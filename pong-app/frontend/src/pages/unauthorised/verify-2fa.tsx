// pong-app/frontend/src/pages/verify-2fa.tsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import QRCode from '../../components/QRCode';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth

export default function VerifyTwoFactorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from AuthContext
  const { userId, totp_url } = location.state || {};
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    // Get TOTP URL from location state or session storage
    const url = totp_url || sessionStorage.getItem('totp_url');
    if (url) {
      setQrCodeUrl(url);
      sessionStorage.setItem('totp_url', url);
    }
    
    if (!userId) {
      console.error('No userId found');
      setError('Invalid session. Please log in again.');
      navigate('/login');
    }
  }, [userId, totp_url, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-2fa', { userId, token });
      
      console.log('2FA verification response:', response.data);
      
      // Clear the TOTP URL from storage after successful verification
      sessionStorage.removeItem('totp_url');
      sessionStorage.removeItem('pendingUser');
      
      // Use the AuthContext login function
      if (response.data.user) {
        // If using HTTPOnly cookies, just pass the user data
        login(response.data.user);
      }
      
      // Redirect to tournament page
      navigate('/tournament', { replace: true });
      
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <p className="text-red-600">Invalid session. Please try logging in again.</p>
        </div>
      </div>
    );
  }

    return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900 bg-opacity-70"></div>

      <div className="relative w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-extrabold text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Two-Factor Authentication
        </h1>

        {qrCodeUrl && (
          <>
            <p className="text-gray-300 text-center mb-2">
              Scan the QR code with your authenticator app and create an account:
            </p>
            <div className="flex justify-center mb-4">
              <QRCode value={qrCodeUrl} />
            </div>
            <p className="text-gray-300 text-center mb-6">
              Please enter the 6-digit code from your authenticator app.
            </p>
          </>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="6-digit code"
              value={token}
              onChange={(e) => {
                setToken(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              autoFocus
              className="w-full px-3 py-2 border rounded-md bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            ) : (
              'Verify'
            )}
          </button>
        </form>

        {!qrCodeUrl && (
          <div className="mt-4 p-3  text-yellow-200 rounded-md text-sm">
            QR code not available. Please use the secret key from your authenticator app.
          </div>
        )}
      </div>
    </div>
  );
}