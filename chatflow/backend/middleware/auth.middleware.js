
const { verifyAccessToken } = require('../utils/jwt');
const { queryOne } = require('../config/database');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    // ==========================================================
    // AUTHORIZATION HEADER
    // ==========================================================

    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return errorResponse(
        res,
        'No token provided',
        401
      );
    }

    // ==========================================================
    // EXTRACT TOKEN
    // ==========================================================

    const token =
      authHeader.substring(7).trim();

    if (!token) {
      return errorResponse(
        res,
        'No token provided',
        401
      );
    }

    // ==========================================================
    // VERIFY TOKEN
    // ==========================================================

    const decoded =
      verifyAccessToken(token);

    if (
      !decoded ||
      !decoded.userId
    ) {
      return errorResponse(
        res,
        'Invalid or expired token',
        401
      );
    }

    // ==========================================================
    // FIND ACTIVE USER
    // ==========================================================

    const user = await queryOne(
      `
        SELECT
          id,
          username,
          email,
          full_name,
          avatar,
          status,
          last_seen,
          is_active
        FROM users
        WHERE id = $1
          AND is_active = TRUE
        LIMIT 1
      `,
      [decoded.userId]
    );

    if (!user) {
      return errorResponse(
        res,
        'User not found or account is inactive',
        401
      );
    }

    // ==========================================================
    // ATTACH AUTH DATA
    // ==========================================================

    req.user = user;
    req.userId = user.id;

    next();

  } catch (error) {

    logger.error(
      'Authentication middleware error:',
      {
        message: error.message,
        stack: error.stack,
      }
    );

    return errorResponse(
      res,
      'Authentication failed',
      401
    );
  }
};

module.exports = auth;
