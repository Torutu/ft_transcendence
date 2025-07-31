import React from 'react'
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";

import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ChangePasswordPage = () => {
	const [searchParams] = useSearchParams();
  
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

		const navigate = useNavigate();

		const handleChangePassword = async (e: React.FormEvent) => {
			e.preventDefault();
			setIsLoading(true);
    	try {
      	const response = await api.post('/auth/change-password', {
					token: searchParams.get('token'),
        	password: formData.newpassword
      	});

      	console.log("Password change Response:", response);

				navigate("/login");
      	
    	} catch (error: any) {
      	console.error('Password change error:', error);
				setErrors(prev => ({
          ...prev,
        	form: error.response?.data?.message || 'Unable to change password. Please try later.'
        }));
    	} finally {
      	setIsLoading(false);
    	}
		}

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
		<div>
			
		  <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <input
              id="newpassword"
              name="newpassword"
              type="password"
              placeholder="New Password"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 focus:caret-blue-500 text-gray-700 ${
                errors.newpassword 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
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
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 focus:caret-blue-500 text-gray-700 ${
                errors.confirmpassword 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex justify-center items-center"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              'Submit'
            )}
          </button>
        </form>

		</div>
	)
}

export default ChangePasswordPage