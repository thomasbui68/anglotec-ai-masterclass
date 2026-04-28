import { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";
import { Volume2, Volume1, AlertTriangle, CheckCircle } from "lucide-react";

interface DegradeState {
  voiceMode: "premium" | "browser" | "silent";
  apiErrors: number;
  lastFail: string | null;
}

interface DegradeContextType {
  voiceMode: DegradeState["voiceMode"];
  reportApiFail: (source: string) => void;
  reportApiSuccess: (source: string) => void;
  forceBrowserVoice: () => void;
  forcePremiumVoice: () => void;
}

const Context = createContext<DegradeContextType>({
  voiceMode: "premium",
  reportApiFail: () => {},
  reportApiSuccess: () => {},
  forceBrowserVoice: () => {},
  forcePremiumVoice: () => {},
});

const FAIL_THRESHOLD = 3; // degrade after 3 consecutive failures
const PREMIUM_SOURCES = ["elevenlabs", "openai", "azure"];

export function SelfDegradingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DegradeState>({
    voiceMode: "premium",
    apiErrors: 0,
    lastFail: null,
  });

  const reportApiFail = useCallback((source: string) => {
    setState((s) => {
      const newErrors = s.apiErrors + 1;
      
      // Auto-degrade voice after threshold
      if (PREMIUM_SOURCES.includes(source) && s.voiceMode === "premium" && newErrors >= FAIL_THRESHOLD) {
        toast.warning(
          <div className="flex items-start gap-2">
            <Volume1 size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium">Premium voice temporarily unavailable</p>
              <p className="text-gray-400">Switched to browser voice. We will try premium again shortly.</p>
            </div>
          </div>,
          { duration: 6000, id: "voice-degraded" }
        );
        return { ...s, apiErrors: newErrors, lastFail: source, voiceMode: "browser" };
      }

      // If browser also fails, go silent
      if (source === "browser" && s.voiceMode === "browser" && newErrors >= FAIL_THRESHOLD * 2) {
        toast.error("Voice playback unavailable. Text mode active.", {
          icon: <AlertTriangle size={14} />,
          duration: 4000,
        });
        return { ...s, apiErrors: newErrors, lastFail: source, voiceMode: "silent" };
      }

      return { ...s, apiErrors: newErrors, lastFail: source };
    });
  }, []);

  const reportApiSuccess = useCallback((source: string) => {
    setState((s) => {
      // If premium succeeds after degradation, attempt to re-upgrade
      if (PREMIUM_SOURCES.includes(source) && s.voiceMode === "browser" && s.apiErrors > 0) {
        // Require 2 consecutive successes before re-promoting
        if (s.apiErrors <= 1) {
          toast.success("Premium voice restored!", { icon: <CheckCircle size={14} />, duration: 3000, id: "voice-restored" });
          return { voiceMode: "premium", apiErrors: 0, lastFail: null };
        }
      }
      return { ...s, apiErrors: Math.max(0, s.apiErrors - 1) };
    });
  }, []);

  const forceBrowserVoice = useCallback(() => {
    setState({ voiceMode: "browser", apiErrors: 0, lastFail: null });
  }, []);

  const forcePremiumVoice = useCallback(() => {
    setState({ voiceMode: "premium", apiErrors: 0, lastFail: null });
  }, []);

  return (
    <Context.Provider value={{
      voiceMode: state.voiceMode,
      reportApiFail,
      reportApiSuccess,
      forceBrowserVoice,
      forcePremiumVoice,
    }}>
      {children}
      {/* Subtle voice mode indicator */}
      {state.voiceMode !== "premium" && (
        <div className="fixed bottom-12 left-2 z-[80] bg-white/10 backdrop-blur border border-white/20 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <Volume2 size={10} className={state.voiceMode === "browser" ? "text-amber-400" : "text-red-400"} />
          {state.voiceMode === "browser" ? "Browser voice" : "Text only"}
        </div>
      )}
    </Context.Provider>
  );
}

export function useSelfDegrading() {
  return useContext(Context);
}
