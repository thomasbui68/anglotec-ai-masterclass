import { useEffect, useState, useCallback } from "react";
import { Wifi, WifiOff, AlertTriangle, RefreshCw, CheckCircle, Shield } from "lucide-react";
import { toast } from "sonner";

interface DiagnosticState {
  online: boolean;
  storageOk: boolean;
  storageError: string | null;
  lastError: string | null;
  errorCount: number;
  autoHealed: string[];
}

export function SelfDiagnosticProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DiagnosticState>({
    online: navigator.onLine,
    storageOk: true,
    storageError: null,
    lastError: null,
    errorCount: 0,
    autoHealed: [],
  });
  const [showPanel, setShowPanel] = useState(false);

  // ── 1. Network State Detection ──
  useEffect(() => {
    const goOnline = () => {
      setState((s) => ({ ...s, online: true }));
      toast.success("You are back online", { icon: <Wifi size={14} />, duration: 3000 });
    };
    const goOffline = () => {
      setState((s) => ({ ...s, online: false }));
      toast.warning("You are offline. Using local mode.", {
        icon: <WifiOff size={14} />,
        duration: 5000,
        id: "offline-notice",
      });
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── 2. Global Error Catcher ──
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.error?.message || event.message || "Unknown error";
      console.error("[SelfDiagnostic] Caught:", msg, event.error);

      setState((s) => {
        const newCount = s.errorCount + 1;
        const healed = [...s.autoHealed];

        // Auto-heal known errors
        if (msg.includes("localStorage") || msg.includes("quota") || msg.includes("Storage")) {
          try {
            // Clear corrupted keys
            const keys = Object.keys(localStorage);
            let cleared = 0;
            for (const key of keys) {
              try {
                localStorage.getItem(key);
              } catch {
                localStorage.removeItem(key);
                cleared++;
              }
            }
            if (cleared > 0) healed.push(`Cleared ${cleared} corrupt storage keys`);
          } catch {
            /* ignore */
          }
        }

        if (msg.includes("chunk") || msg.includes("module")) {
          healed.push("Code chunk load failed — may need refresh");
        }

        if (newCount >= 3) {
          setShowPanel(true);
        }

        return { ...s, lastError: msg, errorCount: newCount, autoHealed: healed };
      });

      toast.error("Something went wrong. We will try to fix it.", {
        icon: <AlertTriangle size={14} />,
        duration: 4000,
        id: "error-toast",
      });

      event.preventDefault();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason) || "Promise rejected";
      console.error("[SelfDiagnostic] Unhandled rejection:", reason);

      setState((s) => ({ ...s, lastError: reason, errorCount: s.errorCount + 1 }));

      toast.error("Network or data error. Using fallback mode.", {
        icon: <WifiOff size={14} />,
        duration: 4000,
        id: "rejection-toast",
      });

      event.preventDefault();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // ── 3. Storage Health Check ──
  useEffect(() => {
    try {
      const testKey = "__anglotec_diag__";
      const testValue = Date.now().toString();
      localStorage.setItem(testKey, testValue);
      const read = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      if (read !== testValue) {
        setState((s) => ({ ...s, storageOk: false, storageError: "Storage read/write mismatch" }));
        toast.warning("Storage issue detected. We are using a safe backup.", { duration: 5000 });
      }
    } catch (e: any) {
      const err = e.name === "QuotaExceededError" ? "Storage full" : "Storage unavailable";
      setState((s) => ({ ...s, storageOk: false, storageError: err }));
    }
  }, []);

  // ── 4. Health Report ──
  const runDiagnostics = useCallback(() => {
    const results: string[] = [];
    let allOk = true;

    // Network
    if (navigator.onLine) {
      results.push("Network: OK");
    } else {
      results.push("Network: Offline");
      allOk = false;
    }

    // Storage
    try {
      const test = "test" + Date.now();
      localStorage.setItem("__diag__", test);
      const ok = localStorage.getItem("__diag__") === test;
      localStorage.removeItem("__diag__");
      results.push(ok ? "Storage: OK" : "Storage: Corrupt");
      if (!ok) allOk = false;
    } catch {
      results.push("Storage: Failed");
      allOk = false;
    }

    // Memory
    if (performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
      const limit = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
      results.push(`Memory: ${used}MB / ${limit}MB`);
    }

    toast.info(
      <div className="space-y-1">
        {results.map((r, i) => (
          <div key={i} className="text-xs">{r.includes("OK") ? "✅" : "⚠️"} {r}</div>
        ))}
        {allOk && <div className="text-xs font-bold text-green-600 mt-1">All systems healthy!</div>}
      </div>,
      { duration: 6000, icon: <Shield size={14} /> }
    );

    return allOk;
  }, []);

  return (
    <>
      {children}

      {/* Floating diagnostic button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`fixed bottom-2 right-2 z-[90] w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg transition-all hover:scale-110 ${
          state.errorCount > 0 ? "bg-red-500 animate-pulse" : state.online ? "bg-green-500" : "bg-amber-500"
        }`}
        title="System Status"
      >
        {state.errorCount > 0 ? "!" : state.online ? "✓" : "~"}
      </button>

      {/* Diagnostic panel */}
      {showPanel && (
        <div className="fixed bottom-12 right-2 z-[90] bg-[#1a2332] border border-white/10 rounded-xl p-4 shadow-2xl w-72">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Shield size={14} className={state.errorCount > 0 ? "text-red-400" : "text-green-400"} />
              System Status
            </h4>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-white">×</button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Network</span>
              <span className={state.online ? "text-green-400" : "text-amber-400"}>
                {state.online ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Storage</span>
              <span className={state.storageOk ? "text-green-400" : "text-red-400"}>
                {state.storageOk ? "OK" : state.storageError || "Error"}
              </span>
            </div>
            {state.errorCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Errors Caught</span>
                <span className="text-red-400">{state.errorCount}</span>
              </div>
            )}
            {state.lastError && (
              <div className="text-red-400 text-[10px] bg-red-500/10 rounded p-1.5">
                Last: {state.lastError.slice(0, 60)}
              </div>
            )}
            {state.autoHealed.length > 0 && (
              <div className="space-y-1">
                <span className="text-green-400 text-[10px]">Auto-healed:</span>
                {state.autoHealed.map((h, i) => (
                  <div key={i} className="text-green-400 text-[10px] pl-2">✓ {h}</div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={runDiagnostics}
              className="flex-1 h-8 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <RefreshCw size={12} /> Run Check
            </button>
            <button
              onClick={() => {
                setState((s) => ({ ...s, errorCount: 0, lastError: null }));
                setShowPanel(false);
                toast.success("Diagnostics cleared", { icon: <CheckCircle size={14} /> });
              }}
              className="flex-1 h-8 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}
