import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeams } from '../hooks/useTeam';
import { RootStackParamList } from '../types';
import { canManageTeams } from '../utils/roles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Home after login: the app's sections (HR, Visitor, Team) and, for super admins, admin. */
export default function HubScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, setActiveTeamId } = useAuthContext();
  const { teams } = useTeams(profile?.teamIds ?? []);
  if (!profile) return null;

  const teamCount = profile.teamIds.length;
  const isAdmin = canManageTeams(profile);
  const teamSubtitle =
    teamCount === 0
      ? isAdmin
        ? 'Create your first team'
        : 'You are not in any team yet'
      : teams.length
      ? teams.map(t => t.name).join(', ')
      : `${teamCount} team${teamCount === 1 ? '' : 's'}`;

  const openTeam = () => {
    if (teamCount === 1 && !isAdmin) {
      setActiveTeamId(profile.teamIds[0]);
      navigation.navigate('Main');
    } else {
      navigation.navigate('TeamPicker');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {firstName(profile.name)}</Text>
      <Text style={styles.sub}>What would you like to open?</Text>

      <SectionCard
        icon="account-tie-outline"
        title="HR"
        subtitle="Coming soon"
        color="#7C3AED"
        onPress={() => navigation.navigate('ComingSoon', { section: 'HR' })}
      />
      <SectionCard
        icon="badge-account-horizontal-outline"
        title="Visitor"
        subtitle="Gate pass and visitor approvals · Coming soon"
        color="#0E7490"
        onPress={() => navigation.navigate('ComingSoon', { section: 'Visitor' })}
      />
      <SectionCard
        icon="clipboard-check-multiple-outline"
        title="Team"
        subtitle={teamSubtitle}
        color={colors.primary}
        disabled={teamCount === 0 && !isAdmin}
        onPress={openTeam}
      />
      {profile.superAdmin && (
        <SectionCard
          icon="shield-account-outline"
          title="Super Admin"
          subtitle="Employees, teams and access"
          color={colors.text}
          onPress={() => navigation.navigate('SuperAdmin')}
        />
      )}
    </ScrollView>
  );
}

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function SectionCard({
  icon,
  title,
  subtitle,
  color,
  disabled,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Icon name={icon} size={30} color={color} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {!disabled && <Icon name="chevron-right" size={24} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  sub: {
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
