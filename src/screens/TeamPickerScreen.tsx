import React, { useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeams } from '../hooks/useTeam';
import { createTeam } from '../services/team';
import { RootStackParamList } from '../types';
import { canManageTeams, roleInTeams } from '../utils/roles';

/**
 * Home → Team when the employee is in several teams, and always for admins, who can also
 * create teams here.
 */
export default function TeamPickerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, setActiveTeamId } = useAuthContext();
  const { teams, loading } = useTeams(profile?.teamIds ?? []);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!profile) return null;
  const isAdmin = canManageTeams(profile);
  const roleLabel = roleInTeams(profile) === 'admin' ? 'Admin' : 'Member';

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createTeam(name);
      Toast.show({ type: 'success', text1: `Team ${name} created`, text2: 'Open it to add members.' });
      setCreating(false);
      setNewName('');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not create team', text2: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.list}
        data={teams}
        keyExtractor={t => t.id}
        ListHeaderComponent={
          teams.length > 0 ? <Text style={styles.heading}>Choose a team</Text> : undefined
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isAdmin ? 'You have no teams yet. Create one below.' : 'You are not in any team.'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              setActiveTeamId(item.id);
              navigation.navigate('Main');
            }}>
            <View style={styles.iconWrap}>
              <Icon name="account-group-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.text}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.role}>{roleLabel}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        ListFooterComponent={
          isAdmin ? (
            <Button
              mode="outlined"
              icon="plus"
              style={styles.create}
              onPress={() => setCreating(true)}>
              Create team
            </Button>
          ) : undefined
        }
      />

      <Portal>
        <Dialog visible={creating} onDismiss={() => !saving && setCreating(false)}>
          <Dialog.Title>New team</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Team name"
              placeholder="e.g. Purchase - Imports"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <Text style={styles.hint}>You will be the team's admin and can add members.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreating(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onPress={handleCreate} loading={saving} disabled={saving || !newName.trim()}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
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
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 24,
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
  create: {
    borderRadius: 10,
    marginTop: 6,
  },
  hint: {
    color: colors.textMuted,
    marginTop: 10,
  },
});
