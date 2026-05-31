import { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import i18n from "@/i18n";

interface SaveState {
  lastSaved: number;
  pendingSaves: number;
  isSaving: boolean;
}

interface SavingContextType {
  save: (key: string, data: any) => void;
  restore: (key: string) => any;
  lastSaved: number;
}

const Context = createContext<SavingContextType>({
  save: () => {},
  restore: () => null,
  lastSaved: 0,
});

export function SelfSavingProvider({ children }: { children: React.ReactNode }) {
  const [lastSaved, setLastSaved] = useState(0);
  const queue = useRef<Map<string, any>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (queue.current.size === 0) return;
    queue.current.forEach((data, key) => {
      try {
        localStorage.setItem(`__autosave_${key}`, JSON.stringify({
          data,
          savedAt: Date.now(),
        }));
      } catch {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("__autosave_"));
        keys.slice(0, 3).forEach(k => localStorage.removeItem(k));
      }
    });
    queue.current.clear();
    setLastSaved(Date.now());
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 2000);
  }, [flush]);

  const save = useCallback((key: string, data: any) => {
    queue.current.set(key, data);
    scheduleFlush();
  }, [scheduleFlush]);

  const restore = useCallback((key: string) => {
    try {
      const raw = localStorage.getItem(`__autosave_${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`__autosave_${key}`);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const handler = () => flush();
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [flush]);

  useEffect(() => {
    const interval = setInterval(flush, 30000);
    return () => clearInterval(interval);
  }, [flush]);

  return (
    <Context.Provider value={{ save, restore, lastSaved }}>
      {children}
      {lastSaved > 0 && Date.now() - lastSaved < 3000 && (
        <div className="fixed bottom-12 left-2 z-[80] bg-green-600/80 backdrop-blur text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 opacity-70">
          <Save size={8} /> {i18n.t("common.saved")}
        </div>
      )}
    </Context.Provider>
  );
}

export function useSelfSaving() {
  return useContext(Context);
}

export function useSessionRestore(key: string) {
  const { restore, save } = useSelfSaving();
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    const data = restore(key);
    if (data) {
      setRecovered(true);
      toast.info(
        <div className="flex items-center gap-2">
          <RotateCcw size={14} />
          <span>{i18n.t("system.restoredSession")}</span>
        </div>,
        { duration: 4000, id: "session-restore" }
      );
    }
  }, [key, restore]);

  const checkpoint = useCallback((data: any) => {
    save(key, data);
  }, [save, key]);

  return { recovered, checkpoint };
}
