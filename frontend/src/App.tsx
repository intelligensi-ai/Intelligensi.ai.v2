import React, { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './global.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard/Dashboard';
import Auth from './components/Auth/Auth';
import { TestSupabasePage } from './pages/TestSupabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Test component to verify environment variables
const EnvTest = () => {
  useEffect(() => {
    console.log('Environment Variables Check:', {
      hasSupabaseUrl: !!process.env.REACT_APP_SUPABASE_URL,
      hasAnonKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY,
      // Don't log actual keys to console in production
      nodeEnv: process.env.NODE_ENV
    });
  }, []);

  return null; // This component doesn't render anything visible
};

// Wrapper component to handle authentication state
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/login" replace />;
};

// Public route that redirects if already authenticated
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
};

const App: React.FC = () => {
  // This will log environment variables to console on app load
  return (
    <>
      <EnvTest />
      <AuthProvider>
        <Router>
          <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Public routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Auth isRegister />
              </PublicRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/profile" element={
              <PrivateRoute>
                <div>Profile Page</div>
              </PrivateRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            {/* Test route - no auth required */}
            <Route path="/test-supabase" element={<TestSupabasePage />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </>
  );
};

export default App;
