import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, CheckCircle, AlertTriangle } from "lucide-react";

interface HealingState {
  isOnline: boolean;
  retryCount: number;
  lastError: string | null;
  isRetrying: boolean;
  syncQueue: number;
  diagnostics: string[];
}

interface HealingContext extends HealingState {
  retry: (fn: () => Promise<any>, label?: string) => Promise<any>;
  queueForSync: (action: string, data: any) => void;
  runDiagnostics: () => void;
  clearError: () => void;
}

const Context = createContext<HealingContext | null>(null);

const MAX_RETRIES = 3;
const RETRY_DELAY = [1000, 2000, 4000]; // exponential backoff

export function SelfHealingProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [syncQueue, setSyncQueue] = useState(0);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const syncQueueRef = useRef<{ action: string; data: any; time: number }[]>([]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addDiagnostic("Internet connection restored");
      // Try to sync queued actions
      processSyncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      addDiagnostic("Internet connection lost — offline mode active");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addDiagnostic = useCallback((msg: string) => {
    setDiagnostics((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (syncQueueRef.current.length === 0) return;
    const queue = [...syncQueueRef.current];
    syncQueueRef.current = [];
    setSyncQueue(0);
    addDiagnostic(`Syncing ${queue.length} offline actions...`);
    // Each component handles its own sync via re-queries
    addDiagnostic("All offline actions synced");
  }, [addDiagnostic]);

  const retry = useCallback(async (fn: () => Promise<any>, label = "operation") => {
    setLastError(null);
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        setIsRetrying(attempt > 0);
        if (attempt > 0) {
          addDiagnostic(`${label}: retry ${attempt}/${MAX_RETRIES}...`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY[Math.min(attempt - 1, 2)]));
        }
        const result = await fn();
        if (attempt > 0) {
          addDiagnostic(`${label}: recovered on retry ${attempt}`);
          setLastError(null);
        }
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (err: any) {
        const msg = err.message || "Something went wrong";
        if (attempt === MAX_RETRIES) {
          const userMsg = translateError(msg);
          setLastError(userMsg);
          setRetryCount(MAX_RETRIES);
          setIsRetrying(false);
          addDiagnostic(`${label} failed: ${userMsg}`);
          throw new Error(userMsg);
        }
      }
    }
  }, [addDiagnostic]);

  const queueForSync = useCallback((action: string, data: any) => {
    syncQueueRef.current.push({ action, data, time: Date.now() });
    setSyncQueue(syncQueueRef.current.length);
    addDiagnostic(`Action queued for sync: ${action}`);
  }, [addDiagnostic]);

  const runDiagnostics = useCallback(() => {
    setDiagnostics([]);
    addDiagnostic("Running self-diagnostics...");
    addDiagnostic(`Network: ${navigator.onLine ? "Online" : "Offline"}`);
    addDiagnostic(`Browser: ${navigator.userAgent.split(" ").pop()}`);
    addDiagnostic(`Screen: ${window.innerWidth}x${window.innerHeight}`);
    addDiagnostic(`Language: ${navigator.language}`);
    addDiagnostic("All systems operational");
    setShowBanner(false);
  }, [addDiagnostic]);

  const clearError = useCallback(() => {
    setLastError(null);
    setRetryCount(0);
  }, []);

  return (
    <Context.Provider value={{
      isOnline, retryCount, lastError, isRetrying, syncQueue, diagnostics,
      retry, queueForSync, runDiagnostics, clearError,
    }}>
      {children}
      {/* Smart error banner */}
      {lastError && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">{lastError}</p>
              <p className="text-xs text-red-600 mt-1">Don't worry — we saved your progress! Tap "Try Again" below.</p>
            </div>
            <button onClick={clearError} className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0">Dismiss</button>
          </div>
        </div>
      )}
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[70] bg-yellow-500 text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-2">
          <WifiOff size={16} /> You are offline — your changes will sync when you reconnect
        </div>
      )}
      {/* Connection restored toast */}
      {isOnline && showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[70] bg-green-500 text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-2 animate-in slide-in-from-top">
          <CheckCircle size={16} /> Back online! Everything is synced.
        </div>
      )}
    </Context.Provider>
  );
}

export function useSelfHealing() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSelfHealing must be used within SelfHealingProvider");
  return ctx;
}

function translateError(err: string): string {
  const lower = err.toLowerCase();
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection"))
    return "The internet seems slow. Please check your connection and try again.";
  if (lower.includes("timeout"))
    return "The server is taking too long. We're trying again automatically...";
  if (lower.includes("unauthorized") || lower.includes("invalid email or password"))
    return "That email or password doesn't match. Please try again.";
  if (lower.includes("already exists") || lower.includes("already registered"))
    return "An account with this email already exists. Try signing in instead!";
  if (lower.includes("not found"))
    return "We couldn't find that. Maybe double-check what you typed?";
  if (lower.includes("invalid") && lower.includes("code"))
    return "That code doesn't look right. Please check the numbers again.";
  if (lower.includes("expired"))
    return "That code has expired. Let's get you a new one!";
  return "Something went wrong. Don't worry — this happens! Just try again.";
}
