/**
 * Blockchain Provider Management
 *
 * Manages ethers.js providers for connecting to EVM networks.
 * Supports network switching between Polygon Amoy and Avalanche Fuji.
 */

import { ethers } from 'ethers';
import { getNetwork, type NetworkConfig } from './networks';
import { ERC20_ABI } from './contracts';

// Cache providers to avoid recreating them
const providerCache: Map<string, ethers.JsonRpcProvider> = new Map();

/**
 * Get or create a provider for the specified network
 */
export function getProvider(networkName: string): ethers.JsonRpcProvider {
  const cached = providerCache.get(networkName);
  if (cached) {
    return cached;
  }

  const network = getNetwork(networkName);
  const provider = new ethers.JsonRpcProvider(network.rpcUrl, {
    chainId: network.chainId,
    name: network.name,
  });

  providerCache.set(networkName, provider);
  return provider;
}

/**
 * Clear provider cache (useful when switching networks)
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

/**
 * Create a wallet instance from a private key
 */
export function createWallet(
  privateKey: string,
  networkName: string,
): ethers.Wallet {
  const provider = getProvider(networkName);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Get the stablecoin contract instance for reading
 */
export function getStablecoinContract(networkName: string): ethers.Contract {
  const network = getNetwork(networkName);
  const provider = getProvider(networkName);
  return new ethers.Contract(network.stablecoinAddress, ERC20_ABI, provider);
}

/**
 * Get the stablecoin contract instance for writing (with signer)
 */
export function getStablecoinContractWithSigner(
  networkName: string,
  signer: ethers.Signer,
): ethers.Contract {
  const network = getNetwork(networkName);
  return new ethers.Contract(network.stablecoinAddress, ERC20_ABI, signer);
}

/**
 * Fetch ERC-20 token balance for an address
 */
export async function getTokenBalance(
  networkName: string,
  tokenAddress: string,
  walletAddress: string,
): Promise<bigint> {
  const provider = getProvider(networkName);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  return contract.balanceOf(walletAddress);
}

/**
 * Fetch the stablecoin balance for an address
 */
export async function getStablecoinBalance(
  networkName: string,
  walletAddress: string,
): Promise<string> {
  const network = getNetwork(networkName);

  // Return 0 if stablecoin not deployed yet
  if (
    network.stablecoinAddress === '0x0000000000000000000000000000000000000000'
  ) {
    return '0.00';
  }

  try {
    const balance = await getTokenBalance(
      networkName,
      network.stablecoinAddress,
      walletAddress,
    );
    return formatTokenAmount(balance, network.stablecoinDecimals);
  } catch (error) {
    console.error('Failed to fetch stablecoin balance:', error);
    return '0.00';
  }
}

/**
 * Fetch native token balance (ETH/MATIC/AVAX)
 */
export async function getNativeBalance(
  networkName: string,
  walletAddress: string,
): Promise<string> {
  const network = getNetwork(networkName);
  const provider = getProvider(networkName);

  try {
    const balance = await provider.getBalance(walletAddress);
    return formatTokenAmount(balance, network.nativeToken.decimals);
  } catch (error) {
    console.error('Failed to fetch native balance:', error);
    return '0.00';
  }
}

/**
 * Format a token amount from wei to human-readable string
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals: number = 2,
): string {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  // Convert fractional part to decimal string
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, maxDecimals);

  if (trimmedFractional === '00' || trimmedFractional === '0') {
    return wholePart.toString() + '.00';
  }

  return `${wholePart}.${trimmedFractional}`;
}

/**
 * Parse a human-readable amount to wei
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Check if an address is valid
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!isValidAddress(address)) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Wait for a transaction to be confirmed
 */
export async function waitForTransaction(
  networkName: string,
  txHash: string,
  confirmations: number = 1,
): Promise<ethers.TransactionReceipt | null> {
  const provider = getProvider(networkName);
  return provider.waitForTransaction(txHash, confirmations);
}
