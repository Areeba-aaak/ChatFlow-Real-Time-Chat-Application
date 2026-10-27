const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Don't exit, allow fallback
    return null;
  }
};

const getRedis = () => {
  return redisClient;
};

const setCache = async (key, value, ttl = 3600) => {
  try {
    if (!redisClient) return false;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    return true;
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
};

const getCache = async (key) => {
  try {
    if (!redisClient) return null;
    const value = await redisClient.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    if (!redisClient) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Cache delete error:', error);
    return false;
  }
};

const publishEvent = async (channel, data) => {
  try {
    if (!redisClient) return false;
    await redisClient.publish(channel, JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error('Publish event error:', error);
    return false;
  }
};

const subscribeEvent = async (channel, callback) => {
  try {
    if (!redisClient) return;
    const subscriber = redisClient.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, (message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        logger.error('Subscribe parse error:', error);
      }
    });
    return subscriber;
  } catch (error) {
    logger.error('Subscribe event error:', error);
    return null;
  }
};

module.exports = {
  initRedis,
  getRedis,
  setCache,
  getCache,
  deleteCache,
  publishEvent,
  subscribeEvent,
};