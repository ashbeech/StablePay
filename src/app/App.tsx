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
import { getMnemonic, isOnboardingComplete } from '../core/storage';
import { deriveEthereumWallet } from '../core/crypto';

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

      // If onboarding complete, load wallet address
      if (onboardingDone) {
        const mnemonic = await getMnemonic();
        if (mnemonic) {
          const wallet = await deriveEthereumWallet(mnemonic);
          setWalletAddress(wallet.address);
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
