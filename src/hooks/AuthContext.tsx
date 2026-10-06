import React, { createContext, useContext } from 'react';
import { AppUser } from '../types';
import { useAuth } from './useAuth';
import { User } from '@react-native-firebase/auth';

interface AuthContextValue {
  initializing: boolean;
  firebaseUser: User | null;
  profile: AppUser | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
