import { createRoot } from "react-dom/client";
import { TRPCProvider } from "@/providers/trpc";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SelfDiagnosticProvider } from "@/components/SelfDiagnosticProvider";
import { SelfProtectingProvider } from "@/components/SelfProtectingProvider";
import { SelfTestingProvider } from "@/components/SelfTestingProvider";
import { SelfCleaningProvider } from "@/components/SelfCleaningProvider";
import { SelfResilientProvider } from "@/components/SelfResilientProvider";
import { SelfSavingProvider } from "@/components/SelfSavingProvider";
import { SelfDegradingProvider } from "@/components/SelfDegradingProvider";
import "./i18n"; // Initialize i18n
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <SelfTestingProvider>
      <SelfDiagnosticProvider>
        <SelfProtectingProvider>
          <SelfCleaningProvider>
            <SelfResilientProvider>
              <TRPCProvider>
                <AuthProvider>
                  <SelfSavingProvider>
                    <SelfDegradingProvider>
                      <App />
                    </SelfDegradingProvider>
                  </SelfSavingProvider>
                </AuthProvider>
              </TRPCProvider>
            </SelfResilientProvider>
          </SelfCleaningProvider>
        </SelfProtectingProvider>
      </SelfDiagnosticProvider>
    </SelfTestingProvider>
  </ErrorBoundary>
);
