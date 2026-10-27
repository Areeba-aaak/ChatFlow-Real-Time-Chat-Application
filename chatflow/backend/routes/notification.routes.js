const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationService = require('../services/notification.service');
const { successResponse, paginatedResponse } = require('../utils/response');

// Get notifications
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await notificationService.getNotifications(req.userId, page, limit);
    paginatedResponse(res, result.data, page, limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread/count', auth, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId);
    successResponse(res, { count }, 'Unread count fetched');
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.userId);
    successResponse(res, result, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/read/all', auth, async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.userId);
    successResponse(res, result, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.userId);
    successResponse(res, result, 'Notification deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;