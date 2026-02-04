/**
 * ERC-4337 Account Abstraction
 *
 * Implements gasless transactions using:
 * - Smart Account (SimpleAccount)
 * - Bundler (Pimlico)
 * - Paymaster (Pimlico Verifying Paymaster)
 *
 * Uses the `permissionless` library for UserOperation handling.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy, avalancheFuji } from 'viem/chains';
import {
  createSmartAccountClient,
  ENTRYPOINT_ADDRESS_V06,
  type SmartAccountClient,
} from 'permissionless';
import {
  signerToSimpleSmartAccount,
  type SimpleSmartAccount,
} from 'permissionless/accounts';
import {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient,
} from 'permissionless/clients/pimlico';
import { getNetwork, type NetworkConfig } from './networks';
import { ERC20_ABI } from './contracts';

// Map network names to viem chain configs
const CHAIN_MAP = {
  'polygon-amoy': polygonAmoy,
  'avalanche-fuji': avalancheFuji,
} as const;

export interface SmartWallet {
  smartAccount: SimpleSmartAccount<typeof ENTRYPOINT_ADDRESS_V06>;
  smartAccountClient: SmartAccountClient<typeof ENTRYPOINT_ADDRESS_V06>;
  smartAccountAddress: Address;
}

/**
 * Create a Smart Account from an EOA private key
 *
 * This creates an ERC-4337 SimpleAccount that the EOA controls.
 * The smart account address is deterministic based on the EOA address.
 */
export async function createSmartWallet(
  privateKeyHex: string,
  networkName: string,
): Promise<SmartWallet> {
  const network = getNetwork(networkName);
  const chain = CHAIN_MAP[networkName as keyof typeof CHAIN_MAP];

  if (!chain) {
    throw new Error(`Unsupported network for ERC-4337: ${networkName}`);
  }

  // Create the EOA signer from private key
  const privateKey = privateKeyHex.startsWith('0x')
    ? (privateKeyHex as Hex)
    : (`0x${privateKeyHex}` as Hex);
  const signer = privateKeyToAccount(privateKey);

  // Create public client for reading blockchain state
  const publicClient = createPublicClient({
    transport: http(network.rpcUrl),
    chain,
  });

  // Create the SimpleSmartAccount
  const smartAccount = await signerToSimpleSmartAccount(publicClient, {
    signer,
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    // Factory address for SimpleAccount (Pimlico's deployed factory)
    factoryAddress: '0x9406Cc6185a346906296840746125a0E44976454',
  });

  // Create Pimlico bundler client
  const bundlerClient = createPimlicoBundlerClient({
    transport: http(network.bundlerUrl),
    entryPoint: ENTRYPOINT_ADDRESS_V06,
  });

  // Create Pimlico paymaster client (sponsors gas)
  const paymasterClient = createPimlicoPaymasterClient({
    transport: http(network.paymasterUrl),
    entryPoint: ENTRYPOINT_ADDRESS_V06,
  });

  // Create the smart account client that ties everything together
  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    chain,
    bundlerTransport: http(network.bundlerUrl),
    // Use Pimlico paymaster to sponsor gas
    middleware: {
      gasPrice: async () => {
        return (await bundlerClient.getUserOperationGasPrice()).fast;
      },
      sponsorUserOperation: paymasterClient.sponsorUserOperation,
    },
  });

  return {
    smartAccount,
    smartAccountClient,
    smartAccountAddress: smartAccount.address,
  };
}

/**
 * Get the deterministic smart account address for an EOA
 * (without actually creating the account on-chain)
 */
export async function getSmartAccountAddress(
  privateKeyHex: string,
  networkName: string,
): Promise<Address> {
  const network = getNetwork(networkName);
  const chain = CHAIN_MAP[networkName as keyof typeof CHAIN_MAP];

  if (!chain) {
    throw new Error(`Unsupported network for ERC-4337: ${networkName}`);
  }

  const privateKey = privateKeyHex.startsWith('0x')
    ? (privateKeyHex as Hex)
    : (`0x${privateKeyHex}` as Hex);
  const signer = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    transport: http(network.rpcUrl),
    chain,
  });

  const smartAccount = await signerToSimpleSmartAccount(publicClient, {
    signer,
    entryPoint: ENTRYPOINT_ADDRESS_V06,
    factoryAddress: '0x9406Cc6185a346906296840746125a0E44976454',
  });

  return smartAccount.address;
}

/**
 * Send an ERC-20 token transfer via the smart account (gasless)
 *
 * The paymaster sponsors the gas, so the user doesn't need native tokens.
 */
export async function sendTokenTransfer(
  smartWallet: SmartWallet,
  tokenAddress: Address,
  recipientAddress: Address,
  amount: bigint,
): Promise<Hex> {
  // Encode the ERC-20 transfer call
  const transferData = encodeFunctionData({
    abi: [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
    ],
    functionName: 'transfer',
    args: [recipientAddress, amount],
  });

  // Send the UserOperation
  const txHash = await smartWallet.smartAccountClient.sendTransaction({
    to: tokenAddress,
    data: transferData,
    value: BigInt(0),
  });

  return txHash;
}

/**
 * Send a batch of transactions via the smart account (gasless)
 *
 * Useful for approve + transfer in a single UserOp.
 */
export async function sendBatchTransactions(
  smartWallet: SmartWallet,
  transactions: Array<{
    to: Address;
    data: Hex;
    value?: bigint;
  }>,
): Promise<Hex> {
  // For batch, we need to use the account's executeBatch function
  // permissionless handles this automatically when we pass an array
  const txHash = await smartWallet.smartAccountClient.sendTransactions({
    transactions: transactions.map(tx => ({
      to: tx.to,
      data: tx.data,
      value: tx.value ?? BigInt(0),
    })),
  });

  return txHash;
}

/**
 * Estimate gas for a token transfer UserOperation
 */
export async function estimateTransferGas(
  smartWallet: SmartWallet,
  tokenAddress: Address,
  recipientAddress: Address,
  amount: bigint,
): Promise<{
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
}> {
  const transferData = encodeFunctionData({
    abi: [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
    ],
    functionName: 'transfer',
    args: [recipientAddress, amount],
  });

  // Use the bundler to estimate gas
  const gasEstimate =
    await smartWallet.smartAccountClient.prepareUserOperationRequest({
      userOperation: {
        callData: await smartWallet.smartAccount.encodeCallData({
          to: tokenAddress,
          data: transferData,
          value: BigInt(0),
        }),
      },
    });

  return {
    callGasLimit: gasEstimate.callGasLimit,
    verificationGasLimit: gasEstimate.verificationGasLimit,
    preVerificationGas: gasEstimate.preVerificationGas,
  };
}
