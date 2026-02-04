/**
 * Network Configurations
 *
 * Defines the supported EVM networks (testnets) for StablePay:
 * - Polygon Amoy (chainId: 80002)
 * - Avalanche Fuji (chainId: 43113)
 *
 * Each network has its own:
 * - RPC endpoint
 * - Block explorer
 * - Deployed stablecoin contract address
 * - ERC-4337 bundler/paymaster URLs (Pimlico)
 */

export interface NetworkConfig {
  chainId: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  explorerUrl: string;
  stablecoinAddress: string;
  stablecoinSymbol: string;
  stablecoinDecimals: number;
  bundlerUrl: string;
  paymasterUrl: string;
  entryPointAddress: string;
  // Native token info (for reference, users won't need it due to AA)
  nativeToken: {
    symbol: string;
    decimals: number;
  };
}

// ERC-4337 EntryPoint v0.6 (deployed at same address on all chains)
const ENTRY_POINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// Pimlico API key placeholder - user should replace with their own
// Get one at https://dashboard.pimlico.io/
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY || 'YOUR_PIMLICO_API_KEY';

export const NETWORKS: Record<string, NetworkConfig> = {
  'polygon-amoy': {
    chainId: 80002,
    name: 'polygon-amoy',
    displayName: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com',
    // TODO: Deploy DemoStablecoin and update this address
    stablecoinAddress: '0x0000000000000000000000000000000000000000',
    stablecoinSymbol: 'dUSDT',
    stablecoinDecimals: 18,
    bundlerUrl: `https://api.pimlico.io/v2/80002/rpc?apikey=${PIMLICO_API_KEY}`,
    paymasterUrl: `https://api.pimlico.io/v2/80002/rpc?apikey=${PIMLICO_API_KEY}`,
    entryPointAddress: ENTRY_POINT_V06,
    nativeToken: {
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  'avalanche-fuji': {
    chainId: 43113,
    name: 'avalanche-fuji',
    displayName: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    // TODO: Deploy DemoStablecoin and update this address
    stablecoinAddress: '0x0000000000000000000000000000000000000000',
    stablecoinSymbol: 'dUSDT',
    stablecoinDecimals: 18,
    bundlerUrl: `https://api.pimlico.io/v2/43113/rpc?apikey=${PIMLICO_API_KEY}`,
    paymasterUrl: `https://api.pimlico.io/v2/43113/rpc?apikey=${PIMLICO_API_KEY}`,
    entryPointAddress: ENTRY_POINT_V06,
    nativeToken: {
      symbol: 'AVAX',
      decimals: 18,
    },
  },
};

export const DEFAULT_NETWORK = 'polygon-amoy';

/**
 * Get network config by name
 */
export function getNetwork(networkName: string): NetworkConfig {
  const network = NETWORKS[networkName];
  if (!network) {
    throw new Error(`Unknown network: ${networkName}`);
  }
  return network;
}

/**
 * Get network config by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find((n) => n.chainId === chainId);
}

/**
 * Get all supported network names
 */
export function getSupportedNetworks(): string[] {
  return Object.keys(NETWORKS);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerTxUrl(networkName: string, txHash: string): string {
  const network = getNetwork(networkName);
  return `${network.explorerUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for an address
 */
export function getExplorerAddressUrl(networkName: string, address: string): string {
  const network = getNetwork(networkName);
  return `${network.explorerUrl}/address/${address}`;
}
