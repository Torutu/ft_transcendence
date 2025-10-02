// frontend/src/components/lobby/OverviewTab.tsx
import React, { useEffect, useState } from "react";
import api from "../../utils/api";

interface DisplayStats {
  totalMatches: number;
  winRate: number;
  currentWinStreak: number;
  monthlyWins: number;
  longestWinStreak: number;
  wins: number;
  losses: number;
  source?: string;
}

interface OnlineFriend {
  id: number;
  name: string;
  status: string;
}

interface RecentMatch {
  id: string;
  opponent: string;
  matchType: string;
  mode: string;
  result: string;
  score: string;
  date: string;
}

export const OverviewTab: React.FC = () => {
  const [displayStats, setDisplayStats] = useState<DisplayStats>({
    totalMatches: 0,
    winRate: 0,
    currentWinStreak: 0,
    monthlyWins: 0,
    longestWinStreak: 0,
    wins: 0,
    losses: 0,
    source: 'loading'
  });
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'in-game': return 'bg-yellow-500';
      case 'away': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'in-game': return 'In Game';
      case 'away': return 'Away';
      default: return 'Offline';
    }
  };

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching overview data...');
        
        // Fetch all data in parallel - using the correct endpoints
        const [statsResponse, friendsResponse, matchesResponse] = await Promise.all([
          api.get('/game/stats'), // Changed from /user/stats to /game/stats for better statistics
          api.get('/friend/online'), 
          api.get('/game/recent?limit=3')
        ]);

        console.log('Stats response:', statsResponse.data);
        console.log('Friends response:', friendsResponse.data);
        console.log('Matches response:', matchesResponse.data);

        setDisplayStats(statsResponse.data);
        setOnlineFriends(friendsResponse.data);
        setRecentMatches(matchesResponse.data);
        setDebugInfo({
          statsEndpoint: '/game/stats',
          statsData: statsResponse.data,
          friendsCount: friendsResponse.data.length,
          matchesCount: matchesResponse.data.length
        });

      } catch (error: any) {
        console.error('Failed to fetch overview data:', error);
        
        // Set detailed error information
        setError(`Failed to fetch overview data: ${error.response?.data?.message || error.message}`);
        setDebugInfo({
          error: error.response?.data || error.message,
          status: error.response?.status
        });
        
        // Set fallback data
        setDisplayStats({
          totalMatches: 0,
          winRate: 0,
          currentWinStreak: 0,
          monthlyWins: 0,
          longestWinStreak: 0,
          wins: 0,
          losses: 0,
          source: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading overview data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg mb-6">
        <h3 className="font-bold mb-2">Error Loading Overview</h3>
        <p>{error}</p>
        {debugInfo && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer">Debug Information</summary>
            <pre className="mt-2 bg-red-800 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
        <button 
          onClick={handleRetry}
          className="mt-2 bg-red-700 hover:bg-red-600 px-4 py-2 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Debug info - for development */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="col-span-3 bg-gray-900 p-3 rounded text-xs">
          <details>
            <summary className="cursor-pointer">Debug Overview Info</summary>
            <pre className="mt-2 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* Quick Stats - Enhanced with detailed information */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-blue-300">⚡ Quick Stats</h3>
          {displayStats.source && (
            <span className={`text-xs px-2 py-1 rounded ${
              displayStats.source === 'game_api' ? 'bg-green-600 text-white' : 
              displayStats.source === 'error' ? 'bg-red-600 text-white' :
              'bg-yellow-600 text-black'
            }`}>
              {displayStats.source === 'game_api' ? '🎮 Game API' : 
               displayStats.source === 'error' ? '❌ Error' : 
               '📊 Basic Data'}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Total Matches:</span>
            <span className="font-bold text-lg">{displayStats.totalMatches}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Win Rate:</span>
            <span className="font-bold text-green-400 text-lg">{displayStats.winRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Record:</span>
            <div className="text-right">
              <span className="text-green-400 font-bold">{displayStats.wins}W</span>
              <span className="text-gray-400 mx-1">-</span>
              <span className="text-red-400 font-bold">{displayStats.losses}L</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>Current Win Streak:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-yellow-400 text-lg">{displayStats.currentWinStreak}</span>
              {displayStats.currentWinStreak > 0 && (
                <span className="text-xs bg-yellow-500 text-black px-1 rounded">🔥</span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>This Month:</span>
            <span className="font-bold text-purple-400 text-lg">{displayStats.monthlyWins}W</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>Longest Streak:</span>
            <span>{displayStats.longestWinStreak}</span>
          </div>
        </div>
      </div>

      {/* Online Friends */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 text-green-300">🟢 Online Squad</h3>
        <div className="space-y-2">
          {onlineFriends.length > 0 ? (
            onlineFriends.map(friend => (
              <div key={friend.id} className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded transition-colors">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(friend.status)}`}></div>
                <span className="flex-1 truncate">{friend.name}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{getStatusText(friend.status)}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">No friends online</p>
              <p className="text-xs text-gray-500 mt-1">Add friends to see who's online!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 text-purple-300">🎯 Recent Matches</h3>
        <div className="space-y-2">
          {recentMatches && recentMatches.length > 0 ? (
            recentMatches.slice(0, 3).map((match) => {
              // Enhanced score parsing
              let userScore = 0;
              let opponentScore = 0;
              
              try {
                const scores = match.score.split(/[-–—]/); // Handle different dash types
                if (scores.length >= 2) {
                  userScore = parseInt(scores[0].trim()) || 0;
                  opponentScore = parseInt(scores[1].trim()) || 0;
                }
              } catch (error) {
                // Fallback to result-based scores
                if (match.result === 'win') {
                  userScore = 3; opponentScore = 0;
                } else if (match.result === 'loss') {
                  userScore = 0; opponentScore = 3;
                } else {
                  userScore = 1; opponentScore = 1;
                }
              }

              const displayScore = `${userScore}-${opponentScore}`;
              
              return (
                <div key={match.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-700 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {match.matchType === 'pingpong' || match.matchType === 'pong' ? '🏓' : 
                       match.matchType === 'keyclash' ? '⌨️' : '🎮'}
                    </span>
                    <div>
                      <div className="truncate max-w-[120px]">vs {match.opponent}</div>
                      <div className="text-xs text-gray-400 capitalize">{match.matchType} • {match.mode}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      match.result === 'win' ? 'text-green-400' : 
                      match.result === 'loss' ? 'text-red-400' : 
                      'text-yellow-400'
                    }`}>
                      {match.result.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {displayScore}
                    </div>
                  </div>
                </div>
              );
            })
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