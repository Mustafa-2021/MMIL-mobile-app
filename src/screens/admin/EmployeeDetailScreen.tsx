import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Menu, SegmentedButtons, Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/theme';
import { useAuthContext } from '../../hooks/AuthContext';
import {
  logoutEmployee,
  setEmployeeActive,
  setSuperAdmin,
  setTeamAccess,
  subscribeEmployee,
  subscribeEmployeeProfile,
  subscribeTeams,
  unlockEmployee,
} from '../../services/admin';
import { AppUser, Employee, RootStackParamList, Team, UserRole } from '../../types';
import { formatDateTime } from '../../utils/helpers';
import EmployeeStatusChip from '../../components/EmployeeStatusChip';

type Route = RouteProp<RootStackParamList, 'EmployeeDetail'>;

export default function EmployeeDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { employeeId } = useRoute<Route>().params;
  const { profile: me } = useAuthContext();
  const [employee, setEmployee] = useState<Employee | null | undefined>(undefined);
  const [appProfile, setAppProfile] = useState<AppUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // "Add to team" form.
  const [newTeamId, setNewTeamId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);

  useEffect(() => subscribeEmployee(employeeId, setEmployee), [employeeId]);
  useEffect(() => subscribeTeams(setTeams), []);
  useEffect(() => subscribeEmployeeProfile(employeeId, setAppProfile), [employeeId]);

  if (employee === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (employee === null) {
    return (
      <View style={styles.center}>
        <Text>Employee {employeeId} not found.</Text>
      </View>
    );
  }

  const isMe = me?.employeeId === employeeId;
  const locked = !!employee.lockedUntil && employee.lockedUntil > Date.now();
  const memberOf = appProfile?.teamIds ?? [];
  const teamRoles = appProfile?.teamRoles ?? {};
  const teamName = (id: string) => teams.find(t => t.id === id)?.name ?? '…';
  const addableTeams = teams.filter(t => !memberOf.includes(t.id));

  const act = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      Toast.show({ type: 'success', text1: success });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not complete', text2: e?.message });
    } finally {
      setBusy(null);
    }
  };

  const confirm = (title: string, message: string, label: string, onYes: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: 'destructive', onPress: onYes },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{employee.name}</Text>
          <Text style={styles.meta}>
            {employee.employeeId}
            {employee.department ? ` · ${employee.department}` : ''}
          </Text>
        </View>
        <EmployeeStatusChip employee={employee} />
      </View>

      <View style={styles.card}>
        <Row label="Mobile" value={employee.phone ?? 'Not logged in yet'} />
        <Row label="Last login" value={employee.lastLoginAt ? formatDateTime(employee.lastLoginAt) : '—'} />
        <Row label="Super admin" value={employee.superAdmin ? 'Yes' : 'No'} />
        {locked && <Row label="Locked until" value={formatDateTime(employee.lockedUntil!)} />}
        {!employee.active && (
          <Row
            label="Deactivated"
            value={employee.deactivatedBy === 'import' ? 'Not in the last HR sheet' : 'By admin'}
          />
        )}
      </View>

      <Text style={styles.section}>Team access</Text>
      <View style={styles.card}>
        {memberOf.length === 0 && (
          <Text style={[styles.hint, styles.cardBody]}>Not in any team.</Text>
        )}
        {memberOf.map(id => (
          <View key={id} style={styles.membership}>
            <View style={styles.membershipHeader}>
              <Text style={styles.membershipName}>{teamName(id)}</Text>
              <Button
                compact
                textColor={colors.high}
                disabled={!!busy}
                loading={busy === `remove-${id}`}
                onPress={() =>
                  confirm(
                    `Remove from ${teamName(id)}?`,
                    `${employee.name} will no longer see this team's tasks.`,
                    'Remove',
                    () =>
                      act(`remove-${id}`, () => setTeamAccess(employeeId, id, null), 'Removed from team'),
                  )
                }>
                Remove
              </Button>
            </View>
            <SegmentedButtons
              density="small"
              value={teamRoles[id] ?? 'member'}
              onValueChange={v =>
                v !== teamRoles[id] &&
                act(`role-${id}`, () => setTeamAccess(employeeId, id, v as UserRole), 'Role updated')
              }
              buttons={[
                { value: 'member', label: 'Member', disabled: !!busy },
                { value: 'admin', label: 'Team admin', disabled: !!busy },
              ]}
            />
          </View>
        ))}

        <View style={styles.cardBody}>
          <Text style={styles.addTitle}>Add to a team</Text>
          {teams.length === 0 ? (
            <Text style={styles.hint}>No teams yet. Create one under Super Admin → Teams.</Text>
          ) : addableTeams.length === 0 ? (
            <Text style={styles.hint}>Already in every team.</Text>
          ) : (
            <>
              <Menu
                visible={teamMenuOpen}
                onDismiss={() => setTeamMenuOpen(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="menu-down"
                    contentStyle={styles.menuButton}
                    onPress={() => setTeamMenuOpen(true)}>
                    {newTeamId ? teamName(newTeamId) : 'Choose team'}
                  </Button>
                }>
                {addableTeams.map(t => (
                  <Menu.Item
                    key={t.id}
                    title={t.name}
                    onPress={() => {
                      setNewTeamId(t.id);
                      setTeamMenuOpen(false);
                    }}
                  />
                ))}
              </Menu>
              <SegmentedButtons
                style={styles.segment}
                value={newRole}
                onValueChange={v => setNewRole(v as UserRole)}
                buttons={[
                  { value: 'member', label: 'Member' },
                  { value: 'admin', label: 'Team admin' },
                ]}
              />
              <Button
                mode="contained"
                style={styles.save}
                disabled={!newTeamId || !!busy}
                loading={busy === 'add'}
                onPress={() =>
                  newTeamId &&
                  act('add', () => setTeamAccess(employeeId, newTeamId, newRole), 'Added to team').then(
                    () => {
                      setNewTeamId(null);
                      setNewRole('member');
                    },
                  )
                }>
                Add to team
              </Button>
            </>
          )}
        </View>
      </View>

      <Text style={styles.section}>Actions</Text>
      <Button
        mode="outlined"
        icon="pencil-outline"
        style={styles.action}
        disabled={!!busy}
        onPress={() => navigation.navigate('EmployeeForm', { employeeId })}>
        Edit name, department or date of birth
      </Button>
      {locked && (
        <Button
          mode="outlined"
          icon="lock-open-variant-outline"
          style={styles.action}
          loading={busy === 'unlock'}
          disabled={!!busy}
          onPress={() => act('unlock', () => unlockEmployee(employeeId), 'Account unlocked')}>
          Unlock login
        </Button>
      )}
      {!!employee.uid && employee.active && (
        <Button
          mode="outlined"
          icon="cellphone-remove"
          style={styles.action}
          loading={busy === 'logout'}
          disabled={!!busy || isMe}
          onPress={() =>
            confirm(
              'Log out from phone?',
              `${employee.name} will be logged out and must log in again.`,
              'Log out',
              () => act('logout', () => logoutEmployee(employeeId), 'Logged out'),
            )
          }>
          Log out from phone
        </Button>
      )}
      <Button
        mode="outlined"
        icon={employee.superAdmin ? 'shield-remove-outline' : 'shield-account-outline'}
        style={styles.action}
        loading={busy === 'super'}
        disabled={!!busy || (isMe && employee.superAdmin)}
        onPress={() =>
          confirm(
            employee.superAdmin ? 'Remove super admin?' : 'Make super admin?',
            employee.superAdmin
              ? `${employee.name} will no longer be able to manage employees.`
              : `${employee.name} will be able to manage all employees, teams and access.`,
            employee.superAdmin ? 'Remove' : 'Make super admin',
            () =>
              act(
                'super',
                () => setSuperAdmin(employeeId, !employee.superAdmin),
                employee.superAdmin ? 'Super admin removed' : 'Super admin granted',
              ),
          )
        }>
        {employee.superAdmin ? 'Remove super admin' : 'Make super admin'}
      </Button>
      <Button
        mode="outlined"
        icon={employee.active ? 'account-off-outline' : 'account-check-outline'}
        textColor={employee.active ? colors.high : colors.low}
        style={[styles.action, { borderColor: employee.active ? colors.high : colors.low }]}
        loading={busy === 'active'}
        disabled={!!busy || isMe}
        onPress={() =>
          employee.active
            ? confirm(
                'Deactivate employee?',
                `${employee.name} will be logged out and cannot log in until reactivated.`,
                'Deactivate',
                () => act('active', () => setEmployeeActive(employeeId, false), 'Employee deactivated'),
              )
            : act('active', () => setEmployeeActive(employeeId, true), 'Employee reactivated')
        }>
        {employee.active ? 'Deactivate' : 'Reactivate'}
      </Button>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  cardBody: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.textMuted,
  },
  rowValue: {
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  section: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  membership: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  membershipName: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  addTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  menuButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  hint: {
    color: colors.textMuted,
    marginTop: 8,
  },
  segment: {
    marginTop: 12,
  },
  save: {
    marginTop: 12,
    borderRadius: 10,
  },
  action: {
    borderRadius: 10,
    marginBottom: 10,
  },
});
