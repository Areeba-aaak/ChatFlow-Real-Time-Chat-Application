const { query, queryOne } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { setCache, getCache, deleteCache } = require('../config/redis');
const { publishEvent } = require('../config/redis');
const logger = require('../utils/logger');

class UserService {
  async getUsers(userId, page = 1, limit = 50, search = '') {
    const offset = (page - 1) * limit;

    let whereClause = 'id != $1';
    let params = [userId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (username ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const users = await query(
      `SELECT id, username, email, full_name, avatar, status, last_seen
       FROM users
       WHERE ${whereClause}
       ORDER BY full_name
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const total = await queryOne(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );

    return {
      data: users,
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        totalPages: Math.ceil((total?.total || 0) / limit),
      },
    };
  }

  async getUserById(userId) {
    // Check cache first
    const cached = await getCache(`user:${userId}`);
    if (cached) return cached;

    const user = await queryOne(
      `SELECT id, username, email, full_name, avatar, status, last_seen, is_active
       FROM users 
       WHERE id = $1 AND is_active = true`,
      [userId]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Cache user data
    await setCache(`user:${userId}`, user, 300); // 5 minutes

    return user;
  }

  async getOnlineUsers(userId) {
    const users = await query(
      `SELECT id, username, full_name, avatar, status, last_seen
       FROM users 
       WHERE status = 'online' AND id != $1
       ORDER BY full_name`,
      [userId]
    );

    return users;
  }

  async searchUsers(userId, query) {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;

    const users = await query(
      `SELECT id, username, full_name, avatar, status, last_seen
       FROM users
       WHERE id != $1 AND (username ILIKE $2 OR full_name ILIKE $3)
       ORDER BY full_name
       LIMIT 20`,
      [userId, searchTerm, searchTerm]
    );

    return users;
  }

  async updateProfile(userId, data) {
    const { full_name, avatar } = data;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (full_name) {
      updates.push(`full_name = $${paramIndex}`);
      values.push(full_name);
      paramIndex++;
    }

    if (avatar !== undefined) {
      updates.push(`avatar = $${paramIndex}`);
      values.push(avatar);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(userId);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Clear cache
    await deleteCache(`user:${userId}`);

    // Get updated user
    const user = await this.getUserById(userId);

    // Publish profile updated event
    await publishEvent('user:profile_updated', {
      userId,
      user,
    });

    logger.info(`User profile updated: ${userId}`);

    return user;
  }

  async updateStatus(userId, status) {
    const validStatuses = ['online', 'offline', 'away'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    await query(
      'UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2',
      [status, userId]
    );

    // Clear cache
    await deleteCache(`user:${userId}`);

    // Publish status changed event
    await publishEvent('user:status_changed', {
      userId,
      status,
    });

    logger.info(`User status updated: ${userId} -> ${status}`);

    return { userId, status };
  }

  async updateLastSeen(userId) {
    await query(
      'UPDATE users SET last_seen = NOW() WHERE id = $1',
      [userId]
    );

    // Clear cache
    await deleteCache(`user:${userId}`);
  }

  async getUsersByIds(userIds) {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const users = await query(
      `SELECT id, username, full_name, avatar, status, last_seen
       FROM users
       WHERE id IN (${placeholders}) AND is_active = true`,
      userIds
    );

    return users;
  }
}

module.exports = new UserService();