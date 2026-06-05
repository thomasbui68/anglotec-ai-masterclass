import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { phrases, usageLogs } from "@db/schema";
import { eq, sql, count, and, inArray } from "drizzle-orm";

// Max phrases per request by tier
const PHRASE_LIMITS = {
  free: 10,      // Small batches only
  pro: 50,
  family: 50,
  classroom: 50,
};

// Daily phrase view limits
const DAILY_PHRASE_LIMITS = {
  free: 20,
  pro: 999999,
  family: 999999,
  classroom: 999999,
};

// Free categories (6 basic)
const FREE_CATEGORIES = [
  "Code Generation",
  "UI/UX Design",
  "Content Creation",
  "Business Strategy",
  "Data Analysis",
  "Project Management",
];

export const phraseRouter = createRouter({
  // List phrases — subscription enforced
  list: authedQuery
    .input(
      z.object({
        category: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;
      const tier = ctx.user.subscription.tier;
      const isFree = tier === "free";

      const page = input?.page ?? 1;
      const requestedLimit = input?.limit ?? 10;

      // Enforce per-request limit by tier
      const maxPerRequest = PHRASE_LIMITS[tier as keyof typeof PHRASE_LIMITS] ?? 10;
      const limit = Math.min(requestedLimit, maxPerRequest);
      const offset = (page - 1) * limit;

      // Enforce daily limit for free users
      if (isFree) {
        const today = new Date().toISOString().split("T")[0];
        const usage = await db.query.usageLogs.findFirst({
          where: and(eq(usageLogs.userId, userId), eq(usageLogs.date, today)),
        });

        const usedToday = usage?.phrasesViewed ?? 0;
        const dailyLimit = DAILY_PHRASE_LIMITS.free;

        if (usedToday >= dailyLimit) {
          throw new Error("DAILY_LIMIT_REACHED: You have viewed your 20 free phrases today. Upgrade to Pro for unlimited access.");
        }

        // Only allow remaining quota
        const remaining = dailyLimit - usedToday;
        const effectiveLimit = Math.min(limit, remaining);

        // Track usage
        if (usage) {
          await db.update(usageLogs)
            .set({ phrasesViewed: usedToday + effectiveLimit })
            .where(eq(usageLogs.id, usage.id));
        } else {
          await db.insert(usageLogs).values({
            userId,
            date: today,
            phrasesViewed: effectiveLimit,
            phrasesPracticed: 0,
            voicePlays: 0,
            sessionsCompleted: 0,
          });
        }

        // Free users: only basic categories
        let query = db.select().from(phrases);

        // Filter to free categories only
        if (input?.category && input.category !== "all") {
          if (!FREE_CATEGORIES.includes(input.category)) {
            throw new Error("UPGRADE_REQUIRED: This category is only available with Pro. Upgrade to unlock all 12 categories.");
          }
          query = query.where(eq(phrases.category, input.category)) as any;
        } else {
          // No category filter = only show free categories
          query = query.where(inArray(phrases.category, FREE_CATEGORIES)) as any;
        }

        if (input?.search) {
          query = query.where(sql`LOWER(${phrases.english}) LIKE LOWER(${'%' + input.search + '%'})`) as any;
        }

        const allPhrases = await query.limit(effectiveLimit).offset(offset);

        // Count (for free categories only)
        let countQuery = db.select({ value: count() }).from(phrases)
          .where(inArray(phrases.category, FREE_CATEGORIES)) as any;
        if (input?.category && input.category !== "all" && FREE_CATEGORIES.includes(input.category)) {
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
          remainingToday: remaining - effectiveLimit,
        };
      }

      // Paid users: full access
      let query = db.select().from(phrases);

      if (input?.category && input.category !== "all") {
        query = query.where(eq(phrases.category, input.category)) as any;
      }

      if (input?.search) {
        query = query.where(sql`LOWER(${phrases.english}) LIKE LOWER(${'%' + input.search + '%'})`) as any;
      }

      const allPhrases = await query.limit(limit).offset(offset);

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
        remainingToday: 999999,
      };
    }),

  // Categories — public but show lock status
  categories: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select({ category: phrases.category })
      .from(phrases)
      .groupBy(phrases.category);
    return result.map((r) => r.category);
  }),

  // Get single phrase — requires auth to prevent scraping
  byId: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const tier = ctx.user.subscription.tier;
      const isFree = tier === "free";

      const phrase = await db.query.phrases.findFirst({
        where: eq(phrases.id, input.id),
      });

      if (!phrase) return null;

      // Free users can only access basic category phrases
      if (isFree && !FREE_CATEGORIES.includes(phrase.category)) {
        throw new Error("UPGRADE_REQUIRED: This phrase is only available with Pro.");
      }

      return phrase;
    }),

  // Search endpoint for typeahead (limited results)
  search: authedQuery
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const tier = ctx.user.subscription.tier;
      const isFree = tier === "free";

      let query = db.select().from(phrases)
        .where(sql`LOWER(${phrases.english}) LIKE LOWER(${'%' + input.q + '%'})`) as any;

      if (isFree) {
        query = query.where(inArray(phrases.category, FREE_CATEGORIES)) as any;
      }

      const results = await query.limit(isFree ? 5 : 20);
      return results;
    }),

  // Count phrases by tier
  count: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tier = ctx.user.subscription.tier;
    const isFree = tier === "free";

    if (isFree) {
      const result = await db.select({ value: count() })
        .from(phrases)
        .where(inArray(phrases.category, FREE_CATEGORIES)) as any;
      return { total: result[0]?.value ?? 0, freeOnly: true };
    }

    const result = await db.select({ value: count() }).from(phrases);
    return { total: result[0]?.value ?? 0, freeOnly: false };
  }),
});
