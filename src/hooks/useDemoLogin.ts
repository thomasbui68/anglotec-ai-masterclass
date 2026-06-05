/**
 * useDemoLogin — "fetch + invalidate + navigate" pattern
 *
 * NEVER uses server-side redirects. ALWAYS:
 *  1. FETCH  credentials from a Netlify Function
 *  2. INVALIDATE any stale local auth state (wipe localStorage, clear old sessions)
 *  3. NAVIGATE  client-side via React Router
 *
 * This guarantees cross-browser reliability (Safari, Chrome, Firefox, iOS, Android)
 * because the browser never follows a 302/Location header.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";

// ========== Types ==========

export interface DemoLoginOptions {
  /** Which demo account to use (defaults to "free") */
  tier?: "free" | "pro" | "admin";
  /** Where to go after login (defaults to "/") */
  redirectTo?: string;
  /** Extra toast message after login */
  welcomeMessage?: string;
}

export interface DemoLoginResult {
  /** true = login succeeded */
  success: boolean;
  /** Error message if success=false */
  error?: string;
  /** The Supabase session object */
  session?: any;
}

// ========== Constants ==========

const DEMO_FUNCTION = "/.netlify/functions/demo-login";

/** Keys we wipe during invalidate() to guarantee clean state */
const STALE_KEYS = [
  "anglotec_auth_v2",
  "anglotec_stripe_tier",
  "anglotec_stripe_status",
  "anglotec_stripe_activated",
  "anglotec_pending_tier",
  "sb-rluiarorxttctkeozmpv-auth-token",
  "supabase.auth.token",
];

// ========== Hook ==========

export function useDemoLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Invalidate — wipe every trace of stale auth state.
   * This prevents "ghost sessions" where an old token interferes
   * with the new login.
   */
  const invalidate = useCallback(() => {
    // 1. Sign out from Supabase (clears its in-memory state)
    try {
      supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore — Supabase may not be initialised yet */
    }

    // 2. Wipe localStorage keys that could contain stale tokens
    for (const key of STALE_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore — storage may be full or disabled */
      }
    }

    // 3. Wipe sessionStorage
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }

    // 4. Clear any cookies we set (best-effort)
    const cookies = document.cookie.split(";");
    for (const c of cookies) {
      const [name] = c.split("=");
      if (name?.trim().startsWith("sb-")) {
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }

    // 5. Broadcast logout to other tabs (if app supports it)
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: "anglotec_logout", newValue: Date.now().toString() }));
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * Fetch — call the Netlify Function to get a demo JWT.
   * Returns a Supabase-compatible session object.
   */
  const fetchDemoSession = useCallback(
    async (tier: DemoLoginOptions["tier"] = "free"): Promise<DemoLoginResult> => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${origin}${DEMO_FUNCTION}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }

      return { success: true, session: data.session };
    },
    []
  );

  /**
   * Activate — inject the fetched session into Supabase so the
   * rest of the app (useAuth, protected routes, etc.) sees the
   * user as logged in.
   */
  const activateSession = useCallback(
    async (session: any): Promise<boolean> => {
      if (!session?.access_token || !session?.refresh_token) {
        return false;
      }

      try {
        // Supabase setSession() makes the client treat this as the
        // current user — no page reload, no redirect.
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (error) {
          console.error("[useDemoLogin] setSession error:", error.message);
          return false;
        }

        return true;
      } catch (err: any) {
        console.error("[useDemoLogin] activateSession error:", err.message);
        return false;
      }
    },
    []
  );

  /**
   * The full flow: fetch → invalidate → activate → navigate.
   *
   * Usage:
   *   const demo = useDemoLogin();
   *   await demo.login({ tier: "pro", redirectTo: "/flashcards" });
   */
  const login = useCallback(
    async (opts: DemoLoginOptions = {}): Promise<DemoLoginResult> => {
      const { tier = "free", redirectTo = "/", welcomeMessage } = opts;

      setIsLoading(true);

      try {
        // ── 1. FETCH ────────────────────────────────────────
        const fetchResult = await fetchDemoSession(tier);
        if (!fetchResult.success || !fetchResult.session) {
          toast.error(fetchResult.error || t("errors.demoLoginFailed"));
          return { success: false, error: fetchResult.error };
        }

        // ── 2. INVALIDATE ───────────────────────────────────
        invalidate();
        // Small delay so Supabase internals settle
        await new Promise((r) => setTimeout(r, 50));

        // ── 3. ACTIVATE ─────────────────────────────────────
        const activated = await activateSession(fetchResult.session);
        if (!activated) {
          toast.error(t("errors.sessionActivationFailed"));
          return { success: false, error: "Session activation failed" };
        }

        // ── 4. NAVIGATE (client-side, NEVER server redirect) ─
        toast.success(welcomeMessage || t("auth.demoWelcome"));
        navigate(redirectTo, { replace: true });

        return { success: true, session: fetchResult.session };
      } catch (err: any) {
        console.error("[useDemoLogin] login error:", err);
        toast.error(err.message || t("errors.demoLoginFailed"));
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDemoSession, invalidate, activateSession, navigate, t]
  );

  /**
   * Magic-link style login (OTP / passwordless).
   * Same fetch + invalidate + navigate pattern.
   */
  const loginWithOtp = useCallback(
    async (email: string, otp: string, redirectTo = "/"): Promise<DemoLoginResult> => {
      setIsLoading(true);

      try {
        // ── 1. FETCH ── verify OTP via Supabase ─────────────
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });

        if (error || !data.session) {
          toast.error(error?.message || t("errors.invalidCode"));
          return { success: false, error: error?.message };
        }

        // ── 2. INVALIDATE ──
        invalidate();
        await new Promise((r) => setTimeout(r, 50));

        // ── 3. ACTIVATE ── session already set by verifyOtp,
        //     but we explicitly set it for consistency ─────────
        await activateSession(data.session);

        // ── 4. NAVIGATE ──
        toast.success(t("auth.welcomeBack"));
        navigate(redirectTo, { replace: true });

        return { success: true, session: data.session };
      } catch (err: any) {
        toast.error(err.message || t("errors.authFailed"));
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [invalidate, activateSession, navigate, t]
  );

  return {
    login,
    loginWithOtp,
    isLoading,
    invalidate,
    fetchDemoSession,
    activateSession,
  };
}

export default useDemoLogin;
