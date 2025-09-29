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
  async (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });

        // Handle 401 errors properly
    if (error.response?.status === 401) {
      
      // Don't try to logout if we're already on auth endpoints
      if (!error.config?.url?.includes('/auth/')) {
        try {
          // Call logout to set user offline in database
          await axios.post('/auth/logout', {}, { withCredentials: true });
          console.log('User marked offline due to token expiry');
        } catch (logoutError) {
          console.error('Failed to call logout on token expiry:', logoutError);
        }
      }
      
      // Clear local auth state and redirect
      localStorage.removeItem('user');
    }

    return Promise.reject(error);
  }
);

export default api;