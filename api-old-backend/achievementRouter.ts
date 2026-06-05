import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { achievements } from "@db/schema";
import { eq } from "drizzle-orm";

export const achievementRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, ctx.user.id))
      .orderBy((a) => a.earnedAt);
  }),

  create: authedQuery
    .input(
      z.object({
        badgeType: z.string(),
        badgeName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(achievements)
        .values({
          userId: ctx.user.id,
          badgeType: input.badgeType,
          badgeName: input.badgeName,
        })
        .$returningId();
      return { id, success: true };
    }),
});
