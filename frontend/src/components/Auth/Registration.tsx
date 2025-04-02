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
        displayName: name,
        email: firebaseUser.email,
        companyId: null, 
        profilePicture: '', 
        isActive: true
      });

      if (data.success) {
        navigate('/profile');
      } else {
        setError('Failed to add user to database');
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to register user. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#1A202C] flex flex-col items-center justify-center p-4">
      {/* Logo at the very top */}
      <div className="mb-2">
        <img 
          src="/logocutout.png" 
          alt="Intelligensi Logo" 
          className="h-16 w-16 mx-auto"
        />
      </div>

      {/* Header Section */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-light text-white mb-1">Intelligensi.ai</h1>
        <p className="text-gray-300 text-lg">
          Smarter Content. Stronger Connections.
        </p>
        <p className="text-gray-400 mt-1 text-sm">
          Join our AI-powered platform today
        </p>
      </div>

      {/* Registration Card with curved design */}
      <div className="bg-[#2D3748] p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1A202C] text-white p-3 rounded-xl border border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            />
          </div>

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
              placeholder="Create a password"
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
            onClick={handleRegister}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-md mt-2"
          >
            Create Account
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-teal-400 hover:text-teal-300 font-medium transition"
            >
              Login Here
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
      <div className="mt-12 text-center text-gray-500 text-sm space-y-1">
        <p>Intelligensi AI - Cloud Firestore</p>
        <p>Intelligensi AI – Authentication</p>
      </div>
    </div>
  );
};

export default Registration;