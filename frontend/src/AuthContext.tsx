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
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const login = (newToken: string, newUser?: any) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
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