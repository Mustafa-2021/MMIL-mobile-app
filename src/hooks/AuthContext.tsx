import React, { createContext, useContext } from 'react';
import { AppUser } from '../types';
import { useAuth } from './useAuth';
import { User } from '@react-native-firebase/auth';

interface AuthContextValue {
  initializing: boolean;
  /** Set only once the employee's profile has loaded. */
  firebaseUser: User | null;
  /** Live: updates when the super admin changes the employee's team, role or status. */
  profile: AppUser | null;
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
