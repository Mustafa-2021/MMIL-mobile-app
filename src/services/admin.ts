import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAt,
} from '@react-native-firebase/firestore';
import { AppUser, AuditEntry, Employee, EmployeeImportRow, ImportSummary, Team } from '../types';
import { callFunction } from './functions';

// Super-admin operations. Every write goes through a Cloud Function (functions/employees.js),
// which re-checks that the caller is a super admin; the app only reads here.

const employeesCollection = () => collection(getFirestore(), 'employees');

/** Employee ID (exact) or the start of a name. Empty search lists the first employees A–Z. */
export async function searchEmployees(text: string, max = 50): Promise<Employee[]> {
  const term = text.trim();
  const results = new Map<string, Employee>();
  if (term) {
    const byId = await getDoc(doc(employeesCollection(), term.toUpperCase()));
    if (byId.exists()) results.set(byId.id, byId.data() as Employee);
  }
  const lower = term.toLowerCase();
  const snap = await getDocs(
    term
      ? query(employeesCollection(), orderBy('nameLower'), startAt(lower), endAt(`${lower}`), limit(max))
      : query(employeesCollection(), orderBy('nameLower'), limit(max)),
  );
  snap.docs.forEach(d => results.set(d.id, d.data() as Employee));
  return [...results.values()];
}

export function subscribeEmployee(
  employeeId: string,
  onChange: (employee: Employee | null) => void,
) {
  return onSnapshot(doc(employeesCollection(), employeeId), snap =>
    onChange(snap.exists() ? (snap.data() as Employee) : null),
  );
}

/** The employee's app profile (team, role); exists after first login or team assignment. */
export function subscribeEmployeeProfile(
  employeeId: string,
  onChange: (profile: AppUser | null) => void,
) {
  const uid = `emp_${employeeId}`;
  return onSnapshot(doc(getFirestore(), 'users', uid), snap =>
    onChange(snap.exists() ? ({ uid, ...snap.data() } as AppUser) : null),
  );
}

export function subscribeTeams(onChange: (teams: Team[]) => void) {
  return onSnapshot(collection(getFirestore(), 'teams'), snap =>
    onChange(
      snap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Team, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ),
  );
}

export function subscribeAuditLog(onChange: (entries: AuditEntry[]) => void, max = 150) {
  return onSnapshot(
    query(collection(getFirestore(), 'auditLog'), orderBy('createdAt', 'desc'), limit(max)),
    snap => onChange(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<AuditEntry, 'id'>) }))),
  );
}

export function importEmployees(
  rows: EmployeeImportRow[],
  options: { dryRun: boolean; deactivateMissing: boolean },
): Promise<ImportSummary> {
  return callFunction<ImportSummary>('importEmployees', { rows, ...options });
}

export function upsertEmployee(data: {
  employeeId: string;
  name: string;
  department: string;
  dob?: string;
}): Promise<{ created: boolean }> {
  return callFunction('upsertEmployee', data);
}

export const setEmployeeActive = (employeeId: string, active: boolean) =>
  callFunction('setEmployeeActive', { employeeId, active });

export const unlockEmployee = (employeeId: string) => callFunction('unlockEmployee', { employeeId });

export const logoutEmployee = (employeeId: string) => callFunction('logoutEmployee', { employeeId });

export const setSuperAdmin = (employeeId: string, value: boolean) =>
  callFunction('setSuperAdmin', { employeeId, value });

export const setTeamAccess = (employeeId: string, teamId: string | null, role: 'admin' | 'member') =>
  callFunction('setTeamAccess', { employeeId, teamId, role });

export const createTeam = (name: string) => callFunction<{ id: string }>('createTeam', { name });
