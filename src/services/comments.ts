import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { AppUser, Task, TaskComment } from '../types';
import { notifyUser } from './notifications';

// Comments live in a subcollection: tasks/{taskId}/comments/{commentId}
const commentsCollection = (taskId: string) =>
  collection(getFirestore(), 'tasks', taskId, 'comments');

export function subscribeTaskComments(
  taskId: string,
  onChange: (comments: TaskComment[]) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    query(commentsCollection(taskId), orderBy('createdAt', 'asc')),
    snap =>
      onChange(
        snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<TaskComment, 'id'>) })),
      ),
    err => onError?.(err as unknown as Error),
  );
}

export async function addTaskComment(
  task: Task,
  author: AppUser,
  text: string,
): Promise<void> {
  await addDoc(commentsCollection(task.id), {
    text,
    authorUid: author.uid,
    authorName: author.name,
    authorRole: author.role,
    createdAt: Date.now(),
  });

  // Notify the other side of the task: assignee <-> task creator.
  const recipients = new Set([task.assigneeUid, task.createdBy].filter(Boolean));
  recipients.delete(author.uid);
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  await Promise.all(
    [...recipients].map(userId =>
      notifyUser({
        teamId: task.teamId,
        userId,
        title: `${author.name} posted an update`,
        body: `"${task.title}": ${preview}`,
        type: 'comment',
        taskId: task.id,
      }),
    ),
  );
}

export async function deleteTaskComments(taskId: string): Promise<void> {
  const snap = await getDocs(commentsCollection(taskId));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}
