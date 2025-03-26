import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define User interface based on the function's response
interface User {
  display_name: string;
  id: number;
  uid: string;
  email: string;
  company_id: number;
  is_active: boolean;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

    fetchUsers();
  }, []);

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
        <div className="flex justify-between mb-8">
          <img 
            src="/logocutout.png" 
            alt="Intelligensi.ai Logo" 
            className="h-24 w-24  mr-4"
          />
          <h1 className="text-3xl font-bold">
            {users.map((user) => user.display_name).join(', ')}
          </h1>
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

export default UsersPage;