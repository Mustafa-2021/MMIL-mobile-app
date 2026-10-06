import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/theme';
import { Task } from '../types';
import { formatDate, isOverdue } from '../utils/helpers';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';

export default function TaskCard({
  task,
  onPress,
  showAssignee,
}: {
  task: Task;
  onPress: () => void;
  showAssignee?: boolean;
}) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        <PriorityBadge priority={task.priority} />
      </View>
      {showAssignee ? (
        <Text style={styles.assignee}>Assigned to: {task.assigneeName}</Text>
      ) : null}
      <View style={styles.categoryRow}>
        <Text style={styles.category}>{task.category}</Text>
        {task.attachment ? (
          <Icon name="paperclip" size={16} color={colors.textMuted} accessibilityLabel="Has attachment" />
        ) : null}
      </View>
      <View style={styles.bottomRow}>
        <StatusBadge status={task.status} overdue={overdue} />
        <Text style={[styles.dueDate, overdue && styles.overdueText]}>
          Due: {formatDate(task.dueDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  assignee: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  category: {
    fontSize: 14,
    color: colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  overdueText: {
    color: colors.overdue,
  },
});
