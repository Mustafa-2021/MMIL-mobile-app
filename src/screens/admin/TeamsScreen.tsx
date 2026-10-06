import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors } from '../../theme/theme';
import { createTeam, subscribeTeams } from '../../services/admin';
import { Team } from '../../types';
import { formatDate } from '../../utils/helpers';

/** Teams for the Team section (task management). Members are assigned from an employee's page. */
export default function TeamsScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeTeams(setTeams), []);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (teams.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      Toast.show({ type: 'error', text1: `A team called ${trimmed} already exists` });
      return;
    }
    setSaving(true);
    try {
      await createTeam(trimmed, false);
      setName('');
      Toast.show({ type: 'success', text1: `Team ${trimmed} created` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not create team', text2: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          mode="outlined"
          label="New team name"
          placeholder="e.g. Purchase"
          value={name}
          onChangeText={setName}
          style={styles.input}
          dense
        />
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={saving}
          disabled={saving || !name.trim()}
          style={styles.button}>
          Create
        </Button>
      </View>
      <Text style={styles.hint}>
        Add members from an employee's page (Employees). Admins can also create their own teams and add members from the app's Team section.
      </Text>
      <FlatList
        data={teams}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No teams yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>Created {formatDate(item.createdAt)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  form: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 10,
  },
  button: {
    borderRadius: 10,
    marginTop: 6,
  },
  hint: {
    color: colors.textMuted,
    marginVertical: 12,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
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
});
