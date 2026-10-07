import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/theme';
import { RootStackParamList } from '../../types';
import { subscribePendingNumberRequests } from '../../services/admin';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ITEMS: {
  icon: string;
  title: string;
  description: string;
  route: 'Employees' | 'EmployeeForm' | 'ImportEmployees' | 'Teams' | 'ActivityLog' | 'NumberRequests';
}[] = [
  {
    icon: 'cellphone-key',
    title: 'Number change requests',
    description: 'Approve employees moving their login to a new mobile number',
    route: 'NumberRequests',
  },
  {
    icon: 'account-search-outline',
    title: 'Employees',
    description: 'Search, unlock, deactivate, assign teams and roles',
    route: 'Employees',
  },
  {
    icon: 'account-plus-outline',
    title: 'Add employee',
    description: 'Add one employee without uploading a sheet',
    route: 'EmployeeForm',
  },
  {
    icon: 'file-upload-outline',
    title: 'Import HR sheet',
    description: 'Upload the Excel list of employee IDs, names and dates of birth',
    route: 'ImportEmployees',
  },
  {
    icon: 'account-group-outline',
    title: 'Teams',
    description: 'Create teams such as Purchase, Finance, Accounts',
    route: 'Teams',
  },
  {
    icon: 'history',
    title: 'Activity log',
    description: 'Logins, number changes, lockouts and admin actions',
    route: 'ActivityLog',
  },
];

export default function SuperAdminScreen() {
  const navigation = useNavigation<Nav>();
  const [pendingNumbers, setPendingNumbers] = useState(0);
  useEffect(() => subscribePendingNumberRequests(r => setPendingNumbers(r.length)), []);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {ITEMS.map(item => (
        <TouchableOpacity
          key={item.route}
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(item.route as any)}>
          <View style={styles.iconWrap}>
            <Icon name={item.icon} size={28} color={colors.primary} />
          </View>
          <View style={styles.text}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {item.route === 'NumberRequests' && pendingNumbers > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingNumbers}</Text>
                </View>
              )}
            </View>
            <Text style={styles.description}>{item.description}</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  text: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginLeft: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.high,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  description: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
