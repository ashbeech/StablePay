/**
 * End-to-End Encryption Module
 *
 * Implements X25519 key agreement + AES-256-GCM encryption.
 * Used for encrypting payment requests between users.
 *
 * Protocol:
 * 1. Generate ephemeral X25519 keypair
 * 2. Perform key agreement with recipient's public key
 * 3. Derive AES key using HKDF-SHA256
 * 4. Encrypt with AES-256-GCM
 */

import { x25519 } from '@noble/curves/ed25519';
import { gcm } from '@noble/ciphers/aes';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { uint8ArrayToBase64, base64ToUint8Array } from './keyDerivation';

const HKDF_INFO = 'stablepay-e2ee-v1';
const NONCE_LENGTH = 12; // 96 bits for GCM

export interface EncryptedPayload {
  ephemeralPublicKey: Uint8Array;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export interface EncryptedPayloadSerialized {
  ephemeralPublicKey: string; // base64
  nonce: string; // base64
  ciphertext: string; // base64
}

/**
 * Encrypt a message for a recipient using their X25519 public key
 */
export function encrypt(
  plaintext: Uint8Array,
  recipientPublicKey: Uint8Array,
): EncryptedPayload {
  // Generate ephemeral keypair for this message
  const ephemeralPrivateKey = randomBytes(32);
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);

  // Perform X25519 key agreement
  const sharedSecret = x25519.getSharedSecret(
    ephemeralPrivateKey,
    recipientPublicKey,
  );

  // Derive AES-256 key using HKDF
  const aesKey = hkdf(sha256, sharedSecret, undefined, HKDF_INFO, 32);

  // Generate random nonce
  const nonce = randomBytes(NONCE_LENGTH);

  // Encrypt with AES-256-GCM
  const cipher = gcm(aesKey, nonce);
  const ciphertext = cipher.encrypt(plaintext);

  return {
    ephemeralPublicKey,
    nonce,
    ciphertext,
  };
}

/**
 * Decrypt a message using your X25519 private key
 */
export function decrypt(
  payload: EncryptedPayload,
  recipientPrivateKey: Uint8Array,
): Uint8Array {
  // Perform X25519 key agreement with ephemeral public key
  const sharedSecret = x25519.getSharedSecret(
    recipientPrivateKey,
    payload.ephemeralPublicKey,
  );

  // Derive the same AES key
  const aesKey = hkdf(sha256, sharedSecret, undefined, HKDF_INFO, 32);

  // Decrypt with AES-256-GCM
  const cipher = gcm(aesKey, payload.nonce);
  return cipher.decrypt(payload.ciphertext);
}

/**
 * Encrypt a string message (convenience wrapper)
 */
export function encryptString(
  message: string,
  recipientPublicKey: Uint8Array,
): EncryptedPayload {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(message);
  return encrypt(plaintext, recipientPublicKey);
}

/**
 * Decrypt to a string (convenience wrapper)
 */
export function decryptString(
  payload: EncryptedPayload,
  recipientPrivateKey: Uint8Array,
): string {
  const plaintext = decrypt(payload, recipientPrivateKey);
  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Encrypt a JSON object
 */
export function encryptJSON<T>(
  data: T,
  recipientPublicKey: Uint8Array,
): EncryptedPayload {
  return encryptString(JSON.stringify(data), recipientPublicKey);
}

/**
 * Decrypt to a JSON object
 */
export function decryptJSON<T>(
  payload: EncryptedPayload,
  recipientPrivateKey: Uint8Array,
): T {
  const jsonString = decryptString(payload, recipientPrivateKey);
  return JSON.parse(jsonString) as T;
}

/**
 * Serialize encrypted payload for transmission (to base64 strings)
 */
export function serializePayload(
  payload: EncryptedPayload,
): EncryptedPayloadSerialized {
  return {
    ephemeralPublicKey: uint8ArrayToBase64(payload.ephemeralPublicKey),
    nonce: uint8ArrayToBase64(payload.nonce),
    ciphertext: uint8ArrayToBase64(payload.ciphertext),
  };
}

/**
 * Deserialize encrypted payload from transmission
 */
export function deserializePayload(
  serialized: EncryptedPayloadSerialized,
): EncryptedPayload {
  return {
    ephemeralPublicKey: base64ToUint8Array(serialized.ephemeralPublicKey),
    nonce: base64ToUint8Array(serialized.nonce),
    ciphertext: base64ToUint8Array(serialized.ciphertext),
  };
}

/**
 * Encrypt and serialize in one step (for network transmission)
 */
export function encryptForTransmission<T>(
  data: T,
  recipientPublicKey: Uint8Array,
): EncryptedPayloadSerialized {
  const payload = encryptJSON(data, recipientPublicKey);
  return serializePayload(payload);
}

/**
 * Deserialize and decrypt in one step
 */
export function decryptFromTransmission<T>(
  serialized: EncryptedPayloadSerialized,
  recipientPrivateKey: Uint8Array,
): T {
  const payload = deserializePayload(serialized);
  return decryptJSON<T>(payload, recipientPrivateKey);
}
