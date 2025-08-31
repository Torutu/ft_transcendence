import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import validator from 'validator';
import api from '../utils/api';
import { setAuthToken } from '../utils/auth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    form: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
    
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      email: '',
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validator.isEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response.data.requiresVerification) {
        navigate('/verify-email', { 
          state: { 
            email: formData.email,
            userId: response.data.userId 
          } 
        });
      } else {
        setErrors(prev => ({
          ...prev,
          form: 'Unexpected response from server'
        }));
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.error === 'USER_EXISTS') {
        setErrors(prev => ({
          ...prev,
          email: error.response.data.message
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          form: error.response?.data?.message || 'Registration failed. Please try again.'
        }));
      }
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto flex h-screen">
        {/* Image Section - 50% width */}
        <div className="hidden lg:block lg:w-1/2 p-4 flex items-center justify-center">
          <img 
            src="/background/bg12.jpeg" // Replace with your image path
            alt="Registration Visual"
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Form Section - 50% width */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
              Create A New Account
            </h1>
            
            {errors.form && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Username (letters and digits, 3 to 16 symbols)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 focus:caret-blue-500 text-gray-700 ${
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
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 focus:caret-blue-500 text-gray-700 ${
                    errors.email 
                      ? 'border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:ring-blue-200'
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password (at least 6 symbols)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 focus:caret-blue-500 text-gray-700 ${
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
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-base text-blue-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
