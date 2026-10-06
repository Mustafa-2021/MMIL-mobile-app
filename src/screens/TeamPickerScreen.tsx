import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeams } from '../hooks/useTeam';
import { RootStackParamList } from '../types';

/** Shown from Home → Team when the employee belongs to more than one team. */
export default function TeamPickerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, setActiveTeamId } = useAuthContext();
  const { teams, loading } = useTeams(profile?.teamIds ?? []);

  if (loading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={teams}
      keyExtractor={t => t.id}
      ListHeaderComponent={<Text style={styles.heading}>Choose a team</Text>}
      renderItem={({ item }) => {
        const role = profile?.teamRoles[item.id] === 'admin' ? 'Team admin' : 'Member';
        return (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              setActiveTeamId(item.id);
              navigation.replace('Main');
            }}>
            <View style={styles.iconWrap}>
              <Icon name="account-group-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.text}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.role}>{role}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
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
  loading: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  heading: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  text: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  role: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
