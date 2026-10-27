const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // ============================================================
  // AUTHENTICATE SOCKET
  // ============================================================

  socket.on('authenticate', async (_data = {}, ack) => {
    try {
      const connectionCount =
        presenceService.registerSocket(
          socket.id,
          userId
        );

      // User becomes online when first socket connects.
      if (connectionCount === 1) {
        await presenceService.updateUserStatus(
          userId,
          'online'
        );

        socket.broadcast.emit(
          'user:online',
          {
            userId,
            user: socket.user,
          }
        );
      }

      // Send current online users to this socket.
      socket.emit(
        'users:online',
        presenceService.getOnlineUserIds()
      );

      // ========================================================
      // PERSONAL USER ROOM
      // ========================================================
      //
      // Every browser/tab/device of the same user joins:
      //
      // user:<userId>
      //
      // Example:
      //
      // Bisma Chrome      -> user:10
      // Bisma Incognito   -> user:10
      // Bisma Edge        -> user:10
      //
      // Therefore an event sent to user:10 reaches ALL of them.
      //

      socket.join(`user:${userId}`);

      logger.info(
        `User authenticated: ${userId} - Socket: ${socket.id}`
      );

      // ========================================================
      // IMPORTANT
      // ========================================================
      //
      // Tell frontend authentication is completely finished.
      // The frontend waits for this acknowledgement before
      // sending queued socket events.
      //

      if (typeof ack === 'function') {
        ack({
          success: true,
          userId,
        });
      }

    } catch (error) {

      logger.error(
        'Authentication error:',
        error
      );

      if (typeof ack === 'function') {
        ack({
          success: false,
        });
      }

      socket.emit(
        'error',
        {
          message: 'Authentication failed',
        }
      );
    }
  });


  // ============================================================
  // DISCONNECT
  // ============================================================

  socket.on(
    'disconnect',
    async () => {

      try {

        const result =
          presenceService.unregisterSocket(
            socket.id
          );

        if (!result.userId) {
          return;
        }

        // Do not mark offline if another browser/device
        // is still connected.
        if (!result.hasOtherConnections) {

          await presenceService.updateUserStatus(
            result.userId,
            'offline'
          );

          socket.broadcast.emit(
            'user:offline',
            {
              userId: result.userId,
            }
          );
        }

        logger.info(
          `User disconnected: ${result.userId} - Socket: ${socket.id}`
        );

      } catch (error) {

        logger.error(
          'Disconnect error:',
          error
        );

      }
    }
  );
};