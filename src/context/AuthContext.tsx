import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'clocky_auth_jwt_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [token]
  );

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (isMounted && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setToken(null);
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {}
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Inloggen mislukt.' };
      }

      setToken(data.token);
      setUser(data.user);
      try {
        localStorage.setItem(TOKEN_KEY, data.token);
      } catch {}
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err.message : 'Netwerkfout bij inloggen.' };
    }
  };

  const register = async (username: string, password: string, email?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registratie mislukt.' };
      }

      setToken(data.token);
      setUser(data.user);
      try {
        localStorage.setItem(TOKEN_KEY, data.token);
      } catch {}
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err.message : 'Netwerkfout bij registreren.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        login,
        register,
        logout,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
