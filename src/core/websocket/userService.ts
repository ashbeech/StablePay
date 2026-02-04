/**
 * User Service
 *
 * Handles user registration and lookup via the WebSocket relay.
 */

import { wsClient } from './client';
import { lookupUser } from './messageHandler';
import type { LookupResultMessage } from './types';

export interface UserProfile {
  address: string;
  username?: string;
  sixDigitId: string;
  x25519PublicKey: string;
  online: boolean;
}

/**
 * Register or update user profile on the relay server
 */
export function registerUser(x25519PublicKey: string, username?: string): void {
  wsClient.send({
    type: 'register',
    payload: {
      username,
      x25519PublicKey,
    },
  });
}

/**
 * Update username
 */
export function updateUsername(
  username: string,
  x25519PublicKey: string,
): void {
  registerUser(x25519PublicKey, username);
}

/**
 * Look up a user by @username
 */
export async function lookupByUsername(username: string): Promise<UserProfile> {
  // Ensure @ prefix
  const query = username.startsWith('@') ? username : `@${username}`;
  const result = await lookupUser(query);
  return mapLookupResult(result);
}

/**
 * Look up a user by 6-digit ID
 */
export async function lookupBySixDigitId(
  sixDigitId: string,
): Promise<UserProfile> {
  if (!/^\d{6}$/.test(sixDigitId)) {
    throw new Error('Invalid 6-digit ID format');
  }
  const result = await lookupUser(sixDigitId);
  return mapLookupResult(result);
}

/**
 * Look up a user by wallet address
 */
export async function lookupByAddress(address: string): Promise<UserProfile> {
  if (!address.startsWith('0x') || address.length !== 42) {
    throw new Error('Invalid address format');
  }
  const result = await lookupUser(address);
  return mapLookupResult(result);
}

/**
 * Look up a user by any identifier (auto-detect type)
 */
export async function lookupAny(query: string): Promise<UserProfile> {
  const trimmed = query.trim();

  if (trimmed.startsWith('@')) {
    return lookupByUsername(trimmed);
  }

  if (/^\d{6}$/.test(trimmed)) {
    return lookupBySixDigitId(trimmed);
  }

  if (trimmed.startsWith('0x') && trimmed.length === 42) {
    return lookupByAddress(trimmed);
  }

  // Try as username without @
  if (/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(trimmed)) {
    return lookupByUsername(trimmed);
  }

  throw new Error('Invalid identifier format');
}

/**
 * Validate username format
 * Rules:
 * - 3-20 characters
 * - Starts with a letter
 * - Only alphanumeric and underscores
 */
export function isValidUsername(username: string): boolean {
  const cleaned = username.startsWith('@') ? username.slice(1) : username;
  return /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(cleaned);
}

/**
 * Map lookup result to UserProfile
 */
function mapLookupResult(result: LookupResultMessage['payload']): UserProfile {
  return {
    address: result.address,
    username: result.username,
    sixDigitId: result.sixDigitId,
    x25519PublicKey: result.x25519PublicKey,
    online: result.online,
  };
}
