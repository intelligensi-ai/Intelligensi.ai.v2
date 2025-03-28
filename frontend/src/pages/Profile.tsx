import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../components/Config/firebaseConfig';

interface User {
  display_name: string;
  id: number;
  uid: string;
  email: string;
  company_id: number;
  is_active: boolean;
}

interface Props {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
}

const UsersPage: React.FC<Props> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Navigate back to the login page
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // POST Request to write user data to Supabase
  const addUserToSupabase = async () => {
    try {
      await axios.post('http://localhost:5001/intelligensi-ai-v2/us-central1/updateuser', {
        uid: user.uid,
        display_name: user.displayName || 'Anonymous User',
        email: user.email || 'no-email@example.com',
        company_id: 'company-123', 
        is_active: true
      });
      console.log('User added to Supabase');
    } catch (err) {
      console.error('Failed to add user:', err);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5001/intelligensi-ai-v2/us-central1/fetchusers');
        setUsers(response.data.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch users');
        setLoading(false);
      }
    };

    // Only write user once on initial load
    if (user) {
      addUserToSupabase();
    }

    fetchUsers();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#152125] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#152125] flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#152125] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <img src="/logocutout.png" alt="Intelligensi.ai Logo" className="h-24 w-24 mr-4" />
            <h1 className="text-3xl font-bold">
              {user.displayName || 'Unknown User'}
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="bg-[#1E2B32] rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#273238]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Company ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#273238] hover:bg-[#273238] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{user.display_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.company_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;