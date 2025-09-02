// frontend/src/pages/verify-email.tsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, email } = location.state || {};
  
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // if (!userId || !email) {
  //   navigate('/register');
  //   return null;
  // }

    // Redirect if userId or email missing
  useEffect(() => {
    if (!userId || !email) {
      navigate('/register');
    }
  }, [userId, email, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/verify-otp', { userId, code });

      navigate('/login', { 
        state: { 
          message: 'Email verified successfully! Please login to continue.',
          email: email
        }
      });

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
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/resend-verification', { userId });
      // setError('');
      setSuccess('A new verification code has been sent to your email');
      // alert('New verification code sent to your email');
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
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {/* Background Image */}
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
        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="text-gray-300 text-center mb-6">
            We've sent a 6-digit verification code to {email}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                setError('');
              }}
              autoFocus
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition"
            />

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-400">
              Didn't receive a code?{' '}
              <button
                onClick={handleResendCode}
                disabled={isResending}
                className="text-base text-blue-400 hover:underline font-medium"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            </p>
          </div>
        </div>

        {/* Right Side Image */}
        <div className="hidden md:block md:w-1/2">
          <img
            src="/background/verifyemail1.png"
            alt="Verify Email Visual"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
