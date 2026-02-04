/**
 * StablePay Application Entry Point
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
  getX25519PrivateKey,
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
  }, []); // eslint-disable-line

  const initializeApp = async () => {
    try {
      await initDatabase();

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

          // Initialize WebSocket connection
          wsClient.initialize(wallet.privateKeyHex, wallet.address);
          wsClient.connect();

          // Register with relay once connected
          wsClient.onStateChange(state => {
            if (state.isAuthenticated) {
              registerUser(x25519Keys.publicKeyBase64);
            }
          });
        }
      }

      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setOnboardingComplete(false);
      setInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

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
  spinner: { marginTop: spacing.xl },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
});
