import { HashRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/components/Onboarding";
import StorageWarning from "@/components/StorageWarning";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Flashcards from "@/pages/Flashcards";
import ProgressPage from "@/pages/Progress";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import NotFound from "@/pages/NotFound";

function AppRoutes() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StorageWarning />
      <Toaster position="top-center" richColors closeButton duration={5000} />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/" replace />} />
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/flashcards" element={isAuthenticated ? <Flashcards /> : <Navigate to="/login" replace />} />
        <Route path="/progress" element={isAuthenticated ? <ProgressPage /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />} />
        <Route path="/help" element={isAuthenticated ? <Help /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <OnboardingProvider>
          <AppRoutes />
        </OnboardingProvider>
      </HashRouter>
    </AuthProvider>
  );
}
