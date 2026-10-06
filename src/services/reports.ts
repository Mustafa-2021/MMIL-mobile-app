import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import * as XLSX from 'xlsx';
import { Task } from '../types';
import { formatDate } from '../utils/helpers';

function formatExtensions(task: Task): string {
  if (!task.extensionHistory?.length) return '-';
  return task.extensionHistory
    .map(
      e =>
        `${e.round}: ${formatDate(e.previousDueDate)}→${formatDate(e.newDueDate)}`,
    )
    .join(', ');
}

export async function exportTasksToExcel(tasks: Task[]): Promise<string> {
  const rows = tasks.map(t => ({
    'Task Title': t.title,
    Assignee: t.assigneeName,
    Priority: t.priority,
    Category: t.category,
    Status: t.status,
    'Created Date': formatDate(t.createdAt),
    'Due Date': formatDate(t.dueDate),
    Extensions: formatExtensions(t),
    'Last Updated': formatDate(t.updatedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 36 },
    { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks Report');

  const wbout: string = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

  const fileName = `MMIL_Purchase_Report_${Date.now()}.xlsx`;

  // Android 10+ blocks direct writes to the public Downloads folder without
  // scoped-storage APIs, so we try it first (works on older devices where it
  // is permitted) and fall back to the app's own storage otherwise. Either
  // way the file is then handed to the share sheet so the user can save it
  // to Downloads (or anywhere else) themselves.
  if (Platform.OS === 'android') {
    try {
      const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      await RNFS.writeFile(downloadPath, wbout, 'base64');
      return downloadPath;
    } catch {
      // fall through to app-private storage
    }
  }

  const fallbackDir =
    Platform.OS === 'android' ? RNFS.CachesDirectoryPath : RNFS.DocumentDirectoryPath;
  const filePath = `${fallbackDir}/${fileName}`;
  await RNFS.writeFile(filePath, wbout, 'base64');
  return filePath;
}

export async function shareExcelFile(filePath: string): Promise<void> {
  await Share.open({
    url: `file://${filePath}`,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    failOnCancel: false,
  });
}
