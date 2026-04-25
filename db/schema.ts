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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("category_idx").on(table.category),
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
