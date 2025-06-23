// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  user: any; 
  login: (token: string, user?: any) => void; 
  logout: () => void; 
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Custom hook 
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); 
  const navigate = useNavigate(); 

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse stored user data:", e);
          localStorage.removeItem('user');
        }
      }
    }
  }, []);

  const login = (newToken: string, newUser?: any) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    } else {
       localStorage.removeItem('user');
       setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/'); 
  };

  const isAuthenticated = token !== null;

  const contextValue: AuthContextValue = {
    isAuthenticated,
    token,
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}