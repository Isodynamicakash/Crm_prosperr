import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import type { Role, Token, UserView } from './types';

interface AuthState {
  user: UserView | null;
  loading: boolean;
  signInWithGoogle: (idToken: string) => Promise<void>;
  devSignIn: (email: string) => Promise<void>;
  signOut: () => void;
  is: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) { setLoading(false); return; }
    api.get<UserView>('/api/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, [signOut]);

  const accept = (t: Token) => { setToken(t.accessToken); setUser(t.user); };

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    signInWithGoogle: async (idToken) => accept(await api.post<Token>('/api/auth/google', { idToken })),
    devSignIn: async (email) => accept(await api.post<Token>('/api/auth/dev-login', { email })),
    signOut,
    is: (...roles) => !!user && roles.includes(user.role),
  }), [user, loading, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

export const isLeadership = (r?: Role) => r === 'MANAGER' || r === 'ADMIN';
