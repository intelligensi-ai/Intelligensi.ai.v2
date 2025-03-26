import React from 'react';
import { auth } from '../firebase';
import { useAuth } from '../Context/AuthContext';

const LogoutButton: React.FC = () => {
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return currentUser ? (
    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
    >
      Logout
    </button>
  ) : null;
};

export default LogoutButton;