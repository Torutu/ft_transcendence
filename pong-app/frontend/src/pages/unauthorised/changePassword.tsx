// frontend/src/pages/changePassword.tsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import api from '../../utils/api';
import LoadingSpinner from '../../components/general/LoadingSpinner';

const ChangePasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    newpassword: '',
    confirmpassword: '',
  });
  
  const [errors, setErrors] = useState({
    newpassword: '',
    confirmpassword: '',
    form: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newpassword !== formData.confirmpassword) {
      setErrors(prev => ({
        ...prev,
        confirmpassword: 'Passwords do not match'
      }));
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post('/auth/change-password', {
        token: searchParams.get('token'),
        password: formData.newpassword
      });
      
      // navigate("/login");
      navigate("/login", { 
        state: { 
          message: 'Password successfully changed! Please login with your new password.' 
        } 
      });
      
    } catch (error: any) {
      setErrors(prev => ({
        ...prev,
        form: error.response?.data?.message || 'Unable to change password. Please try later.'
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

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900 bg-opacity-70"></div>

      {/* Card */}
      <div className="relative flex flex-col md:flex-row bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-4">
        {/* Optional Image */}
        <div className="hidden md:block md:w-1/2">
          <img
            src="/background/changepassword.png"
            alt="Visual"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Change Password
          </h1>

          {errors.form && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <input
                id="newpassword"
                name="newpassword"
                type="password"
                placeholder="New Password"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition`}
                value={formData.newpassword}
                onChange={handleChange}
              />
              {errors.newpassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newpassword}</p>
              )}
            </div>

            <div>
              <input
                id="confirmpassword"
                name="confirmpassword"
                type="password"
                placeholder="Confirm Password"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition`}
                value={formData.confirmpassword}
                onChange={handleChange}
              />
              {errors.confirmpassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmpassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
            >
              {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;