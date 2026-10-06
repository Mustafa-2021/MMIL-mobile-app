const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

// Same region as the Firestore database (Mumbai).
setGlobalOptions({ region: 'asia-south1', maxInstances: 5 });

// Must match the channel created in the app (src/services/notifications.ts).
const ANDROID_CHANNEL_ID = 'tasks';
const TIME_ZONE = 'Asia/Kolkata';

const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Sends a push to one user's phone. `data` values must all be strings. */
async function sendToUser(uid, title, body, data = {}) {
  const userRef = db.doc(`users/${uid}`);
  const token = (await userRef.get()).get('fcmToken');
  if (!token) {
    logger.info(`No FCM token for user ${uid}; skipping push`);
    return;
  }
  try {
    await getMessaging().send({
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { channelId: ANDROID_CHANNEL_ID, sound: 'default' },
      },
    });
  } catch (e) {
    if (STALE_TOKEN_CODES.has(e.code)) {
      // App was uninstalled or the token rotated; stop sending to it.
      await userRef.update({ fcmToken: null });
      logger.info(`Cleared stale FCM token for user ${uid}`);
    } else {
      throw e;
    }
  }
}

/**
 * Every in-app notification the app writes (task assigned, reassigned, comment,
 * extension request) is also pushed to the recipient's phone.
 */
exports.pushOnNotification = onDocumentCreated('notifications/{notificationId}', async event => {
  const n = event.data && event.data.data();
  if (!n || !n.userId) return;
  await sendToUser(n.userId, n.title, n.body, {
    type: String(n.type || ''),
    taskId: String(n.taskId || ''),
  });
});

/** Start of "today" in IST, as a UTC epoch millis. */
function startOfTodayIST(now = new Date()) {
  const ist = new Date(now.toLocaleString('en-US', { timeZone: TIME_ZONE }));
  const offsetMs = ist.getTime() - now.getTime();
  ist.setHours(0, 0, 0, 0);
  return ist.getTime() - offsetMs;
}

/** 9:00 AM IST: each member with open tasks gets a summary push. */
exports.dailyTaskReminder = onSchedule(
  { schedule: '0 9 * * *', timeZone: TIME_ZONE },
  async () => {
    const snap = await db.collection('tasks').where('status', '!=', 'Done').get();

    const now = Date.now();
    const todayStart = startOfTodayIST();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const perUser = new Map();
    snap.forEach(doc => {
      const t = doc.data();
      if (!t.assigneeUid) return;
      const s = perUser.get(t.assigneeUid) || { pending: 0, overdue: 0, dueToday: 0 };
      s.pending += 1;
      if (t.dueDate < now) s.overdue += 1;
      else if (t.dueDate < todayEnd) s.dueToday += 1;
      perUser.set(t.assigneeUid, s);
    });

    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const results = await Promise.allSettled(
      [...perUser.entries()].map(([uid, s]) => {
        const extras = [];
        if (s.overdue) extras.push(`${s.overdue} overdue`);
        if (s.dueToday) extras.push(`${s.dueToday} due today`);
        const body =
          `You have ${plural(s.pending, 'pending task')}` +
          (extras.length ? ` (${extras.join(', ')})` : '') +
          '.';
        return sendToUser(uid, 'Good morning!', body, { type: 'reminder', taskId: '' });
      }),
    );
    const failed = results.filter(r => r.status === 'rejected');
    failed.forEach(r => logger.error('Reminder push failed', r.reason));
    logger.info(`Daily reminder: ${perUser.size} users, ${failed.length} failures`);
  },
);
