import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { removeAuthToken } from '../utils/auth';

export default function TournamentPage() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/profile');
        console.log('User profile fetched:', response.data);
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        removeAuthToken();
        // Redirect to login if user profile fetch fails
        setUser(null);
        alert('Session expired. Please log in again.');
        // Redirect to login page
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{user.name || user.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Logout
          </button>
        </div>
      </header> */}

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome to Tournament!
          </h1>
          <button
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Join Tournament
          </button>
        </div>
      </main>
    </div>
  );
}