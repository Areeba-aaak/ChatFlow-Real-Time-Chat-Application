const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return successResponse(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async createInternalUser(req, res, next) {
    try {
      const result = await authService.createInternalUser(req.body);
      return successResponse(res, result, 'User added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return successResponse(res, result, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.userId, refreshToken);
      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getUserById(req.userId);
      return successResponse(res, user, 'User fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { full_name, avatar } = req.body;
      const user = await authService.updateProfile(req.userId, { full_name, avatar });
      return successResponse(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();