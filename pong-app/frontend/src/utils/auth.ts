// src/utils/auth.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { get } from 'http';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.64.3:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request config:', config);
    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.request.use(request => {
    console.log('Starting Request', JSON.stringify(request, null, 2))
    return request
})

axios.interceptors.response.use(response => {
    console.log('Response:', JSON.stringify(response, null, 2))
    return response
})

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      removeAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Sets the authentication token in localStorage
 * @param token JWT token
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
  console.log('setAuthToken:', token);
};

/**
 * Gets the authentication token from localStorage
 * @returns string | null - The JWT token or null if not found
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Removes the authentication token from localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Checks if user is authenticated
 * @returns boolean - True if token exists, false otherwise
 */
export const isAuthenticated = (): boolean => {
  let x = getAuthToken();
  console.log('x:', x, '!!x:', !!x);
  return !!x;
};

// Export the configured axios instance as default
export default api;