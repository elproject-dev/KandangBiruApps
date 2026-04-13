import { LocalNotifications } from '@capacitor/local-notifications';
import { FeedProduct, Transaction } from './supabase-store';
import { Capacitor } from '@capacitor/core';

const ANDROID_STOCK_CHANNEL_ID = 'stock-alerts-v2';
const ANDROID_REVENUE_CHANNEL_ID = 'revenue-achievement-v1';
const ANDROID_TRANSACTION_CHANNEL_ID = 'transaction-count-v1';
const ANDROID_PRAYER_CHANNEL_ID = 'prayer-time-v1';
const REVENUE_MILESTONE_STEP = 5_000_000;
const REVENUE_MILESTONE_STORAGE_KEY = 'lastRevenueMilestoneNotified';
const TRANSACTION_MILESTONE_STEP = 100;
const TRANSACTION_MILESTONE_STORAGE_KEY = 'lastTransactionMilestoneNotified';
const PRAYER_SCHEDULE_STORAGE_KEY = 'lastPrayerScheduleDate';
const PRAYER_NOTIFICATIONS_ENABLED_KEY = 'enablePrayerNotifications';
const PRAYER_SCHEDULE_LOCK_KEY = 'prayerScheduleInProgress';

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

let lastNotificationIdSeed = 0;
let notificationIdCounter = 0;

function createAndroidNotificationId(): number {
  // Android requires a Java int (-2147483648..2147483647)
  // Use epoch seconds modulo int max to stay in range and still vary over time.
  const seed = Math.floor(Date.now() / 1000) % 2147483647;
  if (seed !== lastNotificationIdSeed) {
    lastNotificationIdSeed = seed;
    notificationIdCounter = 0;
  }

  const id = (seed + notificationIdCounter) % 2147483647;
  notificationIdCounter++;
  return id > 0 ? id : 1;
}

// Create notification channels for Android O+
export async function createNotificationChannels(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    await LocalNotifications.createChannel({
      id: ANDROID_STOCK_CHANNEL_ID,
      name: 'Stok Menipis',
      description: 'Notifikasi untuk stok yang menipis',
      importance: 5,
      visibility: 1,
      lights: true,
      lightColor: '#FF6B6B',
      vibration: true,
      // IMPORTANT (Android 8+): custom sound is set on the channel, not per-notification.
      // This refers to android/app/src/main/res/raw/notification.wav (or .mp3) WITHOUT extension.
      sound: 'notification',
    });

    await LocalNotifications.createChannel({
      id: ANDROID_REVENUE_CHANNEL_ID,
      name: 'Pencapaian Omset',
      description: 'Notifikasi pencapaian target omset',
      importance: 5,
      visibility: 1,
      lights: true,
      lightColor: '#22C55E',
      vibration: true,
      sound: 'notification',
    });

    await LocalNotifications.createChannel({
      id: ANDROID_TRANSACTION_CHANNEL_ID,
      name: 'Pencapaian Transaksi',
      description: 'Notifikasi pencapaian jumlah transaksi',
      importance: 5,
      visibility: 1,
      lights: true,
      lightColor: '#3B82F6',
      vibration: true,
      sound: 'notification',
    });

    await LocalNotifications.createChannel({
      id: ANDROID_PRAYER_CHANNEL_ID,
      name: 'Waktu Sholat',
      description: 'Notifikasi pengingat waktu sholat',
      importance: 5,
      visibility: 1,
      lights: true,
      lightColor: '#F59E0B',
      vibration: true,
      sound: 'prayer',
    });
    console.log('Notification channel created successfully');
  } catch (error) {
    console.error('Failed to create notification channel:', error);
  }
}

function formatIdr(amount: number): string {
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `Rp${amount}`;
  }
}

function getLastRevenueMilestoneNotified(): number {
  const raw = localStorage.getItem(REVENUE_MILESTONE_STORAGE_KEY);
  const val = raw ? Number(raw) : 0;
  return Number.isFinite(val) ? val : 0;
}

function setLastRevenueMilestoneNotified(value: number): void {
  localStorage.setItem(REVENUE_MILESTONE_STORAGE_KEY, String(value));
}

function getLastTransactionMilestoneNotified(): number {
  const raw = localStorage.getItem(TRANSACTION_MILESTONE_STORAGE_KEY);
  const val = raw ? Number(raw) : 0;
  return Number.isFinite(val) ? val : 0;
}

function setLastTransactionMilestoneNotified(value: number): void {
  localStorage.setItem(TRANSACTION_MILESTONE_STORAGE_KEY, String(value));
}

export async function notifyRevenueMilestone(totalRevenue: number, milestone: number): Promise<boolean> {
  await createNotificationChannels();

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('Notification permission not granted');
      return false;
    }
  }

  try {
    const at = new Date(Date.now() + 1000);
    const id = createAndroidNotificationId();

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Pencapaian Omset',
          body: `Omset sudah mencapai ${formatIdr(milestone)}. Total saat ini: ${formatIdr(totalRevenue)}\nMantap gan!`,
          schedule: { at },
          channelId: ANDROID_REVENUE_CHANNEL_ID,
        },
      ],
    });

    console.log('Revenue milestone notification scheduled successfully');
    return true;
  } catch (error) {
    console.error('Failed to schedule revenue milestone notification:', error);
    return false;
  }
}

export async function checkRevenueMilestones(transactions: Transaction[]): Promise<number> {
  const totalRevenue = transactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
  const lastNotified = getLastRevenueMilestoneNotified();

  console.log('Revenue check - total:', totalRevenue, 'lastNotified:', lastNotified);

  const currentMilestone = Math.floor(totalRevenue / REVENUE_MILESTONE_STEP) * REVENUE_MILESTONE_STEP;
  if (currentMilestone <= 0) return 0;

  if (currentMilestone <= lastNotified) {
    console.log('Revenue milestone already notified:', currentMilestone);
    return 0;
  }

  console.log('Revenue milestone reached:', currentMilestone);
  const ok = await notifyRevenueMilestone(totalRevenue, currentMilestone);
  if (ok) {
    setLastRevenueMilestoneNotified(currentMilestone);
    return 1;
  }

  return 0;
}

export async function notifyTransactionMilestone(transactionCount: number, milestone: number): Promise<boolean> {
  await createNotificationChannels();

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('Notification permission not granted');
      return false;
    }
  }

  try {
    const at = new Date(Date.now() + 1000);
    const id = createAndroidNotificationId();

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Pencapaian Transaksi',
          body: `Transaksi sudah mencapai ${milestone} transaksi. Total saat ini: ${transactionCount} transaksi\nMantap gan!`,
          schedule: { at },
          channelId: ANDROID_TRANSACTION_CHANNEL_ID,
        },
      ],
    });

    console.log('Transaction milestone notification scheduled successfully');
    return true;
  } catch (error) {
    console.error('Failed to schedule transaction milestone notification:', error);
    return false;
  }
}

export async function checkTransactionMilestones(transactions: Transaction[]): Promise<number> {
  const transactionCount = transactions.length;
  const lastNotified = getLastTransactionMilestoneNotified();

  console.log('Transaction check - count:', transactionCount, 'lastNotified:', lastNotified);

  const currentMilestone = Math.floor(transactionCount / TRANSACTION_MILESTONE_STEP) * TRANSACTION_MILESTONE_STEP;
  if (currentMilestone <= 0) return 0;

  if (currentMilestone <= lastNotified) {
    console.log('Transaction milestone already notified:', currentMilestone);
    return 0;
  }

  console.log('Transaction milestone reached:', currentMilestone);
  const ok = await notifyTransactionMilestone(transactionCount, currentMilestone);
  if (ok) {
    setLastTransactionMilestoneNotified(currentMilestone);
    return 1;
  }

  return 0;
}

// Reset milestone storage (for testing)
export function resetMilestones(): void {
  localStorage.removeItem(REVENUE_MILESTONE_STORAGE_KEY);
  localStorage.removeItem(TRANSACTION_MILESTONE_STORAGE_KEY);
  console.log('Milestones reset');
}

// Reset prayer schedule (for testing)
export async function resetPrayerSchedule(): Promise<number> {
  localStorage.removeItem(PRAYER_SCHEDULE_STORAGE_KEY);

  try {
    const pending = await LocalNotifications.getPending();
    const prayerPending = pending.notifications.filter(
      (n) => n.title === 'Pengingat Waktu Sholat' || n.title === 'Waktu Sholat'
    );

    if (prayerPending.length > 0) {
      await LocalNotifications.cancel({
        notifications: prayerPending.map((n) => ({ id: n.id })),
      });
    }

    console.log(`Prayer schedule reset (canceled ${prayerPending.length} pending)`);
    return prayerPending.length;
  } catch (error) {
    console.warn('Failed to cancel pending prayer notifications:', error);
    console.log('Prayer schedule reset (localStorage cleared only)');
    return 0;
  }
}

// Prayer times
interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

async function fetchPrayerTimes(): Promise<PrayerTimes | null> {
  try {
    const today = new Date();
    const date = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    console.log('Fetching prayer times for Yogyakarta...');
    const response = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=Yogyakarta&country=Indonesia&method=20&date=${date}-${month}-${year}`
    );
    const data = await response.json();

    console.log('Prayer API response:', data);

    if (data.code === 200 && data.data) {
      const timings = data.data.timings;
      console.log('Prayer times fetched:', timings);
      return {
        Fajr: timings.Fajr,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch prayer times:', error);
    return null;
  }
}

function parsePrayerTime(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const prayerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  return prayerTime;
}

async function schedulePrayerNotification(prayerName: string, notificationTime: Date, actualPrayerTime: Date): Promise<boolean> {
  await createNotificationChannels();

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('Notification permission not granted');
      return false;
    }
  }

  try {
    const id = createAndroidNotificationId();
    const timeString = actualPrayerTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Pengingat Waktu Sholat',
          body: `10 menit lagi waktu sholat ${prayerName.toLowerCase()} pukul ${timeString}`,
          schedule: { at: notificationTime },
          channelId: ANDROID_PRAYER_CHANNEL_ID,
        },
      ],
    });

    console.log(`Prayer notification scheduled for ${prayerName} at ${notificationTime.toLocaleTimeString('id-ID')} (actual prayer time: ${timeString})`);
    return true;
  } catch (error) {
    console.error('Failed to schedule prayer notification:', error);
    return false;
  }
}

export async function schedulePrayerNotifications(): Promise<number> {
  console.log('schedulePrayerNotifications called');

  // Check if prayer notifications are enabled
  const enabled = localStorage.getItem(PRAYER_NOTIFICATIONS_ENABLED_KEY);
  console.log('Prayer notifications enabled:', enabled);
  if (enabled !== 'true') {
    console.log('Prayer notifications are disabled');
    return 0;
  }

  const today = new Date().toDateString();
  const lastScheduled = localStorage.getItem(PRAYER_SCHEDULE_STORAGE_KEY);
  console.log('Today:', today, 'Last scheduled:', lastScheduled);

  // Prevent concurrent scheduling which can cause duplicate notifications.
  const lockValue = localStorage.getItem(PRAYER_SCHEDULE_LOCK_KEY);
  if (lockValue === today) {
    console.log('Prayer schedule is already in progress for today');
    return 0;
  }
  localStorage.setItem(PRAYER_SCHEDULE_LOCK_KEY, today);

  // Only schedule once per day
  if (lastScheduled === today) {
    console.log('Prayer notifications already scheduled for today');
    localStorage.removeItem(PRAYER_SCHEDULE_LOCK_KEY);
    return 0;
  }

  try {
    // Cancel existing pending prayer notifications to avoid duplicates.
    try {
      const pending = await LocalNotifications.getPending();
      const prayerPending = pending.notifications.filter(
        (n) => n.title === 'Pengingat Waktu Sholat' || n.title === 'Waktu Sholat'
      );
      if (prayerPending.length > 0) {
        await LocalNotifications.cancel({
          notifications: prayerPending.map((n) => ({ id: n.id })),
        });
        console.log(`Canceled ${prayerPending.length} pending prayer notifications before scheduling`);
      }
    } catch (error) {
      console.warn('Failed to cancel pending prayer notifications before scheduling:', error);
    }

    const prayerTimes = await fetchPrayerTimes();
    if (!prayerTimes) {
      console.log('Failed to fetch prayer times');
      return 0;
    }

  let scheduledCount = 0;
  const now = new Date();
  console.log('Current time:', now.toLocaleTimeString('id-ID'));

  // Schedule notifications 10 minutes before each prayer time
  const prayers: Array<{ name: string; time: string }> = [
    { name: 'Subuh', time: prayerTimes.Fajr },
    { name: 'Dzuhur', time: prayerTimes.Dhuhr },
    { name: 'Ashar', time: prayerTimes.Asr },
    { name: 'Maghrib', time: prayerTimes.Maghrib },
    { name: 'Isya', time: prayerTimes.Isha },
  ];

  for (const prayer of prayers) {
    const prayerTime = parsePrayerTime(prayer.time);
    const notificationTime = new Date(prayerTime.getTime() - 10 * 60 * 1000); // 10 minutes before

    console.log(`Prayer: ${prayer.name}, Time: ${prayer.time}, Notification at: ${notificationTime.toLocaleTimeString('id-ID')}`);

    // Only schedule if notification time is in the future
    if (notificationTime > now) {
      await schedulePrayerNotification(prayer.name, notificationTime, prayerTime);
      scheduledCount++;
    } else {
      console.log(`Skipping ${prayer.name} - notification time is in the past`);
    }
  }

    if (scheduledCount > 0) {
      localStorage.setItem(PRAYER_SCHEDULE_STORAGE_KEY, today);
    }

    console.log(`Scheduled ${scheduledCount} prayer notifications for today`);
    return scheduledCount;
  } finally {
    localStorage.removeItem(PRAYER_SCHEDULE_LOCK_KEY);
  }
}

export function getPrayerNotificationsEnabled(): boolean {
  return localStorage.getItem(PRAYER_NOTIFICATIONS_ENABLED_KEY) === 'true';
}

export function setPrayerNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(PRAYER_NOTIFICATIONS_ENABLED_KEY, String(enabled));
  if (!enabled) {
    // Clear scheduled date when disabled
    localStorage.removeItem(PRAYER_SCHEDULE_STORAGE_KEY);
  }
}

export async function testPrayerNotification(): Promise<boolean> {
  await createNotificationChannels();

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('Notification permission not granted');
      return false;
    }
  }

  try {
    const at = new Date(Date.now() + 1000);
    const id = createAndroidNotificationId();

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Pengingat Waktu Sholat',
          body: '10 menit lagi waktu sholat maghrib pukul 17:38',
          schedule: { at },
          channelId: ANDROID_PRAYER_CHANNEL_ID,
        },
      ],
    });

    console.log('Test prayer notification scheduled successfully');
    return true;
  } catch (error) {
    console.error('Failed to schedule test prayer notification:', error);
    return false;
  }
}

// Request permission for notifications
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Create channels first (Android only)
    await createNotificationChannels();
    
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

// Check if permission is granted
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to check notification permission:', error);
    return false;
  }
}

// Schedule a local notification for low stock
export async function notifyLowStock(alert: StockAlert): Promise<boolean> {
  // Ensure channel exists even when permission is already granted.
  // Android may drop notifications scheduled with a non-existent channelId.
  await createNotificationChannels();

  const hasPermission = await checkNotificationPermission();

  if (!hasPermission) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('Notification permission not granted');
      return false;
    }
  }

  try {
    const at = new Date(Date.now() + 1000);
    console.log('Scheduling notification with id:', createAndroidNotificationId());
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: createAndroidNotificationId(),
          title: 'Stok Menipis Gan...',
          body: `${alert.productName}: ${alert.currentStock}`,
          schedule: { at },
          channelId: ANDROID_STOCK_CHANNEL_ID,
        },
      ],
    });
    console.log('Notification scheduled successfully');
    return true;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return false;
  }
}

// Check for low stock products and send notifications
export async function checkLowStock(
  products: FeedProduct[],
  threshold: number = 10 // Default threshold: 10
): Promise<number> {
  // Ensure channel exists even when permission is already granted.
  await createNotificationChannels();

  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('Notification permission not granted');
      return 0;
    }
  }

  const lowStockProducts = products.filter(product => {
    const isLow = product.stock < threshold;
    console.log(`Product: ${product.name}, stock: ${product.stock}, isLow: ${isLow}`);
    return isLow;
  });

  if (lowStockProducts.length === 0) {
    console.log('No low stock products found');
    return 0;
  }

  // Create summary notification
  let body: string;
  if (lowStockProducts.length === 1) {
    body = `${lowStockProducts[0].name} tersisa ${lowStockProducts[0].stock}.\nWayahe kulak'an gan!`;
  } else {
    const productNames = lowStockProducts.map(p => `${p.name} (${p.stock})`).join(',\n');
    body = `${lowStockProducts.length} stok ${productNames}.\nWayahe kulak'an gan!`;
  }

  console.log(`Sending summary notification: ${body}`);

  try {
    const at = new Date(Date.now() + 1000);
    const id = createAndroidNotificationId();
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: id,
          title: 'Stok Menipis Gan...',
          body: body,
          schedule: { at },
          channelId: ANDROID_STOCK_CHANNEL_ID,
        },
      ],
    });
    console.log('Notification scheduled successfully');
    return lowStockProducts.length;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return 0;
  }
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  try {
    // Note: Cancel all pending notifications
    // This function may need adjustment based on Capacitor version
    console.log('Cancel all notifications called');
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
}

// Get scheduled notifications
export async function getScheduledNotifications() {
  try {
    const result = await LocalNotifications.getPending();
    return result.notifications;
  } catch (error) {
    console.error('Failed to get scheduled notifications:', error);
    return [];
  }
}
