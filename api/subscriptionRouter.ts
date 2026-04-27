import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscriptions, usageLogs, planConfigs } from "@db/schema";
import { eq, and } from "drizzle-orm";

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    dailyPhraseLimit: 20,
    categoryAccess: "basic" as const,
    voiceEnabled: false,
    syncEnabled: false,
    weeklyContent: false,
    analyticsEnabled: false,
    maxFamilyMembers: 1,
    maxStudents: 1,
  },
  pro: {
    dailyPhraseLimit: 999999, // unlimited
    categoryAccess: "all" as const,
    voiceEnabled: true,
    syncEnabled: true,
    weeklyContent: true,
    analyticsEnabled: true,
    maxFamilyMembers: 1,
    maxStudents: 1,
  },
  family: {
    dailyPhraseLimit: 999999,
    categoryAccess: "all" as const,
    voiceEnabled: true,
    syncEnabled: true,
    weeklyContent: true,
    analyticsEnabled: true,
    maxFamilyMembers: 3,
    maxStudents: 3,
  },
  classroom: {
    dailyPhraseLimit: 999999,
    categoryAccess: "all" as const,
    voiceEnabled: true,
    syncEnabled: true,
    weeklyContent: true,
    analyticsEnabled: true,
    maxFamilyMembers: 1,
    maxStudents: 50,
  },
};

// Basic categories available to free users
const BASIC_CATEGORIES = [
  "Code Generation",
  "UI/UX Design",
  "Content Creation",
  "Business Strategy",
  "Data Analysis",
  "Project Management",
];

export const subscriptionRouter = createRouter({
  // Get current user's subscription
  mySubscription: authedQuery.query(async ({ ctx }) => {
    const tier = ctx.user.subscription.tier;
    const limits = PLAN_LIMITS[tier];

    return {
      tier,
      status: ctx.user.subscription.status,
      isPaid: ctx.user.subscription.isPaid,
      trialEndsAt: ctx.user.subscription.trialEndsAt,
      limits,
    };
  }),

  // Get plan configurations for pricing page
  plans: publicQuery.query(async () => {
    const db = getDb();
    const plans = await db.select().from(planConfigs).orderBy(planConfigs.sortOrder);
    if (plans.length === 0) {
      // Return defaults if not seeded
      return [
        {
          tier: "free" as const,
          name: "Free",
          description: "Start learning with basic access",
          monthlyPrice: 0,
          yearlyPrice: 0,
          dailyPhraseLimit: 20,
          categoryAccess: "basic",
          voiceEnabled: false,
          syncEnabled: false,
          weeklyContent: false,
          analyticsEnabled: false,
          maxFamilyMembers: 1,
          maxStudents: 1,
          features: [
            "20 phrases per day",
            "6 basic categories",
            "Local progress tracking",
            "Basic achievements",
          ],
        },
        {
          tier: "pro" as const,
          name: "Pro",
          description: "Unlimited access for serious learners",
          monthlyPrice: 1999,
          yearlyPrice: 17999,
          dailyPhraseLimit: 999999,
          categoryAccess: "all",
          voiceEnabled: true,
          syncEnabled: true,
          weeklyContent: true,
          analyticsEnabled: true,
          maxFamilyMembers: 1,
          maxStudents: 1,
          features: [
            "Unlimited phrases (3,000+)",
            "All 12 categories",
            "AI voice pronunciation",
            "Cross-device sync",
            "Weekly new phrases",
            "Advanced analytics",
            "Progress reports",
            "Priority support",
          ],
        },
        {
          tier: "family" as const,
          name: "Family",
          description: "Learn together with your family",
          monthlyPrice: 3999,
          yearlyPrice: 34999,
          dailyPhraseLimit: 999999,
          categoryAccess: "all",
          voiceEnabled: true,
          syncEnabled: true,
          weeklyContent: true,
          analyticsEnabled: true,
          maxFamilyMembers: 3,
          maxStudents: 3,
          features: [
            "Everything in Pro",
            "Up to 3 family members",
            "Parent dashboard",
            "Weekly family reports",
            "Shared achievements",
            "Family challenges",
          ],
        },
        {
          tier: "classroom" as const,
          name: "Classroom",
          description: "For educators and teams",
          monthlyPrice: 19999,
          yearlyPrice: 199999,
          dailyPhraseLimit: 999999,
          categoryAccess: "all",
          voiceEnabled: true,
          syncEnabled: true,
          weeklyContent: true,
          analyticsEnabled: true,
          maxFamilyMembers: 1,
          maxStudents: 50,
          features: [
            "Everything in Family",
            "Up to 50 students",
            "Teacher dashboard",
            "Class analytics",
            "Assignment builder",
            "Gradebook export",
            "Priority support",
            "Custom onboarding",
          ],
        },
      ];
    }
    return plans;
  }),

  // Track usage (phrase viewed, practiced, etc.)
  trackUsage: authedQuery
    .input(
      z.object({
        type: z.enum(["phrases_viewed", "phrases_practiced", "voice_plays", "sessions_completed"]),
        amount: z.number().int().min(1).max(100).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Pro users don't need tracking (unlimited)
      if (ctx.user.subscription.tier !== "free") {
        return { allowed: true, remaining: 999999 };
      }

      const db = getDb();
      const today = new Date().toISOString().split("T")[0];

      // Get or create today's usage log
      let log = await db.query.usageLogs.findFirst({
        where: and(eq(usageLogs.userId, ctx.user.id), eq(usageLogs.date, today)),
      });

      if (!log) {
        await db.insert(usageLogs).values({
          userId: ctx.user.id,
          date: today,
          phrasesViewed: 0,
          phrasesPracticed: 0,
          voicePlays: 0,
          sessionsCompleted: 0,
        });
        log = await db.query.usageLogs.findFirst({
          where: and(eq(usageLogs.userId, ctx.user.id), eq(usageLogs.date, today)),
        });
      }

      if (!log) return { allowed: false, remaining: 0 };

      const currentCount = log[input.type as keyof typeof log] as number || 0;
      const limit = PLAN_LIMITS.free.dailyPhraseLimit;

      if (currentCount + input.amount > limit) {
        return {
          allowed: false,
          remaining: Math.max(0, limit - currentCount),
          limit,
          used: currentCount,
        };
      }

      // Update the counter
      const updateData: Record<string, number> = {};
      updateData[input.type] = currentCount + input.amount;
      await db.update(usageLogs).set(updateData).where(eq(usageLogs.id, log.id));

      return {
        allowed: true,
        remaining: limit - (currentCount + input.amount),
        limit,
        used: currentCount + input.amount,
      };
    }),

  // Get today's usage stats
  todayUsage: authedQuery.query(async ({ ctx }) => {
    // Pro users get unlimited
    if (ctx.user.subscription.tier !== "free") {
      return {
        phrasesViewed: { used: 0, limit: 999999, remaining: 999999 },
        phrasesPracticed: { used: 0, limit: 999999, remaining: 999999 },
        voicePlays: { used: 0, limit: 999999, remaining: 999999 },
        sessionsCompleted: { used: 0, limit: 999999, remaining: 999999 },
      };
    }

    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    const log = await db.query.usageLogs.findFirst({
      where: and(eq(usageLogs.userId, ctx.user.id), eq(usageLogs.date, today)),
    });

    const limit = PLAN_LIMITS.free.dailyPhraseLimit;

    return {
      phrasesViewed: { used: log?.phrasesViewed || 0, limit, remaining: Math.max(0, limit - (log?.phrasesViewed || 0)) },
      phrasesPracticed: { used: log?.phrasesPracticed || 0, limit: 999999, remaining: 999999 },
      voicePlays: { used: log?.voicePlays || 0, limit: 0, remaining: 0 },
      sessionsCompleted: { used: log?.sessionsCompleted || 0, limit: 999999, remaining: 999999 },
    };
  }),

  // Check if user can access a specific category
  canAccessCategory: authedQuery
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      const tier = ctx.user.subscription.tier;

      if (tier !== "free") {
        return { allowed: true, requiresUpgrade: false };
      }

      const isBasic = BASIC_CATEGORIES.includes(input.category);
      return {
        allowed: isBasic,
        requiresUpgrade: !isBasic,
        message: isBasic ? undefined : `Upgrade to Pro to access "${input.category}" and 6 more premium categories`,
      };
    }),

  // Admin: manually set subscription (for testing/demo)
  setSubscription: authedQuery
    .input(
      z.object({
        tier: z.enum(["free", "pro", "family", "classroom"]),
        status: z.enum(["active", "cancelled", "expired", "trial"]).optional(),
        days: z.number().int().min(1).max(365).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow self-upgrades or admin
      const db = getDb();
      const userId = ctx.user.id;

      const existing = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + (input.days || 30));

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            tier: input.tier,
            status: input.status || "active",
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existing.id));
      } else {
        await db.insert(subscriptions).values({
          userId,
          tier: input.tier,
          status: input.status || "active",
          currentPeriodEnd: periodEnd,
          currentPeriodStart: new Date(),
        });
      }

      return { success: true, tier: input.tier, expiresAt: periodEnd };
    }),

  // Cancel subscription
  cancel: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelAtPeriodEnd: 1,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, ctx.user.id));

    return { success: true };
  }),
});
