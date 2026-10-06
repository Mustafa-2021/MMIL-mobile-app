import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/theme';
import { subscribeAuditLog } from '../../services/admin';
import { AuditEntry } from '../../types';
import { formatDateTime } from '../../utils/helpers';

const LABELS: Record<string, { icon: string; color: string; text: (e: AuditEntry) => string }> = {
  login: { icon: 'login', color: colors.low, text: () => 'Logged in' },
  'number-change': {
    icon: 'cellphone-arrow-down',
    color: colors.medium,
    text: e => `Changed mobile ${e.previousPhone ?? ''} → ${e.phone ?? ''}`,
  },
  lockout: { icon: 'lock-alert-outline', color: colors.high, text: () => 'Locked after 5 wrong attempts' },
  unlocked: { icon: 'lock-open-variant-outline', color: colors.primary, text: () => 'Unlocked' },
  'forced-logout': { icon: 'cellphone-remove', color: colors.primary, text: () => 'Logged out by admin' },
  deactivated: { icon: 'account-off-outline', color: colors.high, text: () => 'Deactivated' },
  activated: { icon: 'account-check-outline', color: colors.low, text: () => 'Reactivated' },
  'super-admin-granted': { icon: 'shield-account-outline', color: colors.primary, text: () => 'Made super admin' },
  'super-admin-removed': { icon: 'shield-remove-outline', color: colors.primary, text: () => 'Super admin removed' },
  'team-access': { icon: 'account-group-outline', color: colors.primary, text: e => `Team: ${e.details ?? ''}` },
  'team-created': { icon: 'account-multiple-plus-outline', color: colors.primary, text: e => `Team created: ${e.details ?? ''}` },
  'employee-added': { icon: 'account-plus-outline', color: colors.primary, text: () => 'Employee added' },
  'employee-edited': {
    icon: 'account-edit-outline',
    color: colors.primary,
    text: e => (e.details ? `Employee edited (${e.details})` : 'Employee edited'),
  },
  import: { icon: 'file-upload-outline', color: colors.primary, text: e => `HR sheet imported: ${e.details ?? ''}` },
};

export default function ActivityLogScreen() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => subscribeAuditLog(setEntries), []);

  if (!entries) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={entries}
      keyExtractor={e => e.id}
      ListEmptyComponent={<Text style={styles.empty}>No activity yet.</Text>}
      renderItem={({ item }) => {
        const label = LABELS[item.type] ?? { icon: 'information-outline', color: colors.textMuted, text: () => item.type };
        const who = item.name ? `${item.name} (${item.employeeId})` : null;
        const by = item.actorName ? `by ${item.actorName}` : null;
        return (
          <View style={styles.row}>
            <Icon name={label.icon} size={22} color={label.color} style={styles.icon} />
            <View style={styles.text}>
              {who && <Text style={styles.who}>{who}</Text>}
              <Text style={styles.what}>{label.text(item)}</Text>
              <Text style={styles.meta}>
                {formatDateTime(item.createdAt)}
                {by ? ` · ${by}` : ''}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  loading: {
    marginTop: 40,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  text: {
    flex: 1,
  },
  who: {
    fontWeight: '700',
    color: colors.text,
  },
  what: {
    color: colors.text,
    marginTop: 1,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
});
