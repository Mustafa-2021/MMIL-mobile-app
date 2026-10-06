import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  IconButton,
  Portal,
  Searchbar,
  Text,
  TextInput,
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeam, useTeamMembers } from '../hooks/useTeam';
import { useTeamTasks } from '../hooks/useTasks';
import {
  addTeamMember,
  EmployeeSummary,
  removeTeamMember,
  renameTeam,
  searchEmployeesForTeam,
} from '../services/team';
import { AppUser } from '../types';
import { canManageTeams } from '../utils/roles';

export default function MyTeamScreen() {
  const { profile } = useAuthContext();
  const teamId = profile?.teamId ?? null;
  const { team, loading: teamLoading } = useTeam(teamId);
  const { members, loading: membersLoading } = useTeamMembers(teamId);
  const { tasks } = useTeamTasks(teamId);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  const canManage = canManageTeams(profile);
  const shownName = teamName ?? team?.name;

  const taskCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => {
      map[t.assigneeUid] = (map[t.assigneeUid] ?? 0) + 1;
    });
    return map;
  }, [tasks]);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'admin' ? -1 : 1,
      ),
    [members],
  );

  const handleRemove = (member: AppUser) => {
    if (!teamId) return;
    Alert.alert(
      `Remove ${member.name}?`,
      `They will no longer see ${shownName ?? 'this team'}'s tasks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusyId(member.uid);
            try {
              await removeTeamMember(teamId, member.employeeId);
              Toast.show({ type: 'success', text1: `${member.name} removed` });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Could not remove', text2: e?.message });
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
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
      <View style={styles.titleRow}>
        <Text style={styles.teamName} numberOfLines={2}>
          {shownName}
        </Text>
        {canManage && team && (
          <IconButton icon="pencil-outline" size={20} onPress={() => setRenaming(true)} />
        )}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Team Members ({members.length})</Text>
        {canManage && (
          <Button compact mode="contained" icon="account-plus-outline" onPress={() => setAdding(true)}>
            Add
          </Button>
        )}
      </View>
      <FlatList
        data={sortedMembers}
        keyExtractor={m => m.uid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No team members yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={styles.memberText}>
              <Text style={styles.memberName}>
                {item.name} {item.role === 'admin' ? '(Admin)' : ''}
              </Text>
              <Text style={styles.memberPhone}>
                ID {item.employeeId}
                {item.phone ? ` · ${item.phone}` : ' · not logged in yet'}
              </Text>
              <Text style={styles.memberTasks}>{taskCounts[item.uid] ?? 0} task(s) assigned</Text>
            </View>
            {canManage &&
              (busyId === item.uid ? (
                <ActivityIndicator style={styles.removeBusy} />
              ) : (
                <Button compact textColor={colors.overdue} onPress={() => handleRemove(item)}>
                  Remove
                </Button>
              ))}
          </View>
        )}
      />

      {teamId && (
        <AddMemberDialog
          visible={adding}
          teamId={teamId}
          memberIds={members.map(m => m.employeeId)}
          onDismiss={() => setAdding(false)}
        />
      )}
      {teamId && (
        <RenameDialog
          visible={renaming}
          teamId={teamId}
          current={shownName ?? ''}
          onDismiss={() => setRenaming(false)}
          onRenamed={setTeamName}
        />
      )}
    </View>
  );
}

function AddMemberDialog({
  visible,
  teamId,
  memberIds,
  onDismiss,
}: {
  visible: boolean;
  teamId: string;
  memberIds: string[];
  onDismiss: () => void;
}) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<EmployeeSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!visible) {
      setText('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const term = text.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await searchEmployeesForTeam(term);
        if (id === requestId.current) setResults(list);
      } catch (e: any) {
        if (id === requestId.current) Toast.show({ type: 'error', text1: 'Search failed', text2: e?.message });
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [text]);

  const handleAdd = async (e: EmployeeSummary) => {
    setAddingId(e.employeeId);
    try {
      await addTeamMember(teamId, e.employeeId);
      Toast.show({ type: 'success', text1: `${e.name} added` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Could not add', text2: err?.message });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Add member</Dialog.Title>
        <Dialog.Content>
          <Searchbar
            placeholder="Employee ID or name"
            value={text}
            onChangeText={setText}
            autoFocus
            autoCorrect={false}
            style={styles.search}
          />
          {searching && <ActivityIndicator style={styles.searching} />}
        </Dialog.Content>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <FlatList
            data={results}
            keyExtractor={e => e.employeeId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !searching && text.trim().length >= 2 ? (
                <Text style={styles.emptyText}>No active employee found.</Text>
              ) : undefined
            }
            renderItem={({ item }) => {
              const already = memberIds.includes(item.employeeId);
              return (
                <TouchableOpacity
                  style={styles.result}
                  disabled={already || !!addingId}
                  onPress={() => handleAdd(item)}>
                  <View style={styles.memberText}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberPhone}>
                      {item.employeeId}
                      {item.department ? ` · ${item.department}` : ''}
                    </Text>
                  </View>
                  {addingId === item.employeeId ? (
                    <ActivityIndicator />
                  ) : already ? (
                    <Text style={styles.already}>In team</Text>
                  ) : (
                    <Text style={styles.addLabel}>Add</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function RenameDialog({
  visible,
  teamId,
  current,
  onDismiss,
  onRenamed,
}: {
  visible: boolean;
  teamId: string;
  current: string;
  onDismiss: () => void;
  onRenamed: (name: string) => void;
}) {
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setName(current);
  }, [visible, current]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === current) return onDismiss();
    setSaving(true);
    try {
      await renameTeam(teamId, trimmed);
      onRenamed(trimmed);
      Toast.show({ type: 'success', text1: 'Team renamed' });
      onDismiss();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not rename', text2: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => !saving && onDismiss()}>
        <Dialog.Title>Rename team</Dialog.Title>
        <Dialog.Content>
          <TextInput mode="outlined" label="Team name" value={name} onChangeText={setName} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={saving}>
            Cancel
          </Button>
          <Button onPress={handleSave} loading={saving} disabled={saving || !name.trim()}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamName: {
    flex: 1,
    fontSize: 21,
    fontWeight: '800',
    color: colors.primary,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: colors.text,
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
  memberText: {
    flex: 1,
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
  removeBusy: {
    marginHorizontal: 16,
  },
  dialog: {
    maxHeight: '85%',
  },
  search: {
    backgroundColor: colors.surface,
  },
  searching: {
    marginTop: 12,
  },
  scrollArea: {
    paddingHorizontal: 12,
    maxHeight: 360,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  already: {
    color: colors.textMuted,
  },
  addLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
