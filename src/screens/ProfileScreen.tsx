import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { signOutUser } from '../services/auth';
import { getTeam } from '../services/team';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Team } from '../types';
import { formatDateTime } from '../utils/helpers';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuthContext();
  const [team, setTeam] = useState<Team | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (profile?.teamId) {
      getTeam(profile.teamId).then(setTeam).catch(() => setTeam(null));
    }
  }, [profile?.teamId]);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            // Auth listener in useAuth switches the navigator back to Login.
            await signOutUser();
          } catch (e: any) {
            setSigningOut(false);
            Toast.show({ type: 'error', text1: 'Logout failed', text2: e?.message });
          }
        },
      },
    ]);
  };

  if (!profile) return null;

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>
            {profile.superAdmin
              ? 'Super Admin'
              : !profile.teamId
              ? 'Employee'
              : profile.role === 'admin'
              ? 'Admin'
              : 'Member'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Employee ID" value={profile.employeeId} />
        <Row label="Department" value={profile.department || '—'} />
        <Row label="Phone" value={profile.phone || '—'} />
        <Row label="Team" value={team?.name ?? '—'} />
        <Row label="Member since" value={formatDateTime(profile.createdAt)} last />
      </View>

      {profile.superAdmin && (
        <Button
          mode="contained"
          icon="shield-account-outline"
          style={styles.superAdmin}
          onPress={() => navigation.navigate('SuperAdmin')}>
          Super Admin
        </Button>
      )}

      <Button
        mode="outlined"
        icon="logout"
        textColor={colors.high}
        style={styles.logout}
        loading={signingOut}
        disabled={signingOut}
        onPress={handleLogout}>
        Log out
      </Button>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  roleChip: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
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
  superAdmin: {
    marginTop: 24,
    borderRadius: 10,
  },
  logout: {
    marginTop: 16,
    borderColor: colors.high,
  },
});
