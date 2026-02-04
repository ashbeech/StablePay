/**
 * Global App State (Zustand)
 *
 * Manages application-wide state including:
 * - Wallet info (address, balance)
 * - Network selection
 * - WebSocket connection status
 * - Pending payment requests
 * - Transaction history
 */

import { create } from 'zustand';

export interface PaymentRequest {
  id: string;
  direction: 'sent' | 'received';
  counterpartyAddress: string;
  counterpartyUsername?: string;
  amount: string;
  memo?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expiresAt: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  counterpartyAddress: string;
  counterpartyUsername?: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export type NetworkId = 'polygon-amoy' | 'avalanche-fuji';

interface AppState {
  // Initialization
  isInitialized: boolean;
  isOnboardingComplete: boolean;
  setInitialized: (initialized: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;

  // Wallet
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  balance: string;
  setBalance: (balance: string) => void;
  isBalanceLoading: boolean;
  setBalanceLoading: (loading: boolean) => void;

  // Profile
  username: string | null;
  setUsername: (username: string | null) => void;
  sixDigitId: string | null;
  setSixDigitId: (id: string | null) => void;

  // Network
  selectedNetwork: NetworkId;
  setNetwork: (network: NetworkId) => void;

  // WebSocket
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Payment Requests
  pendingRequests: PaymentRequest[];
  addRequest: (request: PaymentRequest) => void;
  updateRequest: (id: string, updates: Partial<PaymentRequest>) => void;
  removeRequest: (id: string) => void;
  clearRequests: () => void;

  // Transactions
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;

  // Reset (for logout/testing)
  reset: () => void;
}

const initialState = {
  isInitialized: false,
  isOnboardingComplete: false,
  walletAddress: null,
  balance: '0.00',
  isBalanceLoading: false,
  username: null,
  sixDigitId: null,
  selectedNetwork: 'polygon-amoy' as NetworkId,
  isConnected: false,
  pendingRequests: [] as PaymentRequest[],
  transactions: [] as Transaction[],
};

export const useAppStore = create<AppState>(set => ({
  ...initialState,

  // Initialization
  setInitialized: initialized => set({ isInitialized: initialized }),
  setOnboardingComplete: complete => set({ isOnboardingComplete: complete }),

  // Wallet
  setWalletAddress: address => set({ walletAddress: address }),
  setBalance: balance => set({ balance }),
  setBalanceLoading: loading => set({ isBalanceLoading: loading }),

  // Profile
  setUsername: username => set({ username }),
  setSixDigitId: id => set({ sixDigitId: id }),

  // Network
  setNetwork: network => set({ selectedNetwork: network }),

  // WebSocket
  setConnected: connected => set({ isConnected: connected }),

  // Payment Requests
  addRequest: request =>
    set(state => ({
      pendingRequests: [...state.pendingRequests, request],
    })),

  updateRequest: (id, updates) =>
    set(state => ({
      pendingRequests: state.pendingRequests.map(req =>
        req.id === id ? { ...req, ...updates } : req,
      ),
    })),

  removeRequest: id =>
    set(state => ({
      pendingRequests: state.pendingRequests.filter(req => req.id !== id),
    })),

  clearRequests: () => set({ pendingRequests: [] }),

  // Transactions
  setTransactions: txs => set({ transactions: txs }),

  addTransaction: tx =>
    set(state => ({
      transactions: [tx, ...state.transactions],
    })),

  updateTransaction: (id, updates) =>
    set(state => ({
      transactions: state.transactions.map(tx =>
        tx.id === id ? { ...tx, ...updates } : tx,
      ),
    })),

  // Reset
  reset: () => set(initialState),
}));
