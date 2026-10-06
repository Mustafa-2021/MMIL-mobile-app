import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';
import { useDatePicker } from '../components/DatePicker';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeamMembers } from '../hooks/useTeam';
import { useTeamTasks } from '../hooks/useTasks';
import { exportTasksToExcel, shareExcelFile } from '../services/reports';
import { endOfDay, formatDate, startOfDay } from '../utils/helpers';

export default function ReportsScreen() {
  const { profile } = useAuthContext();
  const { members } = useTeamMembers(profile?.teamId ?? null);
  const { tasks } = useTeamTasks(profile?.teamId ?? null);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [assigneeUid, setAssigneeUid] = useState<string | null>(null);

  const [openDatePicker, datePicker] = useDatePicker();
  const pickDate = (current: Date | null, onPick: (d: Date) => void) =>
    openDatePicker({ value: current ?? new Date(), onPick });
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (fromDate && t.createdAt < startOfDay(fromDate.getTime())) return false;
      if (toDate && t.createdAt > endOfDay(toDate.getTime())) return false;
      if (assigneeUid && t.assigneeUid !== assigneeUid) return false;
      return true;
    });
  }, [tasks, fromDate, toDate, assigneeUid]);

  const handleExport = async () => {
    if (filteredTasks.length === 0) {
      Toast.show({ type: 'error', text1: 'No tasks match these filters' });
      return;
    }
    setExporting(true);
    try {
      const filePath = await exportTasksToExcel(filteredTasks);
      Toast.show({ type: 'success', text1: 'Excel file saved to Downloads' });
      await shareExcelFile(filePath);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Export failed', text2: e?.message });
    } finally {
      setExporting(false);
    }
  };

  const assigneeName = members.find(m => m.uid === assigneeUid)?.name ?? 'All members';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.heading}>
        Reports
      </Text>
      <Text style={styles.subtitle}>{filteredTasks.length} task(s) match your filters</Text>

      <Text style={styles.label}>From Date</Text>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={() => pickDate(fromDate, setFromDate)}
        style={styles.selectButton}>
        {fromDate ? formatDate(fromDate.getTime()) : 'Any'}
      </Button>

      <Text style={styles.label}>To Date</Text>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={() => pickDate(toDate, setToDate)}
        style={styles.selectButton}>
        {toDate ? formatDate(toDate.getTime()) : 'Any'}
      </Button>

      <Text style={styles.label}>Assignee (optional)</Text>
      <Menu
        visible={assigneeMenu}
        onDismiss={() => setAssigneeMenu(false)}
        anchor={
          <Button mode="outlined" onPress={() => setAssigneeMenu(true)} style={styles.selectButton}>
            {assigneeName}
          </Button>
        }>
        <Menu.Item onPress={() => { setAssigneeUid(null); setAssigneeMenu(false); }} title="All members" />
        {members.map(m => (
          <Menu.Item key={m.uid} onPress={() => { setAssigneeUid(m.uid); setAssigneeMenu(false); }} title={m.name} />
        ))}
      </Menu>

      <Button
        mode="contained"
        icon="file-excel"
        onPress={handleExport}
        loading={exporting}
        disabled={exporting}
        style={styles.exportButton}
        contentStyle={styles.exportButtonContent}>
        Export to Excel
      </Button>

      {(fromDate || toDate || assigneeUid) && (
        <Button
          mode="text"
          onPress={() => {
            setFromDate(null);
            setToDate(null);
            setAssigneeUid(null);
          }}>
          Clear Filters
        </Button>
      )}
      {datePicker}
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
    paddingBottom: 48,
  },
  heading: {
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: 20,
  },
  label: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  selectButton: {
    marginBottom: 16,
    justifyContent: 'flex-start',
  },
  exportButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  exportButtonContent: {
    height: 52,
  },
});
