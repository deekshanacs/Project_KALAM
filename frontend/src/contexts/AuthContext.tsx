import React, { createContext, useCallback, useEffect, useState } from 'react';
import type { User } from '@tms/shared';
import { loginApi, registerApi, logoutApi, getMeApi } from '../api/auth.api';
import { setAccessToken } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session on mount
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    getMeApi()
      .then((user) => {
        setState({ user, isLoading: false, isAuthenticated: true });
      })
      .catch(() => {
        localStorage.removeItem('refreshToken');
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await loginApi(email, password);
    setAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user, accessToken, refreshToken } = await registerApi(name, email, password);
    setAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await logoutApi(refreshToken).catch(() => undefined);
    }
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
