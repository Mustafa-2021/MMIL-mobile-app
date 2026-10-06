import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';
import { ExtensionRecord } from '../types';
import { formatDate, formatDateTime } from '../utils/helpers';

export default function ExtensionHistoryList({
  history,
}: {
  history: ExtensionRecord[];
}) {
  if (!history || history.length === 0) {
    return (
      <Text style={styles.empty}>No extension requests yet.</Text>
    );
  }

  return (
    <View>
      {history.map((item, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.roundLabel}>{item.round}</Text>
          <Text style={styles.text}>
            Extended from {formatDate(item.previousDueDate)} to{' '}
            {formatDate(item.newDueDate)} on {formatDateTime(item.requestedAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
  },
  roundLabel: {
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
    minWidth: 28,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  empty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
