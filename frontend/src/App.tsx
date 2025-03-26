import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';
import Profile from './pages/Profile';

interface AuthFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLogin: boolean;
  error: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSubmit, isLogin, error }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
          Email
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
          Password
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      <div className="flex items-center justify-between">
        <button
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          type="submit"
        >
          {isLogin ? 'Sign In' : 'Register'}
        </button>
      </div>
    </form>
  );
};

const Login: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleAuth = async (email: string, password: string) => {
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/pages/profile');
    } catch (err) {
      const error = err as { code?: string; message?: string };
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email already in use.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters.';
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Invalid email or password.';
            break;
        }
      }
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-t from-teal-800 to-teal-900">
      <div className="text-center mb-8">
        <img
          src="logocutout.png"
          alt="Intelligensi AI Logo"
          className="mx-auto mb-4"
        />
        <h1 className="text-4xl text-white mb-2">Intelligensi.ai</h1>
        <p className="text-lg text-white">
          Smarter Content. Stronger Connections.
        </p>
        <p className="text-sm text-white mt-2">
          Enhance search, automation, and retrieval with AI-driven optimization.
        </p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <AuthForm 
          onSubmit={handleAuth} 
          isLogin={!isRegistering} 
          error={error} 
        />
        
        <div className="mt-4 text-center">
          <button
            className="text-teal-700 hover:text-teal-900 text-sm font-medium"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering 
              ? 'Already have an account? Sign In' 
              : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/pages/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
};

export default App;