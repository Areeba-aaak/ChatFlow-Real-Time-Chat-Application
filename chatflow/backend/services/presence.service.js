const { query } = require('../config/database');
const { getRedis, publishEvent, subscribeEvent } = require('../config/redis');
const logger = require('../utils/logger');

/*
 * Presence is connection based:
 * userId -> Set(socketIds)
 *
 * This is important because a user can have multiple tabs/devices.
 * A user is offline only when their LAST socket disconnects.
 */
class PresenceService {
  constructor() {
    this.userSockets = new Map();
    this.socketUsers = new Map();
    this.setupSubscriptions();
  }

  setupSubscriptions() {
    subscribeEvent('user:online', (data) => this.handleUserOnline(data));
    subscribeEvent('user:offline', (data) => this.handleUserOffline(data));
  }

  registerSocket(socketId, userId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }

    this.userSockets.get(userId).add(socketId);
    this.socketUsers.set(socketId, userId);

    return this.userSockets.get(userId).size;
  }

  unregisterSocket(socketId) {
    const userId = this.socketUsers.get(socketId);

    if (!userId) {
      return { userId: null, hasOtherConnections: false };
    }

    const sockets = this.userSockets.get(userId);

    if (sockets) {
      sockets.delete(socketId);

      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.socketUsers.delete(socketId);

    return {
      userId,
      hasOtherConnections: this.userSockets.has(userId),
    };
  }

  getSocketId(userId) {
    const sockets = this.userSockets.get(userId);
    return sockets?.values().next().value || null;
  }

  getSocketIds(userId) {
    return Array.from(this.userSockets.get(userId) || []);
  }

  getUserId(socketId) {
    return this.socketUsers.get(socketId);
  }

  async getUserStatus(userId) {
    if (this.isUserOnline(userId)) {
      return 'online';
    }

    const redis = getRedis();

    if (!redis) {
      return 'offline';
    }

    const status = await redis.get(`user:${userId}:status`);
    return status || 'offline';
  }

  async getOnlineUsers(userIds = []) {
    const online = [];

    for (const userId of userIds) {
      if (this.isUserOnline(userId)) {
        online.push(userId);
      }
    }

    return online;
  }

  async handleUserOnline(data) {
    const { userId } = data;
    const redis = getRedis();

    if (redis) {
      await redis.set(`user:${userId}:status`, 'online', { EX: 300 });
    }
  }

  async handleUserOffline(data) {
    const { userId } = data;
    const redis = getRedis();

    if (redis) {
      await redis.set(`user:${userId}:status`, 'offline', { EX: 300 });
    }
  }

  async updateUserStatus(userId, status) {
    await query(
      'UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2',
      [status, userId]
    );

    const redis = getRedis();

    if (redis) {
      await redis.set(`user:${userId}:status`, status, { EX: 300 });
    }

    await publishEvent('user:status_changed', { userId, status });

    return { success: true };
  }

  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }

  getOnlineUserIds() {
    return Array.from(this.userSockets.keys());
  }
}

module.exports = new PresenceService();
