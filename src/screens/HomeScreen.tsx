import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, FAB, Menu, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useMyTasks, useTeamTasks } from '../hooks/useTasks';
import { useTeamMembers } from '../hooks/useTeam';
import TaskCard from '../components/TaskCard';
import { RootStackParamList, TaskPriority, TaskStatus } from '../types';
import { isOverdue } from '../utils/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function MemberHome() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthContext();
  const { tasks, loading } = useMyTasks(profile?.teamId ?? null, profile?.uid ?? null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.greeting}>
        Hi, {profile?.name?.split(' ')[0]}
      </Text>
      <Text style={styles.subGreeting}>Here are your assigned tasks</Text>
      <FlatList
        data={tasks}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState message="No tasks assigned to you yet." />}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
          />
        )}
      />
    </View>
  );
}

function AdminHome() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthContext();
  const { tasks, loading } = useTeamTasks(profile?.teamId ?? null);
  const { members } = useTeamMembers(profile?.teamId ?? null);
  const [refreshing] = useState(false);

  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [priorityMenu, setPriorityMenu] = useState(false);

  const counts = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
    return { total, inProgress, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (assigneeFilter && t.assigneeUid !== assigneeFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, assigneeFilter, statusFilter, priorityFilter]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: colors.inProgress }]}>
            {counts.inProgress}
          </Text>
          <Text style={styles.summaryLabel}>In Progress</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: colors.overdue }]}>
            {counts.overdue}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Menu
          visible={assigneeMenu}
          onDismiss={() => setAssigneeMenu(false)}
          anchor={
            <Chip
              icon="account"
              onPress={() => setAssigneeMenu(true)}
              style={styles.filterChip}
              selected={!!assigneeFilter}>
              {assigneeFilter
                ? members.find(m => m.uid === assigneeFilter)?.name ?? 'Assignee'
                : 'Assignee'}
            </Chip>
          }>
          <Menu.Item onPress={() => { setAssigneeFilter(null); setAssigneeMenu(false); }} title="All" />
          {members.map(m => (
            <Menu.Item
              key={m.uid}
              onPress={() => { setAssigneeFilter(m.uid); setAssigneeMenu(false); }}
              title={m.name}
            />
          ))}
        </Menu>

        <Menu
          visible={statusMenu}
          onDismiss={() => setStatusMenu(false)}
          anchor={
            <Chip
              icon="progress-check"
              onPress={() => setStatusMenu(true)}
              style={styles.filterChip}
              selected={!!statusFilter}>
              {statusFilter ?? 'Status'}
            </Chip>
          }>
          <Menu.Item onPress={() => { setStatusFilter(null); setStatusMenu(false); }} title="All" />
          {(['To Do', 'In Progress', 'Done'] as TaskStatus[]).map(s => (
            <Menu.Item key={s} onPress={() => { setStatusFilter(s); setStatusMenu(false); }} title={s} />
          ))}
        </Menu>

        <Menu
          visible={priorityMenu}
          onDismiss={() => setPriorityMenu(false)}
          anchor={
            <Chip
              icon="flag"
              onPress={() => setPriorityMenu(true)}
              style={styles.filterChip}
              selected={!!priorityFilter}>
              {priorityFilter ?? 'Priority'}
            </Chip>
          }>
          <Menu.Item onPress={() => { setPriorityFilter(null); setPriorityMenu(false); }} title="All" />
          {(['High', 'Medium', 'Low'] as TaskPriority[]).map(p => (
            <Menu.Item key={p} onPress={() => { setPriorityFilter(p); setPriorityMenu(false); }} title={p} />
          ))}
        </Menu>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}
        ListEmptyComponent={<EmptyState message="No tasks match these filters." />}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            showAssignee
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
          />
        )}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color={colors.white}
        onPress={() => navigation.navigate('CreateTask')}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { profile } = useAuthContext();
  if (profile?.role === 'admin') return <AdminHome />;
  return <MemberHome />;
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
  greeting: {
    fontWeight: '800',
    color: colors.text,
  },
  subGreeting: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: colors.surface,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
  },
});
