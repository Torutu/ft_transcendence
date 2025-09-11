// frontend/src/utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',  // Use Vite proxy instead of direct backend URL
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Generic user profile fetch (used in AuthContext, My Locker, etc)
export async function getUserProfile() {
  const res = await api.get("/api/lobby/profile");
  return res.data;
}

// Generic update user profile
export async function updateUserProfile(data: {
  firstName?: string;
  lastName?: string;
  profilePic?: string;
  dateOfBirth?: string;
  gender?: string;
  favAvatar?: string;
  language?: string;
}) {
  const res = await api.post("/api/lobby/profile", data);
  return res.data;
}

// Generic logout
export async function logoutUser() {
  const res = await api.post("/auth/logout");
  return res.data;
}


// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export default api;