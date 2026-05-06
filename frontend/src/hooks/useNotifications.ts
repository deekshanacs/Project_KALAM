import { useCallback, useEffect, useState } from 'react';
import type { NotificationDto } from '@tms/shared';
import { useSocket } from './useSocket';

const MAX_NOTIFICATIONS = 50;

export function useNotifications() {
  const { on, off } = useSocket();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);

  const addNotification = useCallback((notification: NotificationDto) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev];
      return updated.slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  useEffect(() => {
    const handler = (notification: unknown) => {
      addNotification(notification as NotificationDto);
    };
    on('notification:new', handler);
    return () => off('notification:new', handler);
  }, [on, off, addNotification]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead };
}
