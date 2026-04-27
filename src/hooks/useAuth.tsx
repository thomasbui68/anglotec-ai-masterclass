import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase, type UserProfile } from "@/lib/supabase";
import { toast } from "sonner";

/* ---- Types ---- */

// Admin emails — these accounts get full pro access always
const ADMIN_EMAILS = [
  "thomasb@anglotec.com",
  // Add more admin emails here as needed
];

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

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isReady: boolean; // Alias for loading (backward compat)
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

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

/* ---- Context ---- */

const AuthContext = createContext<AuthContextType | null>(null);

/* ---- Helper: Build AuthUser from Supabase session ---- */

function buildAuthUser(sessionUser: any, profile?: UserProfile | null): AuthUser | null {
  if (!sessionUser) return null;
  const email = sessionUser.email || "";
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  return {
    id: sessionUser.id,
    email,
    displayName: profile?.display_name || sessionUser.user_metadata?.display_name || email.split("@")[0],
    avatarUrl: profile?.avatar_url || sessionUser.user_metadata?.avatar_url,
    emailVerified: !!sessionUser.email_confirmed_at,
    plan: profile?.plan || sessionUser.user_metadata?.plan || "free",
    hasBiometric: !!sessionUser.user_metadata?.has_biometric,
    isAdmin,
  };
}

/* ---- Provider ---- */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);

  // Check if Supabase is properly configured
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && url !== "https://your-project.supabase.co" && key && key !== "your-anon-key") {
      setIsSupabaseReady(true);
    } else {
      setIsSupabaseReady(false);
      setLoading(false);
    }
  }, []);

  // Fetch profile from Supabase database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data as UserProfile;
  }, []);

  // Refresh user from current session
  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      const authUser = buildAuthUser(session.user, profile);
      setUser(authUser);
    } else {
      setUser(null);
    }
  }, [fetchProfile]);

  // Listen for auth state changes
  useEffect(() => {
    if (!isSupabaseReady) return;

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(buildAuthUser(session.user, profile));
      }
      setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(buildAuthUser(session.user, profile));
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [isSupabaseReady, fetchProfile]);

  /* ---- Login ---- */
  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseReady) throw new Error("Supabase is not configured. Please set up your project credentials.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("Invalid email or password. Please check and try again.");
      } else if (error.message.includes("Email not confirmed")) {
        throw new Error("Please verify your email before logging in. Check your inbox for the verification link.");
      } else if (error.message.includes("Too many requests")) {
        throw new Error("Too many login attempts. Please wait a moment and try again.");
      }
      throw new Error(error.message);
    }

    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      setUser(buildAuthUser(data.user, profile));
    }
  }, [isSupabaseReady, fetchProfile]);

  /* ---- Register ---- */
  const register = useCallback(async (data: RegisterData) => {
    if (!isSupabaseReady) throw new Error("Supabase is not configured. Please set up your project credentials.");

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          display_name: data.displayName || data.email.split("@")[0],
          phone: data.phone,
          security_question: data.securityQuestion,
          security_answer: data.securityAnswer,
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        throw new Error("An account with this email already exists. Please sign in instead.");
      } else if (error.message.includes("Password")) {
        throw new Error(error.message);
      }
      throw new Error(error.message);
    }

    if (authData.user) {
      // Create profile in database
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: data.email.trim(),
        display_name: data.displayName || data.email.split("@")[0],
        plan: "free",
        daily_goal: 20,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      toast.success("Account created! Please check your email for the verification link.");
    }

    return {};
  }, [isSupabaseReady]);

  /* ---- Logout ---- */
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  /* ---- Resend Verification ---- */
  const resendVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    if (error) throw new Error(error.message);
    toast.success("Verification email sent! Please check your inbox.");
  }, []);

  /* ---- Reset Password ---- */
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      if (error.message.includes("not found")) {
        throw new Error("We couldn't find an account with that email.");
      }
      throw new Error(error.message);
    }
    toast.success("Password reset email sent! Check your inbox for the reset link.");
  }, []);

  /* ---- Update Password ---- */
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    toast.success("Password updated successfully!");
  }, []);

  /* ---- Get Session ---- */
  const getSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      return { user: buildAuthUser(session.user, profile) };
    }
    return { user: null };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isReady: !loading,
        isAuthenticated: !!user,
        isSupabaseReady,
        mode: isSupabaseReady ? "cloud" : "local",
        login,
        register,
        logout,
        resendVerification,
        resetPassword,
        updatePassword,
        getSession,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ---- Hook ---- */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
