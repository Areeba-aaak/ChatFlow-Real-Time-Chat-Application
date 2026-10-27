const notificationService = require('../services/notification.service');
const { successResponse, paginatedResponse } = require('../utils/response');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await notificationService.getNotifications(req.userId, page, limit);
      return paginatedResponse(res, result.data, page, limit, result.pagination.total);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationService.getUnreadCount(req.userId);
      return successResponse(res, { count }, 'Unread count fetched');
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const result = await notificationService.markAsRead(id, req.userId);
      return successResponse(res, result, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.userId);
      return successResponse(res, result, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      const result = await notificationService.deleteNotification(id, req.userId);
      return successResponse(res, result, 'Notification deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();