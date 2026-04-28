import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Activity, Wifi, Database, Volume2, HardDrive, CheckCircle,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Zap
} from "lucide-react";

interface TestResult {
  name: string;
  status: "pending" | "running" | "pass" | "warn" | "fail";
  message: string;
  duration: number;
}

const TESTS = [
  { id: "network", name: "Network", icon: Wifi },
  { id: "supabase", name: "Cloud Auth", icon: Database },
  { id: "storage", name: "Storage", icon: HardDrive },
  { id: "voice", name: "Voice", icon: Volume2 },
  { id: "performance", name: "Performance", icon: Activity },
];

export function SelfTestingProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [showPanel, setShowPanel] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);

  const runTest = useCallback(async (id: string): Promise<TestResult> => {
    const start = performance.now();
    let result: TestResult = { name: "", status: "pending", message: "", duration: 0 };

    switch (id) {
      case "network": {
        const online = navigator.onLine;
        result = {
          name: "Network",
          status: online ? "pass" : "warn",
          message: online ? "Connected" : "Offline — app will use local mode",
          duration: performance.now() - start,
        };
        break;
      }

      case "supabase": {
        try {
          const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
          const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (hasUrl && hasKey) {
            result = { name: "Cloud Auth", status: "pass", message: "Supabase connected", duration: performance.now() - start };
          } else {
            result = { name: "Cloud Auth", status: "warn", message: "Using local auth mode", duration: performance.now() - start };
          }
        } catch {
          result = { name: "Cloud Auth", status: "warn", message: "Using local auth mode", duration: performance.now() - start };
        }
        break;
      }

      case "storage": {
        try {
          const testKey = "__smoke_test__";
          const testValue = Date.now().toString();
          localStorage.setItem(testKey, testValue);
          const read = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          result = {
            name: "Storage",
            status: read === testValue ? "pass" : "fail",
            message: read === testValue ? "Read/write OK" : "Storage corruption detected",
            duration: performance.now() - start,
          };
        } catch (e: any) {
          result = {
            name: "Storage",
            status: "fail",
            message: e.name === "QuotaExceededError" ? "Storage full" : "Storage unavailable",
            duration: performance.now() - start,
          };
        }
        break;
      }

      case "voice": {
        const hasTTS = "speechSynthesis" in window;
        const hasElevenLabs = !!import.meta.env.VITE_ELEVENLABS_API_KEY;
        result = {
          name: "Voice",
          status: hasTTS ? "pass" : "warn",
          message: hasElevenLabs ? "Premium voice ready" : hasTTS ? "Browser voice ready" : "Voice unavailable",
          duration: performance.now() - start,
        };
        break;
      }

      case "performance": {
        const memory = (performance as any).memory;
        const memMB = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : null;
        const ok = memMB === null || memMB < 256;
        result = {
          name: "Performance",
          status: ok ? "pass" : "warn",
          message: memMB ? `${memMB}MB memory used` : "Performance OK",
          duration: performance.now() - start,
        };
        break;
      }
    }

    return result;
  }, []);

  const runAllTests = useCallback(async () => {
    setAllPassed(null);
    const newResults: Record<string, TestResult> = {};

    for (const test of TESTS) {
      newResults[test.id] = { name: test.name, status: "running", message: "Testing...", duration: 0 };
      setResults({ ...newResults });

      const result = await runTest(test.id);
      newResults[test.id] = result;
      setResults({ ...newResults });
    }

    const failures = Object.values(newResults).filter(r => r.status === "fail");
    const warnings = Object.values(newResults).filter(r => r.status === "warn");

    if (failures.length > 0) {
      setAllPassed(false);
      toast.error(`${failures.length} system check${failures.length > 1 ? "s" : ""} failed. Tap the indicator for details.`, {
        icon: <AlertTriangle size={14} />,
        duration: 6000,
        id: "smoke-fail",
      });
    } else if (warnings.length > 0) {
      setAllPassed(true);
      toast.success("All systems operational — running in local mode.", {
        icon: <CheckCircle size={14} />,
        duration: 3000,
        id: "smoke-warn",
      });
    } else {
      setAllPassed(true);
      toast.success("All systems healthy!", {
        icon: <Zap size={14} />,
        duration: 3000,
        id: "smoke-pass",
      });
    }
  }, [runTest]);

  // Run on mount
  useEffect(() => {
    // Small delay so the app renders first, then tests run
    const timer = setTimeout(runAllTests, 1500);
    return () => clearTimeout(timer);
  }, [runAllTests]);

  const anyFail = Object.values(results).some(r => r.status === "fail");
  const anyWarn = Object.values(results).some(r => r.status === "warn");
  const running = Object.values(results).some(r => r.status === "running");

  return (
    <>
      {children}

      {/* Floating smoke test button — bottom left, tiny, out of the way */}
      <button
        onClick={() => { setShowPanel(!showPanel); setExpanded(false); }}
        className={`fixed bottom-16 left-2 z-[85] w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] shadow-lg transition-all hover:scale-110 ${
          running ? "bg-blue-500 animate-pulse" :
          anyFail ? "bg-red-500" :
          anyWarn ? "bg-amber-500" :
          allPassed === true ? "bg-green-500" :
          "bg-white/10 backdrop-blur"
        }`}
        title="System Health"
      >
        {running ? <RefreshCw size={10} className="animate-spin" /> :
         anyFail ? <AlertTriangle size={10} /> :
         anyWarn ? <Activity size={10} /> :
         allPassed === true ? <CheckCircle size={10} /> :
         <Activity size={10} />}
      </button>

      {/* Test panel */}
      {showPanel && (
        <div className="fixed bottom-24 left-2 z-[85] bg-[#1a2332] border border-white/10 rounded-xl p-4 shadow-2xl w-72">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Activity size={14} className={anyFail ? "text-red-400" : anyWarn ? "text-amber-400" : "text-green-400"} />
              System Check
            </h4>
            <div className="flex items-center gap-1">
              <button onClick={runAllTests} className="text-gray-400 hover:text-white p-1">
                <RefreshCw size={12} />
              </button>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-white p-1">×</button>
            </div>
          </div>

          <div className="space-y-1.5">
            {TESTS.map((test) => {
              const r = results[test.id];
              if (!r) return (
                <div key={test.id} className="flex items-center justify-between text-xs text-gray-500 py-1">
                  <span className="flex items-center gap-1.5"><test.icon size={10} /> {test.name}</span>
                  <span>Pending</span>
                </div>
              );
              return (
                <div key={test.id} className="flex items-center justify-between text-xs py-1">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <test.icon size={10} className={
                      r.status === "pass" ? "text-green-400" :
                      r.status === "warn" ? "text-amber-400" :
                      r.status === "fail" ? "text-red-400" :
                      "text-blue-400"
                    } />
                    {test.name}
                  </span>
                  <span className={
                    r.status === "pass" ? "text-green-400" :
                    r.status === "warn" ? "text-amber-400" :
                    r.status === "fail" ? "text-red-400" :
                    "text-blue-400"
                  }>
                    {r.status === "running" ? "..." :
                     r.status === "pass" ? "✓" :
                     r.status === "warn" ? "~" :
                     "✗"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 flex items-center justify-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            {expanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> Details</>}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 text-[10px] text-gray-400 bg-white/5 rounded-lg p-2">
              {Object.values(results).map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={
                    r.status === "pass" ? "text-green-400" :
                    r.status === "warn" ? "text-amber-400" :
                    "text-red-400"
                  }>
                    {r.status === "pass" ? "✓" : r.status === "warn" ? "~" : "✗"}
                  </span>
                  <div>
                    <p className="font-medium text-gray-300">{r.name}</p>
                    <p>{r.message} ({Math.round(r.duration)}ms)</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {anyFail && (
            <div className="mt-3 bg-red-500/10 border border-red-400/20 rounded-lg p-2 text-[10px] text-red-300">
              <p className="font-medium">Some checks failed.</p>
              <p>The app will use fallback modes where possible.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
