import { useEffect } from 'react';
import { getPrayerNotificationsEnabled, schedulePrayerNotifications } from '@/lib/notifications';

export function usePrayerNotifications() {
  useEffect(() => {
    console.log('usePrayerNotifications hook mounted');
    // Check if prayer notifications are enabled
    const enabled = getPrayerNotificationsEnabled();
    console.log('Prayer notifications enabled on app load:', enabled);

    // Auto-schedule prayer notifications if enabled
    if (enabled) {
      console.log('Auto-scheduling prayer notifications...');
      schedulePrayerNotifications();
    }
  }, []);
}
