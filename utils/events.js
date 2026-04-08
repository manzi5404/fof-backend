const EventEmitter = require('events');

/**
 * Global Event Emitter for Real-Time Backend Communications
 * Used primarily for Server-Sent Events (SSE) to notify frontends
 * of live drop changes without polling.
 */
class AppEmitter extends EventEmitter {}

const appEmitter = new AppEmitter();

module.exports = appEmitter;
