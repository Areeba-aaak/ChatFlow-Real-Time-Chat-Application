const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(
      res,
      'Validation error',
      400,
      errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      }))
    );
  }
  next();
};

module.exports = { validate };