
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLobbyRecentMatches, getLobbyProfile } from "../../utils/lobbyApi";

interface Match {
  id: string;
  opponent: string;
  result: string;
  score: string;
  playedAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  wins: number;
  losses: number;
  avatarUrl?: string;
}

export const MatchHistoryTab = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedProfile, fetchedMatches] = await Promise.all([
          getLobbyProfile(),
          getLobbyRecentMatches()
        ]);

        setProfile(fetchedProfile);
        setMatches(fetchedMatches);
      } catch (err) {
        console.error("Error during data fetching:", err);
        setError("Failed to load match history");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleMatchDetails = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  const adjustToTimezone = (dateString: string): string => {
    const date = new Date(dateString);
    
    // Format the date manually
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="text-center text-gray-400">Loading match history...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="text-center">
            <div className="text-red-400 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Game History</h2>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Refresh
          </button>
        </div>

        {/* User Stats Summary */}
        {profile && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <img
                src={profile.avatarUrl || "/avatars/default-avatar.png"}
                alt={profile.name}
                className="w-16 h-16 rounded-full border-2 border-white object-cover"
              />
              <div>
                <h3 className="text-xl font-semibold text-white">{profile.name}</h3>
                <div className="flex gap-4 text-sm text-gray-300">
                  <span>Wins: <span className="text-green-400">{profile.wins}</span></span>
                  <span>Losses: <span className="text-red-400">{profile.losses}</span></span>
                  <span>Total: <span className="text-blue-400">{profile.wins + profile.losses}</span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match History */}
        <div className="space-y-4">
          {matches.length > 0 ? (
            matches.map((match) => (
              <div key={match.id} className="bg-gray-700 rounded-lg overflow-hidden">
                {/* Match Header */}
                <button
                  onClick={() => toggleMatchDetails(match.id)}
                  className={`w-full p-4 text-left hover:bg-gray-600 transition-colors ${
                    expandedMatchId === match.id ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">
                      {adjustToTimezone(match.playedAt)} - vs {match.opponent}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      match.result === 'win' ? 'bg-green-600' : 
                      match.result === 'loss' ? 'bg-red-600' : 
                      'bg-yellow-600'
                    }`}>
                      {match.result.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Score: {match.score}
                  </div>
                </button>

                {/* Expanded Match Details */}
                {expandedMatchId === match.id && (
                  <div className="p-6 bg-gray-800">
                    <h3 className="text-xl font-bold mb-4 text-white">Game Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">Match Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Opponent:</span>
                            <span className="text-white">{match.opponent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Result:</span>
                            <span className={
                              match.result === 'win' ? 'text-green-400' : 
                              match.result === 'loss' ? 'text-red-400' : 
                              'text-yellow-400'
                            }>{match.result.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Score:</span>
                            <span className="text-white">{match.score}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white">{adjustToTimezone(match.playedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">Performance</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Match Duration:</span>
                            <span className="text-white">N/A</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Game Type:</span>
                            <span className="text-white">Ping Pong</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Points Won:</span>
                            <span className="text-white">N/A</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Placeholder for future round data */}
                    <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                      <p className="text-gray-400 text-center">
                        Detailed round statistics will be available soon
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              <p>No match history available</p>
              <p className="text-sm mt-2">Play some games to see your history here!</p>
            </div>
          )}
        </div>

        {/* Match Count */}
        {matches.length > 0 && (
          <div className="mt-4 text-center text-gray-400 text-sm">
            Showing {matches.length} match{matches.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>
    </div>
  );
};
