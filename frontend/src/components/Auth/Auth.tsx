import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import axios from 'axios';
import { toast } from 'react-toastify';

interface AuthProps {
  isRegister?: boolean;
}

const Auth: React.FC<AuthProps> = ({ isRegister = false }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    
    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }
      
      if (!name.trim()) {
        setError('Name is required');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isRegister) {
        await handleRegister();
      } else {
        await handleLogin();
      }
    } catch (err) {
      console.error(isRegister ? 'Registration error:' : 'Login error:', err);
      setError(
        isRegister 
          ? 'Failed to create account. Please try again.'
          : 'Invalid credentials. Please check your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogin = async () => {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
    if (!apiBaseUrl) {
      console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
      setError("Application configuration error: API endpoint is missing. Please contact support.");
      return;
    }
    
    try {
      const { data } = await axios.get(
        `${apiBaseUrl}/fetchuser?email=${email}`
      );

      if (!data.success || !data.data?.is_active) {
        setError('User not found or account is inactive.');
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };
  
  const handleRegister = async () => {
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
    if (!apiBaseUrl) {
      console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
      setError("Application configuration error: API endpoint is missing. Please contact support.");
      return;
    }
    
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user in your database
      await axios.post(`${apiBaseUrl}/updateuser`, {
        id: user.uid,
        email,
        name,
        is_active: true
      });
      
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      throw err;
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

      {/* Logo */}
      <div className="mb-8 text-center relative z-10">
        <img 
          src="/logocutout.png" 
          alt="Intelligensi Logo" 
          className="h-32 w-auto mx-auto mb-4"
        />
        <h1 className="text-4xl font-light text-white mb-1">Intelligensi.ai</h1>
        <p className="text-gray-300 text-lg">
          Let&apos;s build smarter, faster, together.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/10 relative z-10">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isRegister ? 'Create an Account' : 'Welcome Back'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {isRegister && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRegister ? 'Creating Account...' : 'Signing In...'}
              </span>
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link 
              to={isRegister ? '/login' : '/register'} 
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-400 relative z-10">
        <p>© {new Date().getFullYear()} Intelligensi.ai. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Auth;