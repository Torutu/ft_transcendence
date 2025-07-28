import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import validator from 'validator';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

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
        // Store the TOTP URL in localStorage for later use
        localStorage.setItem('totp_url', response.data.totp_url);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" style={{
        backgroundImage: "url(/background/login-bg.jpeg)",
        backgroundSize: "contain",
        backgroundPosition: "center",
      }}>
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Welcome Back!
        </h1>
        
        {errors.form && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
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
        </form>
      </div>
    </div>
  );
}