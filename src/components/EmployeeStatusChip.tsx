import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import { Employee } from '../types';

export function employeeStatus(e: Employee): { label: string; color: string } {
  if (!e.active) return { label: 'Inactive', color: colors.todo };
  if (e.lockedUntil && e.lockedUntil > Date.now()) return { label: 'Locked', color: colors.high };
  if (!e.uid) return { label: 'Not logged in', color: colors.medium };
  return { label: 'Active', color: colors.low };
}

export default function EmployeeStatusChip({ employee }: { employee: Employee }) {
  const { label, color } = employeeStatus(employee);
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
