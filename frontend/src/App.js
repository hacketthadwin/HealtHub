import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Signup from './components/Signup';

import PrivateRoute from './components/PrivateRoute';
import DoctorPage from './components/DoctorPage';
import PatientPage from './components/PatientPage';
import PublicRoute from './components/PublicRoute';
import { AIResponseProvider } from './context/AIResponseContext';
import { TaskProgressProvider } from './context/TaskProgressContext';
import { ThemeProvider } from './context/ThemeContext';
import BookAppointments from './components/BookAppointments';
import CommuntiySupport from './components/CommuntiySupport';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import ContactUs1 from './components/mvpblocks/contact-us-1';
import CongestedPricing from './components/mvpblocks/congusted-pricing';
import AboutUs from './components/AboutUs';
function App() {
  return (
    <ThemeProvider>
    <AIResponseProvider>
    <TaskProgressProvider>
    <div className="bg-[#FAFDEE] text-[#1F3A4B] dark:bg-[#1F3A4B] dark:text-[#FAFDEE] h-screen w-screen transition-colors duration-300">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactUs1 />} />
        <Route path="/pricing" element={<CongestedPricing />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }/>
        <Route path="/signup"element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }/>
        <Route path="/patient" element={
          <RoleProtectedRoute allowedRole="patient">
            <PatientPage />
          </RoleProtectedRoute>
        } />
        <Route path="/doctor" element={
            <RoleProtectedRoute allowedRole="doctor">
               <DoctorPage />
            </RoleProtectedRoute>
        } />
        <Route path="/book-appointment" element={
          <PrivateRoute>
            <BookAppointments/>
          </PrivateRoute>
        } />
        <Route path="/community-support" element={
          <PrivateRoute>
            <CommuntiySupport/>
          </PrivateRoute>
        } />
      </Routes>
    </div>
    </TaskProgressProvider>
    </AIResponseProvider>
    </ThemeProvider>
  );
}

export default App;
