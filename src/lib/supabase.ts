import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase configuration from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate config
const isConfigured = !!(
  supabaseUrl &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  supabaseAnonKey &&
  supabaseAnonKey !== "your-anon-key"
);

// Create a no-op fallback when Supabase is not configured
const createNoOpClient = (): SupabaseClient => {
  const mockSession = { data: { session: null }, error: null };
  const mockSubscription = {
    data: {
      subscription: { unsubscribe: () => {} } as any,
    },
    error: null,
  };

  const authHandler = {
    get(target: any, prop: string) {
      if (prop === "getSession") return () => Promise.resolve(mockSession);
      if (prop === "onAuthStateChange")
        return (_callback: any) => mockSubscription;
      if (prop === "signInWithPassword")
        return () =>
          Promise.resolve({
            data: { session: null, user: null },
            error: { message: "Supabase not configured" },
          });
      if (prop === "signUp")
        return () =>
          Promise.resolve({
            data: { session: null, user: null },
            error: { message: "Supabase not configured" },
          });
      if (prop === "signOut") return () => Promise.resolve({ error: null });
      if (prop === "resetPasswordForEmail")
        return () =>
          Promise.resolve({ data: {}, error: { message: "Supabase not configured" } });
      if (prop === "updateUser")
        return () =>
          Promise.resolve({ data: { user: null }, error: { message: "Supabase not configured" } });
      return () => Promise.resolve({ data: null, error: null });
    },
  };

  const clientHandler = {
    get(target: any, prop: string) {
      if (prop === "auth") return new Proxy({}, authHandler);
      if (prop === "from") return () => new Proxy({}, clientHandler);
      return () => Promise.resolve({ data: null, error: null });
    },
  };

  return new Proxy({} as any, clientHandler);
};

// Initialize Supabase client — or no-op fallback if not configured
let supabaseInstance: SupabaseClient;

if (isConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: "anglotec_auth_session",
      },
      realtime: { enabled: false },
      db: { schema: "public" },
    });
    console.log("[Supabase] Client initialized successfully");
  } catch (e) {
    console.error("[Supabase] Failed to initialize client:", e);
    supabaseInstance = createNoOpClient();
  }
} else {
  console.warn("[Supabase] Not configured — using no-op client");
  supabaseInstance = createNoOpClient();
}

export const supabase = supabaseInstance;

// Export types
export type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  security_question: string | null;
  security_answer: string | null;
  webauthn_credential_id: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type UserProgress = {
  id: number;
  user_id: string;
  category: string;
  phrase_id: number;
  status: "new" | "learning" | "mastered";
  xp_earned: number;
  streak_days: number;
  practiced_at: string;
};

export type UserSession = {
  id: number;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  phrases_practiced: number;
  correct_count: number;
  total_xp: number;
  device_type: string;
};

export { isConfigured };
