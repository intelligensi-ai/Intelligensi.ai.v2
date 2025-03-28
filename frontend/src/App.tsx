import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';

// ✅ Import the shared Firebase instance
import { auth } from './components/Config/firebaseConfig';

import Auth from './components/Auth/Auth';
import Registration from './components/Auth/Registration';
import Profile from './pages/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // ✅ Clean up the listener on unmount
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
      <Routes>
        <Route path="/" element={user ? <Navigate to="/profile" /> : <Auth />} />
        <Route path="/register" element={user ? <Navigate to="/profile" /> : <Registration />} />
        <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
