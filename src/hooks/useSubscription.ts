/**
 * useSubscription — Stripe-powered subscription management
 *
 * Subscription state comes from:
 * 1. Stripe via /check-subscription Netlify Function (real payments)
 * 2. Admin users (thomasb@anglotec.com) always get pro
 * 3. Local fallback for development/offline
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";

export type SubscriptionTier = "free" | "pro" | "family" | "classroom" | "organization" | "government";

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
  free:           { dailyPromptLimit: 20, categoryAccess: "basic", voiceEnabled: false, syncEnabled: false, weeklyContent: false, analyticsEnabled: false, maxFamilyMembers: 1, maxStudents: 1 },
  pro:            { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 1, maxStudents: 1 },
  family:         { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 3, maxStudents: 3 },
  classroom:      { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 1, maxStudents: 16 },
  organization:   { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 1, maxStudents: 50 },
  government:     { dailyPromptLimit: 999999, categoryAccess: "all", voiceEnabled: true, syncEnabled: true, weeklyContent: true, analyticsEnabled: true, maxFamilyMembers: 1, maxStudents: 999999 },
};

const BASIC_CATEGORIES = [
  "Code Generation", "UI/UX Design", "Content Creation",
  "Business Strategy", "Data Analysis", "Project Management",
];

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `\u00a3${(cents / 100).toFixed(2)}`;
}

export function formatPriceMonthly(cents: number): string {
  if (cents === 0) return "Free";
  return `\u00a3${(cents / 100).toFixed(0)}`;
}

function isAdminUser(email?: string): boolean {
  return email?.toLowerCase() === "thomasb@anglotec.com";
}

// Netlify Function base URL — auto-detect from current origin
function getApiUrl(path: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/.netlify/functions${path}`;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [stripeTier, setStripeTier] = useState<SubscriptionTier | null>(null);
  const [stripeStatus, setStripeStatus] = useState<string>("none");
  const [trialEndsAt, setTrialEndsAt] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const isAdmin = isAdminUser(user?.email);

  // Check Stripe subscription on mount and when user changes
  useEffect(() => {
    if (!isAuthenticated || !user?.email || isAdmin) return;

    let cancelled = false;
    setChecking(true);

    fetch(getApiUrl("/check-subscription"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.tier) {
          setStripeTier(data.tier);
          setStripeStatus(data.status || "none");
          setTrialEndsAt(data.trialEndsAt || null);
        }
      })
      .catch((err) => {
        console.warn("[Subscription] Stripe check failed:", err);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, user?.email, isAdmin]);

  // Final tier: admin always pro, otherwise Stripe, fallback to free
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

  // Create Stripe Checkout session and redirect
  const createCheckout = useCallback(async (targetTier: SubscriptionTier, billingCycle: "monthly" | "yearly" = "monthly") => {
    if (!user?.email) throw new Error("You must be signed in to subscribe");

    const res = await fetch(getApiUrl("/create-checkout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: targetTier,
        customerEmail: user.email,
        billingCycle,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create checkout session");
    return data;
  }, [user]);

  // Open Stripe Customer Portal for managing subscription
  const openCustomerPortal = useCallback(async () => {
    if (!user?.email) throw new Error("You must be signed in");

    const res = await fetch(getApiUrl("/customer-portal"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerEmail: user.email,
        returnUrl: `${window.location.origin}/#/settings`,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to open customer portal");
    return data;
  }, [user]);

  // For immediate local activation (used after Stripe checkout returns)
  const upgrade = useCallback(async (newTier: SubscriptionTier, _days = 30) => {
    if (!user?.id) return { success: false };

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
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) console.warn("[Subscription] Supabase update failed:", error.message);

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
    inTrial,
    trialEndsAt: trialEndsAt ? new Date(trialEndsAt * 1000).toISOString() : null,
    limits,
    canAccessCategory,
    hasFeature,
    recordUsage,
    getRemainingQuota,
    upgrade,
    createCheckout,
    openCustomerPortal,
    isLoading: checking,
    isAdmin,
  };
}
