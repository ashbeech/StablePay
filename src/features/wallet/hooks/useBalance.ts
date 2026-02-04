/**
 * Balance Hook
 *
 * Fetches and manages the user's stablecoin balance.
 * Automatically refreshes on network change or manual trigger.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../../store';
import { getStablecoinBalance } from '../../../core/blockchain';

// Refresh interval: 30 seconds
const REFRESH_INTERVAL = 30000;

export function useBalance() {
  const {
    walletAddress,
    selectedNetwork,
    balance,
    isBalanceLoading,
    setBalance,
    setBalanceLoading,
  } = useAppStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch the current balance
   */
  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance('0.00');
      return;
    }

    setBalanceLoading(true);
    try {
      const newBalance = await getStablecoinBalance(
        selectedNetwork,
        walletAddress,
      );
      setBalance(newBalance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      // Keep existing balance on error
    } finally {
      setBalanceLoading(false);
    }
  }, [walletAddress, selectedNetwork, setBalance, setBalanceLoading]);

  /**
   * Manual refresh trigger
   */
  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  // Fetch balance on mount and when wallet/network changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Set up auto-refresh interval
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval if we have a wallet address
    if (walletAddress) {
      intervalRef.current = setInterval(fetchBalance, REFRESH_INTERVAL);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [walletAddress, fetchBalance]);

  return {
    balance,
    isLoading: isBalanceLoading,
    refreshBalance,
  };
}
