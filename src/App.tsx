import { createHashRouter, RouterProvider, Navigate } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/components/Onboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Flashcards from "@/pages/Flashcards";
import ForgotPassword from "@/pages/ForgotPassword";
import Settings from "@/pages/Settings";
import Progress from "@/pages/Progress";
import Help from "@/pages/Help";
import Pricing from "@/pages/Pricing";
import NotFound from "@/pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isReady } = useAuth();

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

  return <>{children}</>;
}

const router = createHashRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: "/flashcards",
    element: (
      <ProtectedRoute>
        <Flashcards />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/progress",
    element: (
      <ProtectedRoute>
        <Progress />
      </ProtectedRoute>
    ),
  },
  {
    path: "/help",
    element: <Help />,
  },
  {
    path: "/pricing",
    element: <Pricing />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default function App() {
  return (
    <ErrorBoundary>
      <OnboardingProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors closeButton />
      </OnboardingProvider>
    </ErrorBoundary>
  );
}
