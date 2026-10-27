const { body, param, query } = require('express-validator');

const validateSendMessage = [
  body('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),

  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message content must be less than 5000 characters')
    .escape(),

  body('type')
    .optional()
    .isIn(['text', 'image', 'file', 'voice', 'video'])
    .withMessage('Invalid message type'),

  body('fileUrl')
    .optional()
    .isURL()
    .withMessage('Invalid file URL'),

  body('fileName')
    .optional()
    .trim()
    .escape(),

  body('fileSize')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Invalid file size')
    .toInt(),

  body('fileType')
    .optional()
    .trim()
    .escape(),

  body('replyToId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid reply to message ID')
    .toInt(),
];

const validateGetMessages = [
  param('conversationId')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),

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
];

const validateMessageId = [
  param('messageId')
    .isInt({ min: 1 })
    .withMessage('Invalid message ID')
    .toInt(),
];

const validateEditMessage = [
  param('messageId')
    .isInt({ min: 1 })
    .withMessage('Invalid message ID')
    .toInt(),

  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters')
    .escape(),
];

const validateAddReaction = [
  param('messageId')
    .isInt({ min: 1 })
    .withMessage('Invalid message ID')
    .toInt(),

  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ max: 50 })
    .withMessage('Emoji too long'),
];

module.exports = {
  validateSendMessage,
  validateGetMessages,
  validateMessageId,
  validateEditMessage,
  validateAddReaction,
};