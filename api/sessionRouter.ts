import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userSessions, userDevices, subscriptions } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHash } from "crypto";

// Max concurrent sessions per account
const SESSION_LIMITS = {
  free: 1,
  pro: 2,
  family: 2, // per family member
  classroom: 2,
};

// Max devices per account
const DEVICE_LIMITS = {
  free: 2,
  pro: 5,
  family: 3, // per family member
  classroom: 2,
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers.get("user-agent") || "";
  const acceptLang = req.headers.get("accept-language") || "";
  // Simple fingerprint - in production use a library like fingerprintjs
  const raw = `${userAgent}|${acceptLang}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export const sessionRouter = createRouter({
  // Register a new session (called on login)
  registerSession: publicQuery
    .input(
      z.object({
        userId: z.number().int(),
        token: z.string(),
        deviceName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const tokenHash = hashToken(input.token);
      const fingerprint = generateDeviceFingerprint(ctx.req);

      // Get user's subscription tier
      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, input.userId),
      });
      const tier = sub?.tier || "free";
      const limit = SESSION_LIMITS[tier as keyof typeof SESSION_LIMITS] || 2;

      // Count existing active sessions
      const existingSessions = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, input.userId))
        .orderBy(desc(userSessions.lastActive));

      // If over limit, remove oldest sessions
      if (existingSessions.length >= limit) {
        const toRemove = existingSessions.slice(limit - 1);
        for (const s of toRemove) {
          await db.delete(userSessions).where(eq(userSessions.id, s.id));
        }
      }

      // Insert new session
      await db.insert(userSessions).values({
        userId: input.userId,
        tokenHash,
        deviceFingerprint: fingerprint,
        deviceName: input.deviceName || "Unknown Device",
        ipAddress: ctx.req.headers.get("x-forwarded-for") || "",
      });

      // Register/update device
      await registerOrUpdateDevice(db, input.userId, fingerprint, input.deviceName || "Unknown Device");

      return { success: true, sessionCount: Math.min(existingSessions.length + 1, limit) };
    }),

  // Get active sessions (user can see their sessions)
  mySessions: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, ctx.user.id))
      .orderBy(desc(userSessions.lastActive));

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName || "Unknown Device",
      lastActive: s.lastActive,
      createdAt: s.createdAt,
    }));
  }),

  // Get my devices
  myDevices: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const devices = await db
      .select()
      .from(userDevices)
      .where(eq(userDevices.userId, ctx.user.id))
      .orderBy(desc(userDevices.lastSeen));

    // Get tier for limit
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
    });
    const tier = sub?.tier || "free";
    const deviceLimit = DEVICE_LIMITS[tier as keyof typeof DEVICE_LIMITS] || 2;

    return {
      devices: devices.map((d) => ({
        id: d.id,
        deviceName: d.deviceName || "Unknown Device",
        deviceType: d.deviceType || "",
        firstSeen: d.firstSeen,
        lastSeen: d.lastSeen,
      })),
      limit: deviceLimit,
      canAdd: devices.length < deviceLimit,
    };
  }),

  // Revoke a session (logout from specific device)
  revokeSession: authedQuery
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(userSessions)
        .where(and(eq(userSessions.id, input.sessionId), eq(userSessions.userId, ctx.user.id)));
      return { success: true };
    }),

  // Remove a device
  removeDevice: authedQuery
    .input(z.object({ deviceId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(userDevices)
        .where(and(eq(userDevices.id, input.deviceId), eq(userDevices.userId, ctx.user.id)));
      return { success: true };
    }),

  // Heartbeat - update last active (called periodically)
  heartbeat: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const fingerprint = generateDeviceFingerprint(ctx.req);
    const token = ctx.req.headers.get("cookie")?.match(/auth_token=([^;]+)/)?.[1];

    if (token) {
      const tokenHash = hashToken(token);
      await db
        .update(userSessions)
        .set({ lastActive: new Date() })
        .where(and(eq(userSessions.tokenHash, tokenHash), eq(userSessions.userId, ctx.user.id)));
    }

    // Update device last seen
    await db
      .update(userDevices)
      .set({ lastSeen: new Date() })
      .where(and(eq(userDevices.userId, ctx.user.id), eq(userDevices.deviceFingerprint, fingerprint)));

    return { success: true };
  }),

  // Validate session (called on every request via middleware)
  validateSession: publicQuery
    .input(z.object({ token: z.string(), userId: z.number().int() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tokenHash = hashToken(input.token);

      const session = await db.query.userSessions.findFirst({
        where: and(eq(userSessions.tokenHash, tokenHash), eq(userSessions.userId, input.userId)),
      });

      if (!session) {
        return { valid: false, reason: "Session expired or revoked" };
      }

      // Check if session is too old (30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (session.lastActive < thirtyDaysAgo) {
        await db.delete(userSessions).where(eq(userSessions.id, session.id));
        return { valid: false, reason: "Session expired due to inactivity" };
      }

      return { valid: true };
    }),
});

// Helper to register or update a device
async function registerOrUpdateDevice(
  db: any,
  userId: number,
  fingerprint: string,
  deviceName: string
) {
  const existing = await db.query.userDevices.findFirst({
    where: and(eq(userDevices.userId, userId), eq(userDevices.deviceFingerprint, fingerprint)),
  });

  if (existing) {
    await db
      .update(userDevices)
      .set({ lastSeen: new Date(), deviceName })
      .where(eq(userDevices.id, existing.id));
  } else {
    await db.insert(userDevices).values({
      userId,
      deviceFingerprint: fingerprint,
      deviceName,
      lastIp: "",
    });
  }
}
