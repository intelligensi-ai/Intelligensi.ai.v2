import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, User } from 'firebase/auth';
import axios from 'axios';

interface AccountType {
  id: string;
  name: string;
  description: string;
  price: string;
  features: string[];
}

const accountTypes: AccountType[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individuals getting started',
    price: 'Free',
    features: ['1 Project', 'Basic Support', '1GB Storage']
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For growing businesses',
    price: '$29/month',
    features: ['5 Projects', 'Priority Support', '10GB Storage', 'API Access']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 'Custom',
    features: ['Unlimited Projects', '24/7 Support', 'Unlimited Storage', 'Dedicated Account Manager', 'Custom Integrations']
  }
];

const Registration: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  const auth = getAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser: User = userCredential.user;

      // Store in Supabase
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      if (!apiBaseUrl) {
        console.error("CRITICAL: REACT_APP_API_BASE_URL is not defined.");
        setError("Application configuration error: API endpoint is missing. User registration cannot complete.");
        setIsSubmitting(false);
        return;
      }
      
      const { data } = await axios.post(`${apiBaseUrl}/updateuser`, {
        uid: firebaseUser.uid,
        displayName: name,
        email: firebaseUser.email,
        companyId: null, 
        profilePicture: '', 
        isActive: true,
        accountType: selectedPlan
      });

      if (data.success) {
        navigate('/dashboard');
      } else {
        setError(data.error || 'Failed to add user to database');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Failed to register user. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      <div className="w-full max-w-5xl">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Choose Your Plan</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {accountTypes.map((plan) => (
            <div 
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`bg-[#2D3748] rounded-2xl p-6 cursor-pointer transition-all duration-300 border-2 ${
                selectedPlan === plan.id 
                  ? 'border-teal-500 transform scale-105 shadow-lg' 
                  : 'border-transparent hover:border-gray-500 hover:shadow-md'
              }`}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">
                    {plan.id === 'basic' ? '🚀' : plan.id === 'premium' ? '✨' : '🏢'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-teal-400 text-2xl font-bold my-2">{plan.price}</p>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                <ul className="text-left space-y-2 mt-4 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-300 text-sm">
                      <svg className="w-4 h-4 mr-2 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#2D3748] p-6 rounded-2xl shadow-xl w-full max-w-md mx-auto">
          <h3 className="text-xl font-bold text-white text-center mb-6">Create Your Account</h3>
          
          <div className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1A202C] text-white p-3 rounded-xl border border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1A202C] text-white p-3 rounded-xl border border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1A202C] text-white p-3 rounded-xl border border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 rounded-xl">
              {error}
            </div>
          )}
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
      <div className="flex justify-center space-x-4 mt-8">
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