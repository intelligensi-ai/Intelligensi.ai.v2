import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, User } from 'firebase/auth';
import axios from 'axios';

const Registration: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const auth = getAuth();

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser: User = userCredential.user;

      // Store in Supabase
      const { data } = await axios.post('http://localhost:5001/intelligensi-ai-v2/us-central1/updateuser', {
        uid: firebaseUser.uid,
        displayName: name,    // ✅ camelCase here
        email: firebaseUser.email,
        companyId: null, 
        profilePicture: '', 
        isActive: true
      });

      console.log('User added to Supabase:', data);

      // ✅ Only navigate if user is successfully added
      if (data.success) {
        navigate('/profile');
      } else {
        setError('Failed to add user to Supabase');
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to register user.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Register</h2>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        {error && <p className="text-red-500">{error}</p>}

        <button
          onClick={handleRegister}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded"
        >
          Register
        </button>

        <div className="mt-4 text-center">
          <button
            className="text-teal-700 hover:text-teal-900 text-sm"
            onClick={() => navigate('/')}
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Registration;
