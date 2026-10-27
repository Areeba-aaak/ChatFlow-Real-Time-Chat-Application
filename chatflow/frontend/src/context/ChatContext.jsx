
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { conversationService } from '../services/conversationService';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import socketManager from '../socket/socket';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChat must be used inside a ChatProvider');
  }

  return context;
};

const sameId = (a, b) =>
  a !== undefined &&
  a !== null &&
  b !== undefined &&
  b !== null &&
  String(a) === String(b);

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const typingTimeoutRef = useRef(null);

  // ============================================================
  // INITIAL DATA
  // ============================================================

  useEffect(() => {
    if (!user || !token) {
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      setNotifications([]);
      setOnlineUsers([]);
      setUnreadCounts({});
      setUnreadNotificationCount(0);
      setLoading(false);
      return;
    }

    fetchConversations();
    fetchNotifications();
  }, [user, token]);

  // ============================================================
  // CURRENT CONVERSATION
  // ============================================================

  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      return;
    }

    fetchMessages(currentConversation.id);
    markConversationAsRead(currentConversation.id);

    socketManager.emit('message:join', {
      conversationId: currentConversation.id,
    });

    return () => {
      socketManager.emit('message:leave', {
        conversationId: currentConversation.id,
      });
    };
  }, [currentConversation?.id]);

  // ============================================================
  // SOCKET EVENT HANDLERS
  // ============================================================

  useEffect(() => {
    if (!user || !token) return;

    // ----------------------------------------------------------
    // NEW MESSAGE
    // ----------------------------------------------------------

    const handleNewMessage = (message) => {
      if (!message) return;

      // Sender already receives message:sent.
      // Do not add the same message again through message:new.
      if (sameId(message.sender_id, user.id)) {
        return;
      }

      const isCurrent = sameId(
        currentConversation?.id,
        message.conversation_id
      );

      if (isCurrent) {
        setMessages((prev) => {
          if (
            prev.some((item) =>
              sameId(item.id, message.id)
            )
          ) {
            return prev;
          }

          return [...prev, message];
        });

        // Recipient is currently viewing the conversation.
        markMessageAsRead(message.id);
      }

      updateConversationWithNewMessage(
        message,
        isCurrent
      );
    };

    // ----------------------------------------------------------
    // MESSAGE SENT
    // ----------------------------------------------------------

    const handleMessageSent = (message) => {
      if (!message) return;

      setMessages((prev) => {
        const tempIndex = [...prev]
          .map((item, index) => ({ item, index }))
          .reverse()
          .find(
            ({ item }) =>
              item.is_temp &&
              sameId(item.sender_id, user.id) &&
              sameId(
                item.conversation_id,
                message.conversation_id
              ) &&
              item.content === message.content
          )?.index;

        if (tempIndex !== undefined) {
          const updated = [...prev];
          updated[tempIndex] = message;
          return updated;
        }

        if (
          prev.some((item) =>
            sameId(item.id, message.id)
          )
        ) {
          return prev;
        }

        return [...prev, message];
      });
    };

    // ----------------------------------------------------------
    // MESSAGE DELIVERED
    // ----------------------------------------------------------

    const handleMessageDelivered = ({
      messageId,
      conversationId,
      userId,
    }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (
            !sameId(message.id, messageId) ||
            !sameId(
              message.conversation_id,
              conversationId
            )
          ) {
            return message;
          }

          return {
            ...message,
            delivered: true,
            delivered_to: userId,
            reads: [...(message.reads || [])],
          };
        })
      );
    };

    // ----------------------------------------------------------
    // MESSAGE READ
    // ----------------------------------------------------------

    const handleMessageRead = ({
      messageId,
      userId,
      readAt,
    }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (!sameId(message.id, messageId)) {
            return message;
          }

          const reads = [...(message.reads || [])];

          if (
            userId &&
            !reads.some((read) =>
              sameId(read.user_id, userId)
            )
          ) {
            reads.push({
              user_id: userId,
              read_at: readAt || new Date(),
            });
          }

          return {
            ...message,
            reads,
          };
        })
      );
    };

    // ----------------------------------------------------------
    // CONVERSATION READ
    // ----------------------------------------------------------

    const handleConversationRead = ({
      conversationId,
      userId,
      readAt,
    }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (
            !sameId(
              message.conversation_id,
              conversationId
            )
          ) {
            return message;
          }

          // Only incoming messages can become read by this user.
          if (sameId(message.sender_id, userId)) {
            return message;
          }

          const reads = [...(message.reads || [])];

          if (
            !reads.some((read) =>
              sameId(read.user_id, userId)
            )
          ) {
            reads.push({
              user_id: userId,
              read_at: readAt || new Date(),
            });
          }

          return {
            ...message,
            reads,
          };
        })
      );
    };

    // ----------------------------------------------------------
    // MESSAGE EDITED
    // ----------------------------------------------------------

    const handleMessageEdited = (message) => {
      if (!message) return;

      setMessages((prev) =>
        prev.map((item) =>
          sameId(item.id, message.id)
            ? message
            : item
        )
      );
    };

    // ----------------------------------------------------------
    // MESSAGE DELETED
    // ----------------------------------------------------------

    const handleMessageDeleted = ({ messageId }) => {
      if (!messageId) return;

      setMessages((prev) =>
        prev.filter(
          (message) =>
            !sameId(message.id, messageId)
        )
      );
    };

    // ----------------------------------------------------------
    // MESSAGE REACTED
    // ----------------------------------------------------------

    const handleMessageReacted = ({
      messageId,
      userId,
      emoji,
    }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (!sameId(message.id, messageId)) {
            return message;
          }

          const reactions = [
            ...(message.reactions || []),
          ];

          const existing = reactions.find(
            (reaction) =>
              sameId(
                reaction.user_id,
                userId
              )
          );

          if (existing) {
            existing.emoji = emoji;
          } else {
            reactions.push({
              user_id: userId,
              emoji,
            });
          }

          return {
            ...message,
            reactions,
          };
        })
      );
    };

    // ----------------------------------------------------------
    // TYPING STARTED
    // ----------------------------------------------------------

    const handleTypingStarted = ({
      conversationId,
      userId,
      user: typingUser,
    }) => {
      if (
        !conversationId ||
        !userId ||
        sameId(userId, user.id)
      ) {
        return;
      }

      setTypingUsers((prev) => {
        const existing =
          prev[conversationId] || [];

        const alreadyTyping =
          existing.some((item) =>
            sameId(
              typeof item === 'object'
                ? item.id
                : item,
              userId
            )
          );

        if (alreadyTyping) {
          return prev;
        }

        return {
          ...prev,
          [conversationId]: [
            ...existing,
            {
              id: userId,
              name:
                typingUser?.full_name ||
                typingUser?.username ||
                'Someone',
            },
          ],
        };
      });
    };

    // ----------------------------------------------------------
    // TYPING STOPPED
    // ----------------------------------------------------------

    const handleTypingStopped = ({
      conversationId,
      userId,
    }) => {
      if (!conversationId || !userId) {
        return;
      }

      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: (
          prev[conversationId] || []
        ).filter(
          (item) =>
            !sameId(
              typeof item === 'object'
                ? item.id
                : item,
              userId
            )
        ),
      }));
    };

    // ----------------------------------------------------------
    // NEW CONVERSATION
    // ----------------------------------------------------------

    const handleConversationCreated = (
      conversation
    ) => {
      if (!conversation?.id) return;

      setConversations((prev) => {
        const exists = prev.some(
          (item) =>
            sameId(
              item.id,
              conversation.id
            )
        );

        if (exists) {
          return prev.map((item) =>
            sameId(
              item.id,
              conversation.id
            )
              ? conversation
              : item
          );
        }

        return [
          conversation,
          ...prev,
        ];
      });
    };

    // ----------------------------------------------------------
    // NOTIFICATION
    // ----------------------------------------------------------

    const handleNotification = async (
      notification
    ) => {
      if (!notification) return;

      // Add notification to state.
      setNotifications((prev) => {
        if (
          notification.id &&
          prev.some((item) =>
            sameId(
              item.id,
              notification.id
            )
          )
        ) {
          return prev;
        }

        return [
          notification,
          ...prev,
        ];
      });

      // ALWAYS show notification toast.
      // This happens even if the user is already
      // inside the conversation.
      if (notification.content) {
        toast.success(
          notification.content,
          {
            duration: 4000,
          }
        );
      }

      const isCurrentConversation =
        currentConversation &&
        sameId(
          notification.conversation_id,
          currentConversation.id
        );

      // If user is already viewing this conversation,
      // mark notification as read after displaying toast.
      if (
        isCurrentConversation &&
        notification.id
      ) {
        try {
          await notificationService.markAsRead(
            notification.id
          );
        } catch (error) {
          console.error(
            'Error auto-reading notification:',
            error
          );
        }
      }
    };

    // ----------------------------------------------------------
    // NOTIFICATION UPDATED
    // ----------------------------------------------------------

    const handleNotificationUpdated = ({
      notificationId,
      unreadCount,
      allRead,
      readAt,
    }) => {
      if (allRead) {
        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            read_at:
              readAt || new Date(),
          }))
        );
      } else if (notificationId) {
        setNotifications((prev) =>
          prev.map((notification) =>
            sameId(
              notification.id,
              notificationId
            )
              ? {
                  ...notification,
                  read_at:
                    readAt || new Date(),
                }
              : notification
          )
        );
      }

      if (
        typeof unreadCount === 'number'
      ) {
        setUnreadNotificationCount(
          unreadCount
        );
      }
    };

    // ----------------------------------------------------------
    // UNREAD NOTIFICATION COUNT
    // ----------------------------------------------------------

    const handleUnreadNotificationUpdated = ({
      unreadCount,
    }) => {
      if (
        typeof unreadCount === 'number'
      ) {
        setUnreadNotificationCount(
          unreadCount
        );
      }
    };

    // ----------------------------------------------------------
    // USER ONLINE
    // ----------------------------------------------------------

    const handleUserOnline = ({
      userId,
    }) => {
      if (!userId) return;

      setOnlineUsers((prev) => {
        if (
          prev.some((id) =>
            sameId(id, userId)
          )
        ) {
          return prev;
        }

        return [
          ...prev,
          userId,
        ];
      });

      updateUserStatus(
        userId,
        'online'
      );
    };

    // ----------------------------------------------------------
    // USER OFFLINE
    // ----------------------------------------------------------

    const handleUserOffline = ({
      userId,
    }) => {
      if (!userId) return;

      setOnlineUsers((prev) =>
        prev.filter(
          (id) =>
            !sameId(id, userId)
        )
      );

      updateUserStatus(
        userId,
        'offline'
      );
    };

    // ----------------------------------------------------------
    // ALL ONLINE USERS
    // ----------------------------------------------------------

    const handleUsersOnline = (
      userIds
    ) => {
      setOnlineUsers(
        Array.isArray(userIds)
          ? userIds
          : []
      );
    };

    // ==========================================================
    // REGISTER SOCKET LISTENERS
    // ==========================================================

    socketManager.on(
      'message:new',
      handleNewMessage
    );

    socketManager.on(
      'message:sent',
      handleMessageSent
    );

    socketManager.on(
      'message:delivered',
      handleMessageDelivered
    );

    socketManager.on(
      'message:read',
      handleMessageRead
    );

    socketManager.on(
      'conversation:read',
      handleConversationRead
    );

    socketManager.on(
      'message:edited',
      handleMessageEdited
    );

    socketManager.on(
      'message:deleted',
      handleMessageDeleted
    );

    socketManager.on(
      'message:reacted',
      handleMessageReacted
    );

    socketManager.on(
      'typing:started',
      handleTypingStarted
    );

    socketManager.on(
      'typing:stopped',
      handleTypingStopped
    );

    socketManager.on(
      'conversation:new',
      handleConversationCreated
    );

    socketManager.on(
      'notification:new',
      handleNotification
    );

    socketManager.on(
      'notification:updated',
      handleNotificationUpdated
    );

    socketManager.on(
      'notification:unread:updated',
      handleUnreadNotificationUpdated
    );

    socketManager.on(
      'user:online',
      handleUserOnline
    );

    socketManager.on(
      'user:offline',
      handleUserOffline
    );

    socketManager.on(
      'users:online',
      handleUsersOnline
    );

    // Ask server for current online users.
    socketManager.emit(
      'users:get-online'
    );

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      socketManager.off(
        'message:new',
        handleNewMessage
      );

      socketManager.off(
        'message:sent',
        handleMessageSent
      );

      socketManager.off(
        'message:delivered',
        handleMessageDelivered
      );

      socketManager.off(
        'message:read',
        handleMessageRead
      );

      socketManager.off(
        'conversation:read',
        handleConversationRead
      );

      socketManager.off(
        'message:edited',
        handleMessageEdited
      );

      socketManager.off(
        'message:deleted',
        handleMessageDeleted
      );

      socketManager.off(
        'message:reacted',
        handleMessageReacted
      );

      socketManager.off(
        'typing:started',
        handleTypingStarted
      );

      socketManager.off(
        'typing:stopped',
        handleTypingStopped
      );

      socketManager.off(
        'conversation:new',
        handleConversationCreated
      );

      socketManager.off(
        'notification:new',
        handleNotification
      );

      socketManager.off(
        'notification:updated',
        handleNotificationUpdated
      );

      socketManager.off(
        'notification:unread:updated',
        handleUnreadNotificationUpdated
      );

      socketManager.off(
        'user:online',
        handleUserOnline
      );

      socketManager.off(
        'user:offline',
        handleUserOffline
      );

      socketManager.off(
        'users:online',
        handleUsersOnline
      );
    };
  }, [
    user,
    token,
    currentConversation?.id,
  ]);

  // ============================================================
  // UPDATE USER STATUS
  // ============================================================

  const updateUserStatus = (
    userId,
    status
  ) => {
    setConversations((prev) =>
      prev.map((conversation) => ({
        ...conversation,
        members:
          conversation.members?.map(
            (member) =>
              sameId(
                member.id,
                userId
              )
                ? {
                    ...member,
                    status,
                  }
                : member
          ),
      }))
    );
  };

  // ============================================================
  // UPDATE CONVERSATION
  // ============================================================

  const updateConversationWithNewMessage = (
    message,
    isCurrent = false
  ) => {
    setConversations((prev) => {
      const index = prev.findIndex(
        (conversation) =>
          sameId(
            conversation.id,
            message.conversation_id
          )
      );

      if (index === -1) {
        return prev;
      }

      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        last_message: message,
        last_message_at:
          message.created_at,
        unread_count: isCurrent
          ? 0
          : (updated[index].unread_count || 0) + 1,
      };

      const [conversation] =
        updated.splice(index, 1);

      return [
        conversation,
        ...updated,
      ];
    });

    if (
      !isCurrent &&
      !sameId(
        message.sender_id,
        user?.id
      )
    ) {
      setUnreadCounts((prev) => ({
        ...prev,
        [message.conversation_id]:
          (prev[message.conversation_id] || 0) + 1,
      }));
    }
  };

  // ============================================================
  // FETCH CONVERSATIONS
  // ============================================================

  const fetchConversations = async () => {
    try {
      setLoading(true);

      const response =
        await conversationService.getConversations();

      const data = Array.isArray(
        response?.data
      )
        ? response.data
        : [];

      setConversations(data);

      const conversationIds =
        data.map(
          (conversation) =>
            conversation.id
        );

      socketManager.joinConversations(
        conversationIds
      );

      const counts = {};

      data.forEach((conversation) => {
        counts[conversation.id] =
          conversation.unread_count || 0;
      });

      setUnreadCounts(counts);
    } catch (error) {
      console.error(
        'Error fetching conversations:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH MESSAGES
  // ============================================================

  const fetchMessages = async (
    conversationId
  ) => {
    if (!conversationId) return;

    try {
      const response =
        await messageService.getMessages(
          conversationId
        );

      const data = Array.isArray(
        response?.data
      )
        ? response.data
        : [];

      setMessages(data);
    } catch (error) {
      console.error(
        'Error fetching messages:',
        error
      );
    }
  };

  // ============================================================
  // FETCH NOTIFICATIONS
  // ============================================================

  const fetchNotifications = async () => {
    try {
      const response =
        await notificationService.getNotifications();

      const notificationData =
        Array.isArray(response?.data)
          ? response.data
          : [];

      setNotifications(
        notificationData
      );

      const countResponse =
        await notificationService.getUnreadCount();

      setUnreadNotificationCount(
        countResponse?.data?.count || 0
      );
    } catch (error) {
      console.error(
        'Error fetching notifications:',
        error
      );
    }
  };

  // ============================================================
  // MARK MESSAGE AS READ
  // ============================================================

  const markMessageAsRead = async (
    messageId
  ) => {
    if (!messageId) return;

    try {
      // Persist read status in PostgreSQL.
      await messageService.markAsRead(
        messageId
      );

      // Immediately notify sender.
      socketManager.markMessageRead(
        messageId
      );
    } catch (error) {
      console.error(
        'Error marking message as read:',
        error
      );
    }
  };

  // ============================================================
  // MARK CONVERSATION AS READ
  // ============================================================

  const markConversationAsRead = async (
    conversationId
  ) => {
    if (!conversationId) return;

    try {
      await messageService.markConversationAsRead(
        conversationId
      );

      // Send real-time read receipt.
      socketManager.markConversationRead(
        conversationId
      );

      setUnreadCounts((prev) => ({
        ...prev,
        [conversationId]: 0,
      }));

      setConversations((prev) =>
        prev.map((conversation) =>
          sameId(
            conversation.id,
            conversationId
          )
            ? {
                ...conversation,
                unread_count: 0,
              }
            : conversation
        )
      );
    } catch (error) {
      console.error(
        'Error marking conversation as read:',
        error
      );
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async (
    data
  ) => {
    if (!currentConversation || !user) {
      return {
        success: false,
        error: 'No conversation selected',
      };
    }

    try {
      const optimisticMessage = {
        id: `temp-${Date.now()}`,

        conversation_id:
          currentConversation.id,

        sender_id: user.id,

        sender_name:
          user.full_name,

        sender_username:
          user.username,

        sender_avatar:
          user.avatar,

        content:
          data.content,

        type:
          data.type || 'text',

        file_url:
          data.fileUrl,

        file_name:
          data.fileName,

        file_size:
          data.fileSize,

        file_type:
          data.fileType,

        created_at:
          new Date().toISOString(),

        reads: [
          {
            user_id: user.id,
            read_at: new Date(),
          },
        ],

        delivered: false,

        is_temp: true,
      };

      // Show message immediately.
      setMessages((prev) => [
        ...prev,
        optimisticMessage,
      ]);

      // Update conversation preview.
      setConversations((prev) => {
        const index = prev.findIndex(
          (conversation) =>
            sameId(
              conversation.id,
              currentConversation.id
            )
        );

        if (index === -1) {
          return prev;
        }

        const updated = [...prev];

        updated[index] = {
          ...updated[index],
          last_message:
            optimisticMessage,
          last_message_at:
            optimisticMessage.created_at,
        };

        const [conversation] =
          updated.splice(index, 1);

        return [
          conversation,
          ...updated,
        ];
      });

      // Send through Socket.IO.
      socketManager.sendMessage({
        ...data,
        conversationId:
          currentConversation.id,
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        'Error sending message:',
        error
      );

      toast.error(
        'Failed to send message'
      );

      return {
        success: false,
        error,
      };
    }
  };

  // ============================================================
  // TYPING
  // ============================================================

  const sendTyping = (
    conversationId,
    isTypingNow
  ) => {
    if (!conversationId) return;

    if (
      isTypingNow &&
      !isTyping
    ) {
      setIsTyping(true);

      socketManager.startTyping(
        conversationId
      );

      clearTimeout(
        typingTimeoutRef.current
      );

      typingTimeoutRef.current =
        setTimeout(() => {
          setIsTyping(false);

          socketManager.stopTyping(
            conversationId
          );
        }, 3000);
    } else if (
      !isTypingNow &&
      isTyping
    ) {
      setIsTyping(false);

      socketManager.stopTyping(
        conversationId
      );

      clearTimeout(
        typingTimeoutRef.current
      );
    }
  };

  // ============================================================
  // MARK SINGLE NOTIFICATION AS READ
  // ============================================================

  const markNotificationAsRead = async (
    notificationId
  ) => {
    if (!notificationId) return;

    try {
      await notificationService.markAsRead(
        notificationId
      );

      socketManager.emit(
        'notification:read',
        {
          notificationId,
        }
      );
    } catch (error) {
      console.error(
        'Error marking notification as read:',
        error
      );
    }
  };

  // ============================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ============================================================

  const markAllNotificationsAsRead =
    async () => {
      try {
        await notificationService.markAllAsRead();

        socketManager.emit(
          'notification:read:all'
        );

        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            read_at: new Date(),
          }))
        );

        setUnreadNotificationCount(0);
      } catch (error) {
        console.error(
          'Error marking all notifications as read:',
          error
        );
      }
    };

  // ============================================================
  // CLEANUP TYPING TIMER
  // ============================================================

  useEffect(() => {
    return () => {
      clearTimeout(
        typingTimeoutRef.current
      );
    };
  }, []);

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value = {
    conversations,
    setConversations,

    currentConversation,
    setCurrentConversation,

    messages,
    setMessages,

    onlineUsers,

    typingUsers,

    unreadCounts,

    notifications,

    unreadNotificationCount,

    loading,

    fetchConversations,
    fetchMessages,

    sendMessage,
    sendTyping,

    markMessageAsRead,
    markConversationAsRead,

    markNotificationAsRead,
    markAllNotificationsAsRead,

    isTyping,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
