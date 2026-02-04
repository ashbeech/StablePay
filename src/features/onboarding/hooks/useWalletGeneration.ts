/**
 * Hook for wallet generation during onboarding
 */

import { useState, useCallback } from 'react';
import {
  generateMnemonic,
  deriveAllKeys,
  type DerivedKeys,
} from '../../../core/crypto';
import {
  storeMnemonic,
  storeX25519PrivateKey,
  setOnboardingComplete,
} from '../../../core/storage';
import { useAppStore } from '../../../store';

interface WalletGenerationState {
  isGenerating: boolean;
  mnemonic: string | null;
  keys: DerivedKeys | null;
  error: string | null;
}

export function useWalletGeneration() {
  const [state, setState] = useState<WalletGenerationState>({
    isGenerating: false,
    mnemonic: null,
    keys: null,
    error: null,
  });

  const {
    setWalletAddress,
    setOnboardingComplete: setStoreOnboardingComplete,
  } = useAppStore();

  /**
   * Generate a new wallet (mnemonic + derived keys)
   */
  const generateWallet = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Generate new mnemonic
      const mnemonic = generateMnemonic();

      // Derive all keys from mnemonic
      const keys = await deriveAllKeys(mnemonic);

      // Store mnemonic securely (but don't mark onboarding complete yet)
      const stored = await storeMnemonic(mnemonic);
      if (!stored) {
        throw new Error('Failed to store mnemonic securely');
      }

      // Store X25519 private key for quick access
      await storeX25519PrivateKey(keys.x25519.privateKeyBase64);

      setState({
        isGenerating: false,
        mnemonic,
        keys,
        error: null,
      });

      return { mnemonic, keys };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate wallet';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * Confirm that user has saved their recovery phrase
   * This is the final step of onboarding
   */
  const confirmPhraseSaved = useCallback(async () => {
    if (!state.keys) {
      throw new Error('No wallet generated');
    }

    try {
      // Mark onboarding as complete in secure storage
      await setOnboardingComplete(true);

      // Update app state
      setWalletAddress(state.keys.ethereum.address);
      setStoreOnboardingComplete(true);

      return true;
    } catch (error) {
      console.error('Failed to confirm phrase saved:', error);
      return false;
    }
  }, [state.keys, setWalletAddress, setStoreOnboardingComplete]);

  /**
   * Get mnemonic as array of words (for display)
   */
  const getMnemonicWords = useCallback((): string[] => {
    if (!state.mnemonic) return [];
    return state.mnemonic.split(' ');
  }, [state.mnemonic]);

  return {
    ...state,
    generateWallet,
    confirmPhraseSaved,
    getMnemonicWords,
  };
}
