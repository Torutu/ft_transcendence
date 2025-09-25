// frontend/src/pages/register.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import validator from 'validator';
import api from '../../utils/api';
import Alert from '../../components/general/Alert';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '', // Changed from 'name' to 'username'
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    form: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
    
  const validateForm = () => {
    let isValid = true;
    const newErrors = { username: '', email: '', password: '', form: '' };

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
    } else if (!validator.isAlphanumeric(formData.username)) {
      newErrors.username = 'Username must contain only letters and numbers';
      isValid = false;
    } else if (!validator.isLength(formData.username, { min: 3, max: 16 })) {
      newErrors.username = 'Must be 3-16 characters';
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
        username: formData.username, // Changed from 'name' to 'username'
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        setSuccessMessage('Account created successfully! You can now log in.');
        // Clear form
        setFormData({ username: '', email: '', password: '' });
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Account created successfully! Please log in to continue.' 
            } 
          });
        }, 2000);
      } else {
        setErrors(prev => ({
          ...prev,
          form: 'Unexpected response from server'
        }));
      }
    } catch (error: any) {
      if (error.response?.data?.error === 'USERNAME_EXISTS') {
        setErrors(prev => ({
          ...prev,
          username: error.response.data.message
        }));
      } else if (error.response?.data?.error === 'EMAIL_EXISTS') {
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
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '', form: '' }));
    }
    setSuccessMessage('');
  };

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
            src="/background/register.png"
            alt="Register Visual"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-gray-300 text-center mb-6">Join us today</p>

          <Alert type="success" message={successMessage} />
          <Alert type="error" message={errors.form} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Username"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition ${
                  errors.username
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-200'
                }`}
                value={formData.username}
                onChange={handleChange}
                autoFocus
              />
              {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
            </div>

            <div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-200'
                }`}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
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
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            <p className="text-center text-sm mt-6 text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-base text-blue-400 hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}