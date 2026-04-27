import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyToken } from "./lib/jwt";
import { getDb } from "./queries/connection";
import { users, subscriptions } from "@db/schema";
import { eq } from "drizzle-orm";

export type SubscriptionContext = {
  tier: "free" | "pro" | "family" | "classroom";
  status: "active" | "cancelled" | "expired" | "trial";
  isPaid: boolean;
  trialEndsAt?: Date | null;
};

export type UserContext = {
  id: number;
  email: string;
  role: string;
  name?: string | null;
  subscription: SubscriptionContext;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: UserContext;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = {
    req: opts.req,
    resHeaders: opts.resHeaders,
  };

  // Read auth token from cookie or Authorization header
  const cookie = opts.req.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/auth_token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      // Verify user still exists in DB
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });
      if (user) {
        // Get subscription info
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, user.id),
        });

        let tier: SubscriptionContext["tier"] = "free";
        let status: SubscriptionContext["status"] = "trial";
        let isPaid = false;
        let trialEndsAt: Date | null = null;

        if (sub) {
          // Check if subscription is still valid
          const now = new Date();
          const periodEnd = sub.currentPeriodEnd;
          const isActivePeriod = !periodEnd || periodEnd > now;

          tier = sub.tier as SubscriptionContext["tier"];
          status = sub.status as SubscriptionContext["status"];

          if (status === "active" && isActivePeriod) {
            isPaid = true;
          } else if (status === "trial" && sub.trialEndsAt && sub.trialEndsAt > now) {
            // Trial is still active - treat as pro
            isPaid = true;
            tier = "pro"; // Trial gets pro features
            trialEndsAt = sub.trialEndsAt;
          } else {
            // Expired or cancelled - revert to free
            isPaid = false;
            tier = "free";
            status = "expired";
          }
        } else {
          // No subscription record - auto-create free tier
          tier = "free";
          status = "trial";
          isPaid = false;
        }

        ctx.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.email.split("@")[0],
          subscription: {
            tier,
            status,
            isPaid,
            trialEndsAt,
          },
        };
      }
    }
  }

  return ctx;
}
