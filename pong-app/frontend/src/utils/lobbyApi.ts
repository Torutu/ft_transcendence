// frontend/src/utils/lobbyApi.ts
import axios from "axios";

const api = axios.create({
	baseURL: '/api',  // Use Vite proxy instead of direct backend URL
	withCredentials: true,
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json',
	}
});

// 1. Get lobby quick stats (Overview tab)
export async function getLobbyStats() {
  const res = await api.get("/api/lobby/stats");
  return res.data;
}

// 2. Get friends list (Rally Squad & Online Squad tabs)
export async function getLobbyFriends() {
  const res = await api.get("/api/lobby/friends");
  return res.data;
}

// 3. Get recent matches (Overview & Match History tabs)
export async function getLobbyRecentMatches() {
  const res = await api.get("/api/lobby/recent-matches");
  return res.data;
}

// 4. Get friend requests (Rally Squad tab)
export async function getLobbyFriendRequests() {
  const res = await api.get("/api/lobby/friend-requests");
  return res.data;
}

// 5. Get user profile (My Locker tab)
export async function getLobbyProfile() {
  const res = await api.get("/api/lobby/profile");
  return res.data;
}

// 6. Update user profile (My Locker tab)
export async function updateLobbyProfile(data: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  language?: string;
  favAvatar?: string;
  profilePic?: string;
}) {
  const res = await api.post("/api/lobby/profile", data);
  return res.data;
}

// 7. Start quick match (Quick Match button)
export async function startQuickMatch() {
  const res = await api.post("/api/match/quick");
  return res.data;
}

// 8. Start championship (Championship button)
export async function startChampionship() {
  const res = await api.post("/api/match/championship");
  return res.data;
}

export async function getAvatars() {
  const res = await api.get("/api/avatars");
  return res.data;
}

export default api;