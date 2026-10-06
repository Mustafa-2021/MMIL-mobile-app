import { useEffect, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut, User } from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { AppUser } from '../types';
import {
  getStoredSessionVersion,
  isEmployeeUid,
  signOutUser,
  subscribeProfile,
} from '../services/auth';

interface AuthState {
  initializing: boolean;
  firebaseUser: User | null;
  profile: AppUser | null;
}

export function useAuth(): AuthState {
  const [initializing, setInitializing] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const firstEvent = useRef(true);

  useEffect(() => {
    return onAuthStateChanged(getAuth(), user => {
      const isFirst = firstEvent.current;
      firstEvent.current = false;
      if (user && !isEmployeeUid(user.uid)) {
        // Signed in with only a phone number: the login screen is mid-way through linking it to
        // an employee. If the app was restarted in that state, start the login over.
        if (isFirst) signOut(getAuth()).catch(() => {});
        setFirebaseUser(null);
      } else {
        setFirebaseUser(user);
      }
      if (!user || !isEmployeeUid(user.uid)) {
        setProfile(null);
        setInitializing(false);
      }
    });
  }, []);

  const uid = firebaseUser?.uid;
  useEffect(() => {
    if (!uid) return;
    let signingOut = false;
    const forceSignOut = (message: string) => {
      if (signingOut) return;
      signingOut = true;
      Toast.show({ type: 'info', text1: 'Logged out', text2: message, visibilityTime: 6000 });
      signOutUser().catch(() => {});
    };

    return subscribeProfile(
      uid,
      async p => {
        if (!p) {
          forceSignOut('Your account was not found. Please log in again.');
          return;
        }
        if (!p.active) {
          forceSignOut('Your access has been disabled. Please contact the admin.');
          return;
        }
        const stored = await getStoredSessionVersion();
        if (stored != null && p.sessionVersion > stored) {
          forceSignOut('Your account was logged in on another phone.');
          return;
        }
        setProfile(p);
        setInitializing(false);
      },
      () => {
        // Typically the session was revoked; the auth listener will follow with a sign-out.
        setInitializing(false);
      },
    );
  }, [uid]);

  return { initializing, firebaseUser: profile ? firebaseUser : null, profile };
}
