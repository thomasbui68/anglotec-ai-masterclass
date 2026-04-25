import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { phrases } from "@db/schema";
import { eq, sql, count } from "drizzle-orm";

export const phraseRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          category: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(50),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 50;
      const offset = (page - 1) * limit;

      let query = db.select().from(phrases);

      if (input?.category && input.category !== "all") {
        query = query.where(eq(phrases.category, input.category)) as any;
      }

      if (input?.search) {
        query = query.where(sql`LOWER(${phrases.english}) LIKE LOWER(${'%' + input.search + '%'})`) as any;
      }

      const allPhrases = await query.limit(limit).offset(offset);

      // Get total count
      let countQuery = db.select({ value: count() }).from(phrases);
      if (input?.category && input.category !== "all") {
        countQuery = countQuery.where(eq(phrases.category, input.category)) as any;
      }
      if (input?.search) {
        countQuery = countQuery.where(sql`LOWER(${phrases.english}) LIKE LOWER(${'%' + input.search + '%'})`) as any;
      }
      const totalResult = await countQuery;
      const total = totalResult[0]?.value ?? 0;

      return {
        phrases: allPhrases,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  categories: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select({ category: phrases.category })
      .from(phrases)
      .groupBy(phrases.category);
    return result.map((r) => r.category);
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.phrases.findFirst({
        where: eq(phrases.id, input.id),
      });
    }),
});
