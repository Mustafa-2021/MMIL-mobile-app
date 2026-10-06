import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from '@react-native-firebase/auth';
import { AppUser } from '../types';
import { getUserProfile } from '../services/auth';

interface AuthState {
  initializing: boolean;
  firebaseUser: User | null;
  profile: AppUser | null;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [initializing, setInitializing] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);

  const loadProfile = async (user: User | null) => {
    if (!user) {
      setProfile(null);
      return;
    }
    const p = await getUserProfile(user.uid);
    setProfile(p);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async user => {
      // Load the profile before exposing the user, so an existing user doesn't briefly
      // see the onboarding screen while their profile is still loading.
      await loadProfile(user);
      setFirebaseUser(user);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfile = async () => {
    await loadProfile(getAuth().currentUser);
  };

  return { initializing, firebaseUser, profile, refreshProfile };
}
