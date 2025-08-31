import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuthToken } from '../utils/auth';
import QRCodeComponent from '../components/QRCodeComponent';

export default function VerifyTwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = location.state || {};
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const totp_url = localStorage.getItem('totp_url') || '';
  
  if (!userId) {
    console.error('No userId found in location state');
    // setError('Invalid session. Please log in again.');
    navigate('/login');
    return null;
  }

  console.log('User ID from location state:', userId);
  console.log('TOTP URL from localStorage:', totp_url);
  if (!totp_url) {
    console.error('No TOTP URL found in localStorage');
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', { userId, token });
      console.log('Verification response:', response.data);
      setAuthToken(response.data.token);
      localStorage.removeItem('totp_url');
      navigate('/lobby');
    } catch (error) {
      console.error('Verification failed:', error);
      setError('Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Two-Factor Authentication
        </h1>
        <p>
          Scan the QR code with your authenticator app.
        </p>
        <div className="flex justify-center my-4">
          {totp_url && <QRCodeComponent value={totp_url} />}
        </div>
        
        <p className="text-gray-600 text-center mb-6">
          Please enter the 6-digit code from your authenticator app.
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
              placeholder="6-digit code"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:caret-blue-500 placeholder-gray-400 text-gray-700"
              value={token}
              onChange={(e) => {
                setToken(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}