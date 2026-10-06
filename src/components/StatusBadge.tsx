import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import { TaskStatus } from '../types';

const statusColor: Record<TaskStatus, string> = {
  'To Do': colors.todo,
  'In Progress': colors.inProgress,
  Done: colors.done,
};

export default function StatusBadge({
  status,
  overdue,
}: {
  status: TaskStatus;
  overdue?: boolean;
}) {
  const bg = overdue ? colors.overdue : statusColor[status];
  const label = overdue ? 'Overdue' : status;
  return (
    <View style={[styles.badge, { borderColor: bg }]}>
      <Text style={[styles.text, { color: bg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});
