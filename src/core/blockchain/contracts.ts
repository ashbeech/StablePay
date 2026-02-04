/**
 * Contract ABIs and Addresses
 *
 * Contains the ABI for interacting with the DemoStablecoin ERC-20 contract.
 */

// Minimal ERC-20 ABI for balance checking and transfers
export const ERC20_ABI = [
  // Read functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',

  // Write functions
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

// DemoStablecoin specific ABI (extends ERC-20 with faucet)
export const DEMO_STABLECOIN_ABI = [
  ...ERC20_ABI,
  // Faucet functions
  'function faucet() external',
  'function lastFaucetClaim(address) view returns (uint256)',
  'function FAUCET_AMOUNT() view returns (uint256)',
  'function FAUCET_COOLDOWN() view returns (uint256)',
] as const;

// ERC-4337 EntryPoint ABI (minimal, for UserOp submission)
export const ENTRY_POINT_ABI = [
  'function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] ops, address beneficiary)',
  'function getNonce(address sender, uint192 key) view returns (uint256)',
  'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)',
] as const;

// SimpleAccount ABI (for account abstraction)
export const SIMPLE_ACCOUNT_ABI = [
  'function execute(address dest, uint256 value, bytes calldata func) external',
  'function executeBatch(address[] calldata dest, bytes[] calldata func) external',
  'function owner() view returns (address)',
  'function entryPoint() view returns (address)',
] as const;

// SimpleAccountFactory ABI
export const SIMPLE_ACCOUNT_FACTORY_ABI = [
  'function createAccount(address owner, uint256 salt) returns (address)',
  'function getAddress(address owner, uint256 salt) view returns (address)',
] as const;
