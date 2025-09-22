// frontend/src/components/lobby/OverviewTab.tsx
import React, { useEffect, useState } from "react";
import { 
  getLobbyStats, 
  getLobbyFriends, 
  getLobbyRecentMatches,
  getEnhancedStats,
  getEnhancedRecentMatches 
} from "../../utils/lobbyApi";

interface Stats {
  totalMatches: number;
  winRate: number;
  currentWinStreak: number;
  monthlyWins: number;
  wins: number;
  losses: number;
  source?: 'game_api' | 'lobby_api';
}

interface Friend {
  id: number;
  name: string;
  status: string;
  rank: number;
  lastActive: string;
}

interface Match {
  id: string;
  opponent: string;
  result: string;
  score: string;
  matchType: string;
  date: string;
  duration: string;
}

export const OverviewTab: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Enhanced data fetching with fallbacks
        const [fetchedStats, fetchedFriends, fetchedMatches] = await Promise.allSettled([
          // Try enhanced stats first, fallback to lobby stats
          getEnhancedStats().catch(async (error) => {
            console.warn('Enhanced stats failed, falling back to lobby stats:', error);
            return await getLobbyStats();
          }),
          // Friends API stays the same
          getLobbyFriends(),
          // Try enhanced matches first, fallback to lobby matches  
          getEnhancedRecentMatches(10).catch(async (error) => {
            console.warn('Enhanced matches failed, falling back to lobby matches:', error);
            return await getLobbyRecentMatches();
          })
        ]);

        // Handle stats result
        if (fetchedStats.status === 'fulfilled') {
          setStats(fetchedStats.value);
        } else {
          console.error('Stats fetch failed:', fetchedStats.reason);
        }

        // Handle friends result  
        if (fetchedFriends.status === 'fulfilled') {
          setFriends(fetchedFriends.value);
        } else {
          console.error('Friends fetch failed:', fetchedFriends.reason);
        }

        // Handle matches result
        if (fetchedMatches.status === 'fulfilled') {
          setRecentMatches(fetchedMatches.value);
        } else {
          console.error('Matches fetch failed:', fetchedMatches.reason);
        }

      } catch (err: any) {
        console.error("Error fetching overview data:", err);
        setError("Failed to load overview data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Re-run the effect
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [fetchedStats, fetchedFriends, fetchedMatches] = await Promise.allSettled([
          getEnhancedStats().catch(async (error) => {
            console.warn('Enhanced stats failed, falling back to lobby stats:', error);
            return await getLobbyStats();
          }),
          getLobbyFriends(),
          getEnhancedRecentMatches(10).catch(async (error) => {
            console.warn('Enhanced matches failed, falling back to lobby matches:', error);
            return await getLobbyRecentMatches();
          })
        ]);

        if (fetchedStats.status === 'fulfilled') {
          setStats(fetchedStats.value);
        }
        if (fetchedFriends.status === 'fulfilled') {
          setFriends(fetchedFriends.value);
        }
        if (fetchedMatches.status === 'fulfilled') {
          setRecentMatches(fetchedMatches.value);
        }

      } catch (err: any) {
        console.error("Error fetching overview data:", err);
        setError("Failed to load overview data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Error Loading Overview</h3>
        <p>{error}</p>
        <button 
          onClick={handleRetry} 
          className="mt-2 bg-red-700 hover:bg-red-600 px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // Online friends only
  const onlineFriends = friends?.filter(f => f.status === "online" || f.status === "in-game") || [];
  
  // Helper functions for status color/text
  const getStatusColor = (status: string) =>
    status === "online" ? "bg-green-400" : status === "in-game" ? "bg-yellow-400" : "bg-gray-400";
  
  const getStatusText = (status: string) =>
    status === "online" ? "Online" : status === "in-game" ? "In Game" : "Offline";
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Stats - Enhanced with data source indicator */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-blue-300">⚡ Quick Stats</h3>
          {stats?.source && (
            <span className={`text-xs px-2 py-1 rounded ${
              stats.source === 'game_api' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-black'
            }`}>
              {stats.source === 'game_api' ? '🎮 Real Data' : '📊 Basic Data'}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Total Matches:</span>
            <span className="font-bold">{stats?.totalMatches ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Win Rate:</span>
            <span className="font-bold text-green-400">{stats?.winRate?.toFixed(1) ?? 0}%</span>
          </div>
          <div className="flex justify-between">
            <span>Win Streak:</span>
            <span className="font-bold text-yellow-400">{stats?.currentWinStreak ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span>This Month:</span>
            <span className="font-bold text-purple-400">{stats?.monthlyWins ?? 0}W</span>
          </div>
        </div>
        
        {/* Show additional info if real game data is available */}
        {stats?.source === 'game_api' && stats.totalMatches > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="text-xs text-green-400">
              ✅ Showing real game statistics
            </div>
          </div>
        )}
      </div>

      {/* Online Friends - Unchanged */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 text-green-300">🟢 Online Squad</h3>
        <div className="space-y-2">
          {onlineFriends.length > 0 ? (
            onlineFriends.map(friend => (
              <div key={friend.id} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(friend.status)}`}></div>
                <span className="flex-1">{friend.name}</span>
                <span className="text-xs text-gray-400">{getStatusText(friend.status)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">No friends online</p>
          )}
        </div>
      </div>

      {/* Recent Matches - Enhanced with better game type indicators */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 text-purple-300">🎯 Recent Matches</h3>
        <div className="space-y-2">
          {recentMatches && recentMatches.length > 0 ? (
            recentMatches.slice(0, 3).map((match) => (
              <div key={match.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {match.matchType === 'pingpong' || match.matchType === 'pong' ? '🏓' : 
                     match.matchType === 'keyclash' ? '⌨️' : '🎮'}
                  </span>
                  <span>vs {match.opponent}</span>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    match.result === 'win' ? 'text-green-400' : 
                    match.result === 'loss' ? 'text-red-400' : 
                    'text-yellow-400'
                  }`}>
                    {match.result.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-400">{match.score}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-2">No recent matches</p>
              <p className="text-xs text-gray-500">Play some games to see your match history!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};