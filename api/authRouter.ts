import { z } from "zod";
import bcrypt from "bcryptjs";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, emailVerifications, passwordResets, biometricCredentials, userProgress, achievements } from "@db/schema";
import { eq, and, gte } from "drizzle-orm";
import { signToken } from "./lib/jwt";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function setAuthCookie(resHeaders: Headers, token: string) {
  resHeaders.append(
    "Set-Cookie",
    `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
  );
}

function clearAuthCookie(resHeaders: Headers) {
  resHeaders.append("Set-Cookie", `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export const authRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        backupEmail: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        securityQuestion: z.string().optional(),
        securityAnswer: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Check if email exists
      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (existing) {
        throw new Error("An account with this email already exists");
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const securityAnswerHash = input.securityAnswer
        ? await bcrypt.hash(input.securityAnswer.toLowerCase().trim(), 12)
        : null;

      const [{ id }] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          backupEmail: input.backupEmail || null,
          phoneNumber: input.phoneNumber || null,
          securityQuestion: input.securityQuestion || null,
          securityAnswerHash,
        })
        .$returningId();

      const user = await db.query.users.findFirst({ where: eq(users.id, id) });
      if (!user) throw new Error("Failed to create account");

      // Create verification code
      const code = generateCode();
      await db.insert(emailVerifications).values({
        userId: user.id,
        email: user.email,
        code,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      setAuthCookie(ctx.resHeaders, token);

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified === 1,
          hasBiometric: user.hasBiometric === 1,
        },
        verificationCode: code, // In production, this would be sent via email
      };
    }),

  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) {
        throw new Error("Invalid email or password");
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }

      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      setAuthCookie(ctx.resHeaders, token);

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified === 1,
          hasBiometric: user.hasBiometric === 1,
          backupEmail: user.backupEmail,
          phoneNumber: user.phoneNumber,
          securityQuestion: user.securityQuestion,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified === 1,
      phoneVerified: user.phoneVerified === 1,
      hasBiometric: user.hasBiometric === 1,
      backupEmail: user.backupEmail,
      phoneNumber: user.phoneNumber,
      securityQuestion: user.securityQuestion,
      role: user.role,
    };
  }),

  logout: publicQuery.mutation(({ ctx }) => {
    clearAuthCookie(ctx.resHeaders);
    return { success: true };
  }),

  verifyEmail: publicQuery
    .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) throw new Error("User not found");

      const record = await db.query.emailVerifications.findFirst({
        where: and(
          eq(emailVerifications.userId, user.id),
          eq(emailVerifications.email, input.email),
          eq(emailVerifications.code, input.code),
          gte(emailVerifications.expiresAt, new Date()),
        ),
        orderBy: (ev, { desc }) => [desc(ev.createdAt)],
      });

      if (!record) throw new Error("Invalid or expired verification code");

      await db
        .update(users)
        .set({ emailVerified: 1 })
        .where(eq(users.id, user.id));

      return { success: true };
    }),

  forgotPassword: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) throw new Error("No account found with this email");

      const code = generateCode();
      await db.insert(passwordResets).values({
        userId: user.id,
        code,
        method: "email",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      return { code }; // In production, sent via email
    }),

  resetPassword: publicQuery
    .input(z.object({ email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) throw new Error("User not found");

      const record = await db.query.passwordResets.findFirst({
        where: and(
          eq(passwordResets.userId, user.id),
          eq(passwordResets.code, input.code),
          eq(passwordResets.used, 0),
          gte(passwordResets.expiresAt, new Date()),
        ),
        orderBy: (pr, { desc }) => [desc(pr.createdAt)],
      });

      if (!record) throw new Error("Invalid or expired reset code");

      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
      await db
        .update(passwordResets)
        .set({ used: 1 })
        .where(eq(passwordResets.id, record.id));

      return { success: true };
    }),

  recoverWithSecurityQuestion: publicQuery
    .input(z.object({ email: z.string().email(), answer: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user || !user.securityAnswerHash) {
        throw new Error("Security question not set for this account");
      }

      const valid = await bcrypt.compare(input.answer.toLowerCase().trim(), user.securityAnswerHash);
      if (!valid) throw new Error("Incorrect answer");

      // Issue a temporary reset token
      const code = generateCode();
      await db.insert(passwordResets).values({
        userId: user.id,
        code,
        method: "security_question",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      return { code };
    }),

  getUserByEmail: publicQuery
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        backupEmail: user.backupEmail,
        phoneNumber: user.phoneNumber,
        securityQuestion: user.securityQuestion,
        emailVerified: user.emailVerified === 1,
        phoneVerified: user.phoneVerified === 1,
        hasBiometric: user.hasBiometric === 1,
      };
    }),

  registerBiometric: authedQuery
    .input(z.object({ credentialId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Remove old credentials for this user
      await db.delete(biometricCredentials).where(eq(biometricCredentials.userId, ctx.user.id));
      await db.insert(biometricCredentials).values({
        userId: ctx.user.id,
        credentialId: input.credentialId,
      });
      await db
        .update(users)
        .set({ hasBiometric: 1 })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  removeBiometric: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(biometricCredentials).where(eq(biometricCredentials.userId, ctx.user.id));
    await db.update(users).set({ hasBiometric: 0 }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  getBiometricCredential: publicQuery
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) return null;
      const cred = await db.query.biometricCredentials.findFirst({
        where: eq(biometricCredentials.userId, user.id),
      });
      return cred?.credentialId || null;
    }),

  biometricLogin: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) throw new Error("Account not found");
      if (!user.hasBiometric) throw new Error("Face ID not set up for this account");

      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      setAuthCookie(ctx.resHeaders, token);

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified === 1,
          hasBiometric: user.hasBiometric === 1,
          backupEmail: user.backupEmail,
          phoneNumber: user.phoneNumber,
          securityQuestion: user.securityQuestion,
        },
      };
    }),

  deleteAccount: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;
    await db.delete(biometricCredentials).where(eq(biometricCredentials.userId, userId));
    await db.delete(userProgress).where(eq(userProgress.userId, userId));
    await db.delete(achievements).where(eq(achievements.userId, userId));
    await db.delete(emailVerifications).where(eq(emailVerifications.userId, userId));
    await db.delete(passwordResets).where(eq(passwordResets.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    clearAuthCookie(ctx.resHeaders);
    return { success: true };
  }),
});
