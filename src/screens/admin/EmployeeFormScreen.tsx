import React, { useEffect, useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, HelperText, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/theme';
import { subscribeEmployee, upsertEmployee } from '../../services/admin';
import { RootStackParamList } from '../../types';
import { dobInputToIso, maskDobInput } from '../../utils/helpers';

type Route = RouteProp<RootStackParamList, 'EmployeeForm'>;

/** Add one employee, or edit one (the date of birth is only changed if a new one is typed). */
export default function EmployeeFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const editingId = useRoute<Route>().params?.employeeId;
  const [loaded, setLoaded] = useState(!editingId);
  const [employeeId, setEmployeeId] = useState(editingId ?? '');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [dobText, setDobText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editingId ? 'Edit employee' : 'Add employee' });
  }, [navigation, editingId]);

  useEffect(() => {
    if (!editingId) return;
    let first = true;
    return subscribeEmployee(editingId, e => {
      if (!first) return;
      first = false;
      if (e) {
        setName(e.name);
        setDepartment(e.department ?? '');
      }
      setLoaded(true);
    });
  }, [editingId]);

  const handleSave = async () => {
    setError('');
    const id = employeeId.trim().toUpperCase();
    if (!id) return setError('Employee ID is required.');
    if (!name.trim()) return setError('Name is required.');
    const dob = dobText ? dobInputToIso(dobText) : null;
    if (dobText && !dob) return setError('Enter the date of birth as DD/MM/YYYY.');
    if (!editingId && !dob) return setError('Date of birth is required for a new employee.');
    setSaving(true);
    try {
      const { created } = await upsertEmployee({
        employeeId: id,
        name: name.trim(),
        department: department.trim(),
        ...(dob ? { dob } : {}),
      });
      Toast.show({ type: 'success', text1: created ? 'Employee added' : 'Employee updated' });
      if (editingId) navigation.goBack();
      else navigation.replace('EmployeeDetail', { employeeId: id });
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          mode="outlined"
          label="Employee ID"
          autoCapitalize="characters"
          autoCorrect={false}
          value={employeeId}
          onChangeText={setEmployeeId}
          disabled={!!editingId}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Full name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Department"
          value={department}
          onChangeText={setDepartment}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label={editingId ? 'New date of birth (optional)' : 'Date of birth'}
          placeholder="DD/MM/YYYY"
          keyboardType="number-pad"
          maxLength={10}
          value={dobText}
          onChangeText={t => setDobText(maskDobInput(t))}
          style={styles.input}
        />
        {editingId && (
          <Text style={styles.hint}>
            Leave the date of birth empty to keep the current one. It is never shown in the app.
          </Text>
        )}
        {error ? (
          <HelperText type="error" visible style={styles.error}>
            {error}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.button}
          contentStyle={styles.buttonContent}>
          {editingId ? 'Save changes' : 'Add employee'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
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
  loading: {
    marginTop: 40,
  },
  input: {
    marginBottom: 14,
  },
  hint: {
    color: colors.textMuted,
    marginTop: -6,
    marginBottom: 12,
  },
  error: {
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
  },
  buttonContent: {
    height: 52,
  },
});
