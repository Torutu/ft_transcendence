import { useState } from 'react';
import { Link } from 'react-router-dom';
import validator from 'validator';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(''); // Clear error when typing
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validator.isEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Simulate API call
    if (email === 'senthilpoo@gmail.com') {
      setError('No user found with this email address');
    } else {
      setIsSubmitted(true);
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
          Forgot Password?
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          Enter your email to receive a reset link.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>Error: {error}</p>
          </div>
        )}

        {isSubmitted ? (
          <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700">
            <p>Reset link sent to your email!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:caret-blue-500 placeholder-gray-400 text-gray-700"
                value={email}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm">
          <p className="text-gray-600">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
