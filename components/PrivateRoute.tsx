import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface PrivateRouteProps {
  allowedRoles?: ("user" | "admin")[];
}

const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
  const { auth } = useAuth();
  const user = auth.user;

  // No isLoading state in AuthContext, so no loading UI here

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role access if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
