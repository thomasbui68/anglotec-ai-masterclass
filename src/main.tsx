import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TRPCProvider } from "@/providers/trpc";
import { OnboardingProvider } from "@/components/Onboarding";
import { SelfHealingProvider } from "@/components/SelfHealingProvider";
import { AuthProvider } from "@/hooks/useAuth";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
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
