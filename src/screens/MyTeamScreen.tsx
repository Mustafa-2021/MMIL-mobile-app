import React, { useMemo, useState } from 'react';
import { FlatList, Share, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Portal, Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeam, useTeamMembers } from '../hooks/useTeam';
import { useTeamTasks } from '../hooks/useTasks';
import { removeMember } from '../services/team';
import { AppUser } from '../types';

export default function MyTeamScreen() {
  const { profile } = useAuthContext();
  const { team, loading: teamLoading } = useTeam(profile?.teamId ?? null);
  const { members, loading: membersLoading } = useTeamMembers(profile?.teamId ?? null);
  const { tasks } = useTeamTasks(profile?.teamId ?? null);
  const [memberToRemove, setMemberToRemove] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);

  const taskCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => {
      map[t.assigneeUid] = (map[t.assigneeUid] ?? 0) + 1;
    });
    return map;
  }, [tasks]);

  const handleShareCode = async () => {
    if (!team) return;
    try {
      await Share.share({
        message: `Join our team on the Purchase app! Use invite code: ${team.inviteCode}`,
      });
    } catch {
      // user dismissed share sheet
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    setBusy(true);
    try {
      await removeMember(memberToRemove.uid);
      Toast.show({ type: 'success', text1: `${memberToRemove.name} removed from team` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not remove member', text2: e?.message });
    } finally {
      setBusy(false);
      setMemberToRemove(null);
    }
  };

  if (teamLoading || membersLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {team && (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Team Invite Code</Text>
          <Text style={styles.codeValue}>{team.inviteCode}</Text>
          <Button mode="contained" icon="share-variant" onPress={handleShareCode} style={styles.shareButton}>
            Share Invite Code
          </Button>
        </View>
      )}

      <Text style={styles.sectionTitle}>Team Members ({members.length})</Text>
      <FlatList
        data={members}
        keyExtractor={m => m.uid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No team members yet. Share the invite code to add some.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {item.name} {item.role === 'admin' ? '(Admin)' : ''}
              </Text>
              <Text style={styles.memberPhone}>{item.phone}</Text>
              <Text style={styles.memberTasks}>
                {taskCounts[item.uid] ?? 0} task(s) assigned
              </Text>
            </View>
            {item.role !== 'admin' && (
              <Button compact textColor={colors.overdue} onPress={() => setMemberToRemove(item)}>
                Remove
              </Button>
            )}
          </View>
        )}
      />

      <Portal>
        <Dialog visible={!!memberToRemove} onDismiss={() => setMemberToRemove(null)}>
          <Dialog.Title>Remove {memberToRemove?.name}?</Dialog.Title>
          <Dialog.Content>
            <Text>They will lose access to this team's tasks.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMemberToRemove(null)}>Cancel</Button>
            <Button onPress={handleRemove} loading={busy} textColor={colors.overdue}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  codeLabel: {
    color: colors.textMuted,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 4,
    marginBottom: 12,
  },
  shareButton: {
    borderRadius: 10,
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
