const notificationService =
  require('../services/notification.service');

const eventBus =
  require('../events/eventBus');

const logger =
  require('../utils/logger');


module.exports = (io, socket) => {

  const userId =
    socket.userId;


  // ============================================================
  // GET NOTIFICATIONS
  // ============================================================

  socket.on(
    'notification:get',
    async (data) => {

      try {

        const {
          page = 1,
          limit = 50,
        } = data || {};


        const result =
          await notificationService.getNotifications(
            userId,
            page,
            limit
          );


        socket.emit(
          'notification:list',
          result
        );

      } catch (error) {

        logger.error(
          'Get notifications error:',
          error
        );

        socket.emit(
          'error',
          {
            message:
              'Failed to get notifications',
          }
        );

      }

    }
  );


  // ============================================================
  // GET UNREAD COUNT
  // ============================================================

  socket.on(
    'notification:unread:count',
    async () => {

      try {

        const count =
          await notificationService.getUnreadCount(
            userId
          );


        socket.emit(
          'notification:unread:count:response',
          {
            count,
          }
        );

      } catch (error) {

        logger.error(
          'Get unread count error:',
          error
        );

        socket.emit(
          'error',
          {
            message:
              'Failed to get unread count',
          }
        );

      }

    }
  );


  // ============================================================
  // MARK NOTIFICATION AS READ
  // ============================================================

  socket.on(
    'notification:read',
    async (data) => {

      try {

        const {
          notificationId,
        } = data;


        await notificationService.markAsRead(
          notificationId,
          userId
        );


        const unreadCount =
          await notificationService.getUnreadCount(
            userId
          );


        socket.emit(
          'notification:read:success',
          {
            notificationId,

            unreadCount,
          }
        );


        // Update ALL tabs/devices.
        io.to(
          `user:${userId}`
        ).emit(
          'notification:updated',
          {
            notificationId,

            readAt:
              new Date(),

            unreadCount,
          }
        );

      } catch (error) {

        logger.error(
          'Mark notification read error:',
          error
        );

        socket.emit(
          'error',
          {
            message:
              'Failed to mark notification as read',
          }
        );

      }

    }
  );


  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  socket.on(
    'notification:read:all',
    async () => {

      try {

        await notificationService.markAllAsRead(
          userId
        );


        const unreadCount =
          await notificationService.getUnreadCount(
            userId
          );


        socket.emit(
          'notification:read:all:success',
          {
            unreadCount,
          }
        );


        io.to(
          `user:${userId}`
        ).emit(
          'notification:updated',
          {
            allRead: true,

            unreadCount,
          }
        );

      } catch (error) {

        logger.error(
          'Mark all notifications read error:',
          error
        );

        socket.emit(
          'error',
          {
            message:
              'Failed to mark all notifications as read',
          }
        );

      }

    }
  );


  // ============================================================
  // DELETE NOTIFICATION
  // ============================================================

  socket.on(
    'notification:delete',
    async (data) => {

      try {

        const {
          notificationId,
        } = data;


        await notificationService.deleteNotification(
          notificationId,
          userId
        );


        const unreadCount =
          await notificationService.getUnreadCount(
            userId
          );


        socket.emit(
          'notification:delete:success',
          {
            notificationId,

            unreadCount,
          }
        );

      } catch (error) {

        logger.error(
          'Delete notification error:',
          error
        );

        socket.emit(
          'error',
          {
            message:
              'Failed to delete notification',
          }
        );

      }

    }
  );


  // ============================================================
  // CREATE NOTIFICATION
  // ============================================================

  socket.on(
    'notification:create',
    async (data) => {

      try {

        const {
          recipientId,
          type,
          content,
          conversationId,
          messageId,
          metadata,
        } = data;


        const notification =
          await notificationService.createNotification(
            {
              recipientId,

              senderId:
                userId,

              type,

              content,

              conversationId,

              messageId,

              metadata,
            }
          );


        // ======================================================
        // SEND TO ALL RECIPIENT TABS
        // ======================================================

        io.to(
          `user:${recipientId}`
        ).emit(
          'notification:new',
          notification
        );


        // ======================================================
        // UPDATE UNREAD COUNT
        // ======================================================

        const unreadCount =
          await notificationService.getUnreadCount(
            recipientId
          );


        io.to(
          `user:${recipientId}`
        ).emit(
          'notification:unread:updated',
          {
            unreadCount,
          }
        );


        socket.emit(
          'notification:create:success',
          notification
        );

      } catch (error) {

        logger.error(
          'Create notification error:',
          error
        );

        socket.emit(
          'error',
          {
            message:
              'Failed to create notification',
          }
        );

      }

    }
  );


  // ============================================================
  // SUBSCRIBE
  // ============================================================

  socket.on(
    'notification:subscribe',
    () => {

      socket.join(
        `user:${userId}`
      );


      logger.info(
        `User ${userId} subscribed to notifications`
      );

    }
  );


  // ============================================================
  // UNSUBSCRIBE
  // ============================================================

  socket.on(
    'notification:unsubscribe',
    () => {

      socket.leave(
        `user:${userId}`
      );


      logger.info(
        `User ${userId} unsubscribed from notifications`
      );

    }
  );


  // ============================================================
  // EVENT BUS
  // ============================================================

  eventBus.register(
    'notification:created',
    async (notification) => {

      try {

        // Send to EVERY authenticated tab/device.
        io.to(
          `user:${notification.recipient_id}`
        ).emit(
          'notification:new',
          notification
        );


        const unreadCount =
          await notificationService.getUnreadCount(
            notification.recipient_id
          );


        io.to(
          `user:${notification.recipient_id}`
        ).emit(
          'notification:unread:updated',
          {
            unreadCount,
          }
        );

      } catch (error) {

        logger.error(
          'Event bus notification error:',
          error
        );

      }

    }
  );

};