import * as XLSX from 'xlsx';
import { EmployeeImportRow } from '../types';
import { parseDobText, toIsoDate } from './helpers';

export interface ParsedSheet {
  rows: EmployeeImportRow[];
  /** Rows that could not be read, e.g. `Row 14: date of birth "31/02/1990" is not a valid date`. */
  problems: string[];
  /** Header text matched for each field, shown so the admin can confirm the right columns. */
  columns: Record<keyof EmployeeImportRow, string>;
}

type Field = keyof EmployeeImportRow;

// A heading matches a field if it contains one of these (case-insensitive, letters only).
// Fields are matched in this order, so "Employee Name" is claimed by name before the ID looks.
const HEADER_MATCHERS: [Field, string[]][] = [
  ['dob', ['dateofbirth', 'birthdate', 'dob', 'birth']],
  ['department', ['department', 'dept', 'division']],
  ['name', ['employeename', 'empname', 'fullname', 'name']],
  ['employeeId', ['employeeid', 'empid', 'employeecode', 'empcode', 'employeeno', 'empno', 'code', 'id']],
];

/** Reads the first sheet of an HR workbook: Employee ID, Name, Date of Birth, Department. */
export function parseEmployeeSheet(workbook: XLSX.WorkBook): ParsedSheet {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The file has no sheets.');
  // raw: true keeps Excel dates as serial numbers, which avoids time-zone shifts. Blank rows are
  // kept so that table index + firstRow is the row number the admin sees in Excel.
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: true });
  const firstRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r + 1 : 1;

  // The header is the first row (within the first 10) with an ID, a name and a DOB column.
  let headerIndex = -1;
  let colIndex: Partial<Record<Field, number>> = {};
  for (let i = 0; i < Math.min(table.length, 10) && headerIndex < 0; i++) {
    const found = matchHeaders(table[i] ?? []);
    if (found.employeeId != null && found.name != null && found.dob != null) {
      headerIndex = i;
      colIndex = found;
    }
  }
  if (headerIndex < 0) {
    throw new Error(
      'Could not find the column headings. The first row needs: Employee ID, Name, Date of Birth (and optionally Department).',
    );
  }
  const header = table[headerIndex] ?? [];
  const heading = (f: Field) => (colIndex[f] != null ? String(header[colIndex[f]!] ?? '') : '—');
  const columns = {
    employeeId: heading('employeeId'),
    name: heading('name'),
    dob: heading('dob'),
    department: heading('department'),
  };

  const rows: EmployeeImportRow[] = [];
  const problems: string[] = [];
  for (let i = headerIndex + 1; i < table.length; i++) {
    const r = table[i] ?? [];
    const line = i + firstRow;
    const rawId = cell(r, colIndex.employeeId);
    const name = String(cell(r, colIndex.name) ?? '').trim();
    const rawDob = cell(r, colIndex.dob);
    if (rawId == null && !name && rawDob == null) continue;

    const employeeId =
      typeof rawId === 'number' ? String(Math.trunc(rawId)) : String(rawId ?? '').trim();
    if (!employeeId) {
      problems.push(`Row ${line}: employee ID is missing`);
      continue;
    }
    if (!name) {
      problems.push(`Row ${line}: name is missing (ID ${employeeId})`);
      continue;
    }
    const dob = readDob(rawDob);
    if (!dob) {
      problems.push(`Row ${line}: date of birth "${rawDob ?? ''}" is not a valid date (ID ${employeeId})`);
      continue;
    }
    rows.push({
      employeeId,
      name: name.replace(/\s+/g, ' '),
      dob,
      department: String(cell(r, colIndex.department) ?? '').trim(),
    });
  }
  return { rows, problems, columns };
}

function matchHeaders(row: unknown[]): Partial<Record<Field, number>> {
  const headings = row.map(h => String(h ?? '').toLowerCase().replace(/[^a-z]/g, ''));
  const result: Partial<Record<Field, number>> = {};
  const taken = new Set<number>();
  for (const [field, needles] of HEADER_MATCHERS) {
    for (const needle of needles) {
      const idx = headings.findIndex(
        (h, i) => !!h && !taken.has(i) && (needle === 'id' ? h === 'id' || h.endsWith('id') : h.includes(needle)),
      );
      if (idx >= 0) {
        result[field] = idx;
        taken.add(idx);
        break;
      }
    }
  }
  return result;
}

function cell(row: unknown[], index: number | undefined): unknown {
  if (index == null) return null;
  const v = row[index];
  return v === '' || v === undefined ? null : v;
}

function readDob(value: unknown): string | null {
  if (typeof value === 'number') {
    const p = XLSX.SSF.parse_date_code(value);
    return p ? toIsoDate(p.y, p.m, p.d) : null;
  }
  if (value instanceof Date) {
    return toIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  return typeof value === 'string' ? parseDobText(value) : null;
}
