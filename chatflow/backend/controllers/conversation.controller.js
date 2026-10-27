const conversationService = require('../services/conversation.service');
const { successResponse, paginatedResponse } = require('../utils/response');

class ConversationController {
  async getConversations(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await conversationService.getConversations(req.userId, page, limit);
      return paginatedResponse(res, result.data, page, limit, result.pagination.total);
    } catch (error) {
      next(error);
    }
  }

  async createPrivateConversation(req, res, next) {
    try {
      const { userId } = req.body;
      const conversation = await conversationService.createPrivateConversation(req.userId, userId);
      return successResponse(res, conversation, 'Conversation created', 201);
    } catch (error) {
      next(error);
    }
  }

  async createGroupConversation(req, res, next) {
    try {
      const { name, participantIds } = req.body;
      const conversation = await conversationService.createGroupConversation(
        req.userId,
        name,
        participantIds
      );
      return successResponse(res, conversation, 'Group created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getConversation(req, res, next) {
    try {
      const { id } = req.params;
      const conversation = await conversationService.getConversationById(id, req.userId);
      return successResponse(res, conversation, 'Conversation fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async addMembers(req, res, next) {
    try {
      const { id } = req.params;
      const { memberIds } = req.body;
      const conversation = await conversationService.addMembers(id, req.userId, memberIds);
      return successResponse(res, conversation, 'Members added successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const { id, memberId } = req.params;
      await conversationService.removeMember(id, req.userId, parseInt(memberId));
      return successResponse(res, null, 'Member removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async leaveGroup(req, res, next) {
    try {
      const { id } = req.params;
      await conversationService.leaveGroup(id, req.userId);
      return successResponse(res, null, 'Left group successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationController();