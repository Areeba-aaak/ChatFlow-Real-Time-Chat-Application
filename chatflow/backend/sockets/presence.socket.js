const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  socket.on('users:get-online', () => {
    socket.emit('users:online', presenceService.getOnlineUserIds());
  });

  socket.on('user:get-status', async (data = {}) => {
    try {
      if (!data.userId) return;

      const status = await presenceService.getUserStatus(data.userId);
      socket.emit('user:status', {
        userId: data.userId,
        status,
      });
    } catch (error) {
      logger.error('Get user status error:', error);
    }
  });

  socket.on('user:set-status', async (data = {}) => {
    try {
      const status = ['online', 'offline', 'away'].includes(data.status)
        ? data.status
        : 'online';

      await presenceService.updateUserStatus(userId, status);

      io.emit('user:status-changed', {
        userId,
        status,
      });
    } catch (error) {
      logger.error('Set user status error:', error);
    }
  });
};
