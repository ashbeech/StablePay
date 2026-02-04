/**
 * StablePay Application Entry Point
 *
 * Initializes the app by:
 * 1. Initializing SQLite database
 * 2. Checking if wallet exists (mnemonic in keychain)
 * 3. Checking if onboarding was completed
 * 4. Loading wallet address if available
 * 5. Connecting to WebSocket relay
 * 6. Rendering appropriate screen based on state
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './Navigation';
import { colors, typography, spacing } from './theme';
import { Logo } from '../shared/components';
import { useAppStore } from '../store';
import {
  getMnemonic,
  isOnboardingComplete,
  initDatabase,
} from '../core/storage';
import { deriveEthereumWallet, deriveX25519Keys } from '../core/crypto';
import { wsClient, registerUser } from '../core/websocket';

export function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { setInitialized, setOnboardingComplete, setWalletAddress } =
    useAppStore();

  useEffect(() => {
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize SQLite database
      await initDatabase();

      // Check if onboarding was completed
      const onboardingDone = await isOnboardingComplete();
      setOnboardingComplete(onboardingDone);

      // If onboarding complete, load wallet and connect WebSocket
      if (onboardingDone) {
        const mnemonic = await getMnemonic();
        if (mnemonic) {
          // Derive wallet
          const wallet = await deriveEthereumWallet(mnemonic);
          setWalletAddress(wallet.address);

          // Derive X25519 keys
          const x25519Keys = await deriveX25519Keys(mnemonic);
          const x25519PublicKeyBase64 = x25519Keys.publicKeyBase64;

          // Initialize WebSocket connection
          wsClient.initialize(wallet.privateKeyHex, wallet.address);
          wsClient.connect();

          // Register with relay once connected
          wsClient.onStateChange(state => {
            if (state.isAuthenticated) {
              registerUser(x25519PublicKeyBase64);
            }
          });
        }
      }

      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // On error, show onboarding to create new wallet
      setOnboardingComplete(false);
      setInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Show splash screen while loading
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Logo size="large" showTagline />
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.spinner}
          />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  spinner: {
    marginTop: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
});
