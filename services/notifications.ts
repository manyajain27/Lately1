/**
 * Notification Service
 * Handles scheduling weekly dump reminders
 */

import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Notification identifiers
const WEEKLY_REMINDER_ID = 'weekly-dump-reminder';

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

/**
 * Schedule weekly dump reminder
 * Triggers every Sunday at 7 PM
 */
export async function scheduleWeeklyReminder(): Promise<void> {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
        console.log('[Notifications] Permission denied');
        return;
    }

    // Cancel existing reminder first
    await cancelWeeklyReminder();

    // Schedule new weekly reminder
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'your week is ready ✨',
            body: 'tap to see your weekly photo dump',
            data: { type: 'weekly-dump' },
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 1, // Sunday
            hour: 19, // 7 PM
            minute: 0,
        },
        identifier: WEEKLY_REMINDER_ID,
    });

    console.log('[Notifications] Weekly reminder scheduled');
}

/**
 * Cancel weekly reminder
 */
export async function cancelWeeklyReminder(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_REMINDER_ID);
}

/**
 * Send immediate notification
 */
export async function sendNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger: null, // Immediate
    });
}

/**
 * Notify user about new auto-generated dump
 */
export async function notifyNewDump(dumpType: 'weekly' | 'monthly' | 'trip'): Promise<void> {
    const messages = {
        weekly: {
            title: 'new weekly dump ready! 📸',
            body: 'ai picked your best photos from the week',
        },
        monthly: {
            title: 'monthly dump is here ✨',
            body: 'check out your month in photos',
        },
        trip: {
            title: 'trip dump detected! 🌍',
            body: 'looks like you went somewhere cool',
        },
    };

    const { title, body } = messages[dumpType];
    await sendNotification(title, body, { type: dumpType });
}

/**
 * Notify user about successful export
 */
export async function notifyExportComplete(photoCount: number): Promise<void> {
    await sendNotification(
        'export complete! 🎉',
        `${photoCount} photos saved to your album`,
        { type: 'export-complete', photoCount }
    );
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Set up notification response handler
 */
export function setupNotificationHandler(
    onNotificationTap: (data: unknown) => void
): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            const data = response.notification.request.content.data;
            onNotificationTap(data);
        }
    );

    return () => subscription.remove();
}
