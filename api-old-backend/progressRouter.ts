import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userProgress, phrases } from "@db/schema";
import { eq, and, sql, count } from "drizzle-orm";

export const progressRouter = createRouter({
  getByUser: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, ctx.user.id));
    return progress;
  }),

  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const totalPhrasesResult = await db
      .select({ value: count() })
      .from(phrases);
    const totalPhrases = totalPhrasesResult[0]?.value ?? 0;

    const masteredResult = await db
      .select({ value: count() })
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.status, "mastered")));
    const mastered = masteredResult[0]?.value ?? 0;

    const learningResult = await db
      .select({ value: count() })
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.status, "learning")));
    const learning = learningResult[0]?.value ?? 0;

    const newCount = totalPhrases - mastered - learning;

    const avgMasteryResult = await db
      .select({ avg: sql<number>`COALESCE(AVG(${userProgress.masteryScore}), 0)` })
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    const avgMastery = Math.round(avgMasteryResult[0]?.avg ?? 0);

    const totalPracticesResult = await db
      .select({ sum: sql<number>`COALESCE(SUM(${userProgress.practiceCount}), 0)` })
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    const totalPractices = totalPracticesResult[0]?.sum ?? 0;

    // Count unique active days (simplified: count of distinct last_practiced dates)
    const activeDaysResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT DATE(${userProgress.lastPracticed}))` })
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    const activeDays = activeDaysResult[0]?.count ?? 0;

    const lastActiveResult = await db
      .select({ last: sql<Date | null>`MAX(${userProgress.lastPracticed})` })
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    const lastActive = lastActiveResult[0]?.last;

    return {
      total_phrases: totalPhrases,
      mastered,
      learning,
      new_count: Math.max(0, newCount),
      avg_mastery: avgMastery,
      total_practices: totalPractices,
      active_days: activeDays,
      last_active: lastActive,
    };
  }),

  update: authedQuery
    .input(
      z.object({
        phraseId: z.number(),
        status: z.enum(["mastered", "learning", "new"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;
      const now = new Date();

      const existing = await db.query.userProgress.findFirst({
        where: and(eq(userProgress.userId, userId), eq(userProgress.phraseId, input.phraseId)),
      });

      if (existing) {
        const newCount = existing.practiceCount + 1;
        const newMastery = input.status === "mastered" ? Math.min(100, existing.masteryScore + 20) : existing.masteryScore;
        await db
          .update(userProgress)
          .set({
            status: input.status,
            practiceCount: newCount,
            masteryScore: newMastery,
            lastPracticed: now,
            updatedAt: now,
          })
          .where(eq(userProgress.id, existing.id));
      } else {
        const masteryScore = input.status === "mastered" ? 20 : 0;
        await db.insert(userProgress).values({
          userId,
          phraseId: input.phraseId,
          status: input.status,
          practiceCount: 1,
          masteryScore,
          lastPracticed: now,
        });
      }

      return { success: true };
    }),
});
