import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  RemoteMessage,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AuthorizationStatus as NotifeeAuthStatus,
} from '@notifee/react-native';
import { AppNotification } from '../types';

const notificationsCollection = () => collection(getFirestore(), 'notifications');

// Notifee's request shows the Android 13+ POST_NOTIFICATIONS prompt; FCM's own does not.
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= NotifeeAuthStatus.AUTHORIZED;
}

export async function saveFcmToken(uid: string): Promise<void> {
  try {
    const token = await getToken(getMessaging());
    if (token) {
      await updateDoc(doc(getFirestore(), 'users', uid), { fcmToken: token });
    }
  } catch {
    // token retrieval can fail if permission not granted; ignore
  }
}

export async function notifyUser(params: {
  teamId: string;
  userId: string;
  title: string;
  body: string;
  type: AppNotification['type'];
  taskId?: string;
}): Promise<void> {
  await addDoc(notificationsCollection(), {
    ...params,
    read: false,
    createdAt: Date.now(),
  });
}

// Sorted on the client: where + orderBy on different fields would need a composite index.
export function subscribeMyNotifications(
  uid: string,
  onChange: (items: AppNotification[]) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    query(notificationsCollection(), where('userId', '==', uid)),
    snap =>
      onChange(
        snap.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 100),
      ),
    err => onError?.(err as unknown as Error),
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(notificationsCollection(), id), { read: true });
}

// Must match ANDROID_CHANNEL_ID in functions/index.js. Pushes (task assigned, comments,
// extension requests, 9 AM reminder) are sent by Cloud Functions on this channel.
export const TASKS_CHANNEL = 'tasks';

export async function setupNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: TASKS_CHANNEL,
    name: 'Tasks & reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
  // Channel from an earlier version (local 10 AM reminder), now unused.
  await notifee.deleteChannel('daily-reminder').catch(() => {});
}

// FCM does not show a notification while the app is in the foreground, so show it ourselves.
export async function displayForegroundPush(message: RemoteMessage) {
  const title = message.notification?.title;
  const body = message.notification?.body;
  if (!title && !body) return;
  await notifee.displayNotification({
    title,
    body,
    data: (message.data as Record<string, string>) ?? {},
    android: { channelId: TASKS_CHANNEL, pressAction: { id: 'default' } },
  });
}

export function syncFcmTokenOnRefresh(uid: string) {
  return onTokenRefresh(getMessaging(), token =>
    updateDoc(doc(getFirestore(), 'users', uid), { fcmToken: token }).catch(() => {}),
  );
}

// Called before sign-out so the next person who logs in on this phone doesn't get our pushes.
export async function clearFcmToken(uid: string): Promise<void> {
  await updateDoc(doc(getFirestore(), 'users', uid), { fcmToken: null }).catch(() => {});
}
