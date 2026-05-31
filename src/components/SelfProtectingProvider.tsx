import { createContext, useContext, useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Clock, AlertTriangle } from "lucide-react";
import i18n from "@/i18n";

interface ProtectState {
  isRateLimited: boolean;
  loginAttempts: number;
  isLocked: boolean;
  lockExpiry: number;
}

interface ProtectContextType {
  canAct: (actionId: string, cooldownMs?: number) => boolean;
  recordLoginAttempt: () => void;
  isLoginLocked: boolean;
  loginLockSeconds: number;
  canAnswer: boolean;
  recordAnswer: () => void;
  isRateLimited: boolean;
}

const Context = createContext<ProtectContextType>({
  canAct: () => true,
  recordLoginAttempt: () => {},
  isLoginLocked: false,
  loginLockSeconds: 0,
  canAnswer: true,
  recordAnswer: () => {},
  isRateLimited: false,
});

const ACTION_COOLDOWN = 500;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;
const FLASHCARD_ANSWER_COOLDOWN = 800;

export function SelfProtectingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProtectState>({
    isRateLimited: false,
    loginAttempts: 0,
    isLocked: false,
    lockExpiry: 0,
  });

  const actionTimestamps = useRef<Map<string, number>>(new Map());
  const answerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canAnswer, setCanAnswer] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("__protect_login__");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.lockExpiry && Date.now() < saved.lockExpiry) {
          setState(saved);
        } else {
          localStorage.removeItem("__protect_login__");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (state.loginAttempts > 0 || state.isLocked) {
      localStorage.setItem("__protect_login__", JSON.stringify(state));
    }
  }, [state]);

  const [lockSeconds, setLockSeconds] = useState(0);
  useEffect(() => {
    if (!state.isLocked) {
      setLockSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((state.lockExpiry - Date.now()) / 1000));
      setLockSeconds(remaining);
      if (remaining === 0) {
        setState({ isRateLimited: false, loginAttempts: 0, isLocked: false, lockExpiry: 0 });
        localStorage.removeItem("__protect_login__");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isLocked, state.lockExpiry]);

  const canAct = useCallback((actionId: string, cooldownMs: number = ACTION_COOLDOWN) => {
    const now = Date.now();
    const last = actionTimestamps.current.get(actionId) || 0;
    if (now - last < cooldownMs) {
      return false;
    }
    actionTimestamps.current.set(actionId, now);
    return true;
  }, []);

  const recordLoginAttempt = useCallback(() => {
    setState((prev) => {
      if (prev.isLocked) return prev;

      const attempts = prev.loginAttempts + 1;
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        const expiry = Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000;
        toast.error(
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium">{i18n.t("security.tooManyAttempts")}</p>
              <p className="text-gray-400">{i18n.t("security.accountLockedFor", { minutes: LOGIN_LOCKOUT_MINUTES })}</p>
            </div>
          </div>,
          { duration: 6000, id: "login-locked" }
        );
        return { ...prev, isLocked: true, lockExpiry: expiry, loginAttempts: attempts };
      }

      if (attempts >= 3) {
        toast.warning(i18n.t("security.attemptsRemaining", { count: LOGIN_MAX_ATTEMPTS - attempts }), {
          icon: <Clock size={14} />,
          duration: 4000,
          id: "login-warn",
        });
      }

      return { ...prev, loginAttempts: attempts };
    });
  }, []);

  const recordAnswer = useCallback(() => {
    setCanAnswer(false);
    if (answerTimeout.current) clearTimeout(answerTimeout.current);
    answerTimeout.current = setTimeout(() => setCanAnswer(true), FLASHCARD_ANSWER_COOLDOWN);
  }, []);

  return (
    <Context.Provider value={{
      canAct,
      recordLoginAttempt,
      isLoginLocked: state.isLocked,
      loginLockSeconds: lockSeconds,
      canAnswer,
      recordAnswer,
      isRateLimited: state.isRateLimited,
    }}>
      {children}
      {state.isLocked && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#1a2332] border border-red-400/30 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{i18n.t("security.accountLocked")}</h2>
            <p className="text-gray-400 text-sm mb-4">
              {i18n.t("security.accountLockedDesc")}
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-3xl font-bold text-orange-400">{Math.ceil(lockSeconds / 60)}:{String(lockSeconds % 60).padStart(2, "0")}</p>
              <p className="text-xs text-gray-500 mt-1">{i18n.t("security.remaining")}</p>
            </div>
            <p className="text-xs text-gray-500">
              {i18n.t("security.forgotPasswordHint")}
            </p>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}

export function useSelfProtecting() {
  return useContext(Context);
}
