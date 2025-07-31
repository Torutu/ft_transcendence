import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import validator from 'validator';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

import { setAuthToken } from '../utils/auth';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    password: '',
    form: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
    const googleBtnRef = useRef<HTMLDivElement>(null);


  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      password: '',
      form: '',
    };

    if (!formData.name.trim()) {
      newErrors.name = 'Username is required';
      isValid = false;
    } else if (!validator.isAlphanumeric(formData.name)) {
      newErrors.name = 'Only letters and numbers allowed';
      isValid = false;
    } else if (!validator.isLength(formData.name, { min: 3, max: 16 })) {
      newErrors.name = 'Must be 3-16 characters';
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validator.isLength(formData.password, { min: 6 })) {
      newErrors.password = 'Must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };


    const handleGoogleLogin = () => {
    // Implement your Google login logic here
    // This is just a placeholder
    console.log('Google login clicked');
    // Typically you would redirect to Google OAuth or use a popup
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        name: formData.name,
        password: formData.password,
      });
      console.log('Login response:', response.data);
      if (response.data.requires2FA) {
        // If 2FA is required, redirect to verification page
        console.log('2FA required, redirecting to verification page');
        if (response.data.totp_url) {
          // Store the TOTP URL in localStorage for later use
          localStorage.setItem('totp_url', response.data.totp_url);
        }
        
        navigate('/verify-2fa', {
          state: {
            userId: response.data.userId
          } 
        });
      } else {
        console.error('unexpected response format:', response.data);
        setErrors(prev => ({
          ...prev,
          form: 'Unexpected response from server'
        }));
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      setErrors(prev => ({
          ...prev,
          form: error.response?.data?.message || 'Login failed. Please try again.'
        }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
        form: ''
      }));
    }
  };

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    try {
      console.log('Google signin button callback response:', response);
      if (!response.credential) {
        setErrors(prev => ({
          ...prev,
          form: 'Google sign-in failed. Please try again.'
        }));
        return;
      }
      const res = await api.post('/auth/signin-with-google', {
        credential: response.credential,
      });
      console.log('/auth/signin-with-google response:', res.data);
      if (res.data.token) {
        setAuthToken(res.data.token);
        navigate('/tournament');
      } else {
        setErrors(prev => ({
          ...prev,
          form: res.data.message || 'Google sign-in failed',
        }));
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setErrors(prev => ({
          ...prev,
          form: 'An unexpected error occurred. Please try again.',
        })); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (window.google && googleBtnRef.current) {
      const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!client_id) {
        console.error('VITE_GOOGLE_CLIENT_ID is not set in environment variables');
        return;
      }
      window.google.accounts.id.initialize({
        client_id: client_id,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '380',
        locale: 'en'
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4" style={{
        backgroundImage: "url(/background/default-gray.jpg)",
        backgroundSize: "contain",
        backgroundPosition: "center",
      }}>


      {/* Image Section */}
        <div className="hidden md:block md:w-1/2 bg-gray-100">
          <img 
            src="/background/bg15.jpeg" // Replace with your image path
            alt="Login Visual"
            className="w-full h-full object-cover"
          />
        </div>

      {/* Form Section */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-1 text-gray-800">
          Welcome!
        </h1>
        <p className="text text-center mb-6 text-gray-400">Log in to your account</p>
        
        {errors.form && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Username"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 focus:caret-blue-500 text-gray-700 ${
                errors.name 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
              value={formData.name}
              onChange={handleChange}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 focus:caret-blue-500 text-gray-700 ${
                errors.password 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex justify-center items-center"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              'Log In'
            )}
          </button>
          <p className="text-center">
            <Link to="/reset-password" className="text-sm text-blue-600 hover:underline font-medium">
              Forgot Password?
            </Link>
          </p>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">
                Or
              </span>
            </div>
          </div>

                <div className="mt-6">
              <div className="flex items-center justify-center space-x-2">
                <div ref={googleBtnRef}></div>
              </div>
            </div>

          {/* <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full mt-6 flex justify-center items-center gap-2 py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="h-5 w-5"
            />
            Sign in with Google
          </button> */}
        </div>
        
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-base text-blue-600 hover:underline font-medium">
              Create New Account
            </Link>
          </p>

        </div>

      </div>
   
    </div>
  );
}