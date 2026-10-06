import * as XLSX from 'xlsx';
import { parseEmployeeSheet } from '../src/utils/employeeSheet';
import { dobInputToIso, maskDobInput, parseDobText } from '../src/utils/helpers';

function workbook(rows: unknown[][]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
  return wb;
}

// Excel serial number for a calendar date (1900 date system).
const serial = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86400000 + 25569;

describe('parseEmployeeSheet', () => {
  it('reads HR export headings, Excel dates and text dates', () => {
    const { rows, problems, columns } = parseEmployeeSheet(
      workbook([
        ['EMP_CODE', 'EMP_NAME', 'BIRTH_DATE', 'DEPT_NAME'],
        [1001, 'Test  Person', serial(1990, 8, 15), 'Purchase'],
        ['A-17', 'Second Person', '05/01/1985', ''],
        [1003, 'Third Person', '12-Mar-1979', 'Accounts'],
      ]),
    );
    expect(columns).toEqual({
      employeeId: 'EMP_CODE',
      name: 'EMP_NAME',
      dob: 'BIRTH_DATE',
      department: 'DEPT_NAME',
    });
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { employeeId: '1001', name: 'Test Person', dob: '1990-08-15', department: 'Purchase' },
      { employeeId: 'A-17', name: 'Second Person', dob: '1985-01-05', department: '' },
      { employeeId: '1003', name: 'Third Person', dob: '1979-03-12', department: 'Accounts' },
    ]);
  });

  it('finds the header below a title row and does not mistake "Employee Name" for the ID', () => {
    const { rows } = parseEmployeeSheet(
      workbook([
        ['MMIL employee list'],
        ['Employee Name', 'Employee ID', 'Date of Birth'],
        ['Test Person', '2002', '1992-02-29'],
      ]),
    );
    expect(rows).toEqual([
      { employeeId: '2002', name: 'Test Person', dob: '1992-02-29', department: '' },
    ]);
  });

  it('reports rows it cannot use and skips blank rows', () => {
    const { rows, problems } = parseEmployeeSheet(
      workbook([
        ['Emp Code', 'Name', 'DOB'],
        [3001, 'Ok Person', '01/01/1990'],
        [],
        [3002, 'Bad Date', '31/02/1990'],
        [3003, '', '01/01/1990'],
        ['', 'No Id', '01/01/1990'],
      ]),
    );
    expect(rows.map(r => r.employeeId)).toEqual(['3001']);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toMatch(/Row 4: date of birth "31\/02\/1990"/);
  });

  it('rejects a sheet without the required headings', () => {
    expect(() => parseEmployeeSheet(workbook([['Foo', 'Bar'], [1, 2]]))).toThrow(
      /column headings/,
    );
  });
});

describe('date of birth helpers', () => {
  it('parses day-first text dates', () => {
    expect(parseDobText('15/08/1990')).toBe('1990-08-15');
    expect(parseDobText('15.08.1990')).toBe('1990-08-15');
    expect(parseDobText('15 August 1990')).toBe('1990-08-15');
    expect(parseDobText('1990-08-15')).toBe('1990-08-15');
    expect(parseDobText('15/08/90')).toBe('1990-08-15');
    expect(parseDobText('29/02/1991')).toBeNull();
    expect(parseDobText('hello')).toBeNull();
  });

  it('masks and converts typed input', () => {
    expect(maskDobInput('15081990')).toBe('15/08/1990');
    expect(maskDobInput('150')).toBe('15/0');
    expect(dobInputToIso('15/08/1990')).toBe('1990-08-15');
    expect(dobInputToIso('15/08/199')).toBeNull();
    expect(dobInputToIso('31/04/1990')).toBeNull();
  });
});
