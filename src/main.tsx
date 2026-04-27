import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TRPCProvider } from "@/providers/trpc";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SelfDiagnosticProvider } from "@/components/SelfDiagnosticProvider";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <SelfDiagnosticProvider>
        <TRPCProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </TRPCProvider>
      </SelfDiagnosticProvider>
    </ErrorBoundary>
  </StrictMode>
);
