const messageService = require('../services/message.service');
const notificationService = require('../services/notification.service');
const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // Join conversation rooms
  socket.on('join:conversations', async (conversationIds) => {
    try {
      for (const convId of conversationIds) {
        socket.join(`conversation:${convId}`);
      }
      logger.info(`User ${userId} joined conversations: ${conversationIds.join(', ')}`);
    } catch (error) {
      logger.error('Join conversations error:', error);
    }
  });

  // Send message
  socket.on('message:send', async (data) => {
    try {
      const { conversationId, content, type, fileUrl, fileName, fileSize, fileType, replyToId } = data;

      const message = await messageService.sendMessage({
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

      // Get conversation members
      const { query } = require('../config/database');
      const members = await query(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ?',
        [conversationId]
      );

      // Emit to all members in conversation room
      io.to(`conversation:${conversationId}`).emit('message:new', message);

      // Send notifications to other members
      for (const member of members) {
        if (member.user_id !== userId) {
          const notification = await notificationService.createNotification({
            recipientId: member.user_id,
            senderId: userId,
            type: 'message',
            content: `${socket.user.full_name}: ${content || 'File'}`,
            conversationId,
            messageId: message.id,
            metadata: { message },
          });

          const memberSocket = presenceService.getSocketId(member.user_id);
          if (memberSocket) {
            io.to(memberSocket).emit('notification:new', notification);
          }
        }
      }

      logger.info(`Message sent: ${message.id} in conversation ${conversationId}`);
    } catch (error) {
      logger.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Mark message as read
  socket.on('message:read', async (data) => {
    try {
      const { messageId } = data;
      await messageService.markAsRead(messageId, userId);
      
      // Notify sender
      const message = await messageService.getMessageById(messageId);
      if (message && message.sender_id !== userId) {
        const senderSocket = presenceService.getSocketId(message.sender_id);
        if (senderSocket) {
          io.to(senderSocket).emit('message:read', {
            messageId,
            userId,
          });
        }
      }
    } catch (error) {
      logger.error('Mark read error:', error);
    }
  });

  // Mark conversation as read
  socket.on('conversation:read', async (data) => {
    try {
      const { conversationId } = data;
      await messageService.markConversationAsRead(conversationId, userId);
      
      socket.emit('conversation:read:success', { conversationId });
    } catch (error) {
      logger.error('Mark conversation read error:', error);
    }
  });

  // Edit message
  socket.on('message:edit', async (data) => {
    try {
      const { messageId, content } = data;
      const message = await messageService.editMessage(messageId, userId, content);
      
      io.to(`conversation:${message.conversation_id}`).emit('message:edited', message);
    } catch (error) {
      logger.error('Edit message error:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Delete message
  socket.on('message:delete', async (data) => {
    try {
      const { messageId } = data;
      const message = await messageService.getMessageById(messageId);
      await messageService.deleteMessage(messageId, userId);
      
      io.to(`conversation:${message.conversation_id}`).emit('message:deleted', {
        messageId,
        userId,
      });
    } catch (error) {
      logger.error('Delete message error:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Add reaction
  socket.on('message:react', async (data) => {
    try {
      const { messageId, emoji } = data;
      await messageService.addReaction(messageId, userId, emoji);
      
      const message = await messageService.getMessageById(messageId);
      io.to(`conversation:${message.conversation_id}`).emit('message:reacted', {
        messageId,
        userId,
        emoji,
      });
    } catch (error) {
      logger.error('Add reaction error:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  // Remove reaction
  socket.on('message:unreact', async (data) => {
    try {
      const { messageId } = data;
      await messageService.removeReaction(messageId, userId);
      
      const message = await messageService.getMessageById(messageId);
      io.to(`conversation:${message.conversation_id}`).emit('message:unreacted', {
        messageId,
        userId,
      });
    } catch (error) {
      logger.error('Remove reaction error:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  });
};