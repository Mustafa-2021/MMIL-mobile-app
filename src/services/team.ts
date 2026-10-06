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
import { roleInTeams } from '../utils/roles';
import { callFunction } from './functions';

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
          return { ...u, teamId, role: roleInTeams(u) };
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

// Team management by admins (and the super admin); all checked again on the server.

export interface EmployeeSummary {
  employeeId: string;
  name: string;
  department: string;
}

/** Employee ID or the start of a name; at least 2 characters. Active employees only. */
export async function searchEmployeesForTeam(text: string): Promise<EmployeeSummary[]> {
  const { results } = await callFunction<{ results: EmployeeSummary[] }>('searchEmployeesForTeam', {
    query: text.trim(),
  });
  return results;
}

export const addTeamMember = (teamId: string, employeeId: string) =>
  callFunction('setTeamAccess', { teamId, employeeId, member: true });

export const removeTeamMember = (teamId: string, employeeId: string) =>
  callFunction('setTeamAccess', { teamId, employeeId, member: false });

/** join: add yourself to the new team (always true for admins; super admin may pass false). */
export const createTeam = (name: string, join = true) =>
  callFunction<{ id: string }>('createTeam', { name, join });

export const renameTeam = (teamId: string, name: string) => callFunction('renameTeam', { teamId, name });
