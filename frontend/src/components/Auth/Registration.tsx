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
    price: '$1/month',
    features: ['1 Site', '1 Migration', 'Basic Support', ]
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For growing organisations',
    price: '$29/month',
    features: ['10 Sites', '5 migrations', 'Priority Support', 'API Access']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 'Custom',
    features: ['20 Sites', '10 migrations', '24/7 Support', 'Enterprise Private Cloud', 'Custom Integrations', ]
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
    <div className="min-h-screen relative overflow-hidden bg-[#0F172A] flex flex-col items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <img 
          src="/images/tech-bg.jpg" 
          alt="Background" 
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/70 via-[#0F172A]/80 to-[#0F172A]/90" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl">
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
             Lets build smarter, faster, together.
          </p>
          <p className="text-gray-400 mt-1 text-sm">
            Join our AI-powered platform today
          </p>
        </div>

        {/* Registration Card with curved design */}
        <div className="w-full max-w-8xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-4 text-center">Choose Your Plan</h2>
          
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
                  <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-1 p-2">
                    <img 
                      src={`/images/plans/${plan.id}.png`} 
                      alt={`${plan.name} plan`}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'text-2xl';
                        fallback.textContent = 
                          plan.id === 'basic' ? '🚀' : 
                          plan.id === 'premium' ? '✨' : '🏢';
                        target.parentNode?.insertBefore(fallback, target.nextSibling);
                      }}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-teal-400 text-2xl font-bold ">{plan.price}</p>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                  <ul className="text-left space-y-1 mt-4 ">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-300 text-sm">
                        <svg className="w-4 h- mr-2 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

          <div className="bg-[#1d242f5d] p-6 rounded-2xl shadow-xl  max-w-sm mx-auto">
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
              <div className="mt-4 p-3 bg-red-500/20 text-red-200 text-sm rounded-lg">
                {error}
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-teal-400 hover:text-teal-300 font-medium">
                Sign in
              </a>
            </p>
            <button className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-6 rounded-full transition shadow-md">
              Get Started
            </button>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-12 text-center text-gray-500 text-sm space-y-1">
          (c) 2025 intelligensi.ai. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Registration;