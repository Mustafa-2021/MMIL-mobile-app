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
    query(collection(getFirestore(), 'users'), where('teamIds', 'array-contains', teamId)),
    snap =>
      onChange(
        snap.docs.map(d => {
          const u = { uid: d.id, ...(d.data() as Omit<AppUser, 'uid'>) } as AppUser;
          // teamId / role describe membership of *this* team, like the signed-in profile.
          return { ...u, teamId, role: u.teamRoles?.[teamId] ?? 'member' };
        }),
      ),
  );
}

/** All teams, A–Z (a handful of documents). */
export function subscribeAllTeams(onChange: (teams: Team[]) => void) {
  return onSnapshot(collection(getFirestore(), 'teams'), snap =>
    onChange(
      snap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Team, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ),
  );
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(getFirestore(), 'teams', teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Team, 'id'>) };
}
