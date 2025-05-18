import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../Config/firebaseConfig';
import axios from 'axios';

const Auth: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
        setError("Application configuration error: API endpoint is missing. Please contact support.");
        return;
      }
      const { data } = await axios.get(
        `${apiBaseUrl}/fetchuser?email=${email}`
      );

      if (!data.success || !data.data.is_active) {
        setError('User not found or account is inactive.');
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      navigate('/profile');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid credentials or account not found.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <img 
          src="/images/tech-bg.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/90 via-[#0F172A]/80 to-[#0F172A]/90" />
      </div>

      {/* Logo at the very top */}
      <div className="mb-2 relative z-10">
        <img 
          src="/logocutout.png" 
          alt="Intelligensi Logo" 
          className="h-50 w-50 mx-auto"
        />
      </div>

      {/* Header Section */}
      <div className="text-center mb-6 relative z-10">
        <h1 className="text-4xl font-light text-white mb-1">Intelligensi.ai</h1>
        <p className="text-gray-300 text-lg">
        Let's build smarter, faster, together.
        </p>
        <p className="text-gray-400 mt-1 text-sm">
          {/* Let's build smarter, faster, together. */}
        </p>
      </div>

      {/* Login Card with curved design */}
      <div className="bg-[#1d242f5d] p-8 rounded-2xl shadow-xl w-full max-w-md relative z-10 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Login</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1A202C] text-white p-3 rounded-xl border border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1A202C] text-white p-3 rounded-xl border border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-md"
          >
            Sign in
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-teal-400 hover:text-teal-300 font-medium transition"
            >
              Register Here
            </button>
          </p>
        </div>
      </div>

      {/* Additional Links with pill-shaped buttons */}
      <div className="flex space-x-4 mt-8">
        <button className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-6 rounded-full transition shadow-md">
          Get Started
        </button>
        <button className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-6 rounded-full transition shadow-md">
          Documentation
        </button>
      </div>

      {/* Footer Branding */}
      <div className="mt-12 text-center text-gray-500 text-sm relative z-10">
        <p>© 2025 intelligensi.ai. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Auth;