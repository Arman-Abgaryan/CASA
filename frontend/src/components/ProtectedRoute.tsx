import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wrapper for routes that require the user to be signed in.
 * If the user is not logged in, they are redirected to /login.
 * The original location is passed via state so the login page
 * can optionally redirect back after a successful sign-in.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
