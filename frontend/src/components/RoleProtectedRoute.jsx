// src/components/RoleProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const RoleProtectedRoute = ({ children, allowedRole }) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role")?.toLowerCase(); // store as lowercase

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (role !== allowedRole.toLowerCase()) {
    // Redirect based on actual role
    return <Navigate to={role === "doctor" ? "/doctor" : "/patient"} replace />;
  }

  return children;
};

export default RoleProtectedRoute;
