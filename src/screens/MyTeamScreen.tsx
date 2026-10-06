import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeam, useTeamMembers } from '../hooks/useTeam';
import { useTeamTasks } from '../hooks/useTasks';

export default function MyTeamScreen() {
  const { profile } = useAuthContext();
  const { team, loading: teamLoading } = useTeam(profile?.teamId ?? null);
  const { members, loading: membersLoading } = useTeamMembers(profile?.teamId ?? null);
  const { tasks } = useTeamTasks(profile?.teamId ?? null);
  const taskCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => {
      map[t.assigneeUid] = (map[t.assigneeUid] ?? 0) + 1;
    });
    return map;
  }, [tasks]);

  if (teamLoading || membersLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {team && <Text style={styles.teamName}>{team.name}</Text>}

      <Text style={styles.sectionTitle}>Team Members ({members.length})</Text>
      <FlatList
        data={members}
        keyExtractor={m => m.uid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No team members yet. Ask the super admin to add some.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {item.name} {item.role === 'admin' ? '(Admin)' : ''}
              </Text>
              <Text style={styles.memberPhone}>
                ID {item.employeeId}
                {item.phone ? ` · ${item.phone}` : ' · not logged in yet'}
              </Text>
              <Text style={styles.memberTasks}>
                {taskCounts[item.uid] ?? 0} task(s) assigned
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: colors.text,
    marginBottom: 8,
  },
  list: {
    paddingBottom: 24,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 20,
    textAlign: 'center',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  memberName: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 16,
  },
  memberPhone: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  memberTasks: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 2,
  },
});
