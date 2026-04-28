import { createRoot } from "react-dom/client";
import { TRPCProvider } from "@/providers/trpc";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./i18n"; // Initialize i18n
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <TRPCProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </TRPCProvider>
  </ErrorBoundary>
);
