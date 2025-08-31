import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, removeAuthToken } from '../utils/auth';
import api from '../utils/api';


const Navbar = () => {
  const authenticated = isAuthenticated();

  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    window.google.accounts.id.disableAutoSelect();
    removeAuthToken();
    navigate('/');
  };

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-white">
          Ping Pong
        </Link>
        
        <div className="flex space-x-4">
          {authenticated ? (
            <>

            
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
            </div>

              <button 
                onClick={handleLogout}
                className="text-white hover:text-red-300"
              >
                {/* Logout */}
                <img 
                  src="/icons/logout.gif" 
                  alt="Logout" 
                  className="h-10 w-10"  // Adjust size as needed
                />
              </button>
            </>
          ) : (
            <>
              {/* <Link to="/login" className="text-white hover:text-blue-300">
                Login
              </Link>
              <Link to="/register" className="text-white hover:text-blue-300">
                Register
              </Link> */}
              <Link to="/lobby" className="text-white hover:text-blue-300">
                Play as Guest
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
