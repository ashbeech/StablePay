/**
 * Transactions Hook
 *
 * Fetches and caches transaction history.
 * Uses local SQLite cache with background sync from blockchain.
 */

import { useEffect, useCallback, useState } from 'react';
import { ethers } from 'ethers';
import { useAppStore } from '../../../store';
import {
  getProvider,
  getNetwork,
  formatTokenAmount,
} from '../../../core/blockchain';
import {
  initDatabase,
  getTransactions as getCachedTransactions,
  saveTransactions,
  getSyncState,
  updateSyncState,
  type TransactionData,
} from '../../../core/storage';
import { ERC20_ABI } from '../../../core/blockchain/contracts';

// How many blocks to look back on first sync
const INITIAL_BLOCK_LOOKBACK = 10000;

export function useTransactions() {
  const { walletAddress, selectedNetwork, transactions, setTransactions } =
    useAppStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  /**
   * Load cached transactions from SQLite
   */
  const loadCachedTransactions = useCallback(async () => {
    try {
      await initDatabase();
      const cached = await getCachedTransactions(selectedNetwork);

      // Convert to store format
      const storeTransactions = cached.map(tx => ({
        id: tx.id,
        type: tx.type,
        counterpartyAddress: tx.counterpartyAddress,
        counterpartyUsername: tx.counterpartyUsername,
        amount: tx.amount,
        timestamp: tx.timestamp,
        status: tx.status,
      }));

      setTransactions(storeTransactions);
    } catch (error) {
      console.error('[useTransactions] Failed to load cache:', error);
    }
  }, [selectedNetwork, setTransactions]);

  /**
   * Sync transactions from blockchain
   */
  const syncTransactions = useCallback(async () => {
    if (!walletAddress || isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      await initDatabase();

      const network = getNetwork(selectedNetwork);
      const provider = getProvider(selectedNetwork);

      // Skip if stablecoin not deployed
      if (
        network.stablecoinAddress ===
        '0x0000000000000000000000000000000000000000'
      ) {
        setIsSyncing(false);
        return;
      }

      // Get sync state
      const syncState = await getSyncState();
      const currentBlock = await provider.getBlockNumber();

      // Determine start block
      let fromBlock: number;
      if (syncState?.lastSyncedBlock) {
        fromBlock = syncState.lastSyncedBlock + 1;
      } else {
        fromBlock = Math.max(0, currentBlock - INITIAL_BLOCK_LOOKBACK);
      }

      // Don't sync if we're already up to date
      if (fromBlock > currentBlock) {
        setIsSyncing(false);
        setLastSyncTime(Date.now());
        return;
      }

      // Create contract interface for parsing logs
      const contract = new ethers.Contract(
        network.stablecoinAddress,
        ERC20_ABI,
        provider,
      );

      // Get Transfer events where user is sender or recipient
      const filterFrom = contract.filters.Transfer(walletAddress, null);
      const filterTo = contract.filters.Transfer(null, walletAddress);

      const [sentEvents, receivedEvents] = await Promise.all([
        contract.queryFilter(filterFrom, fromBlock, currentBlock),
        contract.queryFilter(filterTo, fromBlock, currentBlock),
      ]);

      // Process events into transactions
      const newTransactions: TransactionData[] = [];

      for (const event of sentEvents) {
        const block = await event.getBlock();
        const args = event.args as unknown as [string, string, bigint];

        newTransactions.push({
          id: event.transactionHash,
          type: 'send',
          counterpartyAddress: args[1], // to
          amount: formatTokenAmount(args[2], network.stablecoinDecimals),
          network: selectedNetwork,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000,
          status: 'confirmed',
          createdAt: Date.now(),
        });
      }

      for (const event of receivedEvents) {
        // Skip if this is a self-transfer (already counted in sent)
        const args = event.args as unknown as [string, string, bigint];
        if (args[0].toLowerCase() === walletAddress.toLowerCase()) {
          continue;
        }

        const block = await event.getBlock();

        newTransactions.push({
          id: event.transactionHash,
          type: 'receive',
          counterpartyAddress: args[0], // from
          amount: formatTokenAmount(args[2], network.stablecoinDecimals),
          network: selectedNetwork,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000,
          status: 'confirmed',
          createdAt: Date.now(),
        });
      }

      // Save to cache
      if (newTransactions.length > 0) {
        await saveTransactions(newTransactions);
      }

      // Update sync state
      await updateSyncState(currentBlock, Date.now());

      // Reload from cache to get sorted results
      await loadCachedTransactions();

      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('[useTransactions] Sync error:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      // Don't throw - gracefully degrade to cached data
    } finally {
      setIsSyncing(false);
    }
  }, [walletAddress, selectedNetwork, isSyncing, loadCachedTransactions]);

  // Load cache on mount and when network changes
  useEffect(() => {
    loadCachedTransactions();
  }, [loadCachedTransactions]);

  // Sync from blockchain in background
  useEffect(() => {
    if (walletAddress) {
      syncTransactions();
    }
  }, [walletAddress, selectedNetwork]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    transactions,
    isSyncing,
    lastSyncTime,
    syncError,
    syncTransactions,
    loadCachedTransactions,
  };
}
