import { useState, useEffect, useCallback } from 'react';
import tokenManager from '@/utils/tokenManager';

interface Notification {
  id: number | string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order_update' | 'payment' | 'system' | 'promotion';
  read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const token = tokenManager.getToken();
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: NotificationsResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: number | string) => {
    const token = tokenManager.getToken();
    if (!token) return;

    try {
      // Handle dynamic notifications (pending vendors, unread messages, etc.)
      if (typeof notificationId === 'string') {
        // For dynamic notifications, just update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return;
      }

      // For database notifications, call the API
      const response = await fetch(`http://localhost:8000/api/notifications/mark-read/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const token = tokenManager.getToken();
    if (!token) return;

    try {
      // Mark all unread notifications as read locally
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);

      // Mark all database notifications as read
      const unreadNotifications = notifications.filter(n => !n.read && typeof n.id === 'number');
      for (const notification of unreadNotifications) {
        await fetch(`http://localhost:8000/api/notifications/mark-read/${notification.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
