import RNFS from 'react-native-fs';
import {
  errorCodes as pickerErrors,
  isErrorWithCode as isPickerError,
  keepLocalCopy,
  pick,
  types as pickerTypes,
} from '@react-native-documents/picker';
import * as XLSX from 'xlsx';
import { parseEmployeeSheet, ParsedSheet } from '../utils/employeeSheet';

/** Opens the file picker for an .xlsx/.xls/.csv HR sheet and reads it. Null if cancelled. */
export async function pickEmployeeSheet(): Promise<(ParsedSheet & { fileName: string }) | null> {
  let picked;
  try {
    [picked] = await pick({
      allowMultiSelection: false,
      type: [pickerTypes.xlsx, pickerTypes.xls, pickerTypes.csv].flat(),
    });
  } catch (e) {
    if (isPickerError(e) && e.code === pickerErrors.OPERATION_CANCELED) return null;
    throw e;
  }
  const fileName = picked.name ?? 'employees.xlsx';
  const [copy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') throw new Error(copy.copyError || 'Could not read the file');
  const localPath = decodeURIComponent(copy.localUri.replace(/^file:\/\//, ''));
  try {
    const base64 = await RNFS.readFile(localPath, 'base64');
    return { fileName, ...parseEmployeeSheet(XLSX.read(base64, { type: 'base64' })) };
  } finally {
    // The sheet holds personal data; don't leave a copy in the app's cache.
    RNFS.unlink(localPath).catch(() => {});
  }
}
