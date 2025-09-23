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
  longestWinStreak?: number;
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
  const [statsDebug, setStatsDebug] = useState<any>(null); // For debugging

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Enhanced data fetching with proper error handling
        const [fetchedStats, fetchedFriends, fetchedMatches] = await Promise.allSettled([
          // Try enhanced stats first, with proper fallback
          getEnhancedStats().catch(async (error) => {
            console.warn('Enhanced stats failed, falling back to lobby stats:', error);
            const lobbyStats = await getLobbyStats();
            return {
              ...lobbyStats,
              source: 'lobby_api' as const,
              // Add calculated fields if missing
              currentWinStreak: lobbyStats.currentWinStreak || 0,
              monthlyWins: lobbyStats.monthlyWins || 0
            };
          }),
          
          // Friends API
          getLobbyFriends(),
          
          // Matches with fallback
          getEnhancedRecentMatches(10).catch(async (error) => {
            console.warn('Enhanced matches failed, falling back to lobby matches:', error);
            return await getLobbyRecentMatches();
          })
        ]);

        // Handle stats result with validation
        if (fetchedStats.status === 'fulfilled') {
          const statsData = fetchedStats.value;
          
          // Validate and ensure required fields
          const validatedStats: Stats = {
            totalMatches: Math.max(0, statsData.totalMatches || 0),
            winRate: Math.max(0, Math.min(100, statsData.winRate || 0)),
            currentWinStreak: Math.max(0, statsData.currentWinStreak || 0),
            monthlyWins: Math.max(0, statsData.monthlyWins || 0),
            wins: Math.max(0, statsData.wins || 0),
            losses: Math.max(0, statsData.losses || 0),
            source: statsData.source,
            longestWinStreak: Math.max(0, (statsData as any).longestWinStreak || statsData.currentWinStreak || 0)
          };
          
          setStats(validatedStats);
          setStatsDebug(statsData); // For debugging
        } else {
          console.error('Stats fetch failed:', fetchedStats.reason);
          setError('Failed to load statistics');
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
        setError("Failed to load overview data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload(); // Simple reload for fresh data
  };

  // Calculate additional real-time stats from recent matches
  const calculateRealTimeStats = () => {
    if (!recentMatches.length) return null;

    // Calculate current win streak from recent matches
    let currentStreak = 0;
    for (const match of recentMatches) {
      if (match.result === 'win') {
        currentStreak++;
      } else if (match.result === 'loss') {
        break; // Streak ends at first loss
      }
    }

    // Calculate monthly wins from recent matches (approximation)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyWins = recentMatches.filter(match => {
      const matchDate = new Date(match.date);
      return matchDate.getMonth() === currentMonth && 
             matchDate.getFullYear() === currentYear && 
             match.result === 'win';
    }).length;

    return { currentStreak, monthlyWins };
  };

  const realTimeStats = calculateRealTimeStats();

  // Use real-time stats if they're more accurate than backend stats
  const displayStats = {
    totalMatches: stats?.totalMatches || 0,
    winRate: stats?.winRate || 0,
    currentWinStreak: realTimeStats?.currentStreak || stats?.currentWinStreak || 0,
    monthlyWins: realTimeStats?.monthlyWins || stats?.monthlyWins || 0,
    wins: stats?.wins || 0,
    losses: stats?.losses || 0,
    source: stats?.source,
    longestWinStreak: stats?.longestWinStreak || 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading overview data...</p>
        </div>
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
          className="mt-2 bg-red-700 hover:bg-red-600 px-4 py-2 rounded transition-colors"
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
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && statsDebug && (
        <div className="col-span-3 bg-gray-900 p-3 rounded text-xs">
          <details>
            <summary className="cursor-pointer">Debug Stats Info</summary>
            <pre>{JSON.stringify(statsDebug, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* Quick Stats - Enhanced with real-time calculations */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-blue-300">⚡ Quick Stats</h3>
          {displayStats.source && (
            <span className={`text-xs px-2 py-1 rounded ${
              displayStats.source === 'game_api' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-black'
            }`}>
              {displayStats.source === 'game_api' ? '🎮 Real Data' : '📊 Basic Data'}
              {realTimeStats && ' + Live'}
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
              <p className="text-xs text-gray-500 mt-1">Invite friends to play!</p>
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
        // Parse scores properly
        let userScore = 0;
        let opponentScore = 0;
        
        try {
          // Try to parse from score string "X-Y"
          const scores = match.score.split('-');
          if (scores.length === 2) {
            userScore = parseInt(scores[0]) || 0;
            opponentScore = parseInt(scores[1]) || 0;
          }
        } catch (error) {
          // Fallback to result-based scores
          userScore = match.result === 'win' ? 3 : 0;
          opponentScore = match.result === 'win' ? 0 : 3;
        }

        // Use the parsed scores
        const displayScore = `${userScore}-${opponentScore}`;
        
        return (
          <div key={match.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-700 rounded transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-xs">
                {match.matchType === 'pingpong' ? '🏓' : 
                 match.matchType === 'keyclash' ? '⌨️' : '🎮'}
              </span>
              <div>
                <div className="truncate max-w-[120px]">vs {match.opponent}</div>
                <div className="text-xs text-gray-400">{match.matchType}</div>
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