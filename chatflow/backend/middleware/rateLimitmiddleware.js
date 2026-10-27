const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

// General rate limiter - applies to all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    return errorResponse(res, 'Too many requests, please try again later.', 429);
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Authentication rate limiter - stricter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  handler: (req, res) => {
    return errorResponse(res, 'Too many authentication attempts, please try again later.', 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Message rate limiter - for sending messages
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 messages per minute
  message: 'Too many messages sent, please slow down.',
  handler: (req, res) => {
    return errorResponse(res, 'Too many messages sent, please slow down.', 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.userId || req.ip;
  }
});

// File upload rate limiter - for upload routes
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: 'Too many file uploads, please try again later.',
  handler: (req, res) => {
    return errorResponse(res, 'Too many file uploads, please try again later.', 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for creating conversations
const conversationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 conversation creations per hour
  message: 'Too many conversations created, please try again later.',
  handler: (req, res) => {
    return errorResponse(res, 'Too many conversations created, please try again later.', 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  messageLimiter,
  uploadLimiter,
  conversationLimiter,
};