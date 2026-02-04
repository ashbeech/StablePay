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
- **Contracts**: Solidity 0.8.20, OpenZeppelin

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
│   ├── App.tsx             # Main entry, initializes DB & WebSocket
│   ├── Navigation.tsx      # React Navigation stack
│   └── theme.ts            # Colors, spacing, typography
├── contracts/              # Solidity smart contracts
│   └── DemoStablecoin.sol  # ERC-20 faucet token
├── core/
│   ├── crypto/             # Key derivation, E2EE
│   │   ├── keyDerivation.ts  # BIP-39/BIP-32, X25519
│   │   └── e2ee.ts           # X25519 + AES-256-GCM
│   ├── blockchain/         # ethers.js, ERC-4337
│   │   ├── networks.ts       # Chain configs
│   │   ├── provider.ts       # RPC providers
│   │   ├── erc4337.ts        # Smart accounts, Pimlico
│   │   └── contracts.ts      # ABIs
│   ├── storage/            # Keychain, SQLite
│   │   ├── keychain.ts       # Secure Enclave wrapper
│   │   └── database.ts       # SQLite for tx/requests
│   └── websocket/          # Relay client
│       ├── client.ts         # WebSocket with auto-reconnect
│       ├── messageHandler.ts # E2EE decryption, routing
│       ├── userService.ts    # Register, lookup
│       └── types.ts          # Message protocol
├── features/
│   ├── onboarding/         # Wallet creation, recovery phrase
│   ├── wallet/             # Home screen, balance, tx list
│   ├── payments/           # Send, receive, request details
│   │   └── services/
│   │       └── paymentRequestService.ts  # E2EE requests
│   └── profile/            # Settings, network switch, view phrase
├── shared/                 # Reusable components, hooks
│   ├── components/         # Button, Logo
│   └── hooks/              # useBiometrics, useWebSocket
├── store/                  # Zustand state management
│   └── useAppStore.ts
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

### WebSocket Relay URL

Update `src/core/websocket/types.ts`:

```typescript
export const RELAY_SERVER_URL = 'wss://your-relay-server.koyeb.app';
```

### Required API Keys

| Service | Purpose                          | Get it at          |
| ------- | -------------------------------- | ------------------ |
| Pimlico | Bundler + Paymaster (gasless tx) | https://pimlico.io |

## Smart Contract

The demo stablecoin (`src/contracts/DemoStablecoin.sol`) is an ERC-20 with:

- **Faucet**: Anyone can claim 100 dUSDT every 24 hours
- **Owner mint**: Deployer can mint additional tokens for testing
- **18 decimals**: Standard stablecoin precision

### Contract Development

OpenZeppelin contracts are included as a dev dependency:

```bash
npm install  # Already includes @openzeppelin/contracts
```

If your Solidity IDE shows import errors, create `remappings.txt` in the project root:

```
@openzeppelin/=node_modules/@openzeppelin/
```

### Deploying the Contract

Deploy to both testnets using Foundry, Hardhat, or Remix:

```solidity
// Constructor mints 1M tokens to deployer
constructor() ERC20('Demo USDT', 'dUSDT') Ownable(msg.sender) {
    _mint(msg.sender, 1_000_000 * 10 ** 18);
}
```

After deployment, update the `stablecoinAddress` in `networks.ts`.

### Contract Functions

| Function                      | Description                           |
| ----------------------------- | ------------------------------------- |
| `faucet()`                    | Claim 100 dUSDT (24h cooldown)        |
| `timeUntilNextClaim(address)` | Seconds until address can claim again |
| `mint(address, uint256)`      | Owner-only: mint tokens to address    |
| `decimals()`                  | Returns 18                            |

## WebSocket Relay Server

The relay handles user discovery and encrypted message routing. Deploy to Koyeb.

**Message Types (Client → Server):**

| Type              | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `auth`            | Authenticate with signed message               |
| `register`        | Register @username + X25519 public key         |
| `lookup`          | Find user by @username, 6-digit ID, or address |
| `payment_request` | Send E2EE payment request                      |
| `cancel_request`  | Cancel pending request                         |
| `ping`            | Keep-alive                                     |

**Message Types (Server → Client):**

| Type                                  | Purpose                                 |
| ------------------------------------- | --------------------------------------- |
| `auth_success` / `auth_error`         | Auth result with 6-digit ID             |
| `register_success` / `register_error` | Registration result                     |
| `lookup_result` / `lookup_error`      | User lookup result                      |
| `payment_request`                     | Incoming E2EE request from another user |
| `request_cancelled` / `request_paid`  | Status updates                          |
| `pong`                                | Keep-alive response                     |

## Security

| Layer           | Protection                                         |
| --------------- | -------------------------------------------------- |
| Private keys    | Secure Enclave / Android Keystore                  |
| Onboarding      | Stored in Keychain (persists across app reinstall) |
| Transactions    | Biometric/PIN required to sign                     |
| Messages        | X25519 + AES-256-GCM encryption                    |
| Transport       | WebSocket over TLS                                 |
| Recovery phrase | Shown once, biometric to view again                |

## User Flows

### Onboarding

1. App generates 12-word recovery phrase
2. User **must** confirm they saved it (no skip option)
3. Keys derived and stored in Keychain
4. User enters main interface

### Send Payment

1. Enter @username, 6-digit ID, or 0x address
2. Enter amount + optional memo
3. Confirm with biometric/PIN
4. Transaction submitted via ERC-4337 (gasless)

### Request Payment

1. Enter who to request from
2. Enter amount + note
3. E2EE request sent via WebSocket
4. Recipient sees popup, can pay or decline
5. Requests expire after 1 hour

### Profile / Settings

1. Edit @username (synced to relay)
2. View/copy 6-digit ID and wallet address
3. Switch network (Polygon Amoy ↔ Avalanche Fuji)
4. View recovery phrase (requires biometric)

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

**Dev Dependencies:**

```json
{
  "@openzeppelin/contracts": "^5.x"
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

- Cached locally in SQLite (`src/core/storage/database.ts`)
- Syncs from chain on app open and pull-to-refresh
- Falls back to cache silently if offline

### Payment Requests

- Stored in Zustand (memory) and optionally SQLite
- Expire after 1 hour (checked every minute)
- Either party can cancel
- Status synced via WebSocket

### State Management

- **Zustand** (`src/store/useAppStore.ts`): Wallet address, balance, network, WebSocket status, pending requests, transactions
- **Keychain**: Mnemonic, X25519 private key, onboarding state
- **SQLite**: Transaction cache, sync state

## Deployment Checklist

Before releasing:

- [ ] Deploy `DemoStablecoin.sol` to Polygon Amoy
- [ ] Deploy `DemoStablecoin.sol` to Avalanche Fuji
- [ ] Update `stablecoinAddress` in `networks.ts`
- [ ] Get Pimlico API key and update bundler/paymaster URLs
- [ ] Deploy WebSocket relay to Koyeb
- [ ] Update `RELAY_SERVER_URL` in `types.ts`
- [ ] Fund Pimlico paymaster with testnet tokens

## License

Proprietary — Demo purposes only.
