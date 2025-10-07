// frontend/src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import api from "../utils/api";

interface User {
  id: number;
  email: string;
  username: string;
  isVerified: boolean;
  nickname?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let authChannel: BroadcastChannel | null = null;

const getAuthChannel = (): BroadcastChannel => {
  if (!authChannel) {
    authChannel = new BroadcastChannel("auth");
  }
  return authChannel;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const isLoggingOut = useRef(false);
  const authRequestSent = useRef(false);

  const checkAuth = async (): Promise<User | null> => {
    try {
      const response = await api.get("/profile");
      return response.data;
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error("Auth check failed:", error);
      }
      return null;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await checkAuth();
      if (userData) {
        setUser(userData);
        // Broadcast the updated user data to other tabs
        try {
          getAuthChannel().postMessage({ type: "USER_UPDATED", user: userData });
        } catch (error) {
          console.error("Failed to broadcast user update:", error);
        }
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (!authChecked) {
        const userData = await checkAuth();
        setUser(userData);
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    initializeAuth();

    const handleAuthMessage = (event: MessageEvent) => {
      switch (event.data.type) {
        case "AUTH_STATE_REQUEST":
          if (!authRequestSent.current) {
            getAuthChannel().postMessage({
              type: "AUTH_STATE_RESPONSE",
              user: user,
            });
          }
          break;
        case "AUTH_STATE_RESPONSE":
          if (event.data.user && !user) {
            setUser(event.data.user);
          }
          setIsLoading(false);
          setAuthChecked(true);
          break;
        case "LOGIN":
          setUser(event.data.user);
          setIsLoading(false);
          setAuthChecked(true);
          break;
        case "LOGOUT":
          setUser(null);
          setIsLoading(false);
          setAuthChecked(true);
          isLoggingOut.current = false;
          break;
        case "USER_UPDATED":
          setUser(event.data.user);
          break;
      }
    };

    const channel = getAuthChannel();
    channel.onmessage = handleAuthMessage;

    if (!authRequestSent.current) {
      setTimeout(() => {
        authRequestSent.current = true;
        channel.postMessage({ type: "AUTH_STATE_REQUEST" });
        setTimeout(() => {
          authRequestSent.current = false;
        }, 1000);
      }, 100);
    }

    return () => {
      channel.onmessage = null;
    };
  }, [user, authChecked]);

  const login = (userData: User) => {
    setUser(userData);
    setIsLoading(false);
    setAuthChecked(true);

    try {
      getAuthChannel().postMessage({ type: "LOGIN", user: userData });
    } catch (error) {
      console.error("Failed to broadcast login:", error);
    }
  };

  const logout = async () => {
    if (isLoggingOut.current) return;

    isLoggingOut.current = true;
    try {
      await api.post("/auth/logout");
      setUser(null);
      setIsLoading(false);
      setAuthChecked(true);

      try {
        getAuthChannel().postMessage({ type: "LOGOUT" });
      } catch (error) {
        console.error("Failed to broadcast logout:", error);
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
      setUser(null);
    } finally {
      isLoggingOut.current = false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
