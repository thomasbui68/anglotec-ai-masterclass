import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === "https://your-project.supabase.co") {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL is not configured. " +
    "Please create a project at https://supabase.com and add your credentials to .env"
  );
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Database types for TypeScript
export type UserProfile = {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  email_verified: boolean;
  plan: "free" | "pro" | "family" | "classroom";
  daily_goal: number;
  created_at: string;
  updated_at: string;
};

export type UserProgress = {
  id: string;
  user_id: string;
  phrase_id: string;
  category: string;
  status: "new" | "learning" | "mastered";
  correct_count: number;
  wrong_count: number;
  last_reviewed: string;
  created_at: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  xp_earned: number;
  phrases_studied: number;
  correct_count: number;
  wrong_count: number;
  duration_seconds: number;
  created_at: string;
};
