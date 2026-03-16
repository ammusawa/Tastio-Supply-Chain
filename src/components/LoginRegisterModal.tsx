'use client';

import { useState } from 'react';
import { X, User, Lock, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCart } from '@/contexts/CartContext';

interface LoginRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginRegisterModal({ isOpen, onClose }: LoginRegisterModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { mergeGuestCart } = useCart();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
         try {
       // Create form data for OAuth2PasswordRequestForm
       const formData = new URLSearchParams();
       formData.append('username', loginEmail); // OAuth2PasswordRequestForm expects 'username'
       formData.append('password', loginPassword);
       
       const response = await fetch('http://localhost:8000/api/auth/login', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded',
         },
         body: formData,
       });

             if (response.ok) {
         const data = await response.json();
         localStorage.setItem('token', data.access_token);
         localStorage.setItem('user', JSON.stringify(data.user));
         
         // Set expiration time
         const expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 hours
         localStorage.setItem('tokenExpiresAt', expiresAt.toString());
         
         toast.success('Login successful!');
         mergeGuestCart(); // Merge guest cart with user cart
         onClose();
         
         // Dispatch auth change event to update navbar
         window.dispatchEvent(new Event('authChange'));
         
         // Redirect to checkout after successful login
         setTimeout(() => {
           router.push('/checkout');
         }, 1000);
       } else {
         try {
           const error = await response.json();
           let errorMessage = 'Login failed';
           
           if (typeof error === 'string') {
             errorMessage = error;
           } else if (error && typeof error === 'object') {
             if (error.detail) {
               errorMessage = error.detail;
             } else if (error.message) {
               errorMessage = error.message;
                      } else if (Array.isArray(error)) {
           errorMessage = error.map(e => e.msg || e.message || 'Validation error').join(', ');
         }
       }
       
       if (typeof errorMessage === 'string') {
         toast.error(errorMessage);
       } else {
         toast.error('Login failed. Please try again.');
       }
     } catch (parseError) {
       toast.error('Login failed. Please try again.');
     }
   }
     } catch (error) {
       console.error('Login error:', error);
       const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
       toast.error(errorMessage);
     } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPhone || !registerPassword || !registerConfirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
          role: 'customer',
        }),
      });

             if (response.ok) {
         const data = await response.json();
         localStorage.setItem('token', data.access_token);
         localStorage.setItem('user', JSON.stringify(data.user));
         
         // Set expiration time
         const expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 hours
         localStorage.setItem('tokenExpiresAt', expiresAt.toString());
         
         toast.success('Registration successful!');
         mergeGuestCart(); // Merge guest cart with user cart
         onClose();
         
         // Dispatch auth change event to update navbar
         window.dispatchEvent(new Event('authChange'));
         
         // Redirect to checkout after successful registration
         setTimeout(() => {
           router.push('/checkout');
         }, 1000);
       } else {
         try {
           const error = await response.json();
           let errorMessage = 'Registration failed';
           
           if (typeof error === 'string') {
             errorMessage = error;
           } else if (error && typeof error === 'object') {
             if (error.detail) {
               errorMessage = error.detail;
             } else if (error.message) {
               errorMessage = error.message;
                        } else if (Array.isArray(error)) {
             errorMessage = error.map(e => e.msg || e.message || 'Validation error').join(', ');
           }
         }
         
         if (typeof errorMessage === 'string') {
           toast.error(errorMessage);
         } else {
           toast.error('Registration failed. Please try again.');
         }
       } catch (parseError) {
         toast.error('Registration failed. Please try again.');
       }
     }
         } catch (error) {
       console.error('Registration error:', error);
       const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
       toast.error(errorMessage);
     } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLogin ? 'Login to Continue' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">
              {isLogin 
                ? 'Please login to complete your order and access your cart.'
                : 'Create an account to complete your order and save your preferences.'
              }
            </p>
            
            {/* Toggle between login and register */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  isLogin
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !isLogin
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {isLogin ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="loginEmail"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="registerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="registerName"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="registerEmail"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="registerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="registerPhone"
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="registerPassword"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Create a password"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="registerConfirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="registerConfirmPassword"
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
