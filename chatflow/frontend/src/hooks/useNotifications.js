import { useChat } from '../context/ChatContext';

export const useNotifications = () => {
  const { 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  } = useChat();
  
  return { 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead 
  };
};