import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRequire } from 'module';

import app from './app.js';

const require = createRequire(import.meta.url);

// Existing CommonJS modules
const { setupSocket } = require('./sockets/socket.js');
const { initRedis, getRedis } = require('./config/redis.js');
const { connectDB } = require('./config/database.js');
const logger = require('./utils/logger.js');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // ============================================================
    // DATABASE
    // ============================================================

    await connectDB();

    console.log('✅ Database connected');

    // ============================================================
    // REDIS
    // ============================================================

    await initRedis();

    console.log('✅ Redis initialized');

    // ============================================================
    // HTTP SERVER
    // ============================================================

    const httpServer = createServer(app);

    // ============================================================
    // SOCKET.IO
    // ============================================================

    const io = new Server(httpServer, {
      cors: {
        origin:
          process.env.FRONTEND_URL ||
          'http://localhost:5173',

        credentials: true,

        methods: [
          'GET',
          'POST',
        ],
      },

      transports: ['websocket', 'polling'],
    });

    // Make Socket.IO available to Express routes/controllers
    app.set('io', io);

    // ============================================================
    // REDIS ADAPTER
    // ============================================================

    try {
      const redis = getRedis();

      if (redis) {
        const pubClient = redis.duplicate();
        const subClient = redis.duplicate();

        await Promise.all([
          pubClient.connect(),
          subClient.connect(),
        ]);

        io.adapter(
          createAdapter(
            pubClient,
            subClient
          )
        );

        console.log(
          '✅ Socket.IO Redis adapter enabled'
        );
      }
    } catch (redisAdapterError) {
      console.warn(
        '⚠️ Socket.IO Redis adapter could not be enabled:',
        redisAdapterError.message
      );

      console.warn(
        '⚠️ Socket.IO will continue without the Redis adapter.'
      );
    }

    // ============================================================
    // SOCKET HANDLERS
    // ============================================================

    setupSocket(io);

    console.log('✅ Socket.IO setup complete');

    // ============================================================
    // START SERVER
    // ============================================================

    httpServer.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT}`
      );

      console.log('');
      console.log('🚀 Server is ready!');
      console.log(
        `📍 API: http://localhost:${PORT}/api`
      );
      console.log(
        `📍 Socket: ws://localhost:${PORT}`
      );
      console.log('');
    });

    // ============================================================
    // SERVER ERROR
    // ============================================================

    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `❌ Port ${PORT} is already in use.`
        );
      } else {
        console.error(
          '❌ HTTP server error:',
          error
        );
      }
    });

    // ============================================================
    // GRACEFUL SHUTDOWN
    // ============================================================

    const shutdown = async (signal) => {
      console.log(
        `\n🛑 ${signal} received. Shutting down...`
      );

      httpServer.close(() => {
        console.log(
          '✅ HTTP server closed'
        );

        process.exit(0);
      });
    };

    process.on(
      'SIGINT',
      () => shutdown('SIGINT')
    );

    process.on(
      'SIGTERM',
      () => shutdown('SIGTERM')
    );

  } catch (error) {
    console.error(
      '\n❌ Failed to start server:'
    );

    console.error(error);

    logger.error(
      'Server startup failed:',
      {
        message: error.message,
        stack: error.stack,
      }
    );

    process.exit(1);
  }
}

startServer();