import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppUser } from '../types';
import { roleInTeams } from '../utils/roles';
import { useAuth } from './useAuth';
import { User } from '@react-native-firebase/auth';

interface AuthContextValue {
  initializing: boolean;
  /** Set only once the employee's profile has loaded. */
  firebaseUser: User | null;
  /**
   * Live profile. `teamId` / `role` describe the team currently open in the Team section
   * (see setActiveTeamId), so task screens work the same for one team or several.
   */
  profile: AppUser | null;
  /** Opens a team in the Team section; null leaves it. Ignored if not a member. */
  setActiveTeamId: (teamId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initializing, firebaseUser, profile: stored } = useAuth();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const uid = stored?.uid;
  useEffect(() => setActiveTeamId(null), [uid]);

  const profile = useMemo<AppUser | null>(() => {
    if (!stored) return null;
    const teamIds = stored.teamIds ?? [];
    const teamId = activeTeamId && teamIds.includes(activeTeamId) ? activeTeamId : null;
    return {
      ...stored,
      admin: stored.admin === true,
      teamIds,
      teamId,
      role: teamId ? roleInTeams(stored) : 'member',
    };
  }, [stored, activeTeamId]);

  const value = useMemo(
    () => ({ initializing, firebaseUser, profile, setActiveTeamId }),
    [initializing, firebaseUser, profile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
