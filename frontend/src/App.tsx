import React, { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './global.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';

// ✅ Import Firebase instance
import { auth } from './components/Config/firebaseConfig';

// ✅ Import Pages
import Auth from './components/Auth/Auth';
import Registration from './components/Auth/Registration';
import Profile from './pages/Dashboard/Profile';
import { Dashboard } from './pages/Dashboard/Dashboard'; 

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // ✅ Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <Routes>
        {/* ✅ Redirect to Dashboard if authenticated */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
        
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Registration />} />
        <Route path="/profile" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/" />} />

        {/* 🆕 Add the new Dashboard route */}
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />

        {/* 🌟 Catch-all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
