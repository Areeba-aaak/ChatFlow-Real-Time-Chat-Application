import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ------------------------------------------------------------
// CommonJS compatibility
// ------------------------------------------------------------
const require = createRequire(import.meta.url);

const logger = require('./utils/logger.js');
const { errorHandler } = require('./middleware/errorHandler.js');

// Existing CommonJS routes
const authRoutes = require('./routes/auth.routes.js');
const userRoutes = require('./routes/user.routes.js');
const conversationRoutes = require('./routes/conversation.routes.js');
const messageRoutes = require('./routes/message.routes.js');
const notificationRoutes = require('./routes/notification.routes.js');
const uploadRoutes = require('./routes/upload.routes.js');

// ------------------------------------------------------------
// __dirname replacement for ES modules
// ------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------
// Express app
// ------------------------------------------------------------
const app = express();

// ============================================================
// SECURITY
// ============================================================

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:5173',

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

// ============================================================
// RATE LIMITING
// ============================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 100,

  message: {
    success: false,
    message:
      'Too many requests from this IP, please try again later.',
  },
});

app.use('/api', limiter);

// ============================================================
// BODY PARSING
// ============================================================

app.use(
  express.json({
    limit: '50mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '50mb',
  })
);

app.use(compression());

// ============================================================
// LOGGING
// ============================================================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => {
          logger.info(message.trim());
        },
      },
    })
  );
}

// ============================================================
// STATIC FILES
// ============================================================

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

// ============================================================
// ROUTES
// ============================================================

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/users',
  userRoutes
);

app.use(
  '/api/conversations',
  conversationRoutes
);

app.use(
  '/api/messages',
  messageRoutes
);

app.use(
  '/api/notifications',
  notificationRoutes
);

app.use(
  '/api/upload',
  uploadRoutes
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ============================================================
// EXPORT
// ============================================================

export default app;