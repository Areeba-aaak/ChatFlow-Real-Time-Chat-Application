import React from 'react';
import { useChat } from '../../context/ChatContext';
import { formatDistanceToNow } from 'date-fns';
import { FaTimes, FaCheck, FaCheckDouble, FaUserPlus, FaUsers } from 'react-icons/fa';

const NotificationPanel = ({ onClose }) => {
  const { notifications, unreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead } = useChat();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <FaCheck className="text-blue-500" />;
      case 'mention':
        return <FaUserPlus className="text-green-500" />;
      case 'group_invite':
        return <FaUsers className="text-purple-500" />;
      default:
        return <FaCheck className="text-gray-500" />;
    }
  };

  const handleMarkAsRead = async (id) => {
    await markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
          {unreadNotificationCount > 0 && (
            <p className="text-sm text-gray-500">{unreadNotificationCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadNotificationCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto p-4">
        {notifications.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  notification.read_at ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{notification.sender_name || 'System'}</span>
                      {' '}{notification.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.read_at && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;