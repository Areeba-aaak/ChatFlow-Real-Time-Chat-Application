const { body, param, query } = require('express-validator');

const validateGetUsers = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid page number')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Invalid limit')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .escape(),
];

const validateUserId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID')
    .toInt(),
];

const validateSearchUsers = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query must be at least 1 character')
    .escape(),
];

const validateUpdateStatus = [
  body('status')
    .isIn(['online', 'offline', 'away'])
    .withMessage('Invalid status value'),
];

const validateUpdateProfile = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .escape(),

  body('avatar')
    .optional()
    .isURL()
    .withMessage('Invalid avatar URL'),
];

module.exports = {
  validateGetUsers,
  validateUserId,
  validateSearchUsers,
  validateUpdateStatus,
  validateUpdateProfile,
};