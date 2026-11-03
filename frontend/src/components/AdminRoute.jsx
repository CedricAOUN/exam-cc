import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
/** Route guard: renders children for admins only; others are redirected to /. */
const AdminRoute = ({ children }) => {
  const { user, loading, error } = useAuth();
  if (loading) return <p>Chargement...</p>;
  if (error) return <p role="alert">{error}</p>;
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
};
export default AdminRoute;
