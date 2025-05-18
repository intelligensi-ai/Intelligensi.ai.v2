import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, User } from 'firebase/auth';
import axios from 'axios';
import { motion } from 'framer-motion';

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

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const gradientPosition = {
    background: `radial-gradient(
      circle at ${mousePosition.x}px ${mousePosition.y}px,
      rgba(16, 185, 129, 0.15) 0%,
      rgba(26, 32, 44, 0) 50%
    )`,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20" style={gradientPosition}></div>
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {/* Animated nodes */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-teal-400/20"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            width: Math.random() * 10 + 5,
            height: Math.random() * 10 + 5,
          }}
          animate={{
            y: [null, Math.random() * 50 - 25],
            x: [null, Math.random() * 50 - 25],
          }}
          transition={{
            duration: Math.random() * 10 + 5,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      ))}
      
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700/50"
        >
          {/* Logo and Header */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl transform rotate-45">
                <div className="absolute inset-1 bg-gradient-to-br from-teal-300 to-blue-400 rounded-xl transform -rotate-6">
                  <div className="absolute inset-1 bg-gradient-to-br from-teal-200 to-blue-300 rounded-lg transform rotate-3 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">I</span>
                  </div>
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-blue-400 mb-2">
              Intelligensi.ai
            </h1>
            <p className="text-teal-100 text-lg font-light mb-1">
              AI-Powered Content Intelligence
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-teal-400 to-blue-500 mx-auto rounded-full my-3"></div>
          </motion.div>

          {/* Plans Section */}
          <h2 className="text-3xl font-bold text-white mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-blue-400">
            Choose Your Plan
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {accountTypes.map((plan) => (
              <motion.div 
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-sm rounded-2xl p-6 cursor-pointer transition-all duration-300 border ${
                  selectedPlan === plan.id 
                    ? 'border-teal-400/50 transform scale-[1.02] shadow-2xl shadow-teal-500/20' 
                    : 'border-gray-700/50 hover:border-teal-400/30 hover:shadow-lg hover:shadow-teal-500/10'
                } relative overflow-hidden`}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                {selectedPlan === plan.id && (
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-blue-500/5"></div>
                )}
                <div className="relative z-10 text-center mb-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 p-4 border border-teal-400/20">
                    <span className="text-3xl">
                      {plan.id === 'basic' ? '🚀' : plan.id === 'premium' ? '✨' : '🏢'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-blue-400">
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-bold text-white my-3">
                    {plan.id === 'enterprise' ? (
                      <span className="text-2xl">Contact Us</span>
                    ) : (
                      <span>{plan.price}</span>
                    )}
                  </p>
                  <p className="text-gray-300 text-sm mb-4">{plan.description}</p>
                  <ul className="text-left space-y-3 mt-6 mb-6">
                    {plan.features.map((feature, index) => (
                      <motion.li 
                        key={index} 
                        className="flex items-center text-gray-200 text-sm group"
                        whileHover={{ x: 5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <div className="w-6 h-6 rounded-full bg-teal-500/10 flex-shrink-0 flex items-center justify-center mr-3 group-hover:bg-teal-500/20 transition-colors">
                          <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-300 group-hover:text-white transition-colors">
                          {feature}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 shadow-2xl w-full max-w-md mx-auto relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full animate-ping"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
            
            <h3 className="text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-blue-400">
              Create Your Account
            </h3>
            
            <div className="space-y-6 relative z-10">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-gray-300 text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-900/50 text-white p-3 rounded-xl border border-gray-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 outline-none transition backdrop-blur-sm"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label className="block text-gray-300 text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900/50 text-white p-3 rounded-xl border border-gray-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 outline-none transition backdrop-blur-sm"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <label className="block text-gray-300 text-sm font-medium mb-2">Password *</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900/50 text-white p-3 rounded-xl border border-gray-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 outline-none transition backdrop-blur-sm"
                />
              </motion.div>

              <motion.div 
                className="pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </motion.div>
            </div>

            {error && (
              <motion.div 
                className="text-red-400 text-sm py-2 px-3 bg-red-900/30 rounded-xl border border-red-500/30 backdrop-blur-sm mt-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {error}
              </motion.div>
            )}

            <motion.div 
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/')}
                  className="text-teal-300 hover:text-white font-medium transition-all hover:underline underline-offset-2"
                >
                  Sign In
                </button>
              </p>
            </motion.div>
          </motion.div>

          {/* Additional Links */}
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <button className="px-6 py-2 bg-gray-800/50 hover:bg-gray-700/70 text-gray-200 rounded-full border border-gray-700 hover:border-teal-400/50 transition-all text-sm font-medium backdrop-blur-sm">
              Explore Features
            </button>
            <button className="px-6 py-2 bg-gradient-to-r from-teal-500/10 to-blue-500/10 hover:from-teal-500/20 hover:to-blue-500/20 text-teal-300 rounded-full border border-teal-400/20 hover:border-teal-400/40 transition-all text-sm font-medium backdrop-blur-sm">
              View Documentation
            </button>
          </motion.div>

          {/* Footer */}
          <motion.div 
            className="mt-12 text-center text-gray-500 text-sm space-y-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <p>© {new Date().getFullYear()} Intelligensi AI. All rights reserved.</p>
            <div className="flex justify-center space-x-4 text-xs text-gray-600 mt-2">
              <a href="#" className="hover:text-teal-400 transition-colors">Terms</a>
              <span>•</span>
              <a href="#" className="hover:text-teal-400 transition-colors">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-teal-400 transition-colors">Security</a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Registration;
