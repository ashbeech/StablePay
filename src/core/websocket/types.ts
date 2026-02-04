/**
 * WebSocket Message Types
 *
 * Defines the protocol for communication with the relay server.
 * All user-to-user message payloads are E2EE - the server only routes encrypted blobs.
 */

// ============================================================================
// Server Configuration
// ============================================================================

// Replace with your deployed relay server URL
export const RELAY_SERVER_URL =
  process.env.RELAY_SERVER_URL || 'wss://stablepay-relay.koyeb.app';

// ============================================================================
// Message Types (Client -> Server)
// ============================================================================

export type ClientMessageType =
  | 'auth'
  | 'register'
  | 'lookup'
  | 'payment_request'
  | 'cancel_request'
  | 'ping';

// Authentication (on connect)
export interface AuthMessage {
  type: 'auth';
  payload: {
    address: string;
    timestamp: number;
    signature: string; // sign(keccak256(address + timestamp))
  };
}

// Register/update user profile
export interface RegisterMessage {
  type: 'register';
  payload: {
    username?: string; // Optional @username
    x25519PublicKey: string; // base64 encoded
    encryptedMetadata?: string; // Optional encrypted profile data
  };
}

// Lookup user by @username, 6-digit ID, or address
export interface LookupMessage {
  type: 'lookup';
  payload: {
    query: string; // "@alice", "123456", or "0x..."
  };
}

// Send encrypted payment request
export interface PaymentRequestMessage {
  type: 'payment_request';
  payload: {
    to: string; // recipient address
    requestId: string; // UUID
    encrypted: string; // base64 encoded encrypted payload
    expiresAt: number; // Unix timestamp
  };
}

// Cancel a pending request
export interface CancelRequestMessage {
  type: 'cancel_request';
  payload: {
    requestId: string;
  };
}

// Ping to keep connection alive
export interface PingMessage {
  type: 'ping';
  payload: {
    timestamp: number;
  };
}

export type ClientMessage =
  | AuthMessage
  | RegisterMessage
  | LookupMessage
  | PaymentRequestMessage
  | CancelRequestMessage
  | PingMessage;

// ============================================================================
// Message Types (Server -> Client)
// ============================================================================

export type ServerMessageType =
  | 'auth_success'
  | 'auth_error'
  | 'register_success'
  | 'register_error'
  | 'lookup_result'
  | 'lookup_error'
  | 'payment_request'
  | 'request_cancelled'
  | 'request_paid'
  | 'error'
  | 'pong';

// Auth success response
export interface AuthSuccessMessage {
  type: 'auth_success';
  payload: {
    address: string;
    username?: string;
    sixDigitId: string;
  };
}

// Auth error response
export interface AuthErrorMessage {
  type: 'auth_error';
  payload: {
    error: string;
  };
}

// Registration success
export interface RegisterSuccessMessage {
  type: 'register_success';
  payload: {
    username?: string;
    sixDigitId: string;
  };
}

// Registration error
export interface RegisterErrorMessage {
  type: 'register_error';
  payload: {
    error: string;
  };
}

// User lookup result
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

// User lookup error
export interface LookupErrorMessage {
  type: 'lookup_error';
  payload: {
    query: string;
    error: string;
  };
}

// Incoming payment request (to recipient)
export interface IncomingPaymentRequestMessage {
  type: 'payment_request';
  payload: {
    from: string; // sender address
    requestId: string;
    encrypted: string; // base64 encoded
    expiresAt: number;
  };
}

// Request cancelled (broadcast to both parties)
export interface RequestCancelledMessage {
  type: 'request_cancelled';
  payload: {
    requestId: string;
    cancelledBy: string;
  };
}

// Request paid (confirmation to requester)
export interface RequestPaidMessage {
  type: 'request_paid';
  payload: {
    requestId: string;
    txHash: string;
    paidBy: string;
  };
}

// Generic error
export interface ErrorMessage {
  type: 'error';
  payload: {
    error: string;
    code?: string;
  };
}

// Pong response
export interface PongMessage {
  type: 'pong';
  payload: {
    timestamp: number;
  };
}

export type ServerMessage =
  | AuthSuccessMessage
  | AuthErrorMessage
  | RegisterSuccessMessage
  | RegisterErrorMessage
  | LookupResultMessage
  | LookupErrorMessage
  | IncomingPaymentRequestMessage
  | RequestCancelledMessage
  | RequestPaidMessage
  | ErrorMessage
  | PongMessage;

// ============================================================================
// Payment Request Payload (Encrypted Content)
// ============================================================================

// This is what gets encrypted before sending
export interface PaymentRequestPayload {
  requestId: string;
  amount: string; // "50.00"
  currency: string; // "dUSDT"
  memo?: string;
  senderAddress: string;
  senderUsername?: string;
  createdAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (createdAt + 1 hour)
}

// ============================================================================
// Connection State
// ============================================================================

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
