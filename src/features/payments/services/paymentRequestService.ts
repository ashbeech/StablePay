/**
 * Payment Request Service
 *
 * Handles creating, sending, and managing E2EE payment requests.
 */

import { v4 as uuidv4 } from 'uuid';
import { wsClient } from '../../../core/websocket/client';
import {
  lookupAny,
  type UserProfile,
} from '../../../core/websocket/userService';
import { encryptForTransmission } from '../../../core/crypto/e2ee';
import { base64ToUint8Array } from '../../../core/crypto/keyDerivation';
import { useAppStore, type PaymentRequest } from '../../../store';
import type { PaymentRequestPayload } from '../../../core/websocket/types';

// Request expiry time: 1 hour
const REQUEST_EXPIRY_MS = 60 * 60 * 1000;

export interface CreateRequestParams {
  recipientQuery: string; // @username, 6-digit ID, or 0x address
  amount: string;
  memo?: string;
  senderAddress: string;
  senderUsername?: string;
}

export interface CreateRequestResult {
  success: boolean;
  request?: PaymentRequest;
  error?: string;
}

/**
 * Create and send an E2EE payment request
 */
export async function createPaymentRequest(
  params: CreateRequestParams,
): Promise<CreateRequestResult> {
  const { recipientQuery, amount, memo, senderAddress, senderUsername } =
    params;

  try {
    // Look up the recipient
    const recipient = await lookupAny(recipientQuery);

    // Generate request ID and timestamps
    const requestId = uuidv4();
    const createdAt = Date.now();
    const expiresAt = createdAt + REQUEST_EXPIRY_MS;

    // Create the payload
    const payload: PaymentRequestPayload = {
      requestId,
      amount,
      currency: 'dUSDT',
      memo,
      senderAddress,
      senderUsername,
      createdAt,
      expiresAt,
    };

    // Encrypt the payload for the recipient
    const recipientPublicKey = base64ToUint8Array(recipient.x25519PublicKey);
    const encrypted = encryptForTransmission(payload, recipientPublicKey);

    // Send via WebSocket
    wsClient.send({
      type: 'payment_request',
      payload: {
        to: recipient.address,
        requestId,
        encrypted: JSON.stringify(encrypted),
        expiresAt,
      },
    });

    // Create local PaymentRequest record
    const request: PaymentRequest = {
      id: requestId,
      direction: 'sent',
      counterpartyAddress: recipient.address,
      counterpartyUsername: recipient.username,
      amount,
      memo,
      status: 'pending',
      expiresAt,
      createdAt,
    };

    // Add to store
    useAppStore.getState().addRequest(request);

    return { success: true, request };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create request';
    return { success: false, error: errorMessage };
  }
}

/**
 * Cancel a payment request
 */
export function cancelRequest(requestId: string): void {
  // Send cancellation to server
  wsClient.send({
    type: 'cancel_request',
    payload: { requestId },
  });

  // Update local state
  useAppStore.getState().updateRequest(requestId, { status: 'cancelled' });
}

/**
 * Mark a request as paid (after successful payment)
 */
export function markRequestPaid(requestId: string, txHash: string): void {
  useAppStore.getState().updateRequest(requestId, { status: 'paid' });

  // Note: The server will broadcast this to the requester
  // For now we just update local state
}

/**
 * Check and expire old requests
 */
export function expireOldRequests(): void {
  const { pendingRequests, updateRequest } = useAppStore.getState();
  const now = Date.now();

  pendingRequests
    .filter(req => req.status === 'pending' && req.expiresAt < now)
    .forEach(req => {
      updateRequest(req.id, { status: 'expired' });
    });
}

/**
 * Get pending requests (received, not yet paid)
 */
export function getPendingReceivedRequests(): PaymentRequest[] {
  const { pendingRequests } = useAppStore.getState();
  return pendingRequests.filter(
    req => req.direction === 'received' && req.status === 'pending',
  );
}

/**
 * Get pending requests (sent, waiting for payment)
 */
export function getPendingSentRequests(): PaymentRequest[] {
  const { pendingRequests } = useAppStore.getState();
  return pendingRequests.filter(
    req => req.direction === 'sent' && req.status === 'pending',
  );
}

/**
 * Calculate time remaining for a request
 */
export function getTimeRemaining(request: PaymentRequest): {
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const now = Date.now();
  const remaining = request.expiresAt - now;

  if (remaining <= 0) {
    return { minutes: 0, seconds: 0, expired: true };
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return { minutes, seconds, expired: false };
}

/**
 * Format time remaining as string
 */
export function formatTimeRemaining(request: PaymentRequest): string {
  const { minutes, seconds, expired } = getTimeRemaining(request);

  if (expired) {
    return 'Expired';
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
