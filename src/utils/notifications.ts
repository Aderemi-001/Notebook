/**
 * Notification utilities for Pomodoro timer
 * Handles web push notifications, vibration, and PWA badge updates
 */

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

// Show notification
export const showTimerNotification = (title: string, body: string, icon?: string) => {
    if (Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body,
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'pomodoro-timer',
                requireInteraction: true, // Stays until user dismisses
            });

            // Auto-close after 10 seconds if not interacted with
            setTimeout(() => notification.close(), 10000);

            // Focus window when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
    return null;
};

// Vibrate device
export const vibrateDevice = (pattern: number | number[] = [200, 100, 200]) => {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
            return true;
        } catch (error) {
            console.error('Vibration failed:', error);
        }
    }
    return false;
};

// Update PWA badge
export const updateBadge = (count: number) => {
    if ('setAppBadge' in navigator) {
        try {
            if (count > 0) {
                (navigator as any).setAppBadge(count);
            } else {
                (navigator as any).clearAppBadge();
            }
            return true;
        } catch (error) {
            console.error('Badge update failed:', error);
        }
    }
    return false;
};

// Clear PWA badge
export const clearBadge = () => updateBadge(0);

// Wake Lock API - prevent screen from sleeping during timer
let wakeLock: any = null;

export const requestWakeLock = async (): Promise<boolean> => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await (navigator as any).wakeLock.request('screen');

            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });

            return true;
        } catch (error) {
            console.error('Wake Lock request failed:', error);
        }
    }
    return false;
};

export const releaseWakeLock = async () => {
    if (wakeLock) {
        try {
            await wakeLock.release();
            wakeLock = null;
            return true;
        } catch (error) {
            console.error('Wake Lock release failed:', error);
        }
    }
    return false;
};

// Check if notifications are supported and enabled
export const areNotificationsEnabled = (): boolean => {
    return 'Notification' in window && Notification.permission === 'granted';
};
