import { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";
import { Volume2, Volume1, AlertTriangle, CheckCircle } from "lucide-react";
import i18n from "@/i18n";

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

const FAIL_THRESHOLD = 3;
const PREMIUM_SOURCES = ["browser", "neural"];

export function SelfDegradingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DegradeState>({
    voiceMode: "premium",
    apiErrors: 0,
    lastFail: null,
  });

  const reportApiFail = useCallback((source: string) => {
    setState((s) => {
      const newErrors = s.apiErrors + 1;
      
      if (PREMIUM_SOURCES.includes(source) && s.voiceMode === "premium" && newErrors >= FAIL_THRESHOLD) {
        toast.warning(
          <div className="flex items-start gap-2">
            <Volume1 size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium">{i18n.t("system.premiumVoiceUnavailable")}</p>
              <p className="text-gray-400">{i18n.t("system.switchedToBrowserVoice")}</p>
            </div>
          </div>,
          { duration: 6000, id: "voice-degraded" }
        );
        return { ...s, apiErrors: newErrors, lastFail: source, voiceMode: "browser" };
      }

      if (source === "browser" && s.voiceMode === "browser" && newErrors >= FAIL_THRESHOLD * 2) {
        toast.error(i18n.t("system.voicePlaybackUnavailable"), {
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
      if (PREMIUM_SOURCES.includes(source) && s.voiceMode === "browser" && s.apiErrors > 0) {
        if (s.apiErrors <= 1) {
          toast.success(i18n.t("system.premiumVoiceRestored"), { icon: <CheckCircle size={14} />, duration: 3000, id: "voice-restored" });
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
      {state.voiceMode !== "premium" && (
        <div className="fixed bottom-12 left-2 z-[80] bg-white/10 backdrop-blur border border-white/20 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <Volume2 size={10} className={state.voiceMode === "browser" ? "text-amber-400" : "text-red-400"} />
          {state.voiceMode === "browser" ? i18n.t("system.browserVoice") : i18n.t("system.textOnly")}
        </div>
      )}
    </Context.Provider>
  );
}

export function useSelfDegrading() {
  return useContext(Context);
}
