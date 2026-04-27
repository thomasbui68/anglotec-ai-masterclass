import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { localAuth } from "@/lib/local-db";

export interface User {
  id: number;
  email: string;
  role?: string;
  backupEmail?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  securityQuestion?: string | null;
  hasBiometric?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  mode: "cloud" | "local" | "unknown";
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{ user: User; verificationCode?: string }>;
}

export interface RegisterData {
  email: string;
  password: string;
  backupEmail?: string;
  phoneNumber?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "local_" + Math.abs(hash).toString(16);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isReady: false,
    mode: "unknown",
  });

  const trpcLogin = trpc.auth.login.useMutation();
  const trpcRegister = trpc.auth.register.useMutation();
  const trpcUtils = trpc.useUtils();

  // Detect backend availability on startup
  const modeRef = useRef<"cloud" | "local" | "unknown">("unknown");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Check if we have a local session first (fast, no network)
      const localUser = localAuth.getCurrentUser();

      // 2. Try to ping backend (with short timeout)
      let backendAvailable = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch("/api/trpc/ping", {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        backendAvailable = res.ok;
      } catch {
        backendAvailable = false;
      }

      if (cancelled) return;

      if (backendAvailable) {
        // Backend is up — use cloud mode, try to get user from session
        modeRef.current = "cloud";
        try {
          const me = await trpcUtils.client.auth.me.query();
          if (me && !cancelled) {
            setAuth({
              user: me as User,
              isAuthenticated: true,
              isReady: true,
              mode: "cloud",
            });
            return;
          }
        } catch {
          // No active session on backend
        }
      }

      // Fallback: use local mode
      modeRef.current = "local";

      // Check if we have a local user with a token
      try {
        const token = localStorage.getItem("anglotec_token");
        if (localUser && token && !cancelled) {
          setAuth({
            user: localUser as User,
            isAuthenticated: true,
            isReady: true,
            mode: "local",
          });
          return;
        }
      } catch { /* ignore */ }

      if (!cancelled) {
        setAuth({
          user: null,
          isAuthenticated: false,
          isReady: true,
          mode: backendAvailable ? "cloud" : "local",
        });
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Always try backend first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch("/api/trpc/ping", { signal: controller.signal });
      clearTimeout(timeout);

      // Backend is up — use tRPC
      const result = await trpcLogin.mutateAsync({ email, password });
      if (result.user) {
        setAuth({
          user: result.user as User,
          isAuthenticated: true,
          isReady: true,
          mode: "cloud",
        });
        modeRef.current = "cloud";
        return;
      }
    } catch {
      // Backend failed — fall through to local
    }

    // Local mode fallback
    const localUser = localAuth.login(email, password);
    if (!localUser) {
      throw new Error("Invalid email or password");
    }

    // Generate a local token
    const token = "local_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    try { localStorage.setItem("anglotec_token", token); } catch { /* ignore */ }

    setAuth({
      user: localUser as User,
      isAuthenticated: true,
      isReady: true,
      mode: "local",
    });
    modeRef.current = "local";
  }, [trpcLogin]);

  const register = useCallback(async (data: RegisterData) => {
    // Always try backend first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch("/api/trpc/ping", { signal: controller.signal });
      clearTimeout(timeout);

      const result = await trpcRegister.mutateAsync(data);
      setAuth({
        user: result.user as User,
        isAuthenticated: true,
        isReady: true,
        mode: "cloud",
      });
      modeRef.current = "cloud";
      return { user: result.user as User, verificationCode: result.verificationCode };
    } catch {
      // Backend failed — fall through to local
    }

    // Local mode fallback — create account in localStorage
    const passwordHash = hashPassword(data.password);
    const securityAnswerHash = data.securityAnswer
      ? hashPassword(data.securityAnswer.toLowerCase().trim())
      : null;

    const user = localAuth.registerUser({
      email: data.email,
      password: data.password,
      password_hash: passwordHash,
      backup_email: data.backupEmail || undefined,
      phone_number: data.phoneNumber || undefined,
      security_question: data.securityQuestion || undefined,
      security_answer_hash: securityAnswerHash,
    });

    if (!user) {
      throw new Error("An account with this email already exists");
    }

    // Generate a local token
    const token = "local_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    try { localStorage.setItem("anglotec_token", token); } catch { /* ignore */ }

    setAuth({
      user: user as User,
      isAuthenticated: true,
      isReady: true,
      mode: "local",
    });
    modeRef.current = "local";

    return { user: user as User, verificationCode: "123456" };
  }, [trpcRegister]);

  const logout = useCallback(() => {
    // Clear everything regardless of mode
    try { localStorage.removeItem("anglotec_token"); } catch { /* ignore */ }
    try { localStorage.removeItem("anglotec_user"); } catch { /* ignore */ }
    trpcUtils.auth.me.invalidate();

    setAuth({
      user: null,
      isAuthenticated: false,
      isReady: true,
      mode: modeRef.current === "cloud" ? "cloud" : "local",
    });
  }, [trpcUtils]);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, register }}>
      {children}
      {/* Mode indicator banner */}
      {auth.isReady && auth.mode === "local" && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] bg-yellow-600 text-white text-center py-1.5 text-xs font-medium">
          Running in local mode — your data is saved on this device only.
          Sign up for cloud sync to access your account from any device.
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
