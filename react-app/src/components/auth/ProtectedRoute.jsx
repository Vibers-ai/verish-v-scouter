import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import LoadingIndicator from '../common/LoadingIndicator';
import { isDevelopment } from '../../config/mockUsers';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Skip auth check in development
  if (isDevelopment()) {
    return children;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to unauthorized page
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;