import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import log from "@/services/logging";
import type { UserResponse } from "@/types/user";
import { api } from "@/lib/api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  user: UserResponse | null;
  login: (accessToken: string, user: UserResponse, refreshToken?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    log.error("useAuth must be used within an AuthProvider");
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Track initial loading state
  const navigate = useNavigate();

  useEffect(() => {
    const tryToLogin = async () => {
      log.debug("Attempting to refresh session...");
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        log.debug("No refresh token found. Skipping session refresh.");
        setIsLoading(false);
        return;
      }

      try {
        log.debug("Sending refresh token request...");
        const tokenData = await api.post<{ access_token: string }>(
          "/auth/refresh-token",
          { refresh_token: refreshToken }
        );
        const newAccessToken = tokenData.access_token;
        log.debug("Successfully obtained new access token.");

        const userData = await api.get<UserResponse>("/users/me", newAccessToken);
        log.info("Session refreshed successfully for user:", userData.username);
        login(newAccessToken, userData, refreshToken);
      } catch (error) {
        log.error("Session refresh failed:", error);
        logout(); // Clear old, invalid tokens
      } finally {
        setIsLoading(false);
      }
    };

    tryToLogin();
  }, []); // Run only once on app startup

  const login = (
    newAccessToken: string,
    newUser: UserResponse,
    newRefreshToken?: string
  ) => {
    log.info("User logged in:", newUser.username);
    localStorage.setItem("access_token", newAccessToken);
    setToken(newAccessToken);

    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
    }

    if (newRefreshToken) {
      localStorage.setItem("refresh_token", newRefreshToken);
    }
  };

  const logout = () => {
    log.info("User logged out.");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    navigate("/");
  };

  const isAuthenticated = token !== null;

  const contextValue: AuthContextValue = {
    isAuthenticated,
    token,
    user,
    login,
    logout,
    isLoading, // Expose loading state
  };

  // Show loading screen while attempting to refresh session
  if (isLoading) {
    log.debug("AuthContext: Loading session...");
    return (
      <div className="flex h-screen items-center justify-center">
        Loading session...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
