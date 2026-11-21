import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Gate for logged-in pages (adminOnly for admin ones); guests are sent to /login.
const ProtectedRoute = ({ adminOnly = false }) => {
  const { user, checkingSession } = useSelector((state) => state.auth);
  const location = useLocation();

  // Wait for the server's answer, so a valid cookie isn't bounced to /login even when the local cache is empty.
  if (checkingSession) return <p style={{ padding: '2rem' }}>Loading...</p>;
  // Remember where they were headed so Login can send them back.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Logged in but not an admin: nothing to see here.
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
