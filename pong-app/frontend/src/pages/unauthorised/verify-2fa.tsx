// pong-app/frontend/src/pages/verify-2fa.tsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Alert from '../../components/general/Alert';
import QRCode from '../../components/general/QRCode';
import { useAuth } from '../../contexts/AuthContext';

export default function VerifyTwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { userId: stateUserId, totp_url: stateTotpUrl } = location.state || {};
  
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Get userId from BOTH sources
  const userId = stateUserId || sessionStorage.getItem('userId');
  const totp_url = stateTotpUrl || sessionStorage.getItem('totp_url');

  // ✅ RECOVERY: Save to sessionStorage if from navigation state
  useEffect(() => {
    if (stateUserId && stateTotpUrl) {
      sessionStorage.setItem('userId', stateUserId);
      sessionStorage.setItem('totp_url', stateTotpUrl);
    } 
    else if (!userId) {
      navigate('/login');
    }
  }, [stateUserId, stateTotpUrl, userId, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter the verification code');
      return;
    }

    // ✅ DOUBLE CHECK: Ensure we have userId
    if (!userId) {
      setError('Invalid session. Please try logging in again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', { 
        userId: userId,
        token 
      });
      
      // ✅ CLEANUP: Remove session storage on success
      sessionStorage.removeItem('totp_url');
      sessionStorage.removeItem('userId');
      
      // Login user and redirect
      if (response.data.user) {
        login(response.data.user);
        navigate('/tournament', { replace: true });
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
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
    setError('');
  };

  if (!userId) {
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
          Two-Factor Authentication
        </h1>

        {/* ✅ Show QR code ONLY if it exists (first-time setup) */}
        {totp_url && totp_url !== 'null' && (
          <>
            <p className="text-gray-300 text-center mb-4">
              Scan the QR code with your authenticator app:
            </p>
            <div className="flex justify-center mb-6">
              <QRCode value={totp_url} />
            </div>
          </>
        )}

        {/* ✅ Show different message for already registered users */}
        {(!totp_url || totp_url === 'null') && (
          <p className="text-gray-300 text-center mb-6">
            Enter the 6-digit code from your authenticator app
          </p>
        )}

        <Alert type="error" message={error} />

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={token}
              onChange={handleChange}
              autoFocus
              className="w-full px-3 py-2 border rounded-md bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:ring-blue-200 text-center text-xl tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || token.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Verify & Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
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