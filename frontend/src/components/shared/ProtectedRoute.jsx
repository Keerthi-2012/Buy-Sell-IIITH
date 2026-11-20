import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Pages that need a logged-in user. Anonymous visitors are sent to /login.
const ProtectedRoute = () => {
  const { user, checkingSession } = useSelector((state) => state.auth);
  const location = useLocation();

  if (checkingSession && user) return <p style={{ padding: '2rem' }}>Loading...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
};

export default ProtectedRoute;
