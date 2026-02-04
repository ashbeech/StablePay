/**
 * Wallet Service
 *
 * High-level wallet operations including:
 * - Loading wallet from keychain
 * - Sending payments via ERC-4337
 * - Transaction history sync
 */

import { getMnemonic, getX25519PrivateKey } from '../../../core/storage';
import {
  deriveEthereumWallet,
  deriveX25519Keys,
  base64ToUint8Array,
} from '../../../core/crypto';
import {
  createSmartWallet,
  getSmartAccountAddress,
  sendTokenTransfer,
  getNetwork,
  parseTokenAmount,
  type SmartWallet,
} from '../../../core/blockchain';
import type { Address, Hex } from 'viem';

// Cache the smart wallet instance
let cachedSmartWallet: SmartWallet | null = null;
let cachedNetwork: string | null = null;

/**
 * Load the user's wallet keys from secure storage
 */
export async function loadWalletKeys(): Promise<{
  privateKeyHex: string;
  address: string;
  x25519PrivateKey: Uint8Array;
} | null> {
  const mnemonic = await getMnemonic();
  if (!mnemonic) {
    return null;
  }

  const [ethereumWallet, x25519PrivateKeyBase64] = await Promise.all([
    deriveEthereumWallet(mnemonic),
    getX25519PrivateKey(),
  ]);

  let x25519PrivateKey: Uint8Array;
  if (x25519PrivateKeyBase64) {
    x25519PrivateKey = base64ToUint8Array(x25519PrivateKeyBase64);
  } else {
    // Derive from mnemonic if not cached
    const x25519Keys = await deriveX25519Keys(mnemonic);
    x25519PrivateKey = x25519Keys.privateKey;
  }

  return {
    privateKeyHex: ethereumWallet.privateKeyHex,
    address: ethereumWallet.address,
    x25519PrivateKey,
  };
}

/**
 * Get or create the smart wallet instance
 */
export async function getOrCreateSmartWallet(
  networkName: string,
): Promise<SmartWallet> {
  // Return cached wallet if same network
  if (cachedSmartWallet && cachedNetwork === networkName) {
    return cachedSmartWallet;
  }

  const walletKeys = await loadWalletKeys();
  if (!walletKeys) {
    throw new Error('No wallet found. Please complete onboarding first.');
  }

  const smartWallet = await createSmartWallet(
    walletKeys.privateKeyHex,
    networkName,
  );

  // Cache for reuse
  cachedSmartWallet = smartWallet;
  cachedNetwork = networkName;

  return smartWallet;
}

/**
 * Clear the cached smart wallet (call when switching networks)
 */
export function clearSmartWalletCache(): void {
  cachedSmartWallet = null;
  cachedNetwork = null;
}

/**
 * Send a stablecoin payment
 *
 * @param recipientAddress - The recipient's wallet address
 * @param amount - The amount to send (as a string, e.g., "10.50")
 * @param networkName - The network to use
 * @returns The transaction hash
 */
export async function sendPayment(
  recipientAddress: string,
  amount: string,
  networkName: string,
): Promise<string> {
  const network = getNetwork(networkName);
  const smartWallet = await getOrCreateSmartWallet(networkName);

  // Parse the amount to wei
  const amountWei = parseTokenAmount(amount, network.stablecoinDecimals);

  // Send the transfer via ERC-4337 (gasless)
  const txHash = await sendTokenTransfer(
    smartWallet,
    network.stablecoinAddress as Address,
    recipientAddress as Address,
    amountWei,
  );

  return txHash;
}

/**
 * Get the user's smart account address for a network
 */
export async function getUserSmartAccountAddress(
  networkName: string,
): Promise<string> {
  const walletKeys = await loadWalletKeys();
  if (!walletKeys) {
    throw new Error('No wallet found');
  }

  const address = await getSmartAccountAddress(
    walletKeys.privateKeyHex,
    networkName,
  );

  return address;
}

/**
 * Validate a payment can be made
 */
export interface PaymentValidation {
  isValid: boolean;
  error?: string;
}

export function validatePayment(
  recipientAddress: string,
  amount: string,
  currentBalance: string,
): PaymentValidation {
  // Check recipient address
  if (!recipientAddress || recipientAddress.length !== 42) {
    return { isValid: false, error: 'Invalid recipient address' };
  }

  if (!recipientAddress.startsWith('0x')) {
    return { isValid: false, error: 'Address must start with 0x' };
  }

  // Check amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { isValid: false, error: 'Invalid amount' };
  }

  // Check balance
  const balanceNum = parseFloat(currentBalance);
  if (amountNum > balanceNum) {
    return { isValid: false, error: 'Insufficient balance' };
  }

  return { isValid: true };
}
