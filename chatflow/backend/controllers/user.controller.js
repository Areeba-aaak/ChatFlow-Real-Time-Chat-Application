const userService = require('../services/user.service');
const { successResponse, paginatedResponse } = require('../utils/response');

class UserController {
  async getUsers(req, res, next) {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const result = await userService.getUsers(req.userId, page, limit, search);
      return paginatedResponse(res, result.data, page, limit, result.pagination.total);
    } catch (error) {
      next(error);
    }
  }

  async getUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      return successResponse(res, user, 'User fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async getOnlineUsers(req, res, next) {
    try {
      const users = await userService.getOnlineUsers(req.userId);
      return successResponse(res, users, 'Online users fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;
      const users = await userService.searchUsers(req.userId, q);
      return successResponse(res, users, 'Search results');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await userService.updateStatus(req.userId, status);
      return successResponse(res, result, 'Status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();