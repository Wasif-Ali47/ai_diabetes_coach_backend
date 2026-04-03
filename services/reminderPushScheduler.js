import { DateTime } from 'luxon';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { getMessaging } from '../utils/firebaseAdminInit.js';

const TICK_MS = 60 * 1000;

function typeLabel(type) {
  const map = {
    meal: 'Meal',
    medication: 'Medication',
    water: 'Water',
    exercise: 'Exercise',
    appointment: 'Appointment',
  };
  return map[type] || 'Reminder';
}

/** Model: 0=Sun .. 6=Sat. Luxon: Mon=1 .. Sun=7 */
function toModelDayOfWeek(luxonWeekday) {
  return luxonWeekday === 7 ? 0 : luxonWeekday;
}

function dayMatchesFrequency(reminder, modelDow) {
  const f = reminder.frequency;
  if (f === 'daily') return true;
  if (f === 'weekdays') return modelDow >= 1 && modelDow <= 5;
  if (f === 'weekends') return modelDow === 0 || modelDow === 6;
  if (f === 'weekly' || f === 'custom') {
    const days = reminder.daysOfWeek || [];
    return days.includes(modelDow);
  }
  return true;
}

function shouldFireNow(reminder, local) {
  const parts = reminder.time.split(':');
  const rh = parseInt(parts[0], 10);
  const rm = parseInt(parts[1], 10);
  if (local.hour !== rh || local.minute !== rm) return false;
  const modelDow = toModelDayOfWeek(local.weekday);
  return dayMatchesFrequency(reminder, modelDow);
}

async function sendReminderPush(reminder, user) {
  const messaging = getMessaging();
  if (!messaging) {
    console.warn('[reminderPushScheduler] Firebase messaging not available; skip send');
    return;
  }

  const tokens = (user.deviceTokens || [])
    .map((dt) => dt?.token)
    .filter(Boolean);
  if (tokens.length === 0) {
    console.log(`[reminderPushScheduler] No FCM tokens for user ${user._id}; reminder ${reminder._id}`);
    return;
  }

  const title = reminder.title || 'Reminder';
  const body = `${typeLabel(reminder.type)} — ${reminder.time}`;

  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    try {
      const response = await messaging.sendEachForMulticast({
        notification: { title, body },
        data: {
          type: 'reminder',
          reminderId: String(reminder._id),
          reminderTitle: String(title),
        },
        tokens: chunk,
      });
      console.log('[reminderPushScheduler] FCM sent', {
        reminderId: String(reminder._id),
        userId: String(user._id),
        success: response.successCount,
        failure: response.failureCount,
      });
    } catch (err) {
      console.error('[reminderPushScheduler] FCM error:', err.message);
    }
  }

  reminder.lastTriggered = new Date();
  await reminder.save();
}

let intervalId = null;

export function startReminderPushScheduler() {
  if (intervalId) return;

  console.log('[reminderPushScheduler] Starting (FCM push every minute, Luxon TZ)');

  intervalId = setInterval(async () => {
    try {
      const reminders = await Reminder.find({ enabled: true });
      const userCache = new Map();

      for (const reminder of reminders) {
        const tz = reminder.timezone || 'UTC';
        let local;
        try {
          local = DateTime.now().setZone(tz);
          if (!local.isValid) {
            local = DateTime.now().setZone('UTC');
          }
        } catch {
          local = DateTime.now().setZone('UTC');
        }

        if (!shouldFireNow(reminder, local)) continue;

        if (reminder.lastTriggered) {
          const ms = Date.now() - new Date(reminder.lastTriggered).getTime();
          if (ms < 50000) continue;
        }

        let user = userCache.get(String(reminder.userId));
        if (!user) {
          user = await User.findById(reminder.userId).select('deviceTokens');
          if (!user) continue;
          userCache.set(String(reminder.userId), user);
        }

        await sendReminderPush(reminder, user);
      }
    } catch (e) {
      console.error('[reminderPushScheduler] tick error:', e);
    }
  }, TICK_MS);
}
