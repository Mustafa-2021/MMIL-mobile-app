import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ConfirmationResult,
  getAuth,
  signInWithCustomToken,
  signInWithPhoneNumber,
  signOut,
  UserCredential,
} from '@react-native-firebase/auth';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';
import { AppUser } from '../types';
import { callFunction, FunctionError } from './functions';
import { clearFcmToken } from './notifications';

// The session this phone was given at login; if the profile's sessionVersion moves past it,
// the employee logged in on another phone (or was logged out by the admin).
const SESSION_KEY = 'mmil.sessionVersion';

/** Employees sign in as emp_{employeeId}; any other signed-in user is a half-finished login. */
export function isEmployeeUid(uid: string | undefined | null): boolean {
  return !!uid && uid.startsWith('emp_');
}

/**
 * Checks employee ID + date of birth (YYYY-MM-DD). With `phone`, also checks the number may
 * log in: each account is locked to the number of its first login, and a different number
 * fails with details.reason 'phone-mismatch' (see isPhoneMismatch). maskedPhone is the
 * registered number, e.g. "******3210", or null before the first login.
 */
export async function verifyEmployee(
  employeeId: string,
  dob: string,
  phone?: string,
): Promise<{ name: string; maskedPhone: string | null }> {
  return callFunction('verifyEmployee', { employeeId, dob, ...(phone ? { phone } : {}) });
}

export function isPhoneMismatch(e: unknown): boolean {
  return e instanceof FunctionError && e.details?.reason === 'phone-mismatch';
}

/**
 * While signed in with a newly verified number: ask the super admin to move the account to
 * it. Does not log in; signs the temporary phone session out either way.
 */
export async function requestNumberChange(employeeId: string, dob: string): Promise<void> {
  try {
    await callFunction('requestNumberChange', { employeeId, dob });
  } finally {
    await signOut(getAuth()).catch(() => {});
  }
}

export async function sendOtp(phoneNumber: string): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(getAuth(), phoneNumber);
}

export async function confirmOtp(
  confirmation: ConfirmationResult,
  code: string,
): Promise<UserCredential> {
  return confirmation.confirm(code);
}

/** Step 3, while signed in with the verified phone number: switch to the employee account. */
export async function completeEmployeeLogin(employeeId: string, dob: string): Promise<void> {
  try {
    const { token, sessionVersion } = await callFunction<{ token: string; sessionVersion: number }>(
      'linkEmployee',
      { employeeId, dob },
    );
    // Saved before signing in, so the profile listener never sees a mismatch for this login.
    await AsyncStorage.setItem(SESSION_KEY, String(sessionVersion));
    await signInWithCustomToken(getAuth(), token);
  } catch (e) {
    await signOut(getAuth()).catch(() => {});
    throw e;
  }
}

export async function getStoredSessionVersion(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(SESSION_KEY);
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}

export function subscribeProfile(
  uid: string,
  onChange: (profile: AppUser | null) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    doc(getFirestore(), 'users', uid),
    snap =>
      onChange(snap.exists() ? { uid, ...(snap.data() as Omit<AppUser, 'uid'>) } : null),
    err => onError?.(err as unknown as Error),
  );
}

export async function signOutUser(): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (uid && isEmployeeUid(uid)) await clearFcmToken(uid);
  await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  await signOut(getAuth());
}
