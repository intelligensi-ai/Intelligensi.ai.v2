import React, { useState, FormEvent } from 'react';
import { getAuth, signInWithEmailAndPassword, UserCredential } from 'firebase/auth'; // Firebase Auth
import { app } from '../Config/firebaseConfig';
import { useNavigate } from 'react-router-dom'; // For navigation

const Auth: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>(''); // State for error messages
  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    const auth = getAuth(app); // Get Firebase Auth instance

    try {
      // Sign in with Firebase
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      console.log('Logged in user:', user); // Debugging

      // Store login state in localStorage
      localStorage.setItem('isLoggedIn', 'true');

      // Redirect to the dashboard after successful login
      navigate('/dashboard');
    } catch (err: any) {
      // Handle errors
      const errorMessage = err.message || 'An error occurred during login';
      setError(errorMessage);
      console.error('Login Error:', err);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-80">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}{' '}
      {/* Display error message */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-teal-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          Sign In
        </button>
      </form>
      {/* Registration Button */}
      <div className="mt-4 text-center">
        <p className="text-sm">Don't have an account?</p>
        <button
          className="mt-2 text-teal-500 hover:underline"
          onClick={() => navigate('/register')}
        >
          Register Here
        </button>
      </div>
    </div>
  );
};

export default Auth;