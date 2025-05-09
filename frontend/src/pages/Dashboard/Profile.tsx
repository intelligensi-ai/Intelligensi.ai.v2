import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../components/Config/firebaseConfig';

interface User {
  display_name: string;
  id: number;
  uid: string;
  email: string;
  company_id: number;
  profile_picture: string;
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
  
  // Retry mechanism settings
  const maxRetries = 5;
  const retryInterval = 1000; // 1 second

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchUserWithRetry = async (retries = 0) => {
    if (!user.email) return;

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
        setError("Application configuration error: API endpoint is missing.");
        setLoading(false);
        return;
      }
      const response = await axios.get(
        `${apiBaseUrl}/fetchuser?email=${user.email}`
      );

      if (response.data.success && response.data.data) {
        console.log('User found:', response.data.data);
        setUserData(response.data.data);
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      if (retries < maxRetries) {
        console.log(`Retrying fetch user... (${retries + 1}/${maxRetries})`);
        setTimeout(() => fetchUserWithRetry(retries + 1), retryInterval);
      } else {
        console.error('Failed to fetch user:', err);
        setError('Failed to fetch user after multiple retries.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserWithRetry();
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
                {/* <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Company ID</th> */}
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {userData && (
                <tr key={userData.id} className="border-b border-[#273238] hover:bg-[#273238] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{userData.display_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{userData.email}</td>
                  {/* <td className="px-6 py-4 whitespace-nowrap">{userData.company_id}</td> to be done */}
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