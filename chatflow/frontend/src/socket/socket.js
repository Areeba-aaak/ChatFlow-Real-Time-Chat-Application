import io from 'socket.io-client';


// ============================================================
// SOCKET URL
// ============================================================

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:5000';


// ============================================================
// SOCKET MANAGER
// ============================================================

class SocketManager {

  constructor() {

    this.socket = null;

    this.listeners = new Map();

    this.isConnected = false;

    this.pendingEmits = [];
  }


  // ==========================================================
  // CONNECT
  // ==========================================================

  connect(token) {

    if (!token) {

      console.warn(
        'Cannot connect socket: no token'
      );

      return;
    }


    // Prevent duplicate connections.
    if (this.socket) {
      this.disconnect();
    }


    this.socket = io(
      SOCKET_URL,
      {
        auth: {
          token,
        },

        transports: [
          'websocket',
          'polling',
        ],

        reconnection: true,

        reconnectionAttempts: 5,

        reconnectionDelay: 1000,
      }
    );


    // ========================================================
    // CONNECTED
    // ========================================================

    this.socket.on(
      'connect',
      () => {

        console.log(
          'Socket connected:',
          this.socket.id
        );

        this.isConnected = true;


        // ======================================================
        // IMPORTANT
        // ======================================================
        //
        // Authenticate FIRST.
        //
        // Backend will:
        //
        // 1. Verify socket
        // 2. Register presence
        // 3. Join user:<userId>
        // 4. Send acknowledgement
        //
        // ONLY AFTER THAT we send queued events.
        //

        this.socket.emit(
          'authenticate',
          {},
          (response) => {

            if (!response?.success) {

              console.error(
                'Socket authentication acknowledgement failed'
              );

              return;
            }


            console.log(
              'Socket authenticated for user:',
              response.userId
            );


            // ==================================================
            // FLUSH QUEUED EVENTS
            // ==================================================

            const pending =
              this.pendingEmits.splice(0);


            pending.forEach(
              ({ event, data }) => {

                if (this.socket) {

                  this.socket.emit(
                    event,
                    data
                  );

                }

              }
            );

          }
        );

      }
    );


    // ========================================================
    // DISCONNECTED
    // ========================================================

    this.socket.on(
      'disconnect',
      (reason) => {

        console.log(
          'Socket disconnected:',
          reason
        );

        this.isConnected = false;
      }
    );


    // ========================================================
    // CONNECTION ERROR
    // ========================================================

    this.socket.on(
      'connect_error',
      (error) => {

        console.error(
          'Socket connection error:',
          error.message
        );

      }
    );


    // ========================================================
    // RESTORE APPLICATION LISTENERS
    // ========================================================

    this.listeners.forEach(
      (callbacks, event) => {

        callbacks.forEach(
          (callback) => {

            this.socket.on(
              event,
              callback
            );

          }
        );

      }
    );
  }


  // ==========================================================
  // DISCONNECT
  // ==========================================================

  disconnect() {

    if (this.socket) {

      this.socket.removeAllListeners();

      this.socket.disconnect();

      this.socket = null;
    }

    this.isConnected = false;

    this.pendingEmits = [];
  }


  // ==========================================================
  // ON
  // ==========================================================

  on(event, callback) {

    if (
      !event ||
      typeof callback !== 'function'
    ) {

      return;
    }


    if (
      !this.listeners.has(event)
    ) {

      this.listeners.set(
        event,
        new Set()
      );

    }


    const callbacks =
      this.listeners.get(event);


    // Prevent duplicate callback.
    if (
      callbacks.has(callback)
    ) {

      return;
    }


    callbacks.add(callback);


    if (this.socket) {

      this.socket.on(
        event,
        callback
      );

    }
  }


  // ==========================================================
  // OFF
  // ==========================================================

  off(event, callback) {

    const callbacks =
      this.listeners.get(event);


    if (!callbacks) {
      return;
    }


    callbacks.delete(
      callback
    );


    if (this.socket) {

      this.socket.off(
        event,
        callback
      );

    }


    if (
      callbacks.size === 0
    ) {

      this.listeners.delete(
        event
      );

    }

  }


  // ==========================================================
  // EMIT
  // ==========================================================

  emit(event, data) {

    if (
      !this.socket ||
      !this.isConnected
    ) {

      // Queue normal application events.
      //
      // Authentication itself is NOT queued because connect()
      // handles authentication directly.

      if (
        event !== 'authenticate'
      ) {

        this.pendingEmits.push({
          event,
          data,
        });

      }


      console.warn(
        'Socket not connected yet, queued event:',
        event
      );

      return;
    }


    this.socket.emit(
      event,
      data
    );
  }


  // ==========================================================
  // CONVERSATIONS
  // ==========================================================

  joinConversations(
    conversationIds
  ) {

    this.emit(
      'join:conversations',
      conversationIds
    );

  }


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  sendMessage(data) {

    this.emit(
      'message:send',
      data
    );

  }


  // ==========================================================
  // MESSAGE READ
  // ==========================================================

  markMessageRead(
    messageId
  ) {

    this.emit(
      'message:read',
      {
        messageId,
      }
    );

  }


  // ==========================================================
  // CONVERSATION READ
  // ==========================================================

  markConversationRead(
    conversationId
  ) {

    this.emit(
      'conversation:read',
      {
        conversationId,
      }
    );

  }


  // ==========================================================
  // TYPING START
  // ==========================================================

  startTyping(
    conversationId
  ) {

    this.emit(
      'typing:start',
      {
        conversationId,
      }
    );

  }


  // ==========================================================
  // TYPING STOP
  // ==========================================================

  stopTyping(
    conversationId
  ) {

    this.emit(
      'typing:stop',
      {
        conversationId,
      }
    );

  }


  // ==========================================================
  // STATUS
  // ==========================================================

  setStatus(status) {

    this.emit(
      'user:set-status',
      {
        status,
      }
    );

  }

}


// ============================================================
// SINGLE SOCKET INSTANCE
// ============================================================

export const socketManager =
  new SocketManager();

export default socketManager;