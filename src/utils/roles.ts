import { AppUser, UserRole } from '../types';

/** Admins (and the super admin) have admin rights in every team they belong to. */
export function roleInTeams(user: Pick<AppUser, 'admin' | 'superAdmin'>): UserRole {
  return user.admin === true || user.superAdmin === true ? 'admin' : 'member';
}

/** Who may create teams and manage members: admins and the super admin. */
export function canManageTeams(user: Pick<AppUser, 'admin' | 'superAdmin'> | null | undefined): boolean {
  return !!user && roleInTeams(user) === 'admin';
}
