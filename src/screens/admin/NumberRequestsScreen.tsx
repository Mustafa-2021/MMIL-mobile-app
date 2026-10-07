import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors } from '../../theme/theme';
import { decideNumberChange, subscribePendingNumberRequests } from '../../services/admin';
import { NumberChangeRequest } from '../../types';
import { formatDateTime } from '../../utils/helpers';

/**
 * Employees asking to log in with a new mobile number. Calling them on the old number before
 * approving confirms the request is really theirs.
 */
export default function NumberRequestsScreen() {
  const [requests, setRequests] = useState<NumberChangeRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribePendingNumberRequests(setRequests), []);

  const decide = (r: NumberChangeRequest, approve: boolean) =>
    Alert.alert(
      approve ? 'Approve number change?' : 'Reject request?',
      approve
        ? `${r.name} will log in with ${r.newPhone} from now on. ${r.oldPhone} stops working and that phone is logged out.`
        : `${r.name} keeps using ${r.oldPhone}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setBusy(r.employeeId);
            try {
              await decideNumberChange(r.employeeId, approve);
              Toast.show({ type: 'success', text1: approve ? 'Number change approved' : 'Request rejected' });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Could not complete', text2: e?.message });
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  if (!requests) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={requests}
      keyExtractor={r => r.employeeId}
      ListHeaderComponent={
        requests.length > 0 ? (
          <Text style={styles.help}>
            Tip: call the employee on their old number to confirm before approving.
          </Text>
        ) : undefined
      }
      ListEmptyComponent={<Text style={styles.empty}>No pending requests.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.employeeId}
            {item.department ? ` · ${item.department}` : ''} · {formatDateTime(item.requestedAt)}
          </Text>
          <View style={styles.numbers}>
            <Number label="Current" value={item.oldPhone} />
            <Number label="New" value={item.newPhone} highlight />
          </View>
          {busy === item.employeeId ? (
            <ActivityIndicator style={styles.busy} />
          ) : (
            <View style={styles.actions}>
              <Button
                icon="phone-outline"
                compact
                onPress={() => Linking.openURL(`tel:${item.oldPhone}`)}>
                Call
              </Button>
              <View style={styles.spacer} />
              <Button compact textColor={colors.high} disabled={!!busy} onPress={() => decide(item, false)}>
                Reject
              </Button>
              <Button mode="contained" compact disabled={!!busy} onPress={() => decide(item, true)}>
                Approve
              </Button>
            </View>
          )}
        </View>
      )}
    />
  );
}

function Number({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.number}>
      <Text style={styles.numberLabel}>{label}</Text>
      <Text style={[styles.numberValue, highlight && styles.numberNew]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  help: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  numbers: {
    flexDirection: 'row',
    marginTop: 12,
  },
  number: {
    flex: 1,
  },
  numberLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  numberValue: {
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  numberNew: {
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  busy: {
    marginTop: 12,
  },
});
