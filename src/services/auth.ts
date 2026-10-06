import {
  ConfirmationResult,
  getAuth,
  signInWithPhoneNumber,
  signOut,
  UserCredential,
} from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { AppUser, Team, UserRole } from '../types';
import { generateInviteCode } from '../utils/helpers';
import { clearFcmToken } from './notifications';

export async function sendOtp(phoneNumber: string): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(getAuth(), phoneNumber);
}

export async function confirmOtp(
  confirmation: ConfirmationResult,
  code: string,
): Promise<UserCredential> {
  return confirmation.confirm(code);
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(getFirestore(), 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<AppUser, 'uid'>) };
}

export async function createUserProfile(
  uid: string,
  name: string,
  phone: string,
): Promise<AppUser> {
  const profile: Omit<AppUser, 'uid'> = {
    name,
    phone,
    role: 'member',
    teamId: null,
    fcmToken: null,
    createdAt: Date.now(),
  };
  await setDoc(doc(getFirestore(), 'users', uid), profile);
  return { uid, ...profile };
}

export async function createTeam(
  uid: string,
  teamName: string,
): Promise<{ team: Team; role: UserRole }> {
  const db = getFirestore();
  const inviteCode = generateInviteCode();
  const teamRef = doc(collection(db, 'teams'));
  const team: Omit<Team, 'id'> = {
    name: teamName,
    inviteCode,
    adminUid: uid,
    createdAt: Date.now(),
  };
  await setDoc(teamRef, team);
  await updateDoc(doc(db, 'users', uid), {
    role: 'admin',
    teamId: teamRef.id,
  });
  return { team: { id: teamRef.id, ...team }, role: 'admin' };
}

export async function joinTeam(
  uid: string,
  inviteCode: string,
): Promise<Team> {
  const db = getFirestore();
  const snapshot = await getDocs(
    query(
      collection(db, 'teams'),
      where('inviteCode', '==', inviteCode.trim()),
      limit(1),
    ),
  );
  if (snapshot.empty) {
    throw new Error('Invalid invite code. Please check and try again.');
  }
  const teamDoc = snapshot.docs[0];
  await updateDoc(doc(db, 'users', uid), {
    role: 'member',
    teamId: teamDoc.id,
  });
  return { id: teamDoc.id, ...(teamDoc.data() as Omit<Team, 'id'>) };
}

export async function signOutUser(): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (uid) await clearFcmToken(uid);
  await signOut(getAuth());
}
