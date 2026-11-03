import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
/** Route guard: renders children for signed-in users; others are redirected to /login. */
const ProtectedRoute = ({ children }) => {
  const { user, loading, error } = useAuth();
  if (loading) return <p>Chargement...</p>;
  if (error) return <p role="alert">{error}</p>;
  return user ? children : <Navigate to="/login" replace />;
};
export default ProtectedRoute;
