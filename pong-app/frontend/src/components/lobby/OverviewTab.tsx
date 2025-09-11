import React from "react";

export const OverviewTab = ({ stats, friends, recentMatches }) => {
  // Online friends only
  const onlineFriends = friends?.filter(f => f.status === "online" || f.status === "in-game") || [];
  // Helper functions for status color/text
  const getStatusColor = status =>
    status === "online" ? "bg-green-400" : status === "in-game" ? "bg-yellow-400" : "bg-gray-400";
  const getStatusText = status =>
    status === "online" ? "Online" : status === "in-game" ? "In Game" : "Offline";
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Stats */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 text-blue-300">⚡ Quick Stats</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Total Matches:</span>
            <span className="font-bold">{stats?.totalMatches ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Win Rate:</span>
            <span className="font-bold text-green-400">{stats?.winRate ?? 0}%</span>
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
      </div>

      {/* Online Friends */}
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

      {/* Recent Matches */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 text-purple-300">🎯 Recent Matches</h3>
        <div className="space-y-2">
          {recentMatches && recentMatches.length > 0 ? (
            recentMatches.slice(0, 3).map((match) => (
              <div key={match.id} className="flex items-center justify-between text-sm">
                <span>vs {match.opponent}</span>
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
            <p className="text-gray-400 text-sm">No recent matches</p>
          )}
        </div>
      </div>
    </div>
  );
}