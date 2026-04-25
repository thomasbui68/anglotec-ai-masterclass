import { relations } from "drizzle-orm";
import { users, biometricCredentials, phrases, userProgress, achievements } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  biometricCredentials: many(biometricCredentials),
  progress: many(userProgress),
  achievements: many(achievements),
}));

export const biometricCredentialsRelations = relations(biometricCredentials, ({ one }) => ({
  user: one(users, { fields: [biometricCredentials.userId], references: [users.id] }),
}));

export const phrasesRelations = relations(phrases, ({ many }) => ({
  progress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, { fields: [userProgress.userId], references: [users.id] }),
  phrase: one(phrases, { fields: [userProgress.phraseId], references: [phrases.id] }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, { fields: [achievements.userId], references: [users.id] }),
}));
