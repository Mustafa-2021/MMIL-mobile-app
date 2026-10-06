import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { Task, TaskStatus } from '../types';
import { nextExtensionRound } from '../utils/helpers';
import { notifyUser } from './notifications';
import { deleteTaskComments } from './comments';
import { deleteAttachment } from './attachments';

const tasksCollection = () => collection(getFirestore(), 'tasks');
const taskDoc = (taskId: string) => doc(getFirestore(), 'tasks', taskId);

function docToTask(d: QueryDocumentSnapshot): Task {
  return { id: d.id, ...(d.data() as Omit<Task, 'id'>) };
}

export function subscribeTeamTasks(
  teamId: string,
  onChange: (tasks: Task[]) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    query(tasksCollection(), where('teamId', '==', teamId)),
    snap => onChange(snap.docs.map(docToTask)),
    err => onError?.(err as unknown as Error),
  );
}

export function subscribeMyTasks(
  teamId: string,
  uid: string,
  onChange: (tasks: Task[]) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    query(
      tasksCollection(),
      where('teamId', '==', teamId),
      where('assigneeUid', '==', uid),
    ),
    snap => onChange(snap.docs.map(docToTask)),
    err => onError?.(err as unknown as Error),
  );
}

export async function getTask(taskId: string): Promise<Task | null> {
  const snap = await getDoc(taskDoc(taskId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Task, 'id'>) };
}

export async function createTask(
  data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'extensionHistory'>,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(tasksCollection(), {
    ...data,
    extensionHistory: [],
    createdAt: now,
    updatedAt: now,
  });
  await notifyUser({
    teamId: data.teamId,
    userId: data.assigneeUid,
    title: 'New task assigned',
    body: `You were assigned: ${data.title}`,
    type: 'assigned',
    taskId: ref.id,
  });
  return ref.id;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
): Promise<void> {
  await updateDoc(taskDoc(taskId), { ...updates, updatedAt: Date.now() });
}

export async function deleteTask(taskId: string): Promise<void> {
  // Firestore doesn't cascade: remove the comments subcollection and attachment file first.
  const task = await getTask(taskId);
  if (task?.attachment) await deleteAttachment(task.attachment);
  await deleteTaskComments(taskId);
  await deleteDoc(taskDoc(taskId));
}

export async function changeTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await updateTask(taskId, { status });
}

export async function requestExtension(
  task: Task,
  newDueDate: number,
): Promise<void> {
  const round = nextExtensionRound(task.extensionHistory);
  const record = {
    previousDueDate: task.dueDate,
    newDueDate,
    requestedAt: Date.now(),
    round,
  };
  await updateDoc(taskDoc(task.id), {
    dueDate: newDueDate,
    extensionHistory: [...(task.extensionHistory || []), record],
    updatedAt: Date.now(),
  });
}
