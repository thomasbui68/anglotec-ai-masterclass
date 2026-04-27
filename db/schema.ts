import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  tinyint,
  index,
  int,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    backupEmail: varchar("backup_email", { length: 320 }),
    phoneNumber: varchar("phone_number", { length: 50 }),
    securityQuestion: varchar("security_question", { length: 255 }),
    securityAnswerHash: varchar("security_answer_hash", { length: 255 }),
    emailVerified: tinyint("email_verified", { unsigned: true }).default(0).notNull(),
    phoneVerified: tinyint("phone_verified", { unsigned: true }).default(0).notNull(),
    hasBiometric: tinyint("has_biometric", { unsigned: true }).default(0).notNull(),
    role: varchar("role", { length: 20 }).default("user").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const biometricCredentials = mysqlTable(
  "biometric_credentials",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    credentialId: text("credential_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("biometric_user_id_idx").on(table.userId),
  }),
);

export type BiometricCredential = typeof biometricCredentials.$inferSelect;

export const phrases = mysqlTable(
  "phrases",
  {
    id: serial("id").primaryKey(),
    english: text("english").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    difficulty: int("difficulty", { unsigned: true }).default(1).notNull(),
    isPremium: tinyint("is_premium", { unsigned: true }).default(0).notNull(),
    weekNumber: int("week_number", { unsigned: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("category_idx").on(table.category),
    premiumIdx: index("premium_idx").on(table.isPremium),
  }),
);

export type Phrase = typeof phrases.$inferSelect;

export const userProgress = mysqlTable(
  "user_progress",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    phraseId: bigint("phrase_id", { mode: "number", unsigned: true }).notNull(),
    status: varchar("status", { length: 20 }).default("new").notNull(),
    practiceCount: int("practice_count", { unsigned: true }).default(0).notNull(),
    masteryScore: int("mastery_score", { unsigned: true }).default(0).notNull(),
    lastPracticed: timestamp("last_practiced"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userPhraseIdx: index("user_phrase_idx").on(table.userId, table.phraseId),
    userStatusIdx: index("user_status_idx").on(table.userId, table.status),
  }),
);

export type UserProgress = typeof userProgress.$inferSelect;

export const achievements = mysqlTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    badgeType: varchar("badge_type", { length: 50 }).notNull(),
    badgeName: varchar("badge_name", { length: 100 }).notNull(),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("achievement_user_idx").on(table.userId),
  }),
);

export type Achievement = typeof achievements.$inferSelect;

export const emailVerifications = mysqlTable(
  "email_verifications",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userEmailIdx: index("verify_user_email_idx").on(table.userId, table.email),
  }),
);

export type EmailVerification = typeof emailVerifications.$inferSelect;

export const passwordResets = mysqlTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    method: varchar("method", { length: 20 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: tinyint("used", { unsigned: true }).default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("reset_user_idx").on(table.userId),
  }),
);

export type PasswordReset = typeof passwordResets.$inferSelect;

// ===== SUBSCRIPTION TABLES =====

export type SubscriptionTier = "free" | "pro" | "family" | "classroom";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial";

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    tier: mysqlEnum("tier", ["free", "pro", "family", "classroom"]).default("free").notNull(),
    status: mysqlEnum("status", ["active", "cancelled", "expired", "trial"]).default("trial").notNull(),
    currentPeriodStart: timestamp("current_period_start").defaultNow().notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    cancelAtPeriodEnd: tinyint("cancel_at_period_end", { unsigned: true }).default(0).notNull(),
    trialEndsAt: timestamp("trial_ends_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("subscription_user_idx").on(table.userId),
    stripeSubIdx: index("stripe_subscription_idx").on(table.stripeSubscriptionId),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;

// ===== FAMILY MEMBERS TABLE =====
// Each family member gets their own account linked to the family plan
export const familyMembers = mysqlTable(
  "family_members",
  {
    id: serial("id").primaryKey(),
    ownerUserId: bigint("owner_user_id", { mode: "number", unsigned: true }).notNull(),
    memberUserId: bigint("member_user_id", { mode: "number", unsigned: true }).notNull(),
    inviteEmail: varchar("invite_email", { length: 320 }).notNull(),
    status: mysqlEnum("status", ["pending", "active", "removed"]).default("pending").notNull(),
    invitedAt: timestamp("invited_at").defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at"),
  },
  (table) => ({
    ownerIdx: index("family_owner_idx").on(table.ownerUserId),
    memberIdx: index("family_member_idx").on(table.memberUserId),
    emailIdx: index("family_email_idx").on(table.inviteEmail),
  }),
);

export type FamilyMember = typeof familyMembers.$inferSelect;

// ===== SESSION TRACKING (concurrent session control) =====
export const userSessions = mysqlTable(
  "user_sessions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
    deviceName: varchar("device_name", { length: 100 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    lastActive: timestamp("last_active").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("session_user_idx").on(table.userId),
    tokenIdx: index("session_token_idx").on(table.tokenHash),
  }),
);

export type UserSession = typeof userSessions.$inferSelect;

// ===== DEVICE TRACKING (device limit enforcement) =====
export const userDevices = mysqlTable(
  "user_devices",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    deviceFingerprint: varchar("device_fingerprint", { length: 255 }).notNull(),
    deviceName: varchar("device_name", { length: 100 }),
    deviceType: varchar("device_type", { length: 50 }),
    lastIp: varchar("last_ip", { length: 45 }),
    firstSeen: timestamp("first_seen").defaultNow().notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
  },
  (table) => ({
    userDeviceIdx: index("user_device_idx").on(table.userId, table.deviceFingerprint),
  }),
);

export type UserDevice = typeof userDevices.$inferSelect;

// Usage tracking for daily limits
export const usageLogs = mysqlTable(
  "usage_logs",
  {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    phrasesViewed: int("phrases_viewed", { unsigned: true }).default(0).notNull(),
    phrasesPracticed: int("phrases_practiced", { unsigned: true }).default(0).notNull(),
    voicePlays: int("voice_plays", { unsigned: true }).default(0).notNull(),
    sessionsCompleted: int("sessions_completed", { unsigned: true }).default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: index("usage_user_date_idx").on(table.userId, table.date),
  }),
);

export type UsageLog = typeof usageLogs.$inferSelect;

// Plan configuration reference table
export const planConfigs = mysqlTable(
  "plan_configs",
  {
    id: serial("id").primaryKey(),
    tier: mysqlEnum("tier", ["free", "pro", "family", "classroom"]).notNull().unique(),
    name: varchar("name", { length: 50 }).notNull(),
    description: text("description"),
    monthlyPrice: int("monthly_price").notNull(),
    yearlyPrice: int("yearly_price").notNull(),
    dailyPhraseLimit: int("daily_phrase_limit").notNull(),
    categoryAccess: varchar("category_access", { length: 20 }).default("basic").notNull(),
    voiceEnabled: tinyint("voice_enabled", { unsigned: true }).default(0).notNull(),
    syncEnabled: tinyint("sync_enabled", { unsigned: true }).default(0).notNull(),
    weeklyContent: tinyint("weekly_content", { unsigned: true }).default(0).notNull(),
    analyticsEnabled: tinyint("analytics_enabled", { unsigned: true }).default(0).notNull(),
    maxFamilyMembers: int("max_family_members").default(1).notNull(),
    maxStudents: int("max_students").default(1).notNull(),
    sortOrder: int("sort_order").default(0).notNull(),
  },
  (table) => ({
    tierIdx: index("plan_tier_idx").on(table.tier),
  }),
);

export type PlanConfig = typeof planConfigs.$inferSelect;
