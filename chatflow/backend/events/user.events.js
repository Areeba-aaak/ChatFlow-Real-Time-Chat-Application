const eventBus = require('./eventBus');
const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

class UserEvents {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    // Handle user online event
    eventBus.register('user:online', this.handleUserOnline.bind(this));
    
    // Handle user offline event
    eventBus.register('user:offline', this.handleUserOffline.bind(this));
    
    // Handle user status changed event
    eventBus.register('user:status_changed', this.handleUserStatusChanged.bind(this));

    // Handle user profile updated event
    eventBus.register('user:profile_updated', this.handleUserProfileUpdated.bind(this));

    logger.info('User events registered');
  }

  async handleUserOnline(data) {
    try {
      const { userId } = data;
      
      // Update user status in database
      const { query } = require('../config/database');
      await query(
        'UPDATE users SET status = "online", last_seen = NOW() WHERE id = ?',
        [userId]
      );

      // Notify all users
      const io = require('socket.io').io;
      io.emit('user:online', { userId });

      logger.debug(`User online event processed: ${userId}`);
    } catch (error) {
      logger.error('Error handling user online event:', error);
    }
  }

  async handleUserOffline(data) {
    try {
      const { userId } = data;
      
      // Update user status in database
      const { query } = require('../config/database');
      await query(
        'UPDATE users SET status = "offline", last_seen = NOW() WHERE id = ?',
        [userId]
      );

      // Notify all users
      const io = require('socket.io').io;
      io.emit('user:offline', { userId });

      logger.debug(`User offline event processed: ${userId}`);
    } catch (error) {
      logger.error('Error handling user offline event:', error);
    }
  }

  async handleUserStatusChanged(data) {
    try {
      const { userId, status } = data;
      
      const io = require('socket.io').io;
      io.emit('user:status_changed', { userId, status });

      logger.debug(`User status changed event processed: ${userId} -> ${status}`);
    } catch (error) {
      logger.error('Error handling user status changed event:', error);
    }
  }

  async handleUserProfileUpdated(data) {
    try {
      const { userId, user } = data;
      
      const io = require('socket.io').io;
      io.emit('user:profile_updated', { userId, user });

      logger.debug(`User profile updated event processed: ${userId}`);
    } catch (error) {
      logger.error('Error handling user profile updated event:', error);
    }
  }
}

module.exports = new UserEvents();