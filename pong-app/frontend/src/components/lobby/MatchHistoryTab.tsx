// frontend/src/components/lobby/MatchHistoryTab.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { 
  getLobbyProfile, 
  getEnhancedStats, 
  getEnhancedRecentMatches,
  getEnhancedLeaderboard,
  type LeaderboardPlayer,
  type EnhancedLeaderboardPlayer
} from "../../utils/lobbyApi";

interface UserProfile {
  username: string;
  email: string;
  profilePic?: string;
  wins: number;
  losses: number;
  firstName?: string;
  online_status: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  favAvatar?: string;
  isVerified: boolean;
  twoFactorRegistered: boolean;
  createdAt: string;
  name?: string;
}

interface Match {
  id: string;
  gameType: string;
  opponent: string;
  result: string;
  score: string;
  duration: string;
  date: string;
  mode: string;
  rounds?: any[];
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

export const MatchHistoryTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<EnhancedLeaderboardPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [profileData, statsData, matchesData, leaderboardData] = await Promise.all([
          getLobbyProfile(),
          getEnhancedStats(),
          getEnhancedRecentMatches(30),
          getEnhancedLeaderboard(user?.username)
        ]);

        setProfile(profileData);
        setStats({
          username: profileData.name || user?.username || '',
          wins: statsData.wins || 0,
          losses: statsData.losses || 0,
          totalMatches: statsData.totalMatches || 0,
          winRate: statsData.winRate || 0,
          currentStreak: statsData.currentStreak || 0,
          memberSince: profileData.createdAt || new Date().toISOString()
        });
        setMatches(matchesData);
        setLeaderboard(leaderboardData);

      } catch (err: any) {
        console.error("Error during data fetching:", err);
        setError("Failed to load game statistics. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleGameDetails = (gameId: string) => {
    const numericId = parseInt(gameId);
    setExpandedGameId(expandedGameId === numericId ? null : numericId);
  };

  const renderMatchDetails = (match: Match) => {
    return (
      <div className="bg-gray-700 text-white p-4 mt-2 rounded-lg">
        <h3 className="text-xl font-bold mb-3">Match Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <strong className="text-blue-300">Game Type:</strong> 
            <span className="ml-2 capitalize">{match.gameType}</span>
          </div>
          <div>
            <strong className="text-blue-300">Result:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              match.result === 'win' ? 'bg-green-500' : 
              match.result === 'loss' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}>
              {match.result.toUpperCase()}
            </span>
          </div>
          <div>
            <strong className="text-blue-300">Final Score:</strong> 
            <span className="ml-2 font-mono">{match.score}</span>
          </div>
          <div>
            <strong className="text-blue-300">Duration:</strong> 
            <span className="ml-2">{match.duration}</span>
          </div>
          <div>
            <strong className="text-blue-300">Mode:</strong> 
            <span className="ml-2 capitalize">{match.mode}</span>
          </div>
          <div>
            <strong className="text-blue-300">Opponent:</strong> 
            <span className="ml-2">{match.opponent}</span>
          </div>
        </div>
        
        {match.rounds && Array.isArray(match.rounds) && match.rounds.length > 0 ? (
          <div>
            <h4 className="font-bold mb-2 text-lg">Round Details:</h4>
            <div className="space-y-3">
              {match.rounds.map((round: any, index: number) => (
                <div key={index} className="bg-gray-600 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Round {index + 1}</span>
                    {round.winner && (
                      <span className="bg-blue-500 px-2 py-1 rounded text-sm">
                        Winner: {round.winner}
                      </span>
                    )}
                  </div>
                  {round.score && (
                    <div className="text-sm text-gray-300">
                      Score: {round.score}
                    </div>
                  )}
                  {round.duration && (
                    <div className="text-sm text-gray-300">
                      Duration: {round.duration}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-2">
            No detailed round data available for this match.
          </div>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-500 text-black';
      case 2: return 'bg-gray-400 text-black';
      case 3: return 'bg-orange-700 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'in-game': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen text-white flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Loading game statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen text-white p-4 md:p-8 bg-gray-900">
      <div className="max-w-6xl mx-auto pt-16">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 mt-4">
          🏆 Game Statistics & History
        </h1>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6 text-center max-w-2xl mx-auto">
            {error}
            <button 
              onClick={() => window.location.reload()} 
              className="ml-4 bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Player Profile Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-300">Player Profile</h2>
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="text-center flex-shrink-0">
              <img
                src={profile?.profilePic || "/profile-pics/default-profile.jpg"}
                alt="Profile"
                className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover mx-auto"
              />
              <div className="mt-4">
                <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${getStatusIndicator(profile.online_status)}`}></div>
                <span className="text-sm text-gray-400 capitalize">{profile.online_status || 'offline'}</span>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-blue-300 font-semibold">Username:</label>
                  <p className="text-lg">{profile?.name || user?.username}</p>
                </div>
                <div>
                  <label className="text-blue-300 font-semibold">Email:</label>
                  <p className="text-lg">{profile?.email}</p>
                </div>
                <div>
                  <label className="text-blue-300 font-semibold">Member Since:</label>
                  <p className="text-lg">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              
              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
                    <div className="text-sm text-gray-300">Wins</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
                    <div className="text-sm text-gray-300">Losses</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.totalMatches}</div>
                    <div className="text-sm text-gray-300">Total Games</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-400">{stats.winRate}%</div>
                    <div className="text-sm text-gray-300">Win Rate</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Section - Exactly like your friend's */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-yellow-300">🏅 Game Leaderboard</h2>
          
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="p-3 font-semibold">Rank</th>
                    <th className="p-3 font-semibold">Player</th>
                    <th className="p-3 font-semibold">Wins</th>
                    <th className="p-3 font-semibold">Losses</th>
                    <th className="p-3 font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player) => (
                    <tr 
                      key={player.username} 
                      className={`border-b border-gray-600 hover:bg-gray-700 transition-colors ${
                        player.isCurrentUser ? 'bg-blue-900 bg-opacity-50' : ''
                      }`}
                    >
                      <td className="p-3">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${getRankBadgeColor(player.rank)}`}>
                          {player.rank}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {player.profilePic ? (
                            <img 
                              src={player.profilePic} 
                              alt={player.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                              {player.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            {player.isCurrentUser && <span className="text-yellow-400">⭐</span>}
                            <span className="font-medium">{player.username}</span>
                            <div className={`w-2 h-2 rounded-full ${getStatusIndicator(player.online_status)}`}></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-green-400 font-semibold">{player.wins}</td>
                      <td className="p-3 text-red-400 font-semibold">{player.losses}</td>
                      <td className="p-3 font-bold text-yellow-400">{player.points.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg">No leaderboard data available yet.</p>
              <p className="text-sm">Play some games to appear on the leaderboard!</p>
            </div>
          )}
        </div>

        {/* Match History Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-purple-300">📊 Match History</h2>
          
          {matches.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg mb-2">No matches played yet.</p>
              <p className="text-sm">Start playing games to see your match history here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="border border-gray-600 rounded-lg overflow-hidden hover:border-gray-500 transition-colors">
                  <button
                    onClick={() => toggleGameDetails(match.id)}
                    className="w-full text-left bg-gray-700 hover:bg-gray-600 px-4 py-4 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-3xl">
                          {match.gameType === 'pingpong' || match.gameType === 'pong' ? '🏓' : 
                           match.gameType === 'keyclash' ? '⌨️' : '🎮'}
                        </span>
                        <div className="text-left">
                          <div className="font-semibold text-lg">
                            {formatDate(match.date)}
                          </div>
                          <div className="text-sm text-gray-300">
                            vs <strong>{match.opponent}</strong> • {match.mode} • {match.gameType}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          match.result === 'win' ? 'bg-green-500 text-white' : 
                          match.result === 'loss' ? 'bg-red-500 text-white' : 
                          'bg-yellow-500 text-black'
                        }`}>
                          {match.result.toUpperCase()}
                        </span>
                        <div className="text-right">
                          <div className="font-mono text-lg">{match.score}</div>
                          <div className="text-sm text-gray-300">{match.duration}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {expandedGameId === parseInt(match.id) && renderMatchDetails(match)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};