import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/AuthContext";

function AdminProtectedRoute() {
  const { isAuthenticated, user } = useAuth();

  const isAdmin = isAuthenticated && user?.role === "admin";

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;
