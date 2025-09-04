// frontend/src/pages/tournament.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function TournamentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading tournament data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            🏆 Tournament Arena
          </h1>
          <p className="text-gray-400 mb-6 text-lg">
            Welcome back, <span className="text-blue-300 font-semibold">{user.name}</span>! Ready to compete?
          </p>
          
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => navigate("/lobby")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors transform hover:scale-105"
            >
              🎯 Join 1v1 lobby
            </button>
            <button
              onClick={() => console.log('Join tournament clicked')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors transform hover:scale-105"
            >
              🎯 Join Tournament
            </button>            
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg text-center">
          <h2 className="text-2xl font-semibold mb-4">Tournament Content</h2>
          <p className="text-gray-400">This is a test message to check if content is rendering.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-lg font-medium mb-2">Quick Match</h3>
              <p>Play a game against one opponent</p>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-lg font-medium mb-2">Tournaments</h3>
              <p>Join competitions</p>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-lg font-medium mb-2">Leaderboard</h3>
              <p>See rankings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}