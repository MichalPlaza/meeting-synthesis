import { useAuth } from '@/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';


function ProtectedRoute() {
  
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;