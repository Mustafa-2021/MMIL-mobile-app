import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { subscribeMyNotifications, markNotificationRead } from '../services/notifications';
import { AppNotification } from '../types';
import { formatDateTime } from '../utils/helpers';

const typeIcon: Record<AppNotification['type'], string> = {
  assigned: '📌',
  overdue: '⏰',
  reminder: '🔔',
  status: '✅',
  extension: '📅',
  comment: '💬',
};

export default function NotificationsScreen() {
  const { profile } = useAuthContext();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeMyNotifications(
      profile.uid,
      list => {
        setItems(list);
        setLoading(false);
      },
      err => {
        console.warn('Notifications subscription failed:', err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [profile?.uid]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.unreadCard]}
            onPress={() => !item.read && markNotificationRead(item.id)}
            activeOpacity={0.7}>
            <Text style={styles.icon}>{typeIcon[item.type] ?? '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
  list: {
    paddingBottom: 24,
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 10,
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
