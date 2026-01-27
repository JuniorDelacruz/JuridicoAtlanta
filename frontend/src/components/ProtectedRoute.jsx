// frontend/src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const normalize = (v) => String(v || "").trim().toLowerCase();

const canAccess = (user, { allowedRoles = [], allowedSubRoles = [] }) => {
  const role = normalize(user?.role);
  const sub  = normalize(user?.subRole);

  const okRole =
    allowedRoles.length === 0 || allowedRoles.map(normalize).includes(role);

  const okSub =
    allowedSubRoles.length === 0 || allowedSubRoles.map(normalize).includes(sub);

  // Regra que você pediu: se role não liberou mas subRole liberou, entra.
  if (allowedRoles.length && allowedSubRoles.length) return okRole || okSub;
  if (allowedRoles.length) return okRole;
  if (allowedSubRoles.length) return okSub;
  return true;
};

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  allowedSubRoles = [],
  redirectTo = "/login",
  deniedTo = "/", // <- para quando não tem permissão (evita loop)
}) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (!canAccess(user, { allowedRoles, allowedSubRoles })) {
    // evita loop: se já estiver indo pro mesmo lugar, manda pro deniedTo
    const target = location.pathname === deniedTo ? "/" : deniedTo;
    return <Navigate to={target} replace />;
  }

  return children;
}