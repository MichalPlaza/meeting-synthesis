import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import log from "./services/logging";
import type { UserResponse } from "./types/user";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

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
  const [isLoading, setIsLoading] = useState(true); // Stan do śledzenia początkowego ładowania
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
        const response = await fetch(
          `${BACKEND_API_BASE_URL}/auth/refresh-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }
        );

        if (!response.ok) {
          log.warn("Refresh token failed. Status:", response.status);
          throw new Error("Refresh token failed");
        }

        const tokenData = await response.json();
        const newAccessToken = tokenData.access_token;
        log.debug("Successfully obtained new access token.");

        const userResponse = await fetch(`${BACKEND_API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${newAccessToken}` },
        });

        if (!userResponse.ok) {
          log.warn(
            "Failed to fetch user after refresh. Status:",
            userResponse.status
          );
          throw new Error("Failed to fetch user after refresh");
        }

        const userData = await userResponse.json();
        log.info("Session refreshed successfully for user:", userData.username);
        login(newAccessToken, userData, refreshToken);
      } catch (error) {
        log.error("Session refresh failed:", error);
        logout(); // Wyczyść stare, nieprawidłowe tokeny
      } finally {
        setIsLoading(false);
      }
    };

    tryToLogin();
  }, []); // Uruchom tylko raz przy starcie aplikacji

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
    isLoading, // Udostępnij stan ładowania
  };

  // Podczas gdy aplikacja próbuje odświeżyć sesję, można pokazać ekran ładowania
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
