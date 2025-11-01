import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/AuthContext";

function AdminProtectedRoute() {
  const { isAuthenticated, user } = useAuth();

  // Điều kiện: Phải đăng nhập VÀ có vai trò 'admin'
  const isAdmin = isAuthenticated && user?.role === "admin";

  if (!isAdmin) {
    // Nếu không phải admin, điều hướng về trang chính hoặc trang "Unauthorized"
    return <Navigate to="/" replace />;
  }

  // Nếu là admin, cho phép truy cập các route con
  return <Outlet />;
}

export default AdminProtectedRoute;
