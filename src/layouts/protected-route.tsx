import { Navigate, Outlet, useLocation } from "react-router";
import { AccessDenied } from "../pages/access-denied";
import { useAuth } from "../hooks/use-auth";

interface ProtectedRouteProps {
  /** Com "admin", só administradores passam; os demais logados veem "Acesso restrito". */
  role?: "admin";
}

export function ProtectedRoute({ role }: ProtectedRouteProps = {}) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role === "admin" && !isAdmin) return <AccessDenied />;
  return <Outlet />;
}
