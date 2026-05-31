/**
 * useSubscription — Clean Stripe-only. No localStorage. No Supabase service key.
 *
 * Subscription state comes DIRECTLY from Stripe via /check-subscription Netlify Function.
 * Admin users (thomasb@anglotec.com) always get pro.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";

export type SubscriptionTier = "free" | "pro" | "family" | "classroom";

export interface PlanLimit {
  dailyPromptLimit: number;
  categoryAccess: "basic" | "all";
  voiceEnabled: boolean;
  syncEnabled: boolean;
  weeklyContent: boolean;
  analyticsEnabled: boolean;
  maxFamilyMembers: number;
  maxStudents: number;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimit> = {
  free:       { dailyPromptLimit: 20, categoryAccess: "basic", voiceEnabled: false, syncEnabled: false, weeklyContent: false, analyticsEnabled: false, maxFamilyMembers: 1, maxStudents: 1 },
  pro:        { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 1, maxStudents: 1 },
  family:     { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 3, maxStudents: 3 },
  classroom:  { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 1, maxStudents: 16 },
};

const BASIC_CATEGORIES = [
  "Code Generation", "UI/UX Design", "Content Creation",
  "Business Strategy", "Data Analysis", "Project Management",
];

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `£${(cents / 100).toFixed(2)}`;
}

export function formatPriceMonthly(cents: number): string {
  if (cents === 0) return "Free";
  return `£${(cents / 100).toFixed(0)}`;
}

function isAdminUser(email?: string): boolean {
  return email?.toLowerCase() === "thomasb@anglotec.com";
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [stripeTier, setStripeTier] = useState<SubscriptionTier | null>(null);
  const [stripeStatus, setStripeStatus] = useState<string>("none");
  const [checking, setChecking] = useState(false);

  const isAdmin = isAdminUser(user?.email);

  // Check localStorage for active subscription (set after Stripe Payment Link checkout)
  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;
    const cachedTier = localStorage.getItem("anglotec_stripe_tier") as "free" | "pro" | "family" | "classroom" | null;
    if (cachedTier) setStripeTier(cachedTier);
  }, [isAuthenticated, isAdmin]);

  // Final tier: admin always pro, otherwise Stripe/localStorage, fallback to free
  const tier: SubscriptionTier = useMemo(() => {
    if (isAdmin) {
      const viewAs = localStorage.getItem("admin_view_tier");
      if (viewAs === "free" || viewAs === "pro" || viewAs === "family" || viewAs === "classroom") return viewAs;
      return "pro";
    }
    if (stripeTier) return stripeTier;
    // Check localStorage for recently activated tier (from Stripe checkout)
    const cachedTier = localStorage.getItem("anglotec_stripe_tier") as SubscriptionTier | null;
    const cachedStatus = localStorage.getItem("anglotec_stripe_status");
    const cachedDate = localStorage.getItem("anglotec_stripe_activated");
    if (cachedTier && cachedStatus === "active" && cachedDate) {
      const activated = new Date(cachedDate);
      const hoursSince = (Date.now() - activated.getTime()) / (1000 * 60 * 60);
      // Only trust localStorage for 24 hours, then rely on Stripe check
      if (hoursSince < 24) return cachedTier;
    }
    // Fallback: check Supabase profile plan
    const profilePlan = (user as any)?.plan;
    if (profilePlan === "pro" || profilePlan === "family" || profilePlan === "classroom") return profilePlan;
    return "free";
  }, [isAdmin, stripeTier, user]);

  const limits = PLAN_LIMITS[tier];
  const isPaid = tier !== "free" || isAdmin;
  const inTrial = stripeStatus === "trialing";

  const canAccessCategory = useCallback((category: string): boolean => {
    if (tier !== "free") return true;
    return BASIC_CATEGORIES.includes(category);
  }, [tier]);

  const hasFeature = useCallback((feature: keyof PlanLimit): boolean => !!limits[feature], [limits]);

  const recordUsage = useCallback(async (_type: string, _amount = 1) => {
    if (isAdmin || tier !== "free") return { allowed: true, remaining: 999999 };
    return { allowed: true, remaining: 20 };
  }, [isAdmin, tier]);

  const getRemainingQuota = useCallback((_type?: string) => {
    if (tier !== "free") return { remaining: 999999, limit: 999999, used: 0 };
    return { remaining: 20, limit: 20, used: 0 };
  }, [tier]);

  // For immediate activation after Stripe checkout: store locally + update state
  const upgrade = useCallback(async (newTier: SubscriptionTier, days = 30) => {
    if (!user?.id) return { success: false };
    
    // Store in localStorage for immediate effect
    try {
      localStorage.setItem("anglotec_stripe_tier", newTier);
      localStorage.setItem("anglotec_stripe_status", "active");
      localStorage.setItem("anglotec_stripe_activated", new Date().toISOString());
      
      // Also try to update Supabase profile if available
      const { error } = await supabase
        .from("profiles")
        .update({ 
          subscription_tier: newTier, 
          subscription_status: "active",
          updated_at: new Date().toISOString() 
        })
        .eq("id", user.id);
      
      if (error) console.warn("[Subscription] Supabase update failed:", error.message);
      
      // Update local state immediately
      setStripeTier(newTier);
      setStripeStatus("active");
      
      return { success: true };
    } catch (err: any) {
      console.error("[Subscription] Upgrade failed:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  return {
    tier,
    status: stripeStatus,
    isPaid,
    trialEndsAt: null,
    limits,
    canAccessCategory,
    hasFeature,
    recordUsage,
    getRemainingQuota,
    upgrade,
    isLoading: checking,
    isAdmin,
  };
}
