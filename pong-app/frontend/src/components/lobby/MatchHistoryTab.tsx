// frontend/src/components/lobby/MatchHistoryTab.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface Match {
  id: string;
  gameType: string;
  opponent: string;
  result: string;
  score: string;
  duration: string;
  date: string;
  mode: string;
}

interface PlayerStats {
  username: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  currentStreak: number;
  memberSince: string;
}

export const MatchHistoryTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchHistory();
    fetchPlayerStats();
  }, []);

  const fetchMatchHistory = async () => {
    try {
      const response = await fetch('/games/recent-matches?limit=20', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatches(data || []);
      } else {
        console.error('Failed to fetch match history:', response.status);
        setError('Failed to fetch match history');
        setMatches([]);
      }
    } catch (error) {
      console.error('Error fetching match history:', error);
      setError('Error fetching match history');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerStats = async () => {
    try {
      const response = await fetch(`/games/stats/${user?.username}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching player stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading match history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen text-white p-8">
      <button
        onClick={() => navigate("/lobby")}
        className="absolute top-6 left-6 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold shadow-md"
      >
        🔙 Back to Lobby
      </button>

      <h1 className="text-4xl font-bold text-center mb-8">
        🏆 Match History & Statistics
      </h1>

      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg mb-6 text-center">
          {error}
        </div>
      )}

      {/* Player Statistics */}
      {stats && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Player Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
              <div className="text-sm">Wins</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
              <div className="text-sm">Losses</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-400">{stats.totalMatches}</div>
              <div className="text-sm">Total Matches</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-3xl font-bold text-yellow-400">{stats.winRate}%</div>
              <div className="text-sm">Win Rate</div>
            </div>
          </div>
          <div className="text-center mt-4 text-sm text-gray-400">
            Member since: {new Date(stats.memberSince).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Match History */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Recent Matches</h2>
        
        {matches.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No matches played yet. Start playing to see your history here!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="p-3">Date</th>
                  <th className="p-3">Game</th>
                  <th className="p-3">Opponent</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Mode</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id} className="border-b border-gray-600 hover:bg-gray-700">
                    <td className="p-3">{formatDate(match.date)}</td>
                    <td className="p-3 capitalize">{match.gameType}</td>
                    <td className="p-3">{match.opponent}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded ${
                        match.result === 'win' 
                          ? 'bg-green-500 text-white' 
                          : match.result === 'loss' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-500 text-white'
                      }`}>
                        {match.result.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{match.score}</td>
                    <td className="p-3">{match.duration}</td>
                    <td className="p-3 capitalize">{match.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}