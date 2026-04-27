import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TRPCProvider } from "@/providers/trpc";
import { SelfHealingProvider } from "@/components/SelfHealingProvider";
import { AuthProvider } from "@/hooks/useAuth";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TRPCProvider>
      <AuthProvider>
        <SelfHealingProvider>
          <App />
        </SelfHealingProvider>
      </AuthProvider>
    </TRPCProvider>
  </StrictMode>,
);
