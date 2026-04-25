import { createContext, useContext, useState, useCallback } from "react";
import type { User } from "@/types";

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSetItem(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}
function safeRemoveItem(key: string) {
  try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean; // true after localStorage is read on initial load
}

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const token = safeGetItem("token");
      const userStr = safeGetItem("user");
      const user = userStr ? (JSON.parse(userStr) as User) : null;
      const isAuthenticated = !!(token && user && user.id && user.email);
      return { token, user, isAuthenticated, isReady: true };
    } catch {
      safeRemoveItem("token");
      safeRemoveItem("user");
      return { token: null, user: null, isAuthenticated: false, isReady: true };
    }
  });

  const login = useCallback((token: string, user: User) => {
    safeSetItem("token", token);
    safeSetItem("user", JSON.stringify(user));
    setAuth({ token, user, isAuthenticated: true, isReady: true });
  }, []);

  const logout = useCallback(() => {
    safeRemoveItem("token");
    safeRemoveItem("user");
    setAuth({ token: null, user: null, isAuthenticated: false, isReady: true });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
