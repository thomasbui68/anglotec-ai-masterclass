import { useState, useCallback } from "react";
import { toast } from "sonner";
import { MessageSquare, X, Send, Bug, Wifi, WifiOff, Clock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

export function SelfReporting() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const collectDiagnostics = useCallback(() => {
    const diagnostics = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      language: navigator.language,
      memory: (performance as any).memory
        ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB`
        : "unknown",
      timestamp: new Date().toISOString(),
      localStorageKeys: Object.keys(localStorage).filter(k => !k.includes("credential") && !k.includes("password")),
      errors: (window as any).__anglotec_errors || [],
      voiceError: JSON.parse(localStorage.getItem("__last_voice_error__") || "null"),
    };
    return diagnostics;
  }, []);

  const sendReport = useCallback(() => {
    const diagnostics = collectDiagnostics();
    console.log("[BUG REPORT]", { message, diagnostics });
    try {
      const reports = JSON.parse(localStorage.getItem("__bug_reports__") || "[]");
      reports.push({ message, diagnostics, date: Date.now() });
      localStorage.setItem("__bug_reports__", JSON.stringify(reports.slice(-20)));
    } catch {
      // ignore
    }

    setSent(true);
    toast.success(t("system.reportSent"), {
      icon: <Send size={14} />,
      duration: 4000,
    });
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setMessage("");
    }, 2000);
  }, [message, collectDiagnostics, t]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-2 left-2 z-[90] w-8 h-8 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition-all hover:scale-110 flex items-center justify-center"
          title={t("settings.reportBug")}
        >
          <MessageSquare size={14} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-12 left-2 z-[90] bg-[#1a2332] border border-white/10 rounded-xl p-4 shadow-2xl w-80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Bug size={14} className="text-orange-400" />
              {t("settings.reportBug")}
            </h4>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Send size={16} className="text-green-400" />
              </div>
              <p className="text-sm text-green-400 font-medium">{t("system.reportSent")}</p>
              <p className="text-xs text-gray-500 mt-1">{t("system.reportReview")}</p>
            </div>
          ) : (
            <>
              <div className="bg-white/5 rounded-lg p-2.5 mb-3 space-y-1 text-[10px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  {navigator.onLine ? <Wifi size={10} className="text-green-400" /> : <WifiOff size={10} className="text-red-400" />}
                  {navigator.onLine ? t("common.online") : t("common.offline")}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={10} /> {new Date().toLocaleTimeString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Smartphone size={10} /> {navigator.userAgent.includes("Mobile") ? t("common.mobile") : t("common.desktop")}
                </div>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("settings.bugPlaceholder")}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-gray-500 resize-none h-20 focus:outline-none focus:border-orange-400/50"
              />
              <Button
                onClick={sendReport}
                disabled={!message.trim()}
                className="w-full h-9 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold mt-2 disabled:opacity-40"
              >
                <Send size={12} className="mr-1.5" /> {t("settings.sendReport")}
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
