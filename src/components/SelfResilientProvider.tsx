import { createContext, useContext, useRef, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi, CloudOff, Cloud } from "lucide-react";

interface QueuedAction {
  id: string;
  type: "progress" | "xp" | "streak" | "settings";
  payload: any;
  retries: number;
  createdAt: number;
}

interface ResilientContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  queueAction: (action: Omit<QueuedAction, "id" | "retries" | "createdAt">) => void;
  retryNow: () => void;
}

const Context = createContext<ResilientContextType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  queueAction: () => {},
  retryNow: () => {},
});

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000]; // exponential-ish backoff
const QUEUE_KEY = "__resilient_queue__";

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedAction[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50))); // keep last 50
  } catch {
    // storage full
  }
}

export function SelfResilientProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const queue = useRef<QueuedAction[]>(loadQueue());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateCount = useCallback(() => {
    setPendingCount(queue.current.length);
  }, []);

  const processQueue = useCallback(async () => {
    if (queue.current.length === 0 || !navigator.onLine) return;
    
    setIsSyncing(true);
    const toProcess = [...queue.current];
    const remaining: QueuedAction[] = [];

    for (const action of toProcess) {
      try {
        // Attempt to sync — replace with actual Supabase sync
        const success = await syncToCloud(action);
        if (!success) throw new Error("Sync failed");
        // Success — drop from queue
      } catch {
        action.retries++;
        if (action.retries < MAX_RETRIES) {
          remaining.push(action);
        }
        // else: drop permanently after 3 retries (data lost, but we tried)
      }
    }

    queue.current = remaining;
    saveQueue(remaining);
    updateCount();
    setIsSyncing(false);

    if (remaining.length === 0 && toProcess.length > 0) {
      toast.success("All progress synced to the cloud", { icon: <Cloud size={14} />, duration: 3000 });
    }
  }, [updateCount]);

  const queueAction = useCallback((action: Omit<QueuedAction, "id" | "retries" | "createdAt">) => {
    const item: QueuedAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      retries: 0,
      createdAt: Date.now(),
    };
    queue.current.push(item);
    saveQueue(queue.current);
    updateCount();

    // If online, try immediately with small delay
    if (navigator.onLine) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(processQueue, 500);
    }
  }, [processQueue, updateCount]);

  const retryNow = useCallback(() => {
    processQueue();
  }, [processQueue]);

  // Network listeners
  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      toast.success("Back online — syncing now", { icon: <Wifi size={14} />, duration: 3000 });
      processQueue();
    };
    const offline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Progress saved locally.", {
        icon: <WifiOff size={14} />,
        duration: 5000,
        id: "offline-toast",
      });
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [processQueue]);

  // Periodic sync every 60 seconds
  useEffect(() => {
    const interval = setInterval(processQueue, 60000);
    return () => clearInterval(interval);
  }, [processQueue]);

  return (
    <Context.Provider value={{ isOnline, isSyncing, pendingCount, queueAction, retryNow }}>
      {children}
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 text-white text-xs font-medium py-1.5 text-center flex items-center justify-center gap-1.5">
          <WifiOff size={12} /> Offline mode — your progress is saved safely on this device
        </div>
      )}
      {/* Syncing indicator */}
      {isSyncing && isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-500/90 text-white text-xs font-medium py-1.5 text-center flex items-center justify-center gap-1.5">
          <Cloud size={12} className="animate-pulse" /> Syncing to cloud...
        </div>
      )}
      {/* Pending badge */}
      {pendingCount > 0 && isOnline && !isSyncing && (
        <button
          onClick={retryNow}
          className="fixed top-12 right-2 z-[90] bg-amber-500/90 text-white text-[10px] px-2.5 py-1 rounded-full shadow-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
        >
          <CloudOff size={10} /> {pendingCount} pending
        </button>
      )}
    </Context.Provider>
  );
}

export function useSelfResilient() {
  return useContext(Context);
}

// Stub: replace with actual Supabase sync call
async function syncToCloud(action: QueuedAction): Promise<boolean> {
  // In production, this calls your Supabase update
  // For now, simulate 95% success rate
  await new Promise(r => setTimeout(r, 300));
  return Math.random() > 0.05;
}
