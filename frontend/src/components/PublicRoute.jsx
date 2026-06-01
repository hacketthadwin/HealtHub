import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("userToken");
  let isLoggedIn = false;
  let role = null;

  if (token) {
    try {
      const decoded = jwtDecode(token);
      // Check for token expiry, though usually handled by backend auth middleware
      const currentTime = Date.now() / 1000; // current time in seconds
      if (decoded.exp > currentTime) {
        isLoggedIn = true;
        role = decoded.role;
        // Optionally, store role in localStorage if you use it elsewhere often,
        // but deriving from token is more reliable for real-time checks.
        // localStorage.setItem("role", role);
      } else {
        // Token expired
        console.log("Token expired.");
        localStorage.removeItem("userToken");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role"); // Clear any stale role
      }
    } catch (err) {
      console.error("Invalid token:", err);
      // Clear invalid token data
      localStorage.removeItem("userToken");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("role");
    }
  }

  if (isLoggedIn) {
    if (role === "Doctor") {
      console.log("Logged in as Doctor, navigating to /doctor");
      return <Navigate to="/doctor" replace />;
    }
    if (role === "Patient") {
      console.log("Logged in as Patient, navigating to /patient");
      return <Navigate to="/patient" replace />;
    }
    // Fallback if logged in but role is not Doctor or Patient, or is null
    console.log("Logged in with unhandled role or no role, navigating to /");
    return <Navigate to="/" replace />;
  }

  // If not logged in, render the children (Login/Signup page)
  console.log("Not logged in, rendering public route children.");
  return children;
};

export default PublicRoute;