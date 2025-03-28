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

const Profile: React.FC<Props> = ({ user }) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if user exists in Supabase and add if not
  const checkAndAddUser = async () => {
    if (!user.email) return;

    try {
      // 🔥 Check if user exists in Supabase
      const response = await axios.get(
        `http://localhost:5001/intelligensi-ai-v2/us-central1/fetchuser?email=${user.email}`
      );

      if (response.data.success && response.data.data) {
        console.log('User found:', response.data.data);
        setUserData(response.data.data);
      } else {
        console.log('User not found, adding to Supabase...');
        // 🛠️ Add user to Supabase if not found
        const addUserResponse = await axios.post(
          'http://localhost:5001/intelligensi-ai-v2/us-central1/updateuser',
          {
            uid: user.uid,
            display_name: user.displayName || 'Anonymous User',
            email: user.email,
            company_id: 'company-123', 
            is_active: true
          }
        );
        setUserData(addUserResponse.data.data);
        console.log('User added to Supabase:', addUserResponse.data.data);
      }
    } catch (err) {
      console.error('Error checking/adding user:', err);
      setError('Failed to fetch or add user.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkAndAddUser();
    }
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
              {userData?.display_name || 'Unknown User'}
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
              {userData && (
                <tr key={userData.id} className="border-b border-[#273238] hover:bg-[#273238] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{userData.display_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{userData.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{userData.company_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      userData.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {userData.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Profile;
