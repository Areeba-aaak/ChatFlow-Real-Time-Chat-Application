const presenceService = require('../services/presence.service');
const { query } = require('../config/database');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;
  const typingTimeouts = new Map();

  const getMembers = async (conversationId) => {
    return query(
      `SELECT user_id
       FROM conversation_members
       WHERE conversation_id = $1
         AND user_id != $2`,
      [conversationId, userId]
    );
  };

  const emitTyping = async (conversationId, event) => {
    const members = await getMembers(conversationId);

    for (const member of members) {
      for (const socketId of presenceService.getSocketIds(member.user_id)) {
        io.to(socketId).emit(event, {
          conversationId,
          userId,
          user: event === 'typing:started' ? socket.user : undefined,
        });
      }
    }
  };

  socket.on('typing:start', async (data = {}) => {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      if (typingTimeouts.has(conversationId)) {
        clearTimeout(typingTimeouts.get(conversationId));
      }

      await emitTyping(conversationId, 'typing:started');

      const timeout = setTimeout(async () => {
        try {
          await emitTyping(conversationId, 'typing:stopped');
        } catch (error) {
          logger.error('Typing timeout error:', error);
        } finally {
          typingTimeouts.delete(conversationId);
        }
      }, 3000);

      typingTimeouts.set(conversationId, timeout);
    } catch (error) {
      logger.error('Typing start error:', error);
    }
  });

  socket.on('typing:stop', async (data = {}) => {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      if (typingTimeouts.has(conversationId)) {
        clearTimeout(typingTimeouts.get(conversationId));
        typingTimeouts.delete(conversationId);
      }

      await emitTyping(conversationId, 'typing:stopped');
    } catch (error) {
      logger.error('Typing stop error:', error);
    }
  });

  socket.on('typing:start:batch', async (data = {}) => {
    try {
      const conversationIds = Array.isArray(data.conversationIds)
        ? data.conversationIds
        : [];

      for (const conversationId of conversationIds) {
        await emitTyping(conversationId, 'typing:started');
      }
    } catch (error) {
      logger.error('Batch typing start error:', error);
    }
  });

  socket.on('typing:stop:batch', async (data = {}) => {
    try {
      const conversationIds = Array.isArray(data.conversationIds)
        ? data.conversationIds
        : [];

      for (const conversationId of conversationIds) {
        if (typingTimeouts.has(conversationId)) {
          clearTimeout(typingTimeouts.get(conversationId));
          typingTimeouts.delete(conversationId);
        }

        await emitTyping(conversationId, 'typing:stopped');
      }
    } catch (error) {
      logger.error('Batch typing stop error:', error);
    }
  });

  socket.on('disconnect', () => {
    for (const timeout of typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    typingTimeouts.clear();
  });
};
