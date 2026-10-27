
const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/database');
const logger = require('./logger');

/**
 * Generate access and refresh tokens.
 *
 * IMPORTANT:
 * When a database transaction client is provided, the refresh token
 * is inserted using that SAME transaction connection.
 *
 * This is important during registration because the newly-created
 * user is not committed yet and therefore cannot be seen by another
 * PostgreSQL connection.
 */
const generateTokens = async (userId, dbClient = null) => {
  if (!userId) {
    throw new Error('User ID is required to generate tokens');
  }

  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }
  );

  const sql = `
    INSERT INTO refresh_tokens (
      user_id,
      token,
      expires_at
    )
    VALUES (
      $1,
      $2,
      NOW() + INTERVAL '30 days'
    )
    RETURNING id, user_id, expires_at
  `;

  /*
   * If we are inside a transaction, use the transaction client.
   *
   * This allows PostgreSQL to see the user inserted earlier
   * in the SAME transaction.
   */
  if (dbClient) {
    await dbClient.query(sql, [userId, refreshToken]);
  } else {
    /*
     * Normal login/refresh operations can use the normal pool
     * because the user already exists and is committed.
     */
    await queryOne(sql, [userId, refreshToken]);
  }

  return {
    accessToken,
    refreshToken,
  };
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error('Access token verification failed:', error);
    return null;
  }
};

const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    );

    const stored = await queryOne(
      `
        SELECT *
        FROM refresh_tokens
        WHERE token = $1
          AND revoked = false
          AND expires_at > NOW()
      `,
      [token]
    );

    if (!stored) {
      return null;
    }

    /*
     * Extra safety:
     * Make sure the token belongs to the same user contained
     * inside the JWT.
     */
    if (Number(stored.user_id) !== Number(decoded.userId)) {
      return null;
    }

    return decoded;
  } catch (error) {
    logger.error(
      'Refresh token verification failed:',
      error
    );

    return null;
  }
};

const revokeRefreshToken = async (token) => {
  await queryOne(
    `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE token = $1
    `,
    [token]
  );
};

const revokeAllUserTokens = async (userId) => {
  await queryOne(
    `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE user_id = $1
    `,
    [userId]
  );
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
