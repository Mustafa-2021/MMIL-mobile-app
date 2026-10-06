import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { AppUser, Team } from '../types';

export function subscribeTeamMembers(
  teamId: string,
  onChange: (members: AppUser[]) => void,
) {
  return onSnapshot(
    query(collection(getFirestore(), 'users'), where('teamId', '==', teamId)),
    snap =>
      onChange(
        snap.docs.map(
          d => ({ uid: d.id, ...(d.data() as Omit<AppUser, 'uid'>) } as AppUser),
        ),
      ),
  );
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(getFirestore(), 'teams', teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Team, 'id'>) };
}
