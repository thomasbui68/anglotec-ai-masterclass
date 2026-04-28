import { createContext, useContext, useEffect, useCallback, useState } from "react";
import { toast } from "sonner";
import { Trash2, Zap } from "lucide-react";

interface CleaningContextType {
  lastCleaned: number;
  cleanedBytes: number;
  runCleanup: () => void;
}

const Context = createContext<CleaningContextType>({
  lastCleaned: 0,
  cleanedBytes: 0,
  runCleanup: () => {},
});

const CLEAN_INTERVAL = 24 * 60 * 60 * 1000; // once per day
const OLD_DATA_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days

export function SelfCleaningProvider({ children }: { children: React.ReactNode }) {
  const [lastCleaned, setLastCleaned] = useState(0);
  const [cleanedBytes, setCleanedBytes] = useState(0);

  const runCleanup = useCallback(() => {
    let freed = 0;
    const now = Date.now();

    // 1. Clean old autosaves
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("__autosave_")) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (now - parsed.savedAt > OLD_DATA_THRESHOLD) {
              freed += raw.length * 2; // rough byte estimate
              localStorage.removeItem(key);
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }

    // 2. Clean old bug reports (keep last 20)
    try {
      const reports = JSON.parse(localStorage.getItem("__bug_reports__") || "[]");
      if (reports.length > 20) {
        const trimmed = reports.slice(-20);
        localStorage.setItem("__bug_reports__", JSON.stringify(trimmed));
      }
    } catch {
      // ignore
    }

    // 3. Clean expired trial markers
    try {
      const trialStart = localStorage.getItem("trial_start");
      if (trialStart) {
        const start = parseInt(trialStart);
        if (now - start > 30 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem("trial_start");
          localStorage.removeItem("subscription_tier");
        }
      }
    } catch {
      // ignore
    }

    // 4. Clean old queued actions
    try {
      const queue = JSON.parse(localStorage.getItem("__resilient_queue__") || "[]");
      const fresh = queue.filter((item: any) => now - item.createdAt < OLD_DATA_THRESHOLD);
      if (fresh.length !== queue.length) {
        localStorage.setItem("__resilient_queue__", JSON.stringify(fresh));
      }
    } catch {
      // ignore
    }

    setLastCleaned(now);
    setCleanedBytes(freed);

    if (freed > 1000) {
      toast.info(`Cleaned up ${Math.round(freed / 1024)}KB of old data`, {
        icon: <Zap size={14} />,
        duration: 3000,
      });
    }
  }, []);

  // Run on mount if never cleaned or stale
  useEffect(() => {
    const last = parseInt(localStorage.getItem("__last_cleaned__") || "0");
    if (Date.now() - last > CLEAN_INTERVAL) {
      runCleanup();
      localStorage.setItem("__last_cleaned__", Date.now().toString());
    }
  }, [runCleanup]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      runCleanup();
      localStorage.setItem("__last_cleaned__", Date.now().toString());
    }, CLEAN_INTERVAL);
    return () => clearInterval(interval);
  }, [runCleanup]);

  return (
    <Context.Provider value={{ lastCleaned, cleanedBytes, runCleanup }}>
      {children}
    </Context.Provider>
  );
}

export function useSelfCleaning() {
  return useContext(Context);
}
