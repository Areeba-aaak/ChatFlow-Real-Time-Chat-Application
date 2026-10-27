const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');

// Register
router.post(
  '/register',
  [
    body('username').isLength({ min: 3, max: 30 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').isLength({ min: 2, max: 100 }).trim().escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      successResponse(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }
);

// Add a user from the authenticated application's internal UI
router.post(
  '/internal-users',
  auth,
  [
    body('username').isLength({ min: 3, max: 30 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').isLength({ min: 2, max: 100 }).trim().escape(),
  ],
  validate,
  authController.createInternalUser.bind(authController)
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      successResponse(res, result, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }
);

// Logout
router.post('/logout', auth, async (req, res, next) => {
  try {
    await authService.logout(req.userId, req.body.refreshToken);
    successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.userId);
    successResponse(res, user, 'User fetched successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;