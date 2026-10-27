import { createRequire } from 'module';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);

// ============================================================
// COMMONJS SOCKET HANDLERS
// ============================================================

const authSocket = require('./auth.socket.js');
const messageSocket = require('./message.socket.js');
const presenceSocket = require('./presence.socket.js');
const typingSocket = require('./typing.socket.js');
const notificationSocket = require('./notification.socket.js');

// ============================================================
// COMMONJS SERVICES / UTILITIES
// ============================================================

const logger = require('../utils/logger.js');
const { verifyAccessToken } = require('../utils/jwt.js');
const { queryOne } = require('../config/database.js');

// ============================================================
// SETUP SOCKET.IO
// ============================================================

export const setupSocket = (io) => {
  // ==========================================================
  // SOCKET AUTHENTICATION MIDDLEWARE
  // ==========================================================

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // ------------------------------------------------------
      // Verify JWT
      // ------------------------------------------------------

      const decoded = verifyAccessToken(token);

      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      // ------------------------------------------------------
      // Get user from PostgreSQL
      // ------------------------------------------------------

      const user = await queryOne(
        `
          SELECT
            id,
            username,
            email,
            full_name,
            avatar
          FROM users
          WHERE id = $1
            AND is_active = TRUE
          LIMIT 1
        `,
        [decoded.userId]
      );

      if (!user) {
        return next(new Error('User not found'));
      }

      // ------------------------------------------------------
      // Store authenticated user on socket
      // ------------------------------------------------------

      socket.user = user;
      socket.userId = user.id;

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);

      next(new Error('Authentication failed'));
    }
  });

  // ==========================================================
  // CONNECTION
  // ==========================================================

  io.on('connection', (socket) => {
    logger.info(
      `Socket connected: ${socket.id} - User: ${socket.userId}`
    );

    // --------------------------------------------------------
    // Initialize handlers
    // --------------------------------------------------------

    authSocket(io, socket);
    messageSocket(io, socket);
    presenceSocket(io, socket);
    typingSocket(io, socket);
    notificationSocket(io, socket);

    // --------------------------------------------------------
    // Socket error
    // --------------------------------------------------------

    socket.on('error', (error) => {
      logger.error(
        `Socket error: ${socket.id}`,
        error
      );
    });
  });

  logger.info('Socket.IO handlers initialized');
};

export default setupSocket;
