const { query, queryOne } = require('../config/database');
const { publishEvent } = require('../config/redis');

class NotificationService {
  async createNotification(data) {
    const {
      recipientId,
      senderId,
      type,
      content,
      conversationId,
      messageId,
      metadata,
    } = data;

    const result = await query(
      `
      INSERT INTO notifications (
        recipient_id,
        sender_id,
        type,
        content,
        conversation_id,
        message_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        recipientId,
        senderId,
        type,
        content,
        conversationId,
        messageId,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    const notification = await this.getNotificationById(
      result[0].id
    );

    // Publish notification event.
    // notification.socket.js listens for this event.
    try {
      await publishEvent(
        'notification:created',
        notification
      );
    } catch (error) {
      console.error(
        'Notification publish failed:',
        error.message
      );
    }

    return notification;
  }

  async getNotificationById(id) {
    return await queryOne(
      `
      SELECT
        n.*,
        u.username AS sender_username,
        u.full_name AS sender_name,
        u.avatar AS sender_avatar
      FROM notifications n
      LEFT JOIN users u
        ON u.id = n.sender_id
      WHERE n.id = $1
      `,
      [id]
    );
  }

  async getNotifications(
    userId,
    page = 1,
    limit = 50
  ) {
    const offset = (page - 1) * limit;

    const notifications = await query(
      `
      SELECT
        n.*,
        u.username AS sender_username,
        u.full_name AS sender_name,
        u.avatar AS sender_avatar
      FROM notifications n
      LEFT JOIN users u
        ON u.id = n.sender_id
      WHERE n.recipient_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    );

    const total = await queryOne(
      `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE recipient_id = $1
      `,
      [userId]
    );

    const totalCount = Number(
      total?.total || 0
    );

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(
          totalCount / limit
        ),
      },
    };
  }

  async getUnreadCount(userId) {
    const result = await queryOne(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE recipient_id = $1
        AND read_at IS NULL
      `,
      [userId]
    );

    return Number(result?.count || 0);
  }

  async markAsRead(
    notificationId,
    userId
  ) {
    await query(
      `
      UPDATE notifications
      SET read_at = NOW()
      WHERE id = $1
        AND recipient_id = $2
      `,
      [notificationId, userId]
    );

    return {
      success: true,
    };
  }

  async markAllAsRead(userId) {
    await query(
      `
      UPDATE notifications
      SET read_at = NOW()
      WHERE recipient_id = $1
        AND read_at IS NULL
      `,
      [userId]
    );

    return {
      success: true,
    };
  }

  async deleteNotification(
    notificationId,
    userId
  ) {
    await query(
      `
      DELETE FROM notifications
      WHERE id = $1
        AND recipient_id = $2
      `,
      [notificationId, userId]
    );

    return {
      success: true,
    };
  }
}

module.exports = new NotificationService();