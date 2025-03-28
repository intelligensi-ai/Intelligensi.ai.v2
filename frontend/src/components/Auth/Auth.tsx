import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../Config/firebaseConfig';  // ✅ Use shared Firebase instance
import axios from 'axios';

const Auth: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  // 🔥 Handle user login with Supabase lookup
  const handleLogin = async () => {
    try {
      // 🔥 Check if user exists in Supabase
      const { data } = await axios.get(
        `http://localhost:5001/intelligensi-ai-v2/us-central1/fetchuser?email=${email}`
      );

      // Check if user exists and is active
      if (!data.success || !data.data.is_active) {
        setError('User not found or account is inactive.');
        return;
      }

      // ✅ Firebase login if Supabase user exists and is active
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/profile');

    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid credentials or account not found.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Login</h2>

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
          onClick={handleLogin}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded"
        >
          Login
        </button>

        <div className="mt-4 text-center">
          <button
            className="text-teal-700 hover:text-teal-900 text-sm"
            onClick={() => navigate('/register')}
          >
            Need an account? Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;