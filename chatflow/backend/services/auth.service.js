
const {
  query,
  queryOne,
  transaction,
} = require('../config/database');

const {
  hashPassword,
  comparePassword,
  validatePassword,
} = require('../utils/password');

const {
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
} = require('../utils/jwt');

const { AppError } = require('../middleware/errorHandler');

const logger = require('../utils/logger');

const {
  setCache,
  getCache,
  deleteCache,
  publishEvent,
} = require('../config/redis');


class AuthService {

  // ============================================================
  // REGISTER
  // ============================================================

  async register(userData) {
    const {
      username,
      email,
      password,
      fullName,
    } = userData;

    // ----------------------------------------------------------
    // Validate password
    // ----------------------------------------------------------

    const passwordValidation =
      validatePassword(password);

    if (!passwordValidation.valid) {
      throw new AppError(
        'Invalid password',
        400,
        passwordValidation.errors
      );
    }

    // ----------------------------------------------------------
    // Check whether username/email already exists
    // ----------------------------------------------------------

    const existingUser = await queryOne(
      `
        SELECT id
        FROM users
        WHERE username = $1
           OR email = $2
        LIMIT 1
      `,
      [username, email]
    );

    if (existingUser) {
      throw new AppError(
        'Username or email already exists',
        409
      );
    }

    // ----------------------------------------------------------
    // Hash password
    // ----------------------------------------------------------

    const hashedPassword =
      await hashPassword(password);

    // ----------------------------------------------------------
    // Create user + refresh token in ONE transaction
    // ----------------------------------------------------------

    const result = await transaction(async (conn) => {

      // STEP 1
      // Create user

      const userResult = await conn.query(
        `
          INSERT INTO users (
            username,
            email,
            password,
            full_name,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'offline'
          )
          RETURNING
            id,
            username,
            email,
            full_name
        `,
        [
          username,
          email,
          hashedPassword,
          fullName,
        ]
      );

      if (
        !userResult.rows ||
        userResult.rows.length === 0
      ) {
        throw new AppError(
          'Failed to create user',
          500
        );
      }

      const createdUser =
        userResult.rows[0];

      const userId =
        createdUser.id;

      // --------------------------------------------------------
      // STEP 2
      // Generate tokens using SAME transaction connection
      // --------------------------------------------------------

      const {
        accessToken,
        refreshToken,
      } = await generateTokens(
        userId,
        conn
      );

      /*
       * IMPORTANT:
       *
       * generateTokens() receives `conn`.
       *
       * Therefore the INSERT into refresh_tokens happens
       * inside this SAME PostgreSQL transaction.
       *
       * PostgreSQL can now see the user inserted above.
       */

      return {
        userId,

        accessToken,

        refreshToken,

        user: {
          id: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
          fullName: createdUser.full_name,
        },
      };
    });

    logger.info(
      `User registered: ${username}`
    );

    return result;
  }


  // ============================================================
  // CREATE USER FROM INTERNAL UI
  // ============================================================

  async createInternalUser(userData) {
    const { username, email, password, fullName } = userData;

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new AppError('Invalid password', 400, passwordValidation.errors);
    }

    const existingUser = await queryOne(
      `SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
      [username, email]
    );

    if (existingUser) {
      throw new AppError('Username or email already exists', 409);
    }

    const hashedPassword = await hashPassword(password);

    const createdUser = await queryOne(
      `INSERT INTO users (username, email, password, full_name, status)
       VALUES ($1, $2, $3, $4, 'offline')
       RETURNING id, username, email, full_name, avatar, status, last_seen, is_active`,
      [username, email, hashedPassword, fullName]
    );

    await publishEvent('user:created', { userId: createdUser.id });

    logger.info(`User created from internal UI: ${username}`);

    return createdUser;
  }


  // ============================================================
  // LOGIN
  // ============================================================

  async login(email, password) {

    const user = await queryOne(
      `
        SELECT
          id,
          username,
          email,
          password,
          full_name,
          avatar,
          status,
          is_active
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

    if (!user) {
      throw new AppError(
        'Invalid credentials',
        401
      );
    }

    // ----------------------------------------------------------
    // Check account status
    // ----------------------------------------------------------

    if (user.is_active === false) {
      throw new AppError(
        'Your account has been deactivated',
        403
      );
    }

    // ----------------------------------------------------------
    // Compare password
    // ----------------------------------------------------------

    const isPasswordValid =
      await comparePassword(
        password,
        user.password
      );

    if (!isPasswordValid) {
      throw new AppError(
        'Invalid credentials',
        401
      );
    }

    // ----------------------------------------------------------
    // Generate tokens
    //
    // User already exists and is committed, so the normal
    // database pool is safe here.
    // ----------------------------------------------------------

    const {
      accessToken,
      refreshToken,
    } = await generateTokens(
      user.id
    );

    // ----------------------------------------------------------
    // Update online status
    // ----------------------------------------------------------

    await query(
      `
        UPDATE users
        SET
          status = $1,
          last_seen = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `,
      [
        'online',
        user.id,
      ]
    );

    // ----------------------------------------------------------
    // Publish online event
    // ----------------------------------------------------------

    await publishEvent(
      'user:online',
      {
        userId: user.id,
      }
    );

    // Never return password
    delete user.password;

    logger.info(
      `User logged in: ${user.username}`
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }


  // ============================================================
  // REFRESH TOKEN
  // ============================================================

  async refreshToken(refreshToken) {

    const decoded =
      await verifyRefreshToken(
        refreshToken
      );

    if (!decoded) {
      throw new AppError(
        'Invalid refresh token',
        401
      );
    }

    // ----------------------------------------------------------
    // Make sure user still exists and is active
    // ----------------------------------------------------------

    const user = await queryOne(
      `
        SELECT id, is_active
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [decoded.userId]
    );

    if (!user || user.is_active === false) {
      throw new AppError(
        'User account is no longer active',
        401
      );
    }

    // ----------------------------------------------------------
    // Generate new token pair
    // ----------------------------------------------------------

    const {
      accessToken,
      refreshToken: newRefreshToken,
    } = await generateTokens(
      decoded.userId
    );

    // ----------------------------------------------------------
    // Revoke old refresh token
    // ----------------------------------------------------------

    await revokeRefreshToken(
      refreshToken
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }


  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(
    userId,
    refreshToken
  ) {

    await query(
      `
        UPDATE users
        SET
          status = $1,
          last_seen = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `,
      [
        'offline',
        userId,
      ]
    );

    if (refreshToken) {
      await revokeRefreshToken(
        refreshToken
      );
    }

    // ----------------------------------------------------------
    // Publish offline event
    // ----------------------------------------------------------

    await publishEvent(
      'user:offline',
      {
        userId,
      }
    );

    logger.info(
      `User logged out: ${userId}`
    );
  }


  // ============================================================
  // GET USER
  // ============================================================

  async getUserById(userId) {

    const cached =
      await getCache(
        `user:${userId}`
      );

    if (cached) {
      return cached;
    }

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
      `,
      [userId]
    );

    if (user) {
      await setCache(
        `user:${userId}`,
        user,
        300
      );
    }

    return user;
  }


  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  async updateProfile(
    userId,
    data
  ) {

    const {
      full_name,
      avatar,
    } = data;

    const updates = [];
    const values = [];

    let paramIndex = 1;

    if (
      full_name !== undefined &&
      full_name !== null
    ) {
      updates.push(
        `full_name = $${paramIndex}`
      );

      values.push(full_name);

      paramIndex++;
    }

    if (avatar !== undefined) {

      updates.push(
        `avatar = $${paramIndex}`
      );

      values.push(avatar);

      paramIndex++;
    }

    if (updates.length === 0) {
      throw new AppError(
        'No fields to update',
        400
      );
    }

    // Update timestamp
    updates.push(
      'updated_at = NOW()'
    );

    values.push(userId);

    await query(
      `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `,
      values
    );

    // ----------------------------------------------------------
    // Clear cache
    // ----------------------------------------------------------

    await deleteCache(
      `user:${userId}`
    );

    // ----------------------------------------------------------
    // Get updated user
    // ----------------------------------------------------------

    const user =
      await this.getUserById(
        userId
      );

    // ----------------------------------------------------------
    // Publish profile event
    // ----------------------------------------------------------

    await publishEvent(
      'user:profile_updated',
      {
        userId,
        user,
      }
    );

    logger.info(
      `User profile updated: ${userId}`
    );

    return user;
  }
}


module.exports = new AuthService();

