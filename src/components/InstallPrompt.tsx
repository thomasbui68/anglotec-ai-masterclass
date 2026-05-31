import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, X, Smartphone, Share, ArrowUpFromLine, Apple, Monitor } from "lucide-react";
import { useTranslation } from "@/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "windows" | "macos" | "desktop" | "unknown";

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/macintosh|mac os x/.test(ua)) return "macos";
  if (/windows/.test(ua)) return "windows";
  if (/win64|win32/.test(ua)) return "windows";
  return "desktop";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform] = useState<Platform>(detectPlatform());

  // Capture Chrome/Edge install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 3 seconds of engagement
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // iOS Safari: show after 5 seconds
  useEffect(() => {
    if (platform === "ios" && !isStandalone()) {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [platform]);

  const dismiss = useCallback(() => {
    setShow(false);
    // Remember dismissal for 24 hours
    try {
      localStorage.setItem("anglotec_install_dismissed", Date.now().toString());
    } catch { /* */ }
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Chrome/Edge native install
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success(t("installPrompt.installedToast"), {
          icon: <Download size={16} />,
          duration: 5000,
        });
      }
      setDeferredPrompt(null);
      setShow(false);
    } else if (platform === "ios") {
      // iOS Safari - show instructions
      toast.info(
        <div className="space-y-2">
          <p className="font-bold">{t("installPrompt.addToHomeScreen")}</p>
          <ol className="text-xs space-y-1 list-decimal pl-4">
            <li>{t("installPrompt.iosStep1")}</li>
            <li>{t("installPrompt.iosStep2")}</li>
            <li>{t("installPrompt.iosStep3")}</li>
          </ol>
        </div>,
        { duration: 10000, icon: <Share size={16} /> }
      );
      setShow(false);
    } else if (platform === "android") {
      // Android browser manual instructions
      toast.info(
        <div className="space-y-2">
          <p className="font-bold">{t("installPrompt.addToHomeScreen")}</p>
          <ol className="text-xs space-y-1 list-decimal pl-4">
            <li>{t("installPrompt.androidStep1")}</li>
            <li>{t("installPrompt.androidStep2")}</li>
          </ol>
        </div>,
        { duration: 10000, icon: <Smartphone size={16} /> }
      );
      setShow(false);
    }
  }, [deferredPrompt, platform, t]);

  // Don't show if already installed
  if (!show || isStandalone()) return null;

  // Don't show if dismissed recently
  try {
    const dismissed = localStorage.getItem("anglotec_install_dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) return null;
  } catch { /* */ }

  const descriptionKey = platform === "ios" ? "installPrompt.description_ios" : platform === "android" ? "installPrompt.description_android" : "installPrompt.description_desktop";

  return (
    <div className="fixed bottom-16 left-4 right-4 z-[80] max-w-md mx-auto">
      <Card className="bg-[#1a2332] border-orange-400/30 shadow-2xl">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shrink-0">
            <Download size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-white">{t("installPrompt.title")}</p>
              {platform === "ios" && <Apple size={14} className="text-gray-400" />}
              {platform === "android" && <Smartphone size={14} className="text-gray-400" />}
              {platform === "windows" && <Monitor size={14} className="text-gray-400" />}
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {t(descriptionKey)}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
              >
                <Download size={14} className="mr-1" />
                {deferredPrompt ? t("installPrompt.installNow") : t("installPrompt.howToInstall")}
              </Button>
              <Button
                onClick={dismiss}
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-gray-500 hover:text-white"
              >
                <X size={14} className="mr-1" /> {t("installPrompt.notNow")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple standalone badge that shows when installed
export function StandaloneBadge() {
  const { t } = useTranslation();
  if (!isStandalone()) return null;
  return (
    <div className="fixed top-1 left-1 z-[90] bg-green-500/20 border border-green-400/30 rounded-full px-2 py-0.5 flex items-center gap-1">
      <ArrowUpFromLine size={10} className="text-green-400" />
      <span className="text-[10px] text-green-300 font-medium">{t("installPrompt.appMode")}</span>
    </div>
  );
}
