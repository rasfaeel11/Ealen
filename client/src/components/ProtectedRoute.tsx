import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useGameSession } from "../hooks/useGameSession";

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { mode, loading } = useGameSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-codex-bg font-cinzel text-sm tracking-wide text-codex-inkDim">
        Carregando...
      </div>
    );
  }

  if (!mode) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
