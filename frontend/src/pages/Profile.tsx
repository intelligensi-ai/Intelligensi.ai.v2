import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import axios from 'axios';

interface User {
  id: number;
  display_name: string;
  email: string;
  company_id: number;
  is_active: boolean;
  profile_pic: string;
}

const UsersPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [newPic, setNewPic] = useState<File | null>(null);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);

        // Fetch user data from Supabase
        try {
          const response = await axios.get(`http://localhost:5001/intelligensi-ai-v2/us-central1/fetchuser?email=${firebaseUser.email}`);
          setUser({
            ...response.data,
            profile_pic: firebaseUser.photoURL || '/default-profile.png',
          });
        } catch (error) {
          console.error('Failed to fetch user:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleEdit = () => setEditing(!editing);

  const handleSave = async () => {
    if (!user) return;

    try {
      await axios.put(`http://localhost:5001/intelligensi-ai-v2/us-central1/updateuser/${user.id}`, user);

      if (newPic) {
        const storage = getStorage();
        const picRef = ref(storage, `profile_pics/${firebaseUser?.uid}.jpg`);
        await uploadBytes(picRef, newPic);
        const downloadURL = await getDownloadURL(picRef);

        setUser((prev) => prev ? { ...prev, profile_pic: downloadURL } : null);
      }

      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewPic(e.target.files[0]);
    }
  };

  if (loading) return <div className="text-center text-white">Loading...</div>;
  if (!user) return <div className="text-center text-red-500">User not found</div>;

  return (
    <div className="min-h-screen bg-[#152125] text-white">
      <div className="container mx-auto px-4 py-8">
        
        {/* Profile Section */}
        <div className="bg-[#1E2B32] rounded-lg shadow-lg p-6 flex items-center">
          <label htmlFor="file-upload" className="cursor-pointer">
            <img 
              src={user.profile_pic} 
              alt="Profile" 
              className="h-24 w-24 rounded-full object-cover border-2 border-green-400"
            />
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>

          <div className="ml-6">
            {editing ? (
              <>
                <input 
                  type="text" 
                  value={user.display_name} 
                  onChange={(e) => setUser({ ...user, display_name: e.target.value })}
                  className="bg-gray-800 text-white px-3 py-1 rounded"
                />
                <input 
                  type="email" 
                  value={user.email} 
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className="bg-gray-800 text-white px-3 py-1 rounded mt-2"
                />
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold">{user.display_name}</h2>
                <p className="text-sm">{user.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Editable Info */}
        <div className="mt-6 p-4 bg-[#273238] rounded-lg shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm">Company ID: {user.company_id}</p>
              <p className={`text-sm ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>

            <div>
              {editing ? (
                <button 
                  className="bg-green-500 text-white px-4 py-2 rounded" 
                  onClick={handleSave}
                >
                  Save
                </button>
              ) : (
                <button 
                  className="bg-blue-500 text-white px-4 py-2 rounded" 
                  onClick={handleEdit}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
