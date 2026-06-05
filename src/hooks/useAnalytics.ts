import { useEffect } from "react";
import { useLocation } from "react-router";

const GA_ID = import.meta.env.VITE_GA_ID;

function gtag(...args: any[]) {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push(args);
}

export function usePageTracking() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return;
    if (typeof window === "undefined") return;

    // Send page_view event to GA4
    gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (!GA_ID || GA_ID === "G-XXXXXXXXXX") return;
  gtag("event", eventName, params);
}

// Pre-defined events for the app
export function trackLogin(method: string) {
  trackEvent("login", { method });
}

export function trackSignUp(method: string) {
  trackEvent("sign_up", { method });
}

export function trackPurchase(tier: string, value: number) {
  trackEvent("purchase", {
    transaction_id: Date.now().toString(),
    value,
    currency: "GBP",
    items: [{ item_name: tier }],
  });
}

export function trackFlashcardAction(action: "known" | "practice" | "skip", category: string) {
  trackEvent("flashcard_action", { action, category });
}

export function trackVoicePlay(voiceType: string) {
  trackEvent("voice_play", { voice_type: voiceType });
}

export function trackLanguageChange(language: string) {
  trackEvent("language_change", { language });
}
