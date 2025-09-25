// pong-app/frontend/src/pages/verify-2fa.tsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Alert from '../../components/general/Alert';
import { useAuth } from '../../contexts/AuthContext';

export default function VerifyTwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { userId: stateUserId, username: stateUsername } = location.state || {};
  
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get username from navigation state or sessionStorage
  const username = stateUsername || sessionStorage.getItem('username');

  // Save to sessionStorage for recovery
  useEffect(() => {
    if (stateUsername) {
      sessionStorage.setItem('username', stateUsername);
    } else if (!username) {
      navigate('/login');
    }
  }, [stateUsername, username, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (!username) {
      setError('Invalid session. Please try logging in again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', { 
        username: username,
        code: code.toLowerCase() // Convert to lowercase to match backend
      });
      
      // Cleanup session storage
      sessionStorage.removeItem('username');
      
      // Login user and redirect
      if (response.data.user) {
        login(response.data.user);
        navigate('/lobby', { replace: true });
      } else {
        setError('Authentication failed. Please try again.');
      }
      
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6); // Allow alphanumeric
    setCode(value);
    setError('');
  };

  const handleResendCode = async () => {
    if (!username) return;
    
    try {
      await api.post('/auth/login', {
        username: username,
        password: 'dummy' // This will fail but trigger a new 2FA code
      });
    } catch (error: any) {
      if (error.response?.data?.requires2FA) {
        setError('');
        // Show success message that new code was sent
        setTimeout(() => {
          setError('');
        }, 3000);
      }
    }
  };

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Invalid session. Please try logging in again.</div>
      </div>
    );
  }

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

      {/* Content Card */}
      <div className="relative w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8 mx-4">
        <h1 className="text-3xl font-extrabold text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Email Verification
        </h1>

        <p className="text-gray-300 text-center mb-6">
          We've sent a 6-digit verification code to your email address. Please check your inbox and enter the code below.
        </p>

        <Alert type="error" message={error} />

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={handleChange}
              autoFocus
              className="w-full px-3 py-2 border rounded-md bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:ring-blue-200 text-center text-xl tracking-widest uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Verify & Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm space-y-3">
          <p className="text-gray-400">
            Didn't receive the code?{' '}
            <button
              onClick={handleResendCode}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Request new code
            </button>
          </p>
          
          <button
            onClick={() => navigate('/login')}
            className="text-blue-400 hover:text-blue-300 underline text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}