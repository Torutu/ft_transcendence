// frontend/src/components/Navbar.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
      // Force reload to ensure complete cleanup
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-gray-800 shadow-sm shadow-black/20 p-4">
      <div className="container mx-auto flex flex-wrap justify-between items-center">
        {/* Logo */}
        <Link to="/" className="mb-2 sm:mb-0">
          <span className="text-2xl font-bold text-[#c82fb3]">
            H5 Asteroids
          </span>
          <span className="block text-sm uppercase tracking-wide text-yellow-400 font-bold">
            Pong Game
          </span>
        </Link>

        {/* Right section */}
        <div className="flex flex-row flex-wrap items-center gap-3">
          {user ? (
            <>
              {/* Avatar + User info */}
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-semibold">
                    Hello, {user?.username || 'User'}
                  </p>
                  <p className="text-gray-300 text-xs">{user?.email}</p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="bg-gray-700 hover:bg-red-600 px-5 py-2 rounded-lg text-white font-semibold inline-flex"
                disabled={isLoggingOut}
              >
                🚪 Logout
              </button>
            </>
          ) : (
            <Link
              to="/quickmatch"
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
