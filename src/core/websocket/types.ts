/**
 * WebSocket Message Types
 *
 * Defines the protocol for communication with the relay server.
 * All user-to-user message payloads are E2EE - the server only routes encrypted blobs.
 */

export const RELAY_SERVER_URL =
  process.env.RELAY_SERVER_URL || 'wss://stablepay-relay.koyeb.app';

// Client -> Server message types
export interface AuthMessage {
  type: 'auth';
  payload: {
    address: string;
    timestamp: number;
    signature: string;
  };
}

export interface RegisterMessage {
  type: 'register';
  payload: {
    username?: string;
    x25519PublicKey: string;
  };
}

export interface LookupMessage {
  type: 'lookup';
  payload: {
    query: string;
  };
}

export interface PaymentRequestMessage {
  type: 'payment_request';
  payload: {
    to: string;
    requestId: string;
    encrypted: string;
    expiresAt: number;
  };
}

export interface CancelRequestMessage {
  type: 'cancel_request';
  payload: {
    requestId: string;
  };
}

export type ClientMessage =
  | AuthMessage
  | RegisterMessage
  | LookupMessage
  | PaymentRequestMessage
  | CancelRequestMessage
  | { type: 'ping'; payload: { timestamp: number } };

// Server -> Client message types
export interface LookupResultMessage {
  type: 'lookup_result';
  payload: {
    address: string;
    username?: string;
    sixDigitId: string;
    x25519PublicKey: string;
    online: boolean;
  };
}

export type ServerMessage =
  | {
      type: 'auth_success';
      payload: { address: string; username?: string; sixDigitId: string };
    }
  | { type: 'auth_error'; payload: { error: string } }
  | {
      type: 'register_success';
      payload: { username?: string; sixDigitId: string };
    }
  | { type: 'register_error'; payload: { error: string } }
  | LookupResultMessage
  | { type: 'lookup_error'; payload: { query: string; error: string } }
  | {
      type: 'payment_request';
      payload: {
        from: string;
        requestId: string;
        encrypted: string;
        expiresAt: number;
      };
    }
  | {
      type: 'request_cancelled';
      payload: { requestId: string; cancelledBy: string };
    }
  | {
      type: 'request_paid';
      payload: { requestId: string; txHash: string; paidBy: string };
    }
  | { type: 'error'; payload: { error: string } }
  | { type: 'pong'; payload: { timestamp: number } };

export interface PaymentRequestPayload {
  requestId: string;
  amount: string;
  currency: string;
  memo?: string;
  senderAddress: string;
  senderUsername?: string;
  createdAt: number;
  expiresAt: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'error';

export interface WebSocketState {
  connectionState: ConnectionState;
  isAuthenticated: boolean;
  lastError?: string;
  reconnectAttempts: number;
}
