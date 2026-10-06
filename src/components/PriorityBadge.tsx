import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import { TaskPriority } from '../types';

const priorityColor: Record<TaskPriority, string> = {
  High: colors.high,
  Medium: colors.medium,
  Low: colors.low,
};

export default function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <View style={[styles.badge, { backgroundColor: priorityColor[priority] }]}>
      <Text style={styles.text}>{priority}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
