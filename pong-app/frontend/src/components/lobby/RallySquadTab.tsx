// frontend/src/components/lobby/RallySquadTab.tsx
import React, { useState, useEffect } from "react";
import api from "../../utils/api";

interface User {
  id: number;
  name: string;
  email: string;
  online_status: string;
  createdAt: string;
  profilePic?: string;
  friendshipStatus?: string;
}

interface Friend {
  friendshipId: string;
  status: string;
  friend: User;
}

interface FriendRequest {
  requestId: string;
  type: string;
  user: User;
}

export const RallySquadTab = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Helper functions
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "online":
        return { color: "bg-green-500", text: "Online" };
      case "in-game":
        return { color: "bg-yellow-500", text: "In Game" };
      case "away":
        return { color: "bg-orange-500", text: "Away" };
      default:
        return { color: "bg-gray-500", text: "Offline" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500 text-white";
      case "in-game":
        return "bg-yellow-500 text-black";
      case "away":
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // RELATIONSHIP STATUS: Only "Friend" or "Not Friend" for the relationship column
  const getRelationshipStatus = (user: User) => {
    const friend = friends.find((f) => f.friend.id === user.id);
    if (friend) {
      return { status: "Friend", bgColor: "bg-green-600" };
    }
    return { status: "Not Friend", bgColor: "bg-gray-600" };
  };

  // ACTION STATUS: Handle "Add Friend", "Pending", "Accept/Decline", "Remove" for action column
  const getActionStatus = (user: User) => {
    // Check if user is already a friend
    const friend = friends.find((f) => f.friend.id === user.id);
    if (friend) {
      return { type: "friend", friendshipId: friend.friendshipId };
    }

    // Check for received request (show Accept/Decline)
    const receivedRequest = friendRequests.find(
      (r) => r.user.id === user.id && r.type === "received"
    );
    if (receivedRequest) {
      return { type: "received", requestId: receivedRequest.requestId };
    }

    // Check for sent request (show Pending)
    const sentRequest = friendRequests.find(
      (r) => r.user.id === user.id && r.type === "sent"
    );
    if (sentRequest) {
      return { type: "pending" };
    }

    // Default: show Add Friend
    return { type: "none" };
  };

  // Data fetching
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [usersResponse, friendsResponse, requestsResponse] =
        await Promise.all([
          api.get("/friend/users/search"),
          api.get("/friend/friends"),
          api.get("/friend/requests"),
        ]);

      setAllUsers(usersResponse.data);
      setFriends(friendsResponse.data);
      setFriendRequests(requestsResponse.data);
      setTotalUsers(usersResponse.data.length);

      // Set online users
      const online = usersResponse.data.filter(
        (user: User) => user.online_status === "online"
      );
      setOnlineUsers(online);

      // Set displayed users based on current filters
      filterAndSetUsers(usersResponse.data);

      setError(null);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Failed to load user data");
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Clean search function
  const searchUsers = async (query: string) => {
    const response = await api.get(
      `/friend/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  };

  // Filter users based on search and online status
  const filterAndSetUsers = (users: User[]) => {
    let filtered = users;

    // Apply online filter only when not searching specifically
    if (showOnlineOnly && searchQuery.trim() === "") {
      filtered = users.filter(
        (user) =>
          user.online_status === "online" || user.online_status === "in-game"
      );
    }

    // Remove duplicates based on user ID
    const uniqueUsers = filtered.filter(
      (user, index, self) => index === self.findIndex((u) => u.id === user.id)
    );

    setDisplayedUsers(uniqueUsers);
  };

  // Event handlers
  const handleRefresh = () => {
    fetchAllData();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setError(null);
    filterAndSetUsers(allUsers);
  };

  // Friend actions
  const sendFriendRequest = async (userId: number) => {
    try {
      const response = await api.post(`/friend/request/${userId}`);
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(""), 3000);

      // Refresh data to update UI
      await fetchAllData();
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to send friend request"
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const response = await api.post(`/friend/accept/${requestId}`);
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(""), 3000);

      // Refresh data to update UI
      await fetchAllData();
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to accept friend request"
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    try {
      const response = await api.delete(`/friend/decline/${requestId}`);
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(""), 3000);

      // Refresh data to update UI
      await fetchAllData();
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to decline friend request"
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;

    try {
      const response = await api.delete(`/friend/remove/${friendshipId}`);
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(""), 3000);

      // Refresh data to update UI
      await fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to remove friend");
      setTimeout(() => setError(null), 3000);
    }
  };

  const renderActionButton = (user: User) => {
    const actionStatus = getActionStatus(user);

    switch (actionStatus.type) {
      case "friend":
        return (
          <button
            onClick={() => removeFriend(actionStatus.friendshipId!)}
            className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition-colors whitespace-nowrap"
          >
            Remove
          </button>
        );

      case "received":
        return (
          <div className="flex gap-1">
            <button
              onClick={() => acceptFriendRequest(actionStatus.requestId!)}
              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
            >
              Accept
            </button>
            <button
              onClick={() => declineFriendRequest(actionStatus.requestId!)}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors whitespace-nowrap"
            >
              Decline
            </button>
          </div>
        );

      case "pending":
        return (
          <span className="text-yellow-400 text-xs sm:text-sm font-medium whitespace-nowrap">
            Pending
          </span>
        );

      case "none":
      default:
        return (
          <button
            onClick={() => sendFriendRequest(user.id)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition-colors whitespace-nowrap"
          >
            Add Friend
          </button>
        );
    }
  };

  // Effects
  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle search with proper debouncing
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);

    if (searchQuery.trim() === "") {
      // If search is empty, show all users (filtered by online status if enabled)
      filterAndSetUsers(allUsers);
      setError(null);
      return;
    }

    // Set loading state for search
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery);
        filterAndSetUsers(results);
        setError(null);
      } catch (error) {
        console.error("Search failed, using local fallback:", error);
        // If search fails, fall back to filtering existing users
        filterAndSetUsers(
          allUsers.filter(
            (user) =>
              user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.email.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
        // Don't show error toast since search info handles all cases
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);
  }, [searchQuery, showOnlineOnly, allUsers]);

  // FIXED: Don't interfere with search results
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Only update when NOT searching
      filterAndSetUsers(allUsers);
    }
  }, [showOnlineOnly, allUsers]); // Removed searchQuery dependency

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900 border border-green-700 text-green-100 rounded-md text-center">
          {successMessage}
          <button
            onClick={() => setSuccessMessage("")}
            className="ml-2 text-green-300 hover:text-green-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-100 rounded-md text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-purple-300">
          🤝 Rally Squad
        </h2>

        {/* Stats Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {onlineUsers.length}
            </div>
            <div className="text-purple-200 text-xs sm:text-sm">Online Now</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {friends.length}
            </div>
            <div className="text-purple-200 text-xs sm:text-sm">Friends</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {friendRequests.length}
            </div>
            <div className="text-purple-200 text-xs sm:text-sm">Requests</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white">{totalUsers}</div>
            <div className="text-purple-200 text-xs sm:text-sm">Total Players</div>
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
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Search Info */}
        {searchQuery.trim() && (
          <div className="mb-4 p-3 bg-blue-900 border border-blue-700 text-blue-100 rounded-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-sm sm:text-base">Searching for: "{searchQuery}"</span>
              <span className="text-xs sm:text-sm">
                Found {displayedUsers.length} user
                {displayedUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gray-700 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-600">
              <tr>
                <th className="text-left p-3 sm:p-4 font-semibold">User</th>
                <th className="text-left p-3 sm:p-4 font-semibold">Status</th>
                <th className="text-left p-3 sm:p-4 font-semibold">
                  Relationship
                </th>
                <th className="p-3 sm:p-4 text-right">Action</th>
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
                  const relationshipStatus = getRelationshipStatus(user);
                  const statusInfo = getStatusInfo(
                    user.online_status || "offline"
                  );
                  return (
                    <tr
                      key={user.id}
                      className={
                        index % 2 === 0
                          ? "bg-gray-700"
                          : "bg-gray-650 hover:bg-gray-600 transition-colors"
                      }
                    >
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div
                              className={`absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-gray-700 ${statusInfo.color}`}
                            ></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate text-sm sm:text-base">{user.name}</div>
                            <div className="text-xs sm:text-sm text-gray-400 truncate">
                              {user.email}
                            </div>
                            {user.createdAt && (
                              <div className="text-xs text-gray-500">
                                Joined{" "}
                                {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            user.online_status || "offline"
                          )}`}
                        >
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium text-white ${relationshipStatus.bgColor}`}
                        >
                          {relationshipStatus.status}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        {renderActionButton(user)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    {searchQuery
                      ? `No users found for "${searchQuery}"`
                      : "No users available."}
                    {showOnlineOnly &&
                      !searchQuery &&
                      ' Try disabling "Online Only" filter.'}
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