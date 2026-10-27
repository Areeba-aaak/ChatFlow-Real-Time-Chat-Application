const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageService = require('../services/message.service');
const { successResponse, paginatedResponse } = require('../utils/response');

// Get messages for conversation
router.get('/:conversationId', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await messageService.getMessages(req.params.conversationId, req.userId, page, limit);
    paginatedResponse(res, result.data, page, limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
});

// Mark message as read
router.put('/:messageId/read', auth, async (req, res, next) => {
  try {
    const result = await messageService.markAsRead(req.params.messageId, req.userId);
    successResponse(res, result, 'Message marked as read');
  } catch (error) {
    next(error);
  }
});

// Mark conversation as read
router.put('/conversation/:conversationId/read', auth, async (req, res, next) => {
  try {
    const result = await messageService.markConversationAsRead(req.params.conversationId, req.userId);
    successResponse(res, result, 'Conversation marked as read');
  } catch (error) {
    next(error);
  }
});

// Edit message
router.put('/:messageId', auth, async (req, res, next) => {
  try {
    const { content } = req.body;
    const message = await messageService.editMessage(req.params.messageId, req.userId, content);
    successResponse(res, message, 'Message edited successfully');
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:messageId', auth, async (req, res, next) => {
  try {
    const result = await messageService.deleteMessage(req.params.messageId, req.userId);
    successResponse(res, result, 'Message deleted successfully');
  } catch (error) {
    next(error);
  }
});

// Add reaction
router.post('/:messageId/reactions', auth, async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const result = await messageService.addReaction(req.params.messageId, req.userId, emoji);
    successResponse(res, result, 'Reaction added successfully');
  } catch (error) {
    next(error);
  }
});

// Remove reaction
router.delete('/:messageId/reactions', auth, async (req, res, next) => {
  try {
    const result = await messageService.removeReaction(req.params.messageId, req.userId);
    successResponse(res, result, 'Reaction removed successfully');
  } catch (error) {
    next(error);
  }
});

// Get message reactions
router.get('/:messageId/reactions', auth, async (req, res, next) => {
  try {
    const reactions = await messageService.getMessageReactions(req.params.messageId);
    successResponse(res, reactions, 'Reactions fetched successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;