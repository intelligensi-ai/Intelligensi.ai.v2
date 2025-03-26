import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';
import Profile from './pages/Profile';

// Auth Context
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType>({ currentUser: null, loading: true });

// Auth Provider Component
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/" replace />;
};

// Auth Form Component
interface AuthFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLogin: boolean;
  error: string;
  loading: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSubmit, isLogin, error, loading }) => {
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
          disabled={loading}
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
          disabled={loading}
        />
      </div>
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      <div className="flex items-center justify-between">
        <button
          className={`bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full flex justify-center items-center ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            isLogin ? 'Sign In' : 'Register'
          )}
        </button>
      </div>
    </form>
  );
};

// Login Component
const Login: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/pages/profile');
    }
  }, [currentUser, navigate]);

  const handleAuth = async (email: string, password: string) => {
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
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
          case 'auth/too-many-requests':
            errorMessage = 'Too many attempts. Please try again later.';
            break;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-t from-teal-800 to-teal-900">
      <div className="text-center mb-8">
        <img
          src="logocutout.png"
          alt="Intelligensi AI Logo"
          className="mx-auto mb-4 h-24 w-24"
        />
        <h1 className="text-4xl text-white mb-2 font-bold">Intelligensi.ai</h1>
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
          loading={loading}
        />
        
        <div className="mt-4 text-center">
          <button
            className={`text-teal-700 hover:text-teal-900 text-sm font-medium ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => !loading && setIsRegistering(!isRegistering)}
            disabled={loading}
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

// Main App Component
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route 
            path="/pages/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;