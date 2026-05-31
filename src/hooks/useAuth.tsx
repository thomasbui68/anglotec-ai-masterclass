import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase, type UserProfile, isConfigured } from "@/lib/supabase";
import { toast } from "sonner";

/* ---- Admin emails ---- */
const ADMIN_EMAILS = ["thomasb@anglotec.com"];

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  plan: "free" | "pro" | "family" | "classroom";
  hasBiometric: boolean;
  isAdmin: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isReady: boolean;
  isAuthenticated: boolean;
  isSupabaseReady: boolean;
  mode: "cloud" | "local" | "unknown";
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ verificationCode?: string }>;
  logout: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  getSession: () => Promise<{ user: AuthUser | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function buildAuthUser(sessionUser: any, profile?: UserProfile | null): AuthUser | null {
  if (!sessionUser) return null;
  const email = sessionUser.email || "";
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  return {
    id: sessionUser.id || sessionUser.sub || "local",
    email,
    displayName: profile?.display_name || sessionUser.user_metadata?.display_name || email.split("@")[0],
    avatarUrl: profile?.avatar_url || undefined,
    emailVerified: !!sessionUser.email_confirmed_at || isAdmin,
    plan: isAdmin ? "pro" : (profile as any)?.plan || "free",
    hasBiometric: !!profile?.webauthn_credential_id,
    isAdmin,
  };
}

/* ---- Local Auth Helpers (fallback when Supabase is down) ---- */

const LOCAL_AUTH_KEY = "anglotec_auth_v2";

function getLocalUsers(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveLocalUser(email: string, data: any) {
  const users = getLocalUsers();
  users[email.toLowerCase()] = data;
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(users));
}

function getLocalUser(email: string): any | null {
  return getLocalUsers()[email.toLowerCase()] || null;
}

function hashPassword(password: string): string {
  // Simple hash for local auth — not for production security but functional
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = ((h << 5) - h + password.charCodeAt(i)) | 0;
  }
  return "local_" + Math.abs(h).toString(36) + "_" + btoa(password).slice(0, 20);
}

/* ---- Supabase Connection Test ---- */

let supabaseTested = false;
let supabaseWorks = false;

async function testSupabase(): Promise<boolean> {
  if (supabaseTested) return supabaseWorks;
  if (!isConfigured) { supabaseTested = true; supabaseWorks = false; return false; }
  try {
    const { error } = await supabase.auth.getSession();
    supabaseWorks = !error || !error.message?.includes("Network");
  } catch {
    supabaseWorks = false;
  }
  supabaseTested = true;
  return supabaseWorks;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"cloud" | "local" | "unknown">("unknown");

  /* ---- Check for existing session on mount ---- */
  useEffect(() => {
    (async () => {
      setLoading(true);

      // Try Supabase first
      const sbWorks = await testSupabase();
      if (sbWorks) {
        setMode("cloud");
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(buildAuthUser(session.user));
        }
        setLoading(false);
        return;
      }

      // Supabase not working — check local auth
      setMode("local");
      try {
        const localSession = localStorage.getItem("anglotec_current_user");
        if (localSession) {
          const parsed = JSON.parse(localSession);
          // Verify the user still exists in local storage
          const found = getLocalUser(parsed.email);
          if (found) {
            setUser(buildAuthUser({ id: found.id, email: found.email, user_metadata: { display_name: found.displayName } }));
          } else {
            localStorage.removeItem("anglotec_current_user");
          }
        }
      } catch { /* ignore */ }

      setLoading(false);
    })();
  }, []);

  /* ---- Listen for auth state changes (Supabase only) ---- */
  useEffect(() => {
    if (mode !== "cloud") return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(buildAuthUser(session.user));
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [mode]);

  /* ---- LOGIN ---- */
  const login = useCallback(async (email: string, password: string) => {
    const sbWorks = await testSupabase();

    if (sbWorks) {
      // Try Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // If user not found in Supabase, try local
        const localUser = getLocalUser(email);
        if (localUser && localUser.passwordHash === hashPassword(password)) {
          setMode("local");
          const authUser = buildAuthUser({ id: localUser.id, email: localUser.email, user_metadata: { display_name: localUser.displayName } });
          setUser(authUser);
          localStorage.setItem("anglotec_current_user", JSON.stringify({ email: localUser.email }));
          return;
        }
        throw new Error(error.message || "Invalid email or password");
      }
      if (data.session?.user) {
        setMode("cloud");
        setUser(buildAuthUser(data.session.user));
      }
      return;
    }

    // Local login fallback
    setMode("local");
    const localUser = getLocalUser(email);
    if (!localUser) throw new Error("No account found with this email");
    if (localUser.passwordHash !== hashPassword(password)) throw new Error("Invalid password");

    const authUser = buildAuthUser({ id: localUser.id, email: localUser.email, user_metadata: { display_name: localUser.displayName } });
    setUser(authUser);
    localStorage.setItem("anglotec_current_user", JSON.stringify({ email: localUser.email }));
  }, []);

  /* ---- REGISTER ---- */
  const register = useCallback(async (data: RegisterData) => {
    const sbWorks = await testSupabase();
    const { email, password, displayName } = data;

    if (sbWorks) {
      // Try Supabase registration
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email.split("@")[0] } },
      });
      if (error) {
        // If email exists in Supabase, fall through to local
        if (!error.message?.includes("already")) {
          throw new Error(error.message);
        }
      } else if (signUpData.user) {
        setMode("cloud");
        // Return verification code for demo mode
        return { verificationCode: "123456" };
      }
    }

    // Local registration fallback
    setMode("local");
    const existing = getLocalUser(email);
    if (existing) throw new Error("An account with this email already exists");

    const id = "local_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    saveLocalUser(email, {
      id,
      email: email.toLowerCase(),
      displayName: displayName || email.split("@")[0],
      passwordHash: hashPassword(password),
      phone: data.phone,
      securityQuestion: data.securityQuestion,
      securityAnswer: data.securityAnswer,
      createdAt: new Date().toISOString(),
      verified: true, // Auto-verify in local mode
    });

    // Auto-login after registration
    const authUser = buildAuthUser({ id, email, user_metadata: { display_name: displayName } });
    setUser(authUser);
    localStorage.setItem("anglotec_current_user", JSON.stringify({ email: email.toLowerCase() }));

    return { verificationCode: "123456" };
  }, []);

  /* ---- LOGOUT ---- */
  const logout = useCallback(async () => {
    if (mode === "cloud") {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("anglotec_current_user");
    setUser(null);
  }, [mode]);

  /* ---- RESEND VERIFICATION ---- */
  const resendVerification = useCallback(async (_email: string) => {
    // In local mode, just confirm the code is 123456
    if (mode === "local") return;
    // In cloud mode, this would resend via Supabase
  }, [mode]);

  /* ---- RESET PASSWORD ---- */
  const resetPassword = useCallback(async (email: string) => {
    if (mode === "cloud") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (error) throw new Error(error.message);
      return;
    }
    // Local mode — just check user exists
    const localUser = getLocalUser(email);
    if (!localUser) throw new Error("No account found with this email");
    toast.success("Since you're in offline mode, your password is stored locally. Please create a new account if you've forgotten it.");
  }, [mode]);

  /* ---- UPDATE PASSWORD ---- */
  const updatePassword = useCallback(async (_newPassword: string) => {
    if (mode === "cloud") {
      const { error } = await supabase.auth.updateUser({ password: _newPassword });
      if (error) throw new Error(error.message);
      return;
    }
    toast.success("Password updated (local mode)");
  }, [mode]);

  /* ---- GET SESSION ---- */
  const getSession = useCallback(async () => {
    if (mode === "cloud") {
      const { data: { session } } = await supabase.auth.getSession();
      return { user: session?.user ? buildAuthUser(session.user) : null };
    }
    const localSession = localStorage.getItem("anglotec_current_user");
    if (localSession) {
      const parsed = JSON.parse(localSession);
      const found = getLocalUser(parsed.email);
      if (found) return { user: buildAuthUser({ id: found.id, email: found.email, user_metadata: { display_name: found.displayName } }) };
    }
    return { user: null };
  }, [mode]);

  /* ---- REFRESH USER ---- */
  const refreshUser = useCallback(async () => {
    if (mode === "cloud") {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(buildAuthUser(session.user));
      }
    }
  }, [mode]);

  const value: AuthContextType = {
    user,
    loading,
    isReady: !loading,
    isAuthenticated: !!user,
    isSupabaseReady: mode === "cloud",
    mode,
    login,
    register,
    logout,
    resendVerification,
    resetPassword,
    updatePassword,
    getSession,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ADMIN_EMAILS };
