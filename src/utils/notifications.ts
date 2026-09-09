/**
 * Cross-platform desktop notification helper for MeTric.
 * Combines native Electron notifications, macOS AppleScript banners, and HTML5 Web Notifications.
 */
export async function sendDesktopNotification(title: string, body: string): Promise<boolean> {
  // 1. Try Native Electron API first
  if (typeof window !== 'undefined' && window.electronAPI?.showNotification) {
    try {
      const res = await window.electronAPI.showNotification(title, body);
      if (res) return true;
    } catch (err) {
      console.error('Electron notification failed, attempting browser fallback', err);
    }
  }

  // 2. Browser HTML5 Notification fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon.png',
        });
        return true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon.png',
          });
          return true;
        }
      }
    } catch (err) {
      console.error('Browser notification error', err);
    }
  }

  return false;
}

/**
 * Explicitly request notification permission from the system/browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Could not request notification permission:', e);
    }
  }
  return 'default';
}

/**
 * Open macOS System Settings directly to Notifications
 */
export async function openSystemNotificationSettings(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.electronAPI?.openNotificationSettings) {
    try {
      return await window.electronAPI.openNotificationSettings();
    } catch (e) {
      console.warn('Could not open notification settings:', e);
    }
  }
  return false;
}

