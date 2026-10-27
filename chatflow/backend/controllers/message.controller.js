const messageService = require('../services/message.service');
const { successResponse, paginatedResponse } = require('../utils/response');

class MessageController {
  async getMessages(req, res, next) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await messageService.getMessages(conversationId, req.userId, page, limit);
      return paginatedResponse(res, result.data, page, limit, result.pagination.total);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { messageId } = req.params;
      const result = await messageService.markAsRead(messageId, req.userId);
      return successResponse(res, result, 'Message marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markConversationAsRead(req, res, next) {
    try {
      const { conversationId } = req.params;
      const result = await messageService.markConversationAsRead(conversationId, req.userId);
      return successResponse(res, result, 'Conversation marked as read');
    } catch (error) {
      next(error);
    }
  }

  async editMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const message = await messageService.editMessage(messageId, req.userId, content);
      return successResponse(res, message, 'Message edited successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const result = await messageService.deleteMessage(messageId, req.userId);
      return successResponse(res, result, 'Message deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async addReaction(req, res, next) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const result = await messageService.addReaction(messageId, req.userId, emoji);
      return successResponse(res, result, 'Reaction added successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeReaction(req, res, next) {
    try {
      const { messageId } = req.params;
      const result = await messageService.removeReaction(messageId, req.userId);
      return successResponse(res, result, 'Reaction removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getReactions(req, res, next) {
    try {
      const { messageId } = req.params;
      const reactions = await messageService.getMessageReactions(messageId);
      return successResponse(res, reactions, 'Reactions fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();