# StablePay

E2EE peer-to-peer stablecoin payments for iOS and Android.

## Overview

StablePay is a self-custody mobile wallet for sending and receiving stablecoin payments. All private keys are generated and stored on-device, and all communication between users is end-to-end encrypted.

### Key Features

- **Self-custody**: 12-word recovery phrase, keys never leave device
- **E2EE messaging**: Payment requests encrypted with X25519 + AES-256-GCM
- **Gasless transactions**: ERC-4337 account abstraction (users don't need ETH/MATIC)
- **Multi-network**: Polygon Amoy and Avalanche Fuji testnets
- **Simple UX**: Pay and receive with @username or 6-digit ID

## Tech Stack

- **Mobile**: React Native (bare CLI), TypeScript
- **Blockchain**: ethers.js, ERC-4337 (Pimlico)
- **Crypto**: @noble/curves, @noble/ciphers, @scure/bip39
- **Storage**: react-native-keychain (Secure Enclave), op-sqlite
- **Relay**: WebSocket server on Koyeb

## Getting Started

### Prerequisites

- Node.js 20+
- Xcode 15+ (iOS)
- Android Studio (Android)
- CocoaPods 1.14+

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd StablePay

# Install dependencies
npm install

# Install iOS pods
cd ios && pod install && cd ..
```

### Running the App

```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

## Project Structure

```
src/
├── app/                    # Navigation & app entry
├── features/
│   ├── onboarding/         # Wallet creation, recovery phrase
│   ├── wallet/             # Home screen, balance
│   ├── payments/           # Send, receive, requests
│   ├── profile/            # Settings, network switching
│   └── history/            # Transaction history
├── core/
│   ├── crypto/             # Key derivation, E2EE
│   ├── blockchain/         # ethers.js, ERC-4337
│   ├── storage/            # Keychain, SQLite
│   └── websocket/          # Relay client
├── shared/                 # Reusable components, hooks
└── types/
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    USER DEVICE                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  Keychain   │  │   SQLite    │  │  React Native│  │
│  │ (encrypted) │  │  (local db) │  │     App      │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
   ┌─────────────┐                ┌──────────────┐
   │  WebSocket  │                │     EVM      │
   │   Relay     │                │  Blockchain  │
   │  (Koyeb)    │                │ (Polygon/AVAX)│
   └─────────────┘                └──────────────┘
```

## Configuration

### Network Settings

Update `src/core/blockchain/networks.ts` with your deployed contract addresses:

```typescript
export const NETWORKS = {
  'polygon-amoy': {
    chainId: 80002,
    stablecoinAddress: '0x...', // Your deployed dUSDT
    bundlerUrl: 'https://api.pimlico.io/v2/80002/rpc?apikey=YOUR_KEY',
    paymasterUrl: 'https://api.pimlico.io/v2/80002/rpc?apikey=YOUR_KEY',
  },
  'avalanche-fuji': {
    chainId: 43113,
    stablecoinAddress: '0x...',
    bundlerUrl: 'https://api.pimlico.io/v2/43113/rpc?apikey=YOUR_KEY',
    paymasterUrl: 'https://api.pimlico.io/v2/43113/rpc?apikey=YOUR_KEY',
  },
};
```

### Required API Keys

| Service | Purpose                          | Get it at          |
| ------- | -------------------------------- | ------------------ |
| Pimlico | Bundler + Paymaster (gasless tx) | https://pimlico.io |

## Smart Contract

Deploy `DemoStablecoin.sol` to both testnets:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DemoStablecoin is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18;
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    mapping(address => uint256) public lastFaucetClaim;

    constructor() ERC20("Demo USDT", "dUSDT") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    function faucet() external {
        require(block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN);
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
```

## WebSocket Relay Server

The relay handles user discovery and encrypted message routing. Deploy to Koyeb.

**Endpoints:**

- `auth` — Authenticate with signed message
- `register` — Register @username + public keys
- `lookup` — Find user by @username or 6-digit ID
- `payment_request` — Send E2EE payment request
- `cancel_request` — Cancel pending request

See full spec for API details.

## Security

| Layer           | Protection                          |
| --------------- | ----------------------------------- |
| Private keys    | Secure Enclave / Android Keystore   |
| Transactions    | Biometric/PIN required to sign      |
| Messages        | X25519 + AES-256-GCM encryption     |
| Transport       | WebSocket over TLS                  |
| Recovery phrase | Shown once, biometric to view again |

## User Flows

### Onboarding

1. App generates 12-word recovery phrase
2. User **must** confirm they saved it (no skip option)
3. Keys derived and stored in Keychain
4. User enters main interface

### Send Payment

1. Enter @username or 6-digit ID
2. Enter amount + optional memo
3. Confirm with biometric/PIN
4. Transaction submitted via ERC-4337 (gasless)

### Request Payment

1. Enter who to request from
2. Enter amount + note
3. E2EE request sent via WebSocket
4. Recipient sees popup, can pay or decline
5. Requests expire after 1 hour

## Dependencies

```json
{
  "ethers": "^6.x",
  "@scure/bip39": "latest",
  "@scure/bip32": "latest",
  "@noble/curves": "latest",
  "@noble/ciphers": "latest",
  "@noble/hashes": "latest",
  "react-native-keychain": "latest",
  "react-native-biometrics": "latest",
  "@op-engineering/op-sqlite": "latest",
  "@react-navigation/native": "latest",
  "@react-navigation/native-stack": "latest",
  "zustand": "latest",
  "permissionless": "latest",
  "viem": "latest"
}
```

## Development Notes

### Opening in Xcode

Always use the workspace file:

```
ios/StablePay.xcworkspace  ✓
ios/StablePay.xcodeproj    ✗
```

### Transaction History

- Cached locally in SQLite
- Syncs from chain when app opens (if online)
- Falls back to cache silently if offline (no error shown)

### Payment Requests

- Stored on both sender and recipient devices
- Expire after 1 hour
- Either party can cancel
- Status synced via WebSocket

## License

Proprietary — Demo purposes only.
