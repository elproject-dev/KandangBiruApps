import { useEffect, useRef } from 'react';
import { getProducts, getTransactions } from '@/lib/supabase-store';
import { checkLowStock, checkNotificationPermission, checkRevenueMilestones, checkTransactionMilestones } from '@/lib/notifications';

interface UseStockNotificationsOptions {
  enabled?: boolean;
  intervalMinutes?: number;
}

export function useStockNotifications({
  enabled = true,
  intervalMinutes = 180, // Default 3 hours (180 minutes)
}: UseStockNotificationsOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Read settings from localStorage
    const enableNotifications = localStorage.getItem('enableStockNotifications') !== 'false';

    const isEnabled = enabled !== undefined ? enabled : enableNotifications;
    const finalInterval = intervalMinutes !== undefined ? intervalMinutes : 180; // Fixed 3 hours
    const FIXED_THRESHOLD = 10; // Fixed threshold: 10 ons

    if (!isEnabled) return;

    const checkStock = async () => {
      try {
        const products = await getProducts();
        await checkLowStock(products, FIXED_THRESHOLD);

        // Delay before checking revenue milestones to avoid notification overlap
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Fetching transactions for revenue milestone check...');
        const transactions = await getTransactions();
        console.log('Transactions fetched:', transactions.length);
        await checkRevenueMilestones(transactions);

        // Delay before checking transaction milestones to avoid notification overlap
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Checking transaction milestones...');
        await checkTransactionMilestones(transactions);
      } catch (error) {
        console.error('Failed to check stock for notifications:', error);
      }
    };

    // Check immediately on mount
    const initializeNotifications = async () => {
      const hasPermission = await checkNotificationPermission();
      if (hasPermission) {
        await checkStock();
      }
    };

    initializeNotifications();

    // Set up periodic checks
    intervalRef.current = setInterval(checkStock, finalInterval * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMinutes]);

  return {
    checkNow: async () => {
      try {
        const FIXED_THRESHOLD = 10; // Fixed threshold: 10 ons
        const products = await getProducts();
        await checkLowStock(products, FIXED_THRESHOLD);

        // Delay before checking revenue milestones to avoid notification overlap
        await new Promise(resolve => setTimeout(resolve, 2000));

        const transactions = await getTransactions();
        await checkRevenueMilestones(transactions);

        // Delay before checking transaction milestones to avoid notification overlap
        await new Promise(resolve => setTimeout(resolve, 2000));

        await checkTransactionMilestones(transactions);
      } catch (error) {
        console.error('Failed to check stock:', error);
      }
    },
  };
}
