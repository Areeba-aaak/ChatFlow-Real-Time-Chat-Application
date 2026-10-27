const eventBus = require('./eventBus');
const notificationService = require('../services/notification.service');
const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

class MessageEvents {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    // Handle message sent event
    eventBus.register('message:sent', this.handleMessageSent.bind(this));
    
    // Handle message read event
    eventBus.register('message:read', this.handleMessageRead.bind(this));
    
    // Handle message edited event
    eventBus.register('message:edited', this.handleMessageEdited.bind(this));
    
    // Handle message deleted event
    eventBus.register('message:deleted', this.handleMessageDeleted.bind(this));
    
    // Handle message reaction event
    eventBus.register('message:reaction', this.handleMessageReaction.bind(this));

    logger.info('Message events registered');
  }

  async handleMessageSent(data) {
    try {
      const { conversationId, messageId, senderId } = data;
      
      // Get conversation members
      const { query } = require('../config/database');
      const members = await query(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?',
        [conversationId, senderId]
      );

      // Send notifications to other members
      for (const member of members) {
        await notificationService.createNotification({
          recipientId: member.user_id,
          senderId,
          type: 'message',
          content: 'New message received',
          conversationId,
          messageId,
        });
      }

      logger.debug(`Message event processed: ${messageId}`);
    } catch (error) {
      logger.error('Error handling message sent event:', error);
    }
  }

  async handleMessageRead(data) {
    try {
      const { messageId, userId, conversationId } = data;
      
      // Get message sender
      const { queryOne } = require('../config/database');
      const message = await queryOne(
        'SELECT sender_id FROM messages WHERE id = ?',
        [messageId]
      );

      if (message && message.sender_id !== userId) {
        // Notify sender that message was read
        const senderSocket = presenceService.getSocketId(message.sender_id);
        if (senderSocket) {
          const io = require('socket.io').io;
          io.to(senderSocket).emit('message:read', {
            messageId,
            userId,
          });
        }
      }

      logger.debug(`Message read event processed: ${messageId}`);
    } catch (error) {
      logger.error('Error handling message read event:', error);
    }
  }

  async handleMessageEdited(data) {
    try {
      const { messageId, userId, conversationId } = data;
      
      // Notify all members that message was edited
      const { query } = require('../config/database');
      const members = await query(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?',
        [conversationId, userId]
      );

      const io = require('socket.io').io;
      for (const member of members) {
        const memberSocket = presenceService.getSocketId(member.user_id);
        if (memberSocket) {
          io.to(memberSocket).emit('message:edited', data);
        }
      }

      logger.debug(`Message edited event processed: ${messageId}`);
    } catch (error) {
      logger.error('Error handling message edited event:', error);
    }
  }

  async handleMessageDeleted(data) {
    try {
      const { messageId, userId, conversationId } = data;
      
      // Notify all members that message was deleted
      const { query } = require('../config/database');
      const members = await query(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?',
        [conversationId, userId]
      );

      const io = require('socket.io').io;
      for (const member of members) {
        const memberSocket = presenceService.getSocketId(member.user_id);
        if (memberSocket) {
          io.to(memberSocket).emit('message:deleted', {
            messageId,
            userId,
          });
        }
      }

      logger.debug(`Message deleted event processed: ${messageId}`);
    } catch (error) {
      logger.error('Error handling message deleted event:', error);
    }
  }

  async handleMessageReaction(data) {
    try {
      const { messageId, userId, emoji, conversationId } = data;
      
      // Notify all members about reaction
      const { query } = require('../config/database');
      const members = await query(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?',
        [conversationId, userId]
      );

      const io = require('socket.io').io;
      for (const member of members) {
        const memberSocket = presenceService.getSocketId(member.user_id);
        if (memberSocket) {
          io.to(memberSocket).emit('message:reacted', {
            messageId,
            userId,
            emoji,
          });
        }
      }

      logger.debug(`Message reaction event processed: ${messageId}`);
    } catch (error) {
      logger.error('Error handling message reaction event:', error);
    }
  }
}

module.exports = new MessageEvents();