// frontend/src/utils/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Use a proxy instead of direct backend URL
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error("API Response Error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });

    // Handle 404 USER_NOT_FOUND errors
    if (error.response?.status === 404 && error.response?.data?.error === "USER_NOT_FOUND") {
      console.log("User account deleted - redirecting to login");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Handle 401 errors properly
    if (error.response?.status === 401) {
      // Don't try to logout if we're already on auth endpoints
      if (!error.config?.url?.includes("/auth/")) {
        try {
          // Call logout to set user offline in database
          await axios.post("/api/auth/logout", {}, { withCredentials: true });
        } catch (logoutError) {
          console.error("Failed to call logout on token expiry:", logoutError);
        }
      }

      // Clear local auth state and redirect
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  }
);

export default api;
