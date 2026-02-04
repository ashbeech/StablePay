/**
 * Key Derivation Module
 *
 * Derives all cryptographic keys from a single BIP-39 mnemonic:
 * - Ethereum wallet (secp256k1) via BIP-32/44 path m/44'/60'/0'/0/0
 * - X25519 keypair for E2EE via BIP-32 path m/44'/60'/0'/1/0
 */

import * as bip39 from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import { wordlist } from '@scure/bip39/wordlists/english';
import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { keccak_256 } from '@noble/hashes/sha3';

// BIP-44 paths
const ETH_PATH = "m/44'/60'/0'/0/0";
const X25519_PATH = "m/44'/60'/0'/1/0"; // Different derivation index for encryption keys

export interface EthereumWallet {
  privateKey: Uint8Array;
  privateKeyHex: string;
  publicKey: Uint8Array;
  address: string;
}

export interface X25519KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  privateKeyBase64: string;
  publicKeyBase64: string;
}

export interface DerivedKeys {
  ethereum: EthereumWallet;
  x25519: X25519KeyPair;
}

/**
 * Generate a new BIP-39 mnemonic (12 words)
 */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(wordlist, 128); // 128 bits = 12 words
}

/**
 * Validate a BIP-39 mnemonic
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

/**
 * Derive Ethereum wallet from mnemonic
 */
export async function deriveEthereumWallet(
  mnemonic: string,
): Promise<EthereumWallet> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const ethKey = hdKey.derive(ETH_PATH);

  if (!ethKey.privateKey || !ethKey.publicKey) {
    throw new Error('Failed to derive Ethereum keys');
  }

  // Ethereum address: keccak256(publicKey)[12:32] with 0x prefix
  // Note: publicKey from HDKey is 33 bytes (compressed), we need uncompressed (65 bytes)
  // For address derivation, we use the last 20 bytes of keccak256(uncompressed pubkey without prefix)
  const address = ethereumAddressFromPublicKey(ethKey.publicKey);

  return {
    privateKey: ethKey.privateKey,
    privateKeyHex: '0x' + bytesToHex(ethKey.privateKey),
    publicKey: ethKey.publicKey,
    address,
  };
}

/**
 * Derive Ethereum address from compressed public key
 */
function ethereumAddressFromPublicKey(compressedPubKey: Uint8Array): string {
  // Import secp256k1 to decompress the public key
  const { secp256k1 } = require('@noble/curves/secp256k1');

  // Decompress the public key (33 bytes -> 65 bytes)
  const point = secp256k1.ProjectivePoint.fromHex(compressedPubKey);
  const uncompressedPubKey = point.toRawBytes(false); // false = uncompressed

  // Remove the 0x04 prefix (uncompressed indicator) and hash
  const pubKeyWithoutPrefix = uncompressedPubKey.slice(1);
  const hash = keccak_256(pubKeyWithoutPrefix);

  // Take last 20 bytes for address
  const addressBytes = hash.slice(-20);
  return '0x' + bytesToHex(addressBytes);
}

/**
 * Derive X25519 keypair from mnemonic for E2EE
 */
export async function deriveX25519Keys(
  mnemonic: string,
): Promise<X25519KeyPair> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const derivedKey = hdKey.derive(X25519_PATH);

  if (!derivedKey.privateKey) {
    throw new Error('Failed to derive X25519 seed');
  }

  // Use first 32 bytes of derived key as X25519 private key
  const privateKey = derivedKey.privateKey.slice(0, 32);
  const publicKey = x25519.getPublicKey(privateKey);

  return {
    privateKey,
    publicKey,
    privateKeyBase64: uint8ArrayToBase64(privateKey),
    publicKeyBase64: uint8ArrayToBase64(publicKey),
  };
}

/**
 * Derive all keys from a mnemonic
 */
export async function deriveAllKeys(mnemonic: string): Promise<DerivedKeys> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  const [ethereum, x25519Keys] = await Promise.all([
    deriveEthereumWallet(mnemonic),
    deriveX25519Keys(mnemonic),
  ]);

  return {
    ethereum,
    x25519: x25519Keys,
  };
}

// Utility functions for encoding
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export { bytesToHex, hexToBytes };
