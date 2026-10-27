const { EventEmitter } = require('events');
const logger = require('../utils/logger');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.listeners = new Map();
  }

  register(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    this.on(event, handler);
    logger.debug(`Registered handler for event: ${event}`);
  }

  unregister(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
      this.off(event, handler);
      logger.debug(`Unregistered handler for event: ${event}`);
    }
  }

  emit(event, data) {
    logger.debug(`Event emitted: ${event}`, data);
    return super.emit(event, data);
  }

  async emitAsync(event, data) {
    logger.debug(`Async event emitted: ${event}`, data);
    const handlers = this.listeners.get(event) || new Set();
    const promises = Array.from(handlers).map(handler => 
      Promise.resolve(handler(data)).catch(error => {
        logger.error(`Error in async handler for ${event}:`, error);
      })
    );
    await Promise.all(promises);
  }

  getListenersCount(event) {
    return this.listeners.get(event)?.size || 0;
  }

  getAllListeners() {
    const result = {};
    for (const [event, handlers] of this.listeners) {
      result[event] = handlers.size;
    }
    return result;
  }
}

module.exports = new EventBus();