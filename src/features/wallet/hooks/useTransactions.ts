/**
 * Transactions Hook
 *
 * Fetches and caches transaction history from blockchain.
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

const INITIAL_BLOCK_LOOKBACK = 10000;

export function useTransactions() {
  const { walletAddress, selectedNetwork, transactions, setTransactions } =
    useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const loadCachedTransactions = useCallback(async () => {
    try {
      await initDatabase();
      const cached = await getCachedTransactions(selectedNetwork);
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

  const syncTransactions = useCallback(async () => {
    if (!walletAddress || isSyncing) return;

    setIsSyncing(true);
    try {
      await initDatabase();
      const network = getNetwork(selectedNetwork);
      const provider = getProvider(selectedNetwork);

      if (
        network.stablecoinAddress ===
        '0x0000000000000000000000000000000000000000'
      ) {
        setIsSyncing(false);
        return;
      }

      const syncState = await getSyncState();
      const currentBlock = await provider.getBlockNumber();

      let fromBlock: number;
      if (syncState?.lastSyncedBlock) {
        fromBlock = syncState.lastSyncedBlock + 1;
      } else {
        fromBlock = Math.max(0, currentBlock - INITIAL_BLOCK_LOOKBACK);
      }

      if (fromBlock > currentBlock) {
        setIsSyncing(false);
        setLastSyncTime(Date.now());
        return;
      }

      const contract = new ethers.Contract(
        network.stablecoinAddress,
        ERC20_ABI,
        provider,
      );
      const filterFrom = contract.filters.Transfer(walletAddress, null);
      const filterTo = contract.filters.Transfer(null, walletAddress);

      const [sentEvents, receivedEvents] = await Promise.all([
        contract.queryFilter(filterFrom, fromBlock, currentBlock),
        contract.queryFilter(filterTo, fromBlock, currentBlock),
      ]);

      const newTransactions: TransactionData[] = [];

      for (const event of sentEvents) {
        const block = await event.getBlock();
        const args = event.args as unknown as [string, string, bigint];
        newTransactions.push({
          id: event.transactionHash,
          type: 'send',
          counterpartyAddress: args[1],
          amount: formatTokenAmount(args[2], network.stablecoinDecimals),
          network: selectedNetwork,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000,
          status: 'confirmed',
          createdAt: Date.now(),
        });
      }

      for (const event of receivedEvents) {
        const args = event.args as unknown as [string, string, bigint];
        if (args[0].toLowerCase() === walletAddress.toLowerCase()) continue;
        const block = await event.getBlock();
        newTransactions.push({
          id: event.transactionHash,
          type: 'receive',
          counterpartyAddress: args[0],
          amount: formatTokenAmount(args[2], network.stablecoinDecimals),
          network: selectedNetwork,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000,
          status: 'confirmed',
          createdAt: Date.now(),
        });
      }

      if (newTransactions.length > 0) {
        await saveTransactions(newTransactions);
      }

      await updateSyncState(currentBlock, Date.now());
      await loadCachedTransactions();
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('[useTransactions] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [walletAddress, selectedNetwork, isSyncing, loadCachedTransactions]);

  useEffect(() => {
    loadCachedTransactions();
  }, [loadCachedTransactions]);

  useEffect(() => {
    if (walletAddress) syncTransactions();
  }, [walletAddress, selectedNetwork]); // eslint-disable-line

  return {
    transactions,
    isSyncing,
    lastSyncTime,
    syncTransactions,
    loadCachedTransactions,
  };
}
