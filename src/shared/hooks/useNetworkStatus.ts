/**
 * Network Status Hook
 *
 * Monitors device network connectivity.
 * Used for graceful offline mode handling.
 */

import { useState, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// Note: In a real app, you'd use @react-native-community/netinfo
// For now, we'll use a simple implementation that assumes online
// and relies on actual network request failures

export interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: number | null;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true, // Assume online initially
    isChecking: false,
    lastChecked: null,
  });

  // Check network on app foreground
  useEffect(() => {
    const checkNetwork = async () => {
      setStatus(prev => ({ ...prev, isChecking: true }));

      try {
        // Simple connectivity check - try to fetch a known endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('https://api.polygon.technology/health', {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        setStatus({
          isOnline: response.ok,
          isChecking: false,
          lastChecked: Date.now(),
        });
      } catch {
        // Network error - could be offline or the endpoint is down
        // We'll be conservative and mark as offline
        setStatus({
          isOnline: false,
          isChecking: false,
          lastChecked: Date.now(),
        });
      }
    };

    // Check on mount
    checkNetwork();

    // Check when app comes to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkNetwork();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Manually trigger a network check
   */
  const checkNetwork = async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://api.polygon.technology/health', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setStatus({
        isOnline: response.ok,
        isChecking: false,
        lastChecked: Date.now(),
      });

      return response.ok;
    } catch {
      setStatus({
        isOnline: false,
        isChecking: false,
        lastChecked: Date.now(),
      });
      return false;
    }
  };

  /**
   * Mark as online (call after successful network request)
   */
  const markOnline = () => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastChecked: Date.now(),
    }));
  };

  /**
   * Mark as offline (call after failed network request)
   */
  const markOffline = () => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastChecked: Date.now(),
    }));
  };

  return {
    ...status,
    checkNetwork,
    markOnline,
    markOffline,
  };
}
