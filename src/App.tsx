import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/components/Onboarding";
import { OnboardingModal } from "@/components/Onboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Flashcards from "@/pages/Flashcards";
import ForgotPassword from "@/pages/ForgotPassword";
import Settings from "@/pages/Settings";
import Progress from "@/pages/Progress";
import Help from "@/pages/Help";
import NotFound from "@/pages/NotFound";

function AppRoutes() {
  const { isAuthenticated, isReady } = useAuth();
  const { hasSeenOnboarding, finishOnboarding } = useOnboarding();

  // Show loading screen while auth initializes
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-orange-500 mx-auto mb-6" />
          <p className="text-white text-lg font-medium">Loading your experience...</p>
          <p className="text-gray-500 text-xs mt-2">This will only take a moment</p>
        </div>
      </div>
    );
  }

  // Show onboarding for authenticated users who haven't seen it
  // This happens AFTER loading is complete, so no overlap
  const showOnboarding = isAuthenticated && !hasSeenOnboarding;

  return (
    <>
      {showOnboarding && <OnboardingModal onFinish={finishOnboarding} />}
      <Routes>
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/flashcards" element={isAuthenticated ? <Flashcards /> : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />} />
        <Route path="/progress" element={isAuthenticated ? <Progress /> : <Navigate to="/login" replace />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
      <Toaster position="top-center" richColors closeButton />
    </ErrorBoundary>
  );
}
