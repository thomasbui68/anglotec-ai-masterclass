/**
 * Lightweight Supabase client using direct REST API calls.
 * Handles auth (signIn, signUp, signOut, session) only.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = !!(
  SUPABASE_URL &&
  SUPABASE_URL !== "https://your-project.supabase.co" &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY !== "your-anon-key"
);

function makeHeaders(authToken?: string): Record<string, string> {
  const h: Record<string, string> = {
    "apikey": SUPABASE_ANON_KEY || "",
    "Content-Type": "application/json",
    "X-Client-Info": "supabase-js/2.0",
  };
  if (authToken) {
    h["Authorization"] = `Bearer ${authToken}`;
  } else if (SUPABASE_ANON_KEY) {
    h["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return h;
}

let currentSession: { access_token: string; user: any } | null = null;
const authCallbacks: Set<(event: string, session: any) => void> = new Set();

async function post(path: string, body: any, authToken?: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      method: "POST",
      headers: makeHeaders(authToken),
      body: JSON.stringify(body),
      mode: "cors",
    });
    const data = await res.json();
    return { data, error: data.error || null };
  } catch (err: any) {
    return { data: null, error: { message: "Network error: " + err.message } };
  }
}

async function get(path: string, authToken?: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      headers: makeHeaders(authToken),
      mode: "cors",
    });
    const data = await res.json();
    return { data, error: data.error || null };
  } catch (err: any) {
    return { data: null, error: { message: "Network error: " + err.message } };
  }
}

const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { data, error } = await post("/auth/v1/token?grant_type=password", { email, password });
    if (error) return { data: { session: null, user: null }, error };
    currentSession = data;
    authCallbacks.forEach((cb) => cb("SIGNED_IN", data));
    return { data: { session: data, user: data.user }, error: null };
  },

  async signUp({ email, password, ...metadata }: { email: string; password: string; [key: string]: any }) {
    const { data, error } = await post("/auth/v1/signup", { email, password, data: metadata });
    if (error) return { data: { session: null, user: null }, error };
    return { data: { session: data.session || null, user: data.user }, error: null };
  },

  async signOut() {
    currentSession = null;
    authCallbacks.forEach((cb) => cb("SIGNED_OUT", null));
    return { error: null };
  },

  async getSession() {
    if (!currentSession) return { data: { session: null }, error: null };
    const { data, error } = await get("/auth/v1/user", currentSession.access_token);
    if (error) {
      currentSession = null;
      return { data: { session: null }, error: null };
    }
    return { data: { session: { ...currentSession, user: data } }, error: null };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    authCallbacks.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => authCallbacks.delete(callback),
        },
      },
      error: null,
    };
  },

  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    const { error } = await post("/auth/v1/recover", { email, ...options });
    return { data: {}, error };
  },

  async updateUser(attrs: any, authToken?: string) {
    const token = authToken || currentSession?.access_token;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: makeHeaders(token),
        body: JSON.stringify(attrs),
        mode: "cors",
      });
      const data = await res.json();
      return { data: { user: data }, error: data.error || null };
    } catch (err: any) {
      return { data: { user: null }, error: { message: "Network error: " + err.message } };
    }
  },
};

export const supabase: any = {
  auth,
  from: (_table: string) => ({
    select: (_cols?: string) => ({
      eq: (_col: string, _val: any) => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    update: (_data: any) => ({
      eq: (_col: string, _val: any) => Promise.resolve({ error: null }),
    }),
    insert: (_data: any) => Promise.resolve({ error: null }),
  }),
};

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
  prompt_id: number;
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
  prompts_practiced: number;
  correct_count: number;
  total_xp: number;
  device_type: string;
};

export { isConfigured };
