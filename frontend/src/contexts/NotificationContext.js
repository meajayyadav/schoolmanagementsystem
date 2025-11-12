import { createContext, useState, useEffect, useContext } from 'react';
import { announcementsApi } from '@/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // --- Fetch unread count from backend ---
  const refreshUnread = async () => {
    try {
      const res = await announcementsApi.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  // --- Optimistically mark one announcement as read ---
  const markAsRead = async (announcementId) => {
    try {
      // Optimistic UI update
      setUnreadCount((prev) => Math.max(prev - 1, 0));

      await announcementsApi.markAsRead(announcementId);

      // Small delay before re-syncing to allow DB write to complete
      setTimeout(refreshUnread, 1000);
    } catch (err) {
      console.error('Failed to mark as read', err);
      // Optional: fallback to re-fetch actual count if something fails
      refreshUnread();
    }
  };

  // --- Mark all as read ---
  const markAllAsRead = async () => {
    try {
      setUnreadCount(0); // Optimistic
      await announcementsApi.markAllAsRead();
      setTimeout(refreshUnread, 1000);
    } catch (err) {
      console.error('Failed to mark all as read', err);
      refreshUnread();
    }
  };

  useEffect(() => {
    if (user) {
      refreshUnread();
      const interval = setInterval(refreshUnread, 60000); // auto refresh every 1 min
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnread,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
