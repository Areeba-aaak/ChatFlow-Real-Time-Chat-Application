const { query, queryOne, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { publishEvent } = require('../config/redis');
const logger = require('../utils/logger');

class MessageService {
  async sendMessage(data) {
    const { conversationId, senderId, content, type = 'text', fileUrl, fileName, fileSize, fileType, replyToId } = data;

    // Check if user is in conversation
    const isMember = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, senderId]
    );

    if (!isMember) {
      throw new AppError('You are not a member of this conversation', 403);
    }

    const result = await transaction(async (conn) => {
      const msgResult = await conn.query(
        `INSERT INTO messages (conversation_id, sender_id, content, type, file_url, file_name, file_size, file_type, reply_to_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [conversationId, senderId, content, type, fileUrl, fileName, fileSize, fileType, replyToId]
      );

      const messageId = msgResult.rows[0].id;

      // Update conversation last message
      await conn.query(
        `UPDATE conversations SET last_message_id = $1, last_message_at = NOW() WHERE id = $2`,
        [messageId, conversationId]
      );

      // Add read receipt for sender
      await conn.query(
        `INSERT INTO message_reads (message_id, user_id) VALUES ($1, $2)`,
        [messageId, senderId]
      );

      return messageId;
    });

    const message = await this.getMessageById(result);

    // Publish message event
    await publishEvent('message:sent', {
      conversationId,
      messageId: result,
      senderId,
    });

    return message;
  }

  async getMessageById(messageId) {
    const message = await queryOne(
      `SELECT m.id, m.content, m.type, m.file_url, m.file_name, m.file_size, m.file_type,
       m.created_at, m.updated_at, m.edited_at, m.reply_to_id,
       u.id as sender_id, u.username as sender_username, u.full_name as sender_name, u.avatar as sender_avatar,
       r.id as reply_id, r.content as reply_content, r.type as reply_type,
       ru.id as reply_sender_id, ru.full_name as reply_sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages r ON r.id = m.reply_to_id
       LEFT JOIN users ru ON ru.id = r.sender_id
       WHERE m.id = $1`,
      [messageId]
    );

    if (message) {
      const reads = await query(
        'SELECT user_id, read_at FROM message_reads WHERE message_id = $1',
        [messageId]
      );
      message.reads = reads;
    }

    return message;
  }

  async getMessages(conversationId, userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    // Check if user is in conversation
    const isMember = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (!isMember) {
      throw new AppError('You are not a member of this conversation', 403);
    }

    const messages = await query(
      `SELECT m.id, m.content, m.type, m.file_url, m.file_name, m.file_size, m.file_type,
       m.created_at, m.updated_at, m.edited_at, m.reply_to_id,
       u.id as sender_id, u.username as sender_username, u.full_name as sender_name, u.avatar as sender_avatar,
       (SELECT COUNT(*) FROM message_reads mr WHERE mr.message_id = m.id) as read_count
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    const total = await queryOne(
      'SELECT COUNT(*) as total FROM messages WHERE conversation_id = $1',
      [conversationId]
    );

    // Get reads for each message
    for (const message of messages) {
      const reads = await query(
        'SELECT user_id, read_at FROM message_reads WHERE message_id = $1',
        [message.id]
      );
      message.reads = reads;
      message.is_read = reads.some(r => r.user_id === userId);
    }

    return {
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        totalPages: Math.ceil((total?.total || 0) / limit),
      },
    };
  }

  async markAsRead(messageId, userId) {
    const message = await queryOne(
      'SELECT id, conversation_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check if user is in conversation
    const isMember = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [message.conversation_id, userId]
    );

    if (!isMember) {
      throw new AppError('You are not a member of this conversation', 403);
    }

    await query(
      `INSERT INTO message_reads (message_id, user_id) VALUES ($1, $2) ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, userId]
    );

    // Publish read event
    await publishEvent('message:read', {
      messageId,
      userId,
      conversationId: message.conversation_id,
    });

    return { success: true };
  }

  async markConversationAsRead(conversationId, userId) {
    const messages = await query(
      `SELECT id FROM messages 
       WHERE conversation_id = $1 AND sender_id != $2
       AND id NOT IN (SELECT message_id FROM message_reads WHERE user_id = $3)`,
      [conversationId, userId, userId]
    );

    for (const message of messages) {
      await query(
        `INSERT INTO message_reads (message_id, user_id) VALUES ($1, $2) ON CONFLICT (message_id, user_id) DO NOTHING`,
        [message.id, userId]
      );
    }

    await publishEvent('conversation:read', {
      conversationId,
      userId,
    });

    return { success: true, count: messages.length };
  }

  async editMessage(messageId, userId, content) {
    const message = await queryOne(
      'SELECT id, sender_id, conversation_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.sender_id !== userId) {
      throw new AppError('You can only edit your own messages', 403);
    }

    await query(
      'UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2',
      [content, messageId]
    );

    const updatedMessage = await this.getMessageById(messageId);

    await publishEvent('message:edited', {
      messageId,
      userId,
      conversationId: message.conversation_id,
    });

    return updatedMessage;
  }

  async deleteMessage(messageId, userId) {
    const message = await queryOne(
      'SELECT id, sender_id, conversation_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.sender_id !== userId) {
      throw new AppError('You can only delete your own messages', 403);
    }

    await query('DELETE FROM messages WHERE id = $1', [messageId]);

    await publishEvent('message:deleted', {
      messageId,
      userId,
      conversationId: message.conversation_id,
    });

    return { success: true };
  }

  async addReaction(messageId, userId, emoji) {
    const message = await queryOne(
      'SELECT id, conversation_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check if user is in conversation
    const isMember = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [message.conversation_id, userId]
    );

    if (!isMember) {
      throw new AppError('You are not a member of this conversation', 403);
    }

    await query(
      `INSERT INTO message_reactions (message_id, user_id, emoji) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji`,
      [messageId, userId, emoji]
    );

    await publishEvent('message:reaction', {
      messageId,
      userId,
      emoji,
      conversationId: message.conversation_id,
    });

    return { success: true, emoji };
  }

  async removeReaction(messageId, userId) {
    await query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2',
      [messageId, userId]
    );

    return { success: true };
  }

  async getMessageReactions(messageId) {
    return await query(
      `SELECT user_id, emoji, created_at 
       FROM message_reactions 
       WHERE message_id = $1`,
      [messageId]
    );
  }
}

module.exports = new MessageService();