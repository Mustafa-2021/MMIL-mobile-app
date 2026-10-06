import RNFS from 'react-native-fs';
import {
  errorCodes as pickerErrors,
  isErrorWithCode as isPickerError,
  keepLocalCopy,
  pick,
} from '@react-native-documents/picker';
import { viewDocument } from '@react-native-documents/viewer';
import {
  deleteObject,
  getStorage,
  putFile,
  ref,
  writeToFile,
} from '@react-native-firebase/storage';
import { TaskAttachment } from '../types';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
// Must match the Cloud Storage lifecycle rule that deletes objects after this many days.
export const ATTACHMENT_RETENTION_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PickedFile {
  localPath: string;
  name: string;
  size: number;
  mimeType: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentExpiresAt(att: TaskAttachment): number {
  return att.uploadedAt + ATTACHMENT_RETENTION_DAYS * DAY_MS;
}

export function isAttachmentExpired(att: TaskAttachment): boolean {
  return Date.now() > attachmentExpiresAt(att);
}

/** Opens the system file picker. Returns null if the user cancels; throws if the file is too large. */
export async function pickAttachment(): Promise<PickedFile | null> {
  let picked;
  try {
    [picked] = await pick({ allowMultiSelection: false });
  } catch (e) {
    if (isPickerError(e) && e.code === pickerErrors.OPERATION_CANCELED) return null;
    throw e;
  }

  const name = picked.name ?? 'attachment';
  if (picked.size != null && picked.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`File is ${formatBytes(picked.size)}. Maximum allowed is 10 MB.`);
  }

  // Copy the content:// uri into the app cache so it can be uploaded as a plain file.
  const [copy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName: name }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error(copy.copyError || 'Could not read the selected file');
  }
  const localPath = decodeURIComponent(copy.localUri.replace(/^file:\/\//, ''));
  const stat = await RNFS.stat(localPath);
  const size = Number(stat.size);
  if (size > MAX_ATTACHMENT_BYTES) {
    await RNFS.unlink(localPath).catch(() => {});
    throw new Error(`File is ${formatBytes(size)}. Maximum allowed is 10 MB.`);
  }

  return {
    localPath,
    name,
    size,
    mimeType: picked.type ?? 'application/octet-stream',
  };
}

export async function uploadAttachment(taskId: string, file: PickedFile): Promise<TaskAttachment> {
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_');
  const storagePath = `tasks/${taskId}/${Date.now()}_${safeName}`;
  await putFile(ref(getStorage(), storagePath), file.localPath, {
    contentType: file.mimeType,
  });
  RNFS.unlink(file.localPath).catch(() => {});
  return {
    name: file.name,
    size: file.size,
    mimeType: file.mimeType,
    storagePath,
    uploadedAt: Date.now(),
  };
}

/** Downloads (once, then cached) and opens the file in whichever installed app handles its type. */
export async function openAttachment(att: TaskAttachment): Promise<void> {
  const dir = `${RNFS.CachesDirectoryPath}/attachments`;
  await RNFS.mkdir(dir);
  const localPath = `${dir}/${att.storagePath.replace(/\//g, '_')}`;
  if (!(await RNFS.exists(localPath))) {
    try {
      await writeToFile(ref(getStorage(), att.storagePath), localPath);
    } catch (e: any) {
      await RNFS.unlink(localPath).catch(() => {});
      if (e?.code === 'storage/object-not-found') {
        throw new Error('This attachment has expired and is no longer available.');
      }
      throw e;
    }
  }
  try {
    await viewDocument({ uri: `file://${localPath}`, mimeType: att.mimeType });
  } catch {
    throw new Error('No app on this phone can open this file type.');
  }
}

export async function deleteAttachment(att: TaskAttachment): Promise<void> {
  try {
    await deleteObject(ref(getStorage(), att.storagePath));
  } catch (e: any) {
    // Already removed by the retention rule, nothing to do.
    if (e?.code !== 'storage/object-not-found') throw e;
  }
}
