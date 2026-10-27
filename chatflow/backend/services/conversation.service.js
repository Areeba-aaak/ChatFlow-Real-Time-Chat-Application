const { query, queryOne, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { publishEvent } = require('../config/redis');

class ConversationService {
  async createPrivateConversation(userId, otherUserId) {
    if (userId === parseInt(otherUserId)) {
      throw new AppError('Cannot create conversation with yourself', 400);
    }

    // Check if conversation already exists
    const existing = await queryOne(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
       JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
       WHERE c.is_group = false`,
      [userId, otherUserId]
    );

    if (existing) {
      return this.getConversationById(existing.id, userId);
    }

    const result = await transaction(async (conn) => {
      const convResult = await conn.query(
        `INSERT INTO conversations (is_group, created_by) VALUES ($1, $2) RETURNING id`,
        [false, userId]
      );

      const conversationId = convResult.rows[0].id;

      // Add both members - PostgreSQL uses separate inserts
      await conn.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member')`,
        [conversationId, userId]
      );
      await conn.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'member')`,
        [conversationId, otherUserId]
      );

      return conversationId;
    });

    return this.getConversationById(result, userId);
  }

  async createGroupConversation(userId, name, participantIds) {
    if (!name || !participantIds || participantIds.length < 2) {
      throw new AppError('Group must have at least 2 participants and a name', 400);
    }

    const participants = [...new Set([userId, ...participantIds])];

    const result = await transaction(async (conn) => {
      const convResult = await conn.query(
        `INSERT INTO conversations (name, is_group, created_by) VALUES ($1, $2, $3) RETURNING id`,
        [name, true, userId]
      );

      const conversationId = convResult.rows[0].id;

      // Add members one by one
      for (const participantId of participants) {
        const role = participantId === userId ? 'admin' : 'member';
        await conn.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3)`,
          [conversationId, participantId, role]
        );
      }

      return conversationId;
    });

    // Publish group created event
    await publishEvent('conversation:created', {
      conversationId: result,
      userId,
      participants,
    });

    return this.getConversationById(result, userId);
  }

  async getConversations(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const conversations = await query(
      `SELECT 
        c.id, c.name, c.is_group, c.last_message_at, c.created_at,
        lm.id as last_message_id, lm.content as last_message_content, 
        lm.type as last_message_type, lm.created_at as last_message_time,
        lm.sender_id as last_message_sender_id,
        u_sender.username as last_message_sender_username,
        u_sender.full_name as last_message_sender_name
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1
      LEFT JOIN messages lm ON lm.id = c.last_message_id
      LEFT JOIN users u_sender ON u_sender.id = lm.sender_id
      WHERE c.deleted_at IS NULL
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const total = await queryOne(
      `SELECT COUNT(*) as total FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1`,
      [userId]
    );

    // Get members for each conversation
    for (const conv of conversations) {
      const members = await query(
        `SELECT u.id, u.username, u.full_name, u.avatar, u.status, u.last_seen,
         cm.role, cm.joined_at
         FROM conversation_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.conversation_id = $1`,
        [conv.id]
      );
      conv.members = members;
      conv.unread_count = await this.getUnreadCount(conv.id, userId);

      // Normalize the last-message fields into the same object shape
      // returned by getConversationById(). The frontend conversation
      // list reads conversation.last_message, so returning only
      // last_message_content/last_message_type caused every chat preview
      // to display "No messages yet" even when messages existed.
      conv.last_message = conv.last_message_id
        ? {
            id: conv.last_message_id,
            content: conv.last_message_content,
            type: conv.last_message_type,
            created_at: conv.last_message_time,
            sender_id: conv.last_message_sender_id,
            sender_username: conv.last_message_sender_username,
            sender_name: conv.last_message_sender_name,
          }
        : null;
    }

    return {
      data: conversations,
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        totalPages: Math.ceil((total?.total || 0) / limit),
      },
    };
  }

  async getConversationById(conversationId, userId) {
    const conversation = await queryOne(
      `SELECT c.id, c.name, c.is_group, c.created_by, c.last_message_at, c.created_at
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1
       WHERE c.id = $2 AND c.deleted_at IS NULL`,
      [userId, conversationId]
    );

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const members = await query(
      `SELECT u.id, u.username, u.full_name, u.avatar, u.status, u.last_seen,
       cm.role, cm.joined_at
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = $1`,
      [conversationId]
    );

    conversation.members = members;
    conversation.unread_count = await this.getUnreadCount(conversationId, userId);

    // Get last message
    const lastMessage = await queryOne(
      `SELECT m.id, m.content, m.type, m.file_url, m.file_name, m.created_at,
       u.id as sender_id, u.username as sender_username, u.full_name as sender_name
       FROM messages m
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC LIMIT 1`,
      [conversationId]
    );

    conversation.last_message = lastMessage;

    return conversation;
  }

  async getUnreadCount(conversationId, userId) {
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM messages m
       LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = $1
       WHERE m.conversation_id = $2 AND m.sender_id != $3 AND mr.id IS NULL`,
      [userId, conversationId, userId]
    );
    return result?.count || 0;
  }

  async addMembers(conversationId, userId, memberIds) {
    const conversation = await queryOne(
      'SELECT id, is_group FROM conversations WHERE id = $1 AND deleted_at IS NULL',
      [conversationId]
    );

    if (!conversation || !conversation.is_group) {
      throw new AppError('Group conversation not found', 404);
    }

    // Check if user is admin
    const isAdmin = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2 AND role = $3',
      [conversationId, userId, 'admin']
    );

    if (!isAdmin) {
      throw new AppError('Only admins can add members', 403);
    }

    await transaction(async (conn) => {
      for (const memberId of memberIds) {
        await conn.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (conversation_id, user_id) DO NOTHING`,
          [conversationId, memberId, 'member']
        );
      }
    });

    // Publish members added event
    await publishEvent('conversation:members_added', {
      conversationId,
      userId,
      memberIds,
    });

    return this.getConversationById(conversationId, userId);
  }

  async removeMember(conversationId, userId, targetUserId) {
    const conversation = await queryOne(
      'SELECT id, is_group FROM conversations WHERE id = $1 AND deleted_at IS NULL',
      [conversationId]
    );

    if (!conversation || !conversation.is_group) {
      throw new AppError('Group conversation not found', 404);
    }

    // Check if user is admin or removing themselves
    const isAdmin = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2 AND role = $3',
      [conversationId, userId, 'admin']
    );

    if (userId !== targetUserId && !isAdmin) {
      throw new AppError('Only admins can remove members', 403);
    }

    // Check if target is member
    const isMember = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, targetUserId]
    );

    if (!isMember) {
      throw new AppError('User is not a member', 404);
    }

    await query(
      'DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, targetUserId]
    );

    // Publish member removed event
    await publishEvent('conversation:member_removed', {
      conversationId,
      userId,
      targetUserId,
    });
  }

  async leaveGroup(conversationId, userId) {
    const conversation = await queryOne(
      'SELECT id, created_by, is_group FROM conversations WHERE id = $1 AND deleted_at IS NULL',
      [conversationId]
    );

    if (!conversation || !conversation.is_group) {
      throw new AppError('Group conversation not found', 404);
    }

    // Check if user is member
    const isMember = await queryOne(
      'SELECT id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (!isMember) {
      throw new AppError('You are not a member of this group', 404);
    }

    await transaction(async (conn) => {
      await conn.query(
        'DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      // If creator leaves, transfer ownership
      if (conversation.created_by === userId) {
        const nextAdmin = await conn.query(
          `SELECT user_id FROM conversation_members 
           WHERE conversation_id = $1 ORDER BY joined_at LIMIT 1`,
          [conversationId]
        );

        if (nextAdmin.rows.length > 0) {
          await conn.query(
            `UPDATE conversation_members SET role = 'admin' 
             WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, nextAdmin.rows[0].user_id]
          );
          
          await conn.query(
            `UPDATE conversations SET created_by = $1 WHERE id = $2`,
            [nextAdmin.rows[0].user_id, conversationId]
          );
        } else {
          // Delete conversation if no members left
          await conn.query(
            `UPDATE conversations SET deleted_at = NOW() WHERE id = $1`,
            [conversationId]
          );
        }
      }
    });

    await publishEvent('conversation:member_left', {
      conversationId,
      userId,
    });
  }
}

module.exports = new ConversationService();