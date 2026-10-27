const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const conversationService = require('../services/conversation.service');
const { successResponse, paginatedResponse } = require('../utils/response');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('../services/notification.service');

// Get all conversations
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await conversationService.getConversations(req.userId, page, limit);
    paginatedResponse(res, result.data, page, limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
});

// Create private conversation
router.post('/private', auth, async (req, res, next) => {
  try {
    const { userId } = req.body;
    const conversation = await conversationService.createPrivateConversation(req.userId, userId);
    successResponse(res, conversation, 'Conversation created', 201);
  } catch (error) {
    next(error);
  }
});

// Create group conversation
router.post('/group', auth, async (req, res, next) => {
  try {
    const { name, participantIds } = req.body;
    const conversation = await conversationService.createGroupConversation(req.userId, name, participantIds);

    // Notify every group member so the new group appears without a refresh.
    const io = req.app.get('io');
    if (conversation?.members) {
      for (const member of conversation.members) {
        if (String(member.id) === String(req.userId)) continue;

        const notification = await notificationService.createNotification({
          recipientId: member.id,
          senderId: req.userId,
          type: 'group_invite',
          content: `You were added to ${conversation.name}`,
          conversationId: conversation.id,
          metadata: { conversation },
        });

        if (io) {
          const unreadCount = await notificationService.getUnreadCount(member.id);

          // Every authenticated connection joins its personal user room.
          // Use the room instead of a single presence socket so notifications
          // reach all tabs/devices and do not depend on presence timing.
          io.to(`user:${member.id}`).emit('conversation:new', conversation);
          io.to(`user:${member.id}`).emit('notification:new', notification);
          io.to(`user:${member.id}`).emit('notification:unread:updated', { unreadCount });
        }
      }
    }

    successResponse(res, conversation, 'Group created', 201);
  } catch (error) {
    next(error);
  }
});

// Get conversation by id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const conversation = await conversationService.getConversationById(req.params.id, req.userId);
    successResponse(res, conversation, 'Conversation fetched successfully');
  } catch (error) {
    next(error);
  }
});

// Add members to group
router.post('/:id/members', auth, async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    const conversation = await conversationService.addMembers(req.params.id, req.userId, memberIds);
    successResponse(res, conversation, 'Members added successfully');
  } catch (error) {
    next(error);
  }
});

// Remove member from group
router.delete('/:id/members/:memberId', auth, async (req, res, next) => {
  try {
    await conversationService.removeMember(req.params.id, req.userId, req.params.memberId);
    successResponse(res, null, 'Member removed successfully');
  } catch (error) {
    next(error);
  }
});

// Leave group
router.post('/:id/leave', auth, async (req, res, next) => {
  try {
    await conversationService.leaveGroup(req.params.id, req.userId);
    successResponse(res, null, 'Left group successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;