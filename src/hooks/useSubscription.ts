import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "./useAuth";

export type SubscriptionTier = "free" | "pro" | "family" | "classroom";

export interface PlanLimit {
  dailyPhraseLimit: number;
  categoryAccess: "basic" | "all";
  voiceEnabled: boolean;
  syncEnabled: boolean;
  weeklyContent: boolean;
  analyticsEnabled: boolean;
  maxFamilyMembers: number;
  maxStudents: number;
}

export interface PlanConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  dailyPhraseLimit: number;
  categoryAccess: string;
  voiceEnabled: boolean;
  syncEnabled: boolean;
  weeklyContent: boolean;
  analyticsEnabled: boolean;
  maxFamilyMembers: number;
  maxStudents: number;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimit> = {
  free: {
    dailyPhraseLimit: 20,
    categoryAccess: "basic",
    voiceEnabled: false,
    syncEnabled: false,
    weeklyContent: false,
    analyticsEnabled: false,
    maxFamilyMembers: 1,
    maxStudents: 1,
  },
  pro: {
    dailyPhraseLimit: 999999,
    categoryAccess: "all",
    voiceEnabled: true,
    syncEnabled: true,
    weeklyContent: true,
    analyticsEnabled: true,
    maxFamilyMembers: 1,
    maxStudents: 1,
  },
  family: {
    dailyPhraseLimit: 999999,
    categoryAccess: "all",
    voiceEnabled: true,
    syncEnabled: true,
    weeklyContent: true,
    analyticsEnabled: true,
    maxFamilyMembers: 3,
    maxStudents: 3,
  },
  classroom: {
    dailyPhraseLimit: 999999,
    categoryAccess: "all",
    voiceEnabled: true,
    syncEnabled: true,
    weeklyContent: true,
    analyticsEnabled: true,
    maxFamilyMembers: 1,
    maxStudents: 50,
  },
};

const BASIC_CATEGORIES = [
  "Code Generation",
  "UI/UX Design",
  "Content Creation",
  "Business Strategy",
  "Data Analysis",
  "Project Management",
];

export function useSubscription() {
  const { isAuthenticated, isReady, mode, user } = useAuth();
  const isLocalMode = mode === "local" || mode === "unknown";
  const isAdmin = user?.isAdmin ?? false;

  const mySub = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: isReady && isAuthenticated && !isLocalMode,
    retry: 1,
  });

  const todayUsage = trpc.subscription.todayUsage.useQuery(undefined, {
    enabled: isReady && isAuthenticated && !isLocalMode,
    retry: 1,
  });

  const trackUsage = trpc.subscription.trackUsage.useMutation();
  const setSub = trpc.subscription.setSubscription.useMutation();
  const utils = trpc.useUtils();

  // Local state for offline/local mode
  const [localTier, setLocalTier] = useState<SubscriptionTier>("pro"); // Local users get pro during trial period
  const [localTrialEnd, setLocalTrialEnd] = useState<Date | null>(null);

  // Check if local trial has expired
  useEffect(() => {
    if (isLocalMode) {
      try {
        const stored = localStorage.getItem("anglotec_subscription");
        if (stored) {
          const parsed = JSON.parse(stored);
          setLocalTier(parsed.tier || "pro");
          setLocalTrialEnd(parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : null);
        } else {
          // First time - give 14-day pro trial
          const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          setLocalTier("pro");
          setLocalTrialEnd(trialEnd);
          localStorage.setItem(
            "anglotec_subscription",
            JSON.stringify({ tier: "pro", trialEndsAt: trialEnd.toISOString() })
          );
        }
      } catch {
        setLocalTier("pro");
      }
    }
  }, [isLocalMode]);

  // Determine effective tier — admin users always get pro (unless testing another tier)
  const adminViewTier = isAdmin ? (localStorage.getItem("admin_view_tier") as SubscriptionTier | null) : null;
  const tier: SubscriptionTier = adminViewTier
    ? adminViewTier
    : (isAdmin
      ? "pro"
      : (isLocalMode
        ? localTier
        : (mySub.data?.tier ?? "free")));

  const status = adminViewTier
    ? (adminViewTier === "free" ? "expired" : "active")
    : (isAdmin
      ? "active"
      : (isLocalMode
        ? (localTrialEnd && localTrialEnd > new Date() ? "trial" : "expired")
        : (mySub.data?.status ?? "trial")));

  const isPaid = adminViewTier
    ? (adminViewTier !== "free")
    : (isAdmin
      ? true
      : (isLocalMode
        ? (localTier !== "free" && (!localTrialEnd || localTrialEnd > new Date()))
        : (mySub.data?.isPaid ?? false)));

  const trialEndsAt = isLocalMode
    ? localTrialEnd
    : (mySub.data?.trialEndsAt ?? null);

  const limits = PLAN_LIMITS[tier];

  // Check if user can access a category
  const canAccessCategory = useCallback(
    (category: string): boolean => {
      if (tier !== "free") return true;
      return BASIC_CATEGORIES.includes(category);
    },
    [tier]
  );

  // Check if a feature is available
  const hasFeature = useCallback(
    (feature: keyof PlanLimit): boolean => {
      return !!limits[feature];
    },
    [limits]
  );

  // Track usage (cloud only)
  const recordUsage = useCallback(
    async (type: "phrases_viewed" | "phrases_practiced" | "voice_plays" | "sessions_completed", amount = 1) => {
      if (isLocalMode || tier !== "free") return { allowed: true, remaining: 999999 };
      try {
        const result = await trackUsage.mutateAsync({ type, amount });
        utils.subscription.todayUsage.invalidate();
        return result;
      } catch {
        return { allowed: true, remaining: 999999 };
      }
    },
    [isLocalMode, tier, trackUsage, utils]
  );

  // Check if user has remaining daily quota
  const getRemainingQuota = useCallback(
    (type: "phrases_viewed" | "phrases_practiced" | "voice_plays" = "phrases_viewed") => {
      if (tier !== "free") return { remaining: 999999, limit: 999999, used: 0 };
      const usage = todayUsage.data;
      if (!usage) return { remaining: limits.dailyPhraseLimit, limit: limits.dailyPhraseLimit, used: 0 };
      const key = type === "phrases_viewed" ? "phrasesViewed" : type === "phrases_practiced" ? "phrasesPracticed" : type === "voice_plays" ? "voicePlays" : "sessionsCompleted";
      const item = usage[key];
      return item || { remaining: limits.dailyPhraseLimit, limit: limits.dailyPhraseLimit, used: 0 };
    },
    [tier, todayUsage.data, limits]
  );

  // Manual upgrade (for demo/testing)
  const upgrade = useCallback(
    async (newTier: SubscriptionTier, days = 30) => {
      if (isLocalMode) {
        const periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        setLocalTier(newTier);
        setLocalTrialEnd(periodEnd);
        localStorage.setItem(
          "anglotec_subscription",
          JSON.stringify({ tier: newTier, trialEndsAt: periodEnd.toISOString() })
        );
        return { success: true };
      }
      const result = await setSub.mutateAsync({ tier: newTier, days });
      utils.subscription.mySubscription.invalidate();
      return result;
    },
    [isLocalMode, setSub, utils]
  );

  return {
    tier,
    status,
    isPaid,
    trialEndsAt,
    limits,
    canAccessCategory,
    hasFeature,
    recordUsage,
    getRemainingQuota,
    upgrade,
    isLoading: mySub.isLoading,
  };
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatPriceMonthly(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}
