import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { auth } from '../firebase';
import axios from 'axios';

interface User {
  display_name: string;
  id: number;
  uid: string;
  email: string;
  company_id: number;
  is_active: boolean;
}

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!currentUser) return;
        
        // Get the Firebase ID token
        const token = await currentUser.getIdToken();
        
        const response = await axios.get(
          'https://us-central1-intelligensi-ai-v2.cloudfunctions.net/fetchusers',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        setUsers(response.data.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch users. Please try again.');
        setLoading(false);
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#152125] flex items-center justify-center text-red-500">
        Please sign in to view this page
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#152125] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
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
          <img 
            src="/logocutout.png" 
            alt="Intelligensi.ai Logo" 
            className="h-24 w-24 mr-4"
          />
          <div className="flex items-center space-x-4">
            <div>
              <p className="text-teal-400">Logged in as: {currentUser.email}</p>
              <button 
                onClick={() => auth.signOut()}
                className="text-sm text-red-400 hover:text-red-300 mt-1"
              >
                Sign Out
              </button>
            </div>
          </div>
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
                    <span 
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
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

export default Profile;