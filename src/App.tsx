import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Flashcards from "@/pages/Flashcards";
import Progress from "@/pages/Progress";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/flashcards"
          element={isAuthenticated ? <Flashcards /> : <Navigate to="/login" />}
        />
        <Route
          path="/progress"
          element={isAuthenticated ? <Progress /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </>
  );
}

export default App;