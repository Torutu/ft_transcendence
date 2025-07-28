// frontend/src/pages/verify-email.tsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuthToken } from '../utils/auth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, email } = location.state || {};
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (!userId || !email) {
    navigate('/register');
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Verifying with code:', code);
      const response = await api.post('/auth/verify-otp', { 
        userId, 
        code
      });

      console.log('Verification response:', response);
      
      if (response.data.twoFactorEnabled) {
        // If 2FA is enabled, go to 2FA verification
        navigate('/verify-2fa', { 
          state: { 
            userId,
            email 
          } 
        });
      } else {
        // If no 2FA, log them in directly
        setAuthToken(response.data.token);
        navigate('/tournament');
      }
    } catch (error: any) {
      setError(
        error.response?.data?.message || 
        'Verification failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { userId });
      setError('');
      alert('New verification code sent to your email');
    } catch (error: any) {
      setError(
        error.response?.data?.message || 
        'Failed to resend code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Verify Your Email
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          We've sent a 6-digit verification code to {email}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:caret-blue-500 placeholder-gray-400 text-gray-700"
              value={code}
              onChange={(e) => {
                // Allow only digits and limit to 6 characters
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                setError('');
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Verify Email'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Didn't receive a code?{' '}
            <button
              onClick={handleResendCode}
              className="text-blue-600 hover:underline font-medium"
              disabled={isResending}
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}