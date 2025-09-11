// pong-app/frontend/src/utils/friendApi.ts
import api from './api';

export interface Friend {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: number | null;
  avatarUrl?: string;
	friendshipId: string;
}

export interface FriendRequest {
  id: string;
  sender_username: string;
  sender_email: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  online_status?: string;
}

export async function getFriends(): Promise<Friend[]> {
  const response = await api.get('/api/lobby/friends');
  return response.data;
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  const response = await api.get('/api/lobby/friend-requests');
  return response.data;
}

export async function searchUsers(query: string = ''): Promise<User[]> {
  const response = await api.get(`/api/lobby/search-users?q=${encodeURIComponent(query)}`);
  return response.data;
}

export async function sendFriendRequest(receiverId: string): Promise<void> {
  await api.post('/api/lobby/send-friend-request', { receiverId });
}

export async function respondToFriendRequest(friendshipId: string, action: 'accept' | 'decline'): Promise<void> {
  await api.post('/api/lobby/respond-friend-request', { friendshipId, action });
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await api.delete(`/api/lobby/remove-friend/${friendshipId}`);
}