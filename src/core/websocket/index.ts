/**
 * WebSocket module exports
 */

export { wsClient, WebSocketClient } from './client';
export {
  initializeMessageHandler,
  onIncomingRequest,
  lookupUser,
} from './messageHandler';
export {
  registerUser,
  updateUsername,
  lookupByUsername,
  lookupBySixDigitId,
  lookupByAddress,
  lookupAny,
  isValidUsername,
  type UserProfile,
} from './userService';
export * from './types';
