import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TRPCProvider } from "@/providers/trpc";
import { OnboardingProvider } from "@/components/Onboarding";
import { SelfHealingProvider } from "@/components/SelfHealingProvider";
import { AuthProvider } from "@/hooks/useAuth";
import App from "./App";
import "./index.css";

// Runtime Kimi/Agent pill detection & removal
(function hideAgentOverlays() {
  const AGENT_PATTERNS = [
    /kimi/i, /agent/i, /pill/i, /overlay/i, /bot$/i, /widget/i,
    /float/i, /chat-b/i, /assistant/i, /copilot/i,
  ];

  function killOverlay(el: Element) {
    const html = (el as HTMLElement);
    if (!html.style) return;
    html.style.setProperty("display", "none", "important");
    html.style.setProperty("visibility", "hidden", "important");
    html.style.setProperty("opacity", "0", "important");
    html.style.setProperty("pointer-events", "none", "important");
    html.style.setProperty("width", "0", "important");
    html.style.setProperty("height", "0", "important");
    html.style.setProperty("overflow", "hidden", "important");
    html.style.setProperty("z-index", "-9999", "important");
    html.style.setProperty("position", "fixed", "important");
    html.style.setProperty("top", "-9999px", "important");
    html.style.setProperty("left", "-9999px", "important");
  }

  function scanAndKill() {
    const all = document.querySelectorAll("*");
    all.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      // Only check fixed/absolute positioned elements that could be overlays
      if (tag === "script" || tag === "style") return;
      const style = window.getComputedStyle(el);
      if (style.position !== "fixed" && style.position !== "sticky") return;

      const cls = (el.className || "").toString().toLowerCase();
      const id = (el.id || "").toLowerCase();
      const text = (el.textContent || "").slice(0, 50).toLowerCase();

      for (const pat of AGENT_PATTERNS) {
        if (pat.test(cls) || pat.test(id) || pat.test(text)) {
          killOverlay(el);
          break;
        }
      }
    });
  }

  // Run immediately and keep scanning
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAndKill);
  } else {
    scanAndKill();
  }
  setInterval(scanAndKill, 2000);

  // Also watch for new elements being added
  const observer = new MutationObserver(() => scanAndKill());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

const rootElement = document.getElementById("root");

if (!rootElement) {
  const fallback = document.createElement("div");
  fallback.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;padding:20px;background:linear-gradient(135deg,#0f172a,#1a365d)">
      <div>
        <h1 style="color:#F97316;font-size:28px;margin-bottom:12px;">Anglotec AI</h1>
        <p style="color:#94a3b8;font-size:16px;">Something went wrong. Please refresh the page.</p>
        <button onclick="location.reload()" style="margin-top:20px;padding:14px 32px;background:#F97316;color:white;border:none;border-radius:12px;font-size:16px;cursor:pointer;font-weight:600;">
          Refresh Page
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(fallback);
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <TRPCProvider>
        <AuthProvider>
          <SelfHealingProvider>
            <OnboardingProvider>
              <App />
            </OnboardingProvider>
          </SelfHealingProvider>
        </AuthProvider>
      </TRPCProvider>
    </StrictMode>,
  );
}
