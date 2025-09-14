// pong-app/frontend/src/components/Navbar.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
      // Force reload to ensure complete cleanup
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        {/* Logo */}
        <Link to="/" className="mb-2 sm:mb-0">
          <span className="block text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            H5 Asteroids
          </span>
          <span className="block text-sm uppercase tracking-wide text-red-400">
            Pong Game
          </span>
        </Link>

        {/* Right section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 w-full sm:w-auto space-y-3 sm:space-y-0 mt-3 sm:mt-0">
          {user ? (
            <>
              {/* Avatar + User info */}
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-white font-medium text-sm sm:text-base">
                    Hello, {user?.name || 'User'}
                  </p>
                  <p className="text-gray-300 text-xs sm:text-sm">{user?.email}</p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
                disabled={isLoggingOut}
              >
                🚪 Logout
              </button>
            </>
          ) : (
            <Link
              to="/lobby"
              className="text-white hover:text-blue-300 text-sm sm:text-base"
            >
              Play as Guest
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


