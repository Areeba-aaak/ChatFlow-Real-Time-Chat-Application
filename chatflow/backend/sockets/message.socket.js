const messageService = require('../services/message.service');
const notificationService = require('../services/notification.service');
const presenceService = require('../services/presence.service');
const { query } = require('../config/database');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // ============================================================
  // JOIN CONVERSATIONS
  // ============================================================

  socket.on('join:conversations', async (conversationIds = []) => {
    try {
      if (!Array.isArray(conversationIds)) {
        return;
      }

      for (const conversationId of conversationIds) {
        socket.join(`conversation:${conversationId}`);
      }

      logger.info(
        `User ${userId} joined conversations: ${conversationIds.join(', ')}`
      );
    } catch (error) {
      logger.error('Join conversations error:', error);
    }
  });

  // ============================================================
  // NOTIFY MESSAGE RECIPIENTS
  // ============================================================

  const notifyMessageRecipients = async (message) => {
    const members = await query(
      `
        SELECT user_id
        FROM conversation_members
        WHERE conversation_id = $1
          AND user_id != $2
      `,
      [
        message.conversation_id,
        userId,
      ]
    );

    for (const member of members) {
      const recipientId = member.user_id;

      // --------------------------------------------------------
      // PERSONAL USER ROOM
      // --------------------------------------------------------
      //
      // Every browser/tab/device of the recipient joins:
      //
      // user:<recipientId>
      //
      // Therefore this event reaches ALL open tabs.
      // --------------------------------------------------------

      const recipientRoom = `user:${recipientId}`;

      // --------------------------------------------------------
      // SEND MESSAGE TO RECIPIENT
      // --------------------------------------------------------

      io.to(recipientRoom).emit(
        'message:new',
        message
      );

      // --------------------------------------------------------
      // DELIVERY EVENT
      // --------------------------------------------------------

      io.to(recipientRoom).emit(
        'message:delivered',
        {
          messageId: message.id,
          conversationId: message.conversation_id,
          userId: recipientId,
          deliveredAt: new Date(),
        }
      );

      // --------------------------------------------------------
      // CREATE DATABASE NOTIFICATION
      // --------------------------------------------------------

      const notification = await notificationService.createNotification({
        recipientId,
        senderId: userId,
        type: 'message',
        content:
          message.type === 'text'
            ? `${socket.user.full_name}: ${message.content}`
            : `${socket.user.full_name} sent a ${message.type}`,
        conversationId: message.conversation_id,
        messageId: message.id,
        metadata: {
          message,
        },
      });

      // --------------------------------------------------------
      // REAL-TIME NOTIFICATION
      // --------------------------------------------------------
      //
      // This is the important part.
      //
      // We DO NOT send to only one socket.
      //
      // We send to the user's personal room.
      //
      // So:
      //
      // Bisma Chrome
      // Bisma Edge
      // Bisma Incognito
      // Bisma another device
      //
      // all receive the notification.
      // --------------------------------------------------------

      io.to(recipientRoom).emit(
        'notification:new',
        notification
      );

      // --------------------------------------------------------
      // UPDATE UNREAD COUNT
      // --------------------------------------------------------

      const unreadCount =
        await notificationService.getUnreadCount(
          recipientId
        );

      io.to(recipientRoom).emit(
        'notification:unread:updated',
        {
          unreadCount,
        }
      );

      logger.info(
        `Notification sent to user ${recipientId} for message ${message.id}`
      );
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  socket.on('message:send', async (data = {}) => {
    try {
      const {
        conversationId,
        content,
        type,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        replyToId,
      } = data;

      if (!conversationId) {
        throw new Error('Conversation is required');
      }

      // --------------------------------------------------------
      // SAVE MESSAGE
      // --------------------------------------------------------

      const message =
        await messageService.sendMessage({
          conversationId,
          senderId: userId,
          content,
          type,
          fileUrl,
          fileName,
          fileSize,
          fileType,
          replyToId,
        });

      // --------------------------------------------------------
      // CONFIRM TO SENDER
      // --------------------------------------------------------

      socket.emit(
        'message:sent',
        message
      );

      // --------------------------------------------------------
      // NOTIFY RECIPIENTS
      // --------------------------------------------------------

      await notifyMessageRecipients(message);

      logger.info(
        `Message sent: ${message.id} in conversation ${conversationId}`
      );
    } catch (error) {
      logger.error(
        'Send message error:',
        error
      );

      socket.emit(
        'error',
        {
          message:
            error.message ||
            'Failed to send message',
        }
      );
    }
  });

  // ============================================================
  // MESSAGE READ
  // ============================================================

  socket.on('message:read', async (data = {}) => {
    try {
      const { messageId } = data;

      if (!messageId) {
        return;
      }

      await messageService.markAsRead(
        messageId,
        userId
      );

      const message =
        await messageService.getMessageById(
          messageId
        );

      if (
        message &&
        String(message.sender_id) !== String(userId)
      ) {
        io.to(
          `user:${message.sender_id}`
        ).emit(
          'message:read',
          {
            messageId,
            conversationId:
              message.conversation_id,
            userId,
            readAt: new Date(),
          }
        );
      }
    } catch (error) {
      logger.error(
        'Mark read error:',
        error
      );
    }
  });

  // ============================================================
  // CONVERSATION READ
  // ============================================================

  socket.on('conversation:read', async (data = {}) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return;
      }

      const result =
        await messageService.markConversationAsRead(
          conversationId,
          userId
        );

      socket.emit(
        'conversation:read:success',
        {
          conversationId,
          count: result?.count || 0,
        }
      );

      const members = await query(
        `
          SELECT user_id
          FROM conversation_members
          WHERE conversation_id = $1
            AND user_id != $2
        `,
        [
          conversationId,
          userId,
        ]
      );

      for (const member of members) {
        io.to(
          `user:${member.user_id}`
        ).emit(
          'conversation:read',
          {
            conversationId,
            userId,
            readAt: new Date(),
          }
        );
      }
    } catch (error) {
      logger.error(
        'Mark conversation read error:',
        error
      );
    }
  });

  // ============================================================
  // EDIT MESSAGE
  // ============================================================

  socket.on('message:edit', async (data = {}) => {
    try {
      const {
        messageId,
        content,
      } = data;

      const message =
        await messageService.editMessage(
          messageId,
          userId,
          content
        );

      io.to(
        `conversation:${message.conversation_id}`
      ).emit(
        'message:edited',
        message
      );

      socket.emit(
        'message:edit:success',
        message
      );
    } catch (error) {
      logger.error(
        'Edit message error:',
        error
      );

      socket.emit(
        'error',
        {
          message:
            'Failed to edit message',
        }
      );
    }
  });

  // ============================================================
  // DELETE MESSAGE
  // ============================================================

  socket.on('message:delete', async (data = {}) => {
    try {
      const { messageId } = data;

      const message =
        await messageService.getMessageById(
          messageId
        );

      await messageService.deleteMessage(
        messageId,
        userId
      );

      io.to(
        `conversation:${message.conversation_id}`
      ).emit(
        'message:deleted',
        {
          messageId,
          userId,
          deletedAt: new Date(),
        }
      );

      socket.emit(
        'message:delete:success',
        {
          messageId,
        }
      );
    } catch (error) {
      logger.error(
        'Delete message error:',
        error
      );

      socket.emit(
        'error',
        {
          message:
            'Failed to delete message',
        }
      );
    }
  });

  // ============================================================
  // REACT
  // ============================================================

  socket.on('message:react', async (data = {}) => {
    try {
      const {
        messageId,
        emoji,
      } = data;

      await messageService.addReaction(
        messageId,
        userId,
        emoji
      );

      const message =
        await messageService.getMessageById(
          messageId
        );

      io.to(
        `conversation:${message.conversation_id}`
      ).emit(
        'message:reacted',
        {
          messageId,
          userId,
          emoji,
          user: socket.user,
        }
      );
    } catch (error) {
      logger.error(
        'Add reaction error:',
        error
      );

      socket.emit(
        'error',
        {
          message:
            'Failed to add reaction',
        }
      );
    }
  });

  // ============================================================
  // UNREACT
  // ============================================================

  socket.on('message:unreact', async (data = {}) => {
    try {
      const { messageId } = data;

      await messageService.removeReaction(
        messageId,
        userId
      );

      const message =
        await messageService.getMessageById(
          messageId
        );

      io.to(
        `conversation:${message.conversation_id}`
      ).emit(
        'message:unreacted',
        {
          messageId,
          userId,
        }
      );
    } catch (error) {
      logger.error(
        'Remove reaction error:',
        error
      );

      socket.emit(
        'error',
        {
          message:
            'Failed to remove reaction',
        }
      );
    }
  });

  // ============================================================
  // MESSAGE HISTORY
  // ============================================================

  socket.on('message:history', async (data = {}) => {
    try {
      const {
        conversationId,
        page = 1,
        limit = 50,
      } = data;

      const result =
        await messageService.getMessages(
          conversationId,
          userId,
          page,
          limit
        );

      socket.emit(
        'message:history:response',
        result
      );
    } catch (error) {
      logger.error(
        'Get message history error:',
        error
      );

      socket.emit(
        'error',
        {
          message:
            'Failed to get message history',
        }
      );
    }
  });

  // ============================================================
  // JOIN CONVERSATION
  // ============================================================

  socket.on('message:join', async (data = {}) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return;
      }

      socket.join(
        `conversation:${conversationId}`
      );

      await messageService.markConversationAsRead(
        conversationId,
        userId
      );

      socket.emit(
        'message:join:success',
        {
          conversationId,
        }
      );
    } catch (error) {
      logger.error(
        'Join conversation error:',
        error
      );
    }
  });

  // ============================================================
  // LEAVE CONVERSATION
  // ============================================================

  socket.on('message:leave', (data = {}) => {
    const { conversationId } = data;

    if (!conversationId) {
      return;
    }

    socket.leave(
      `conversation:${conversationId}`
    );

    socket.emit(
      'message:leave:success',
      {
        conversationId,
      }
    );
  });
};