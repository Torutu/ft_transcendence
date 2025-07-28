import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { state } = useLocation();
  const verificationToken = state?.verificationToken;
  const email = state?.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/verify-code', { code, verificationToken });
      navigate('/login', { state: { email, verified: true } });
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!verificationToken || !email) {
    navigate('/register');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Verify Your Email</h1>
        <p className="text-center mb-4">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block mb-1">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="123456"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      </div>
    </div>
  );
}