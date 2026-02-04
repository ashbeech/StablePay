/**
 * WebSocket Hook
 *
 * Manages WebSocket connection lifecycle and state.
 * Automatically connects when wallet is available.
 */

import { useEffect, useState, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  wsClient,
  initializeMessageHandler,
  type WebSocketState,
} from '../../core/websocket';
import { loadWalletKeys } from '../../features/wallet/services/walletService';
import { useAppStore } from '../../store';

export function useWebSocket() {
  const { isOnboardingComplete, setConnected } = useAppStore();
  const [wsState, setWsState] = useState<WebSocketState>(wsClient.getState());
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize message handler on mount
  useEffect(() => {
    const cleanup = initializeMessageHandler();
    return cleanup;
  }, []);

  // Subscribe to WebSocket state changes
  useEffect(() => {
    const unsubscribe = wsClient.onStateChange(state => {
      setWsState(state);
      setConnected(state.isAuthenticated);
    });

    return unsubscribe;
  }, [setConnected]);

  // Initialize and connect when onboarding is complete
  useEffect(() => {
    if (!isOnboardingComplete) return;

    const initializeWebSocket = async () => {
      setIsInitializing(true);
      try {
        const keys = await loadWalletKeys();
        if (keys) {
          wsClient.initialize(keys.privateKeyHex, keys.address);
          wsClient.connect();
        }
      } catch (error) {
        console.error('[useWebSocket] Failed to initialize:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeWebSocket();
  }, [isOnboardingComplete]);

  // Handle app state changes (reconnect when coming to foreground)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && isOnboardingComplete) {
        if (!wsClient.isReady()) {
          wsClient.connect();
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [isOnboardingComplete]);

  const connect = useCallback(() => {
    wsClient.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  return {
    ...wsState,
    isInitializing,
    connect,
    disconnect,
  };
}
