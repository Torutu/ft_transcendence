// frontend/src/pages/unauthorised/login.tsx
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import validator from 'validator';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);

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

  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: '', password: '', form: '' };

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        name: formData.name,
        password: formData.password,
      });
      
      if (response.data.requires2FA) {
        if (response.data.totp_url) {
          sessionStorage.setItem('totp_url', response.data.totp_url);
        }
        
        navigate('/verify-2fa', {
          state: {
            userId: response.data.userId,
            totp_url: response.data.totp_url
          } 
        });
      } else {
        setErrors(prev => ({
          ...prev,
          form: 'Unexpected response from server'
        }));
      }
    } catch (error: any) {
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
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '', form: '' }));
    }
  };

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/signin-with-google', {
        credential: response.credential,
      });
      
      if (res.data.user) {
        login(res.data.user);
        navigate('/tournament');
      } else {
        setErrors(prev => ({
          ...prev,
          form: 'Google sign-in failed',
        }));
      }
    } catch (error: any) {
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
        console.error('VITE_GOOGLE_CLIENT_ID is not set');
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
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="/background/default-gray.jpg"
          alt="background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-900 bg-opacity-60"></div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col md:flex-row bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-4">
        {/* Left Side Image */}
        <div className="hidden md:block md:w-1/2">
          <img
            src="/background/login2.png"
            alt="Login Visual"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-300 text-center mb-3">Log in to your account</p>

          {errors.form && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-200'
                }`}
                value={formData.name}
                onChange={handleChange}
                autoFocus
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-200'
                }`}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
            >
              {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Log In'}
            </button>

            <p className="text-center">
              <Link to="/reset-password" className="text-sm font-medium text-blue-400 hover:underline">
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
              <span className="px-2 text-sm bg-gray-900 text-gray-400">
                Or
              </span>
            </div>
          </div>

                <div className="mt-6">
              <div className="flex items-center justify-center space-x-2">
                <div ref={googleBtnRef}></div>
              </div>
            </div>
        </div>

          {/* <div className="mt-6 relative">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
             <div className="relative flex justify-center"><span className="relative px-2 bg-gray-900 text-sm text-gray-400">Or</span></div>
           </div>
           <div className="mt-6 flex items-center justify-center">
             <div ref={googleBtnRef}></div>
           </div> */}

          {/* Register Link */}
          <div className="mt-6 text-center text-sm">
            <p className="text-center text-sm mt-6 text-gray-400">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-base text-blue-400 hover:underline font-medium">
                Create New Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}