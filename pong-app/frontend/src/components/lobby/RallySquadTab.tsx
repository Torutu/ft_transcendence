// frontend/src/components/lobby/RallySquadTab.tsx
import React, { useState, useEffect } from 'react';
import { 
  getRallySquadData, 
  searchUsers, 
  sendFriendRequest, 
  respondToFriendRequest, 
  removeFriend,
  type RallySquadData,
  type User,
  type FriendRequest,
  type Friend
} from '../../utils/lobbyApi';

export const RallySquadTab = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load initial data on component mount
  useEffect(() => {
    loadInitialData();
    
    // Refresh data every 30 seconds to get updated online status
    const interval = setInterval(loadInitialData, 30000);
    return () => {
      clearInterval(interval);
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  // Handle search with proper debouncing
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (searchQuery.trim() === '') {
      // If search is empty, show all users (filtered by online status if enabled)
      filterAndSetUsers(allUsers);
      return;
    }

    // Set loading state for search
    setIsSearching(true);
    
    const timeout = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery);
        filterAndSetUsers(results);
      } catch (error) {
        console.error('Search failed:', error);
        // If search fails, fall back to filtering existing users
        filterAndSetUsers(allUsers.filter(user => 
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);
  }, [searchQuery, showOnlineOnly, allUsers]);

  // Load initial data (friends, requests, and all users)
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [rallySquadData, users] = await Promise.all([
        getRallySquadData(),
        searchUsers('') // Empty query to get all users
      ]);
      
      setAllUsers(users);
      setDisplayedUsers(users); // Start with all users displayed
      setFriends(rallySquadData.friends);
      setFriendRequests(rallySquadData.friendRequests);
      setSentRequests(rallySquadData.sentRequests);
      setError(null);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data. Please try refreshing.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search and online status
  const filterAndSetUsers = (users: User[]) => {
    let filtered = users;
    
    // Apply online filter only when not searching specifically
    if (showOnlineOnly && searchQuery.trim() === '') {
      filtered = users.filter(user => user.online_status === 'online' || user.online_status === 'in-game');
    }
    
    // Remove duplicates based on user ID
    const uniqueUsers = filtered.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );
    
    setDisplayedUsers(uniqueUsers);
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      console.log('Sending friend request to user ID:', userId);
      await sendFriendRequest(userId);
      setSuccessMessage("Friend request sent!");
      setTimeout(() => setSuccessMessage(""), 3000);
      // Refresh data to get updated state
      await loadInitialData();
    } catch (err: any) {
      console.error('Send friend request error:', err);
      setError(err.response?.data?.error || "Failed to send friend request");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      await respondToFriendRequest(requestId, action);
      setSuccessMessage(`Friend request ${action}ed!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      await loadInitialData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${action} friend request`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    if (!confirm(`Are you sure you want to remove ${friendName} as a friend?`)) return;
    
    try {
      await removeFriend(friendshipId);
      setSuccessMessage(`Removed ${friendName} from friends`);
      setTimeout(() => setSuccessMessage(""), 3000);
      await loadInitialData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to remove friend");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    await loadInitialData();
    setSuccessMessage('Data refreshed successfully!');
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Clear search and reset to initial view
  const handleClearSearch = () => {
    setSearchQuery('');
    setShowOnlineOnly(false);
  };

  // Determine user's friend status
  const getUserFriendStatus = (user: User) => {
    // Check if user is already a friend
    const friend = friends.find(f => f.id.toString() === user.id.toString());
    if (friend) {
      return {
        status: 'Friend',
        type: 'friend',
        friendshipId: friend.friendshipId || friend.id.toString(),
        bgColor: 'bg-green-500'
      };
    }

    // Check if there's an INCOMING friend request from this user (they sent to me)
    const incomingRequest = friendRequests.find(r => r.sender_username === user.name);
    if (incomingRequest) {
      return {
        status: 'Incoming Request',
        type: 'incoming',
        requestId: incomingRequest.id,
        senderName: user.name,
        bgColor: 'bg-blue-500'
      };
    }

    // Check if I sent a request TO this user (outgoing)
    const outgoingRequest = sentRequests.find(r => r.receiver_username === user.name);
    if (outgoingRequest) {
      return {
        status: 'Request Sent',
        type: 'pending',
        bgColor: 'bg-yellow-500'
      };
    }

    // Default: no relationship
    return {
      status: 'Not a Friend',
      type: 'none',
      bgColor: 'bg-purple-500'
    };
  };

  // Render action buttons based on user status
  const renderActionButton = (user: User) => {
    const friendStatus = getUserFriendStatus(user);

    switch (friendStatus.type) {
      case 'friend':
        return (
          <button 
            onClick={() => handleRemoveFriend(friendStatus.friendshipId!, user.name)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm transition-colors"
          >
            Remove Friend
          </button>
        );
      case 'incoming':
        return (
          <div className="flex gap-1">
            <button 
              onClick={() => handleRespondToRequest(friendStatus.requestId!, 'accept')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Accept
            </button>
            <button 
              onClick={() => handleRespondToRequest(friendStatus.requestId!, 'decline')}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Decline
            </button>
          </div>
        );
      case 'pending':
        return (
          <span className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">
            Request Sent
          </span>
        );
      case 'none':
        return (
          <button 
            onClick={() => handleSendFriendRequest(user.id.toString())}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded text-sm transition-colors"
          >
            Add Friend
          </button>
        );
      default:
        return null;
    }
  };

  // Get status info for display
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'online':
        return { color: 'bg-green-500', text: 'Online', textColor: 'text-green-400' };
      case 'in-game':
        return { color: 'bg-yellow-500', text: 'In Game', textColor: 'text-yellow-400' };
      default:
        return { color: 'bg-gray-500', text: 'Offline', textColor: 'text-gray-400' };
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500 text-white';
      case 'in-game':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Stats calculations
  const onlineUsers = allUsers.filter(user => user.online_status === 'online' || user.online_status === 'in-game');
  const totalUsers = allUsers.length;

  if (error && allUsers.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Error Loading Rally Squad</h3>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              loadInitialData();
            }} 
            className="mt-2 bg-red-700 hover:bg-red-600 px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900 border border-green-700 text-green-100 rounded-md text-center">
          {successMessage}
          <button onClick={() => setSuccessMessage('')} className="ml-2 text-green-300 hover:text-green-100">×</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-100 rounded-md text-center">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-100">×</button>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-3xl font-bold mb-6 text-center text-purple-300">🤝 Rally Squad</h2>
        
        {/* Stats Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{onlineUsers.length}</div>
            <div className="text-purple-200 text-sm">Online Now</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{friends.length}</div>
            <div className="text-purple-200 text-sm">Friends</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{friendRequests.length}</div>
            <div className="text-purple-200 text-sm">Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalUsers}</div>
            <div className="text-purple-200 text-sm">Total Players</div>
          </div>
        </div>
        
        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-400 border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 rounded-full border-t-transparent"></div>
              </div>
            )}
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <label className="flex items-center space-x-2 text-gray-300 bg-gray-700 px-3 py-2 rounded-lg">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="rounded bg-gray-600"
                disabled={!!searchQuery.trim()}
              />
              <span className="text-sm whitespace-nowrap">Online Only</span>
            </label>
            
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Search Info */}
        {searchQuery.trim() && (
          <div className="mb-4 p-3 bg-blue-900 border border-blue-700 text-blue-100 rounded-md">
            <div className="flex justify-between items-center">
              <span>Searching for: "{searchQuery}"</span>
              <span className="text-sm">
                Found {displayedUsers.length} user{displayedUsers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-600">
              <tr>
                <th className="text-left p-4 font-semibold w-2/5">User</th>
                <th className="text-left p-4 font-semibold w-1/5">Status</th>
                <th className="text-left p-4 font-semibold w-1/5">Relationship</th>
                <th className="p-4 w-1/5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && allUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    <div className="animate-spin h-8 w-8 border-2 border-purple-500 rounded-full border-t-transparent mx-auto mb-2"></div>
                    Loading users...
                  </td>
                </tr>
              ) : displayedUsers.length > 0 ? (
                displayedUsers.map((user, index) => {
                  const friendStatus = getUserFriendStatus(user);
                  const statusInfo = getStatusInfo(user.online_status || 'offline');
                  return (
                    <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-650 hover:bg-gray-600 transition-colors'}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 ${statusInfo.color}`}></div>
                          </div>
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                            {user.createdAt && (
                              <div className="text-xs text-gray-500">
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.online_status || 'offline')}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${friendStatus.bgColor}`}>
                          {friendStatus.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {renderActionButton(user)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    {searchQuery ? `No users found for "${searchQuery}"` : 'No users available.'}
                    {showOnlineOnly && !searchQuery && ' Try disabling "Online Only" filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};