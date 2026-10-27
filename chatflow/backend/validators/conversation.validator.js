const { body, param } = require('express-validator');

const validateCreatePrivate = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID')
    .toInt(),
];

const validateCreateGroup = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters')
    .escape(),

  body('participantIds')
    .isArray({ min: 2 })
    .withMessage('At least 2 participants are required')
    .custom((value) => {
      if (!value.every(v => Number.isInteger(v) && v > 0)) {
        throw new Error('Invalid participant IDs');
      }
      return true;
    }),
];

const validateConversationId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid conversation ID')
    .toInt(),
];

const validateAddMembers = [
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('At least one member is required')
    .custom((value) => {
      if (!value.every(v => Number.isInteger(v) && v > 0)) {
        throw new Error('Invalid member IDs');
      }
      return true;
    }),
];

const validateRemoveMember = [
  param('memberId')
    .isInt({ min: 1 })
    .withMessage('Invalid member ID')
    .toInt(),
];

module.exports = {
  validateCreatePrivate,
  validateCreateGroup,
  validateConversationId,
  validateAddMembers,
  validateRemoveMember,
};