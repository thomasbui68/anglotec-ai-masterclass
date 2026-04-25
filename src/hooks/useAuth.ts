import { useState, useCallback } from "react";
import type { User, AuthState } from "@/types";

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    return { token, user, isAuthenticated: !!token };
  });

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setAuth({ token, user, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null, isAuthenticated: false });
  }, []);

  return { ...auth, login, logout };
}
