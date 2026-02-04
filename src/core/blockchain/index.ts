/**
 * Blockchain module exports
 */

// Networks
export {
  NETWORKS,
  DEFAULT_NETWORK,
  getNetwork,
  getNetworkByChainId,
  getSupportedNetworks,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  type NetworkConfig,
} from './networks';

// Contracts
export {
  ERC20_ABI,
  DEMO_STABLECOIN_ABI,
  ENTRY_POINT_ABI,
  SIMPLE_ACCOUNT_ABI,
  SIMPLE_ACCOUNT_FACTORY_ABI,
} from './contracts';

// Provider
export {
  getProvider,
  clearProviderCache,
  createWallet,
  getStablecoinContract,
  getStablecoinContractWithSigner,
  getTokenBalance,
  getStablecoinBalance,
  getNativeBalance,
  formatTokenAmount,
  parseTokenAmount,
  isValidAddress,
  shortenAddress,
  waitForTransaction,
} from './provider';

// ERC-4337 Account Abstraction
export {
  createSmartWallet,
  getSmartAccountAddress,
  sendTokenTransfer,
  sendBatchTransactions,
  estimateTransferGas,
  type SmartWallet,
} from './erc4337';
