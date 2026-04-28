import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const VERSION_KEY = "__anglotec_version__";
const CHECK_INTERVAL = 5 * 60 * 1000; // check every 5 minutes

export function SelfAnnouncing() {
  const [updateReady, setUpdateReady] = useState(false);

  const getBuildVersion = useCallback(async () => {
    try {
      // Fetch the index.html and check if it references a different JS bundle
      const res = await fetch("/index.html", { cache: "no-store" });
      const text = await res.text();
      // Extract the current JS bundle hash from the script src
      const match = text.match(/assets\/index-([A-Za-z0-9]+)\.js/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      const current = await getBuildVersion();
      if (!current) return;

      const stored = localStorage.getItem(VERSION_KEY);
      if (!stored) {
        localStorage.setItem(VERSION_KEY, current);
        return;
      }

      if (stored !== current) {
        setUpdateReady(true);
      }
    };

    // Check on mount
    check();

    // Check periodically
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [getBuildVersion]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    setUpdateReady(false);
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-sm w-[calc(100%-2rem)]">
      <Sparkles size={18} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">A new version is ready</p>
        <p className="text-xs text-white/80">Reload to get the latest improvements.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={reload}
          size="sm"
          className="bg-white text-orange-600 hover:bg-white/90 font-bold text-xs h-8 px-3"
        >
          <RefreshCw size={12} className="mr-1" /> Reload
        </Button>
        <button onClick={dismiss} className="text-white/60 hover:text-white">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
