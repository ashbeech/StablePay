/**
 * Shared Type Definitions
 */

// Re-export types from store
export type { PaymentRequest, Transaction, NetworkId } from '../store';

// Re-export types from crypto
export type {
  EthereumWallet,
  X25519KeyPair,
  DerivedKeys,
} from '../core/crypto';

// Re-export types from e2ee
export type {
  EncryptedPayload,
  EncryptedPayloadSerialized,
} from '../core/crypto/e2ee';

// Navigation types
export type { RootStackParamList } from '../app/Navigation';

// Payment request payload (for E2EE transmission)
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

// User lookup result from relay server
export interface UserLookupResult {
  address: string;
  username: string;
  sixDigitId: string;
  x25519PublicKey: string;
  online: boolean;
}
