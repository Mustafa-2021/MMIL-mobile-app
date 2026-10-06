import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors } from '../../theme/theme';
import { pickEmployeeSheet } from '../../services/employeeImport';
import { importEmployees } from '../../services/admin';
import { EmployeeImportRow, ImportSummary } from '../../types';

type Sheet = {
  fileName: string;
  rows: EmployeeImportRow[];
  problems: string[];
  columns: Record<keyof EmployeeImportRow, string>;
};

/** Pick the HR sheet → check (dry run on the server) → confirm import. */
export default function ImportEmployeesScreen() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [deactivateMissing, setDeactivateMissing] = useState(false);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState<'pick' | 'check' | 'import' | null>(null);

  const reset = () => {
    setPreview(null);
    setResult(null);
  };

  const handlePick = async () => {
    setBusy('pick');
    try {
      const picked = await pickEmployeeSheet();
      if (picked) {
        setSheet(picked);
        reset();
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not read the sheet', text2: e?.message });
    } finally {
      setBusy(null);
    }
  };

  const run = async (dryRun: boolean) => {
    if (!sheet) return;
    setBusy(dryRun ? 'check' : 'import');
    try {
      const summary = await importEmployees(sheet.rows, { dryRun, deactivateMissing });
      if (dryRun) setPreview(summary);
      else {
        setResult(summary);
        setPreview(null);
        Toast.show({ type: 'success', text1: 'Employees imported' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: dryRun ? 'Check failed' : 'Import failed', text2: e?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.help}>
        Upload an Excel (.xlsx) or CSV file with the columns Employee ID, Name, Date of Birth and
        Department. Uploading again later adds new employees and updates changed ones.
      </Text>

      <Button
        mode={sheet ? 'outlined' : 'contained'}
        icon="file-excel-outline"
        onPress={handlePick}
        loading={busy === 'pick'}
        disabled={!!busy}
        style={styles.button}>
        {sheet ? 'Choose a different file' : 'Choose file'}
      </Button>

      {sheet && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{sheet.fileName}</Text>
          <Line label="Employee ID column" value={sheet.columns.employeeId} />
          <Line label="Name column" value={sheet.columns.name} />
          <Line label="Date of birth column" value={sheet.columns.dob} />
          <Line label="Department column" value={sheet.columns.department} />
          <Line label="Employees read" value={String(sheet.rows.length)} strong />
          {sheet.problems.length > 0 && (
            <>
              <Text style={styles.warning}>
                {sheet.problems.length} row(s) will be skipped:
              </Text>
              {sheet.problems.slice(0, 20).map(p => (
                <Text key={p} style={styles.problem}>
                  • {p}
                </Text>
              ))}
              {sheet.problems.length > 20 && (
                <Text style={styles.problem}>…and {sheet.problems.length - 20} more</Text>
              )}
            </>
          )}
        </View>
      )}

      {sheet && sheet.rows.length > 0 && !result && (
        <>
          <Checkbox.Item
            label="Deactivate employees who are not in this sheet (people who have left)"
            status={deactivateMissing ? 'checked' : 'unchecked'}
            onPress={() => {
              setDeactivateMissing(v => !v);
              setPreview(null);
            }}
            position="leading"
            labelStyle={styles.checkboxLabel}
            style={styles.checkbox}
            disabled={!!busy}
          />
          {!preview ? (
            <Button
              mode="contained"
              onPress={() => run(true)}
              loading={busy === 'check'}
              disabled={!!busy}
              style={styles.button}>
              Check changes
            </Button>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This import will:</Text>
              <Summary summary={preview} />
              {preview.deactivated > 0 && (
                <Text style={styles.warning}>
                  {preview.deactivated} employee(s) will be logged out and blocked.
                </Text>
              )}
              <Button
                mode="contained"
                onPress={() => run(false)}
                loading={busy === 'import'}
                disabled={!!busy}
                style={styles.confirm}>
                Import now
              </Button>
            </View>
          )}
        </>
      )}

      {result && (
        <View style={[styles.card, styles.done]}>
          <Text style={styles.cardTitle}>Import complete</Text>
          <Summary summary={result} />
        </View>
      )}
    </ScrollView>
  );
}

function Summary({ summary }: { summary: ImportSummary }) {
  return (
    <>
      <Line label="New employees" value={String(summary.created)} />
      <Line label="Updated" value={String(summary.updated)} />
      <Line label="Reactivated" value={String(summary.reactivated)} />
      <Line label="Unchanged" value={String(summary.unchanged)} />
      <Line label="Deactivated" value={String(summary.deactivated)} />
      {summary.errorCount > 0 && (
        <>
          <Text style={styles.warning}>{summary.errorCount} row(s) rejected by the server:</Text>
          {summary.errors.map(e => (
            <Text key={e} style={styles.problem}>
              • {e}
            </Text>
          ))}
        </>
      )}
    </>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  help: {
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: 16,
  },
  button: {
    borderRadius: 10,
    marginBottom: 16,
  },
  confirm: {
    borderRadius: 10,
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  done: {
    borderColor: colors.low,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineLabel: {
    color: colors.textMuted,
  },
  lineValue: {
    color: colors.text,
    fontWeight: '600',
    marginLeft: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  strong: {
    color: colors.primary,
    fontWeight: '800',
  },
  warning: {
    color: colors.high,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  problem: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  checkboxLabel: {
    textAlign: 'left',
    color: colors.text,
  },
});
