import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { trpc } from "@/providers/trpc";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  const { data: meData, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isLoading) {
      setIsReady(true);
    }
  }, [isLoading]);

  const user: User | null = meData
    ? {
        id: meData.id,
        email: meData.email,
        role: meData.role,
        backupEmail: meData.backupEmail,
        phoneNumber: meData.phoneNumber,
        emailVerified: meData.emailVerified,
        phoneVerified: meData.phoneVerified,
        securityQuestion: meData.securityQuestion,
        hasBiometric: meData.hasBiometric,
      }
    : null;

  const login = useCallback(
    async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    [loginMutation],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const result = await registerMutation.mutateAsync(data);
      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          hasBiometric: result.user.hasBiometric,
        },
        verificationCode: result.verificationCode,
      };
    },
    [registerMutation],
  );

  const logout = useCallback(() => {
    logoutMutation.mutateAsync().catch(() => {});
  }, [logoutMutation]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady,
        login,
        logout,
        register,
      }}
    >
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
