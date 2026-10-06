import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Searchbar, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/theme';
import { searchEmployees } from '../../services/admin';
import { Employee, RootStackParamList } from '../../types';
import EmployeeStatusChip from '../../components/EmployeeStatusChip';

export default function EmployeesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [text, setText] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const runSearch = useCallback(async (term: string) => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const list = await searchEmployees(term);
      if (id === requestId.current) setResults(list);
    } catch (e: any) {
      if (id === requestId.current) setError(e?.message ?? 'Search failed');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // Debounced search as the admin types.
  useEffect(() => {
    const t = setTimeout(() => runSearch(text), 300);
    return () => clearTimeout(t);
  }, [text, runSearch]);

  // Refresh when coming back from an employee's page (status may have changed).
  const textRef = useRef(text);
  textRef.current = text;
  useFocusEffect(
    useCallback(() => {
      runSearch(textRef.current);
    }, [runSearch]),
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Employee ID or name"
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={e => e.employeeId}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          loading ? <ActivityIndicator style={styles.loading} /> : undefined
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {text ? 'No employees match this search.' : 'No employees yet. Import the HR sheet first.'}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.employeeId })}>
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.employeeId}
                {item.department ? ` · ${item.department}` : ''}
              </Text>
            </View>
            <EmployeeStatusChip employee={item} />
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
  },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loading: {
    marginVertical: 12,
  },
  error: {
    color: colors.high,
    marginHorizontal: 16,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  rowText: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 16,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
