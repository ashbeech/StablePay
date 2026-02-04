/**
 * Message Handler
 *
 * Routes incoming WebSocket messages to appropriate handlers.
 * Decrypts E2EE payment requests and updates app state.
 */

import { wsClient } from './client';
import {
  type ServerMessage,
  type PaymentRequestPayload,
  type LookupResultMessage,
} from './types';
import { decryptFromTransmission } from '../crypto/e2ee';
import { base64ToUint8Array } from '../crypto/keyDerivation';
import { getX25519PrivateKey } from '../storage';
import { useAppStore, type PaymentRequest } from '../../store';

// Callbacks for specific message types
type LookupCallback = (
  result: LookupResultMessage['payload'] | null,
  error?: string,
) => void;
type RequestCallback = (request: PaymentRequest) => void;

// Pending lookup callbacks (keyed by query)
const pendingLookups = new Map<string, LookupCallback>();

// Incoming request callback
let incomingRequestCallback: RequestCallback | null = null;

/**
 * Initialize the message handler
 */
export function initializeMessageHandler(): () => void {
  return wsClient.onMessage(handleMessage);
}

/**
 * Set callback for incoming payment requests
 */
export function onIncomingRequest(callback: RequestCallback): () => void {
  incomingRequestCallback = callback;
  return () => {
    incomingRequestCallback = null;
  };
}

/**
 * Lookup a user with a promise-based API
 */
export function lookupUser(
  query: string,
): Promise<LookupResultMessage['payload']> {
  return new Promise((resolve, reject) => {
    // Set up callback
    pendingLookups.set(query, (result, error) => {
      pendingLookups.delete(query);
      if (error) {
        reject(new Error(error));
      } else if (result) {
        resolve(result);
      } else {
        reject(new Error('User not found'));
      }
    });

    // Send lookup request
    wsClient.send({
      type: 'lookup',
      payload: { query },
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (pendingLookups.has(query)) {
        pendingLookups.delete(query);
        reject(new Error('Lookup timeout'));
      }
    }, 10000);
  });
}

/**
 * Handle incoming messages from the server
 */
async function handleMessage(message: ServerMessage): Promise<void> {
  switch (message.type) {
    case 'lookup_result':
      handleLookupResult(message);
      break;

    case 'lookup_error':
      handleLookupError(message);
      break;

    case 'payment_request':
      await handleIncomingPaymentRequest(message);
      break;

    case 'request_cancelled':
      handleRequestCancelled(message);
      break;

    case 'request_paid':
      handleRequestPaid(message);
      break;

    case 'register_success':
      handleRegisterSuccess(message);
      break;

    case 'register_error':
      console.error(
        '[MessageHandler] Registration error:',
        message.payload.error,
      );
      break;

    case 'error':
      console.error('[MessageHandler] Server error:', message.payload.error);
      break;

    default:
      // Ignore other message types (auth_success handled in client)
      break;
  }
}

function handleLookupResult(message: LookupResultMessage): void {
  // Find the callback by checking which query this could match
  // The server doesn't echo back the query, so we match by address
  for (const [query, callback] of pendingLookups) {
    // This is a simplified match - real implementation should track request IDs
    callback(message.payload);
    pendingLookups.delete(query);
    return;
  }
}

function handleLookupError(message: {
  type: 'lookup_error';
  payload: { query: string; error: string };
}): void {
  const callback = pendingLookups.get(message.payload.query);
  if (callback) {
    callback(null, message.payload.error);
    pendingLookups.delete(message.payload.query);
  }
}

async function handleIncomingPaymentRequest(message: {
  type: 'payment_request';
  payload: {
    from: string;
    requestId: string;
    encrypted: string;
    expiresAt: number;
  };
}): Promise<void> {
  try {
    // Get X25519 private key from storage
    const privateKeyBase64 = await getX25519PrivateKey();
    if (!privateKeyBase64) {
      console.error('[MessageHandler] No X25519 private key found');
      return;
    }

    const privateKey = base64ToUint8Array(privateKeyBase64);

    // Decrypt the payload
    const decrypted = decryptFromTransmission<PaymentRequestPayload>(
      JSON.parse(message.payload.encrypted),
      privateKey,
    );

    // Create PaymentRequest object
    const request: PaymentRequest = {
      id: decrypted.requestId,
      direction: 'received',
      counterpartyAddress: decrypted.senderAddress,
      counterpartyUsername: decrypted.senderUsername,
      amount: decrypted.amount,
      memo: decrypted.memo,
      status: 'pending',
      expiresAt: decrypted.expiresAt,
      createdAt: decrypted.createdAt,
    };

    // Add to store
    useAppStore.getState().addRequest(request);

    // Notify callback if set
    if (incomingRequestCallback) {
      incomingRequestCallback(request);
    }

    console.log('[MessageHandler] Received payment request:', request.id);
  } catch (error) {
    console.error('[MessageHandler] Failed to process payment request:', error);
  }
}

function handleRequestCancelled(message: {
  type: 'request_cancelled';
  payload: { requestId: string; cancelledBy: string };
}): void {
  const { requestId } = message.payload;
  useAppStore.getState().updateRequest(requestId, { status: 'cancelled' });
  console.log('[MessageHandler] Request cancelled:', requestId);
}

function handleRequestPaid(message: {
  type: 'request_paid';
  payload: { requestId: string; txHash: string; paidBy: string };
}): void {
  const { requestId } = message.payload;
  useAppStore.getState().updateRequest(requestId, { status: 'paid' });
  console.log('[MessageHandler] Request paid:', requestId);
}

function handleRegisterSuccess(message: {
  type: 'register_success';
  payload: { username?: string; sixDigitId: string };
}): void {
  const store = useAppStore.getState();
  if (message.payload.username) {
    store.setUsername(message.payload.username);
  }
  store.setSixDigitId(message.payload.sixDigitId);
  console.log(
    '[MessageHandler] Registered with ID:',
    message.payload.sixDigitId,
  );
}
