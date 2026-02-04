/**
 * StablePay Application Entry Point
 *
 * Initializes the app by:
 * 1. Checking if wallet exists (mnemonic in keychain)
 * 2. Checking if onboarding was completed
 * 3. Loading wallet address if available
 * 4. Rendering appropriate screen based on state
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './Navigation';
import { colors } from './theme';
import { Logo } from '../shared/components';
import { useAppStore } from '../store';
import {
  getMnemonic,
  isOnboardingComplete,
  getX25519PrivateKey,
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

          // Get or derive X25519 keys
          let x25519PublicKeyBase64 = await getX25519PrivateKey();
          if (!x25519PublicKeyBase64) {
            const x25519Keys = await deriveX25519Keys(mnemonic);
            x25519PublicKeyBase64 = x25519Keys.publicKeyBase64;
          } else {
            // We have the private key, need to derive public
            const x25519Keys = await deriveX25519Keys(mnemonic);
            x25519PublicKeyBase64 = x25519Keys.publicKeyBase64;
          }

          // Initialize WebSocket connection
          wsClient.initialize(wallet.privateKeyHex, wallet.address);
          wsClient.connect();

          // Register with relay once connected
          wsClient.onStateChange(state => {
            if (state.isAuthenticated) {
              registerUser(x25519PublicKeyBase64!);
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
    marginTop: 32,
  },
});
