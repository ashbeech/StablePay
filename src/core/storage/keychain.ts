/**
 * Secure Storage Module
 *
 * Wrapper around react-native-keychain for storing sensitive data
 * in the device's secure enclave (iOS) or Android Keystore.
 *
 * Stored items:
 * - wallet.mnemonic: BIP-39 recovery phrase
 * - wallet.x25519PrivateKey: Derived encryption key (base64)
 * - app.onboardingComplete: Whether user confirmed saving phrase
 * - app.biometricEnabled: User preference for biometric auth
 */

import * as Keychain from 'react-native-keychain';

// Storage keys
export const KEYCHAIN_KEYS = {
  MNEMONIC: 'wallet.mnemonic',
  X25519_PRIVATE_KEY: 'wallet.x25519PrivateKey',
  ONBOARDING_COMPLETE: 'app.onboardingComplete',
  BIOMETRIC_ENABLED: 'app.biometricEnabled',
} as const;

type KeychainKey = (typeof KEYCHAIN_KEYS)[keyof typeof KEYCHAIN_KEYS];

// Service name for keychain (groups all our items)
const SERVICE_NAME = 'com.stablepay.wallet';

/**
 * Store a value securely in the keychain
 */
export async function setSecureItem(
  key: KeychainKey,
  value: string,
): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(key, value, {
      service: `${SERVICE_NAME}.${key}`,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error) {
    console.error(`[Keychain] Failed to store ${key}:`, error);
    return false;
  }
}

/**
 * Retrieve a value from the keychain
 */
export async function getSecureItem(key: KeychainKey): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}.${key}`,
    });

    if (result && result.password) {
      return result.password;
    }
    return null;
  } catch (error) {
    console.error(`[Keychain] Failed to retrieve ${key}:`, error);
    return null;
  }
}

/**
 * Delete a value from the keychain
 */
export async function deleteSecureItem(key: KeychainKey): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({
      service: `${SERVICE_NAME}.${key}`,
    });
    return true;
  } catch (error) {
    console.error(`[Keychain] Failed to delete ${key}:`, error);
    return false;
  }
}

/**
 * Check if a key exists in the keychain
 */
export async function hasSecureItem(key: KeychainKey): Promise<boolean> {
  const value = await getSecureItem(key);
  return value !== null;
}

// Convenience functions for specific items

/**
 * Store the wallet mnemonic
 */
export async function storeMnemonic(mnemonic: string): Promise<boolean> {
  return setSecureItem(KEYCHAIN_KEYS.MNEMONIC, mnemonic);
}

/**
 * Retrieve the wallet mnemonic
 */
export async function getMnemonic(): Promise<string | null> {
  return getSecureItem(KEYCHAIN_KEYS.MNEMONIC);
}

/**
 * Store the X25519 private key (base64 encoded)
 */
export async function storeX25519PrivateKey(
  privateKeyBase64: string,
): Promise<boolean> {
  return setSecureItem(KEYCHAIN_KEYS.X25519_PRIVATE_KEY, privateKeyBase64);
}

/**
 * Retrieve the X25519 private key
 */
export async function getX25519PrivateKey(): Promise<string | null> {
  return getSecureItem(KEYCHAIN_KEYS.X25519_PRIVATE_KEY);
}

/**
 * Mark onboarding as complete (user confirmed saving phrase)
 */
export async function setOnboardingComplete(
  complete: boolean,
): Promise<boolean> {
  return setSecureItem(
    KEYCHAIN_KEYS.ONBOARDING_COMPLETE,
    complete ? 'true' : 'false',
  );
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete(): Promise<boolean> {
  const value = await getSecureItem(KEYCHAIN_KEYS.ONBOARDING_COMPLETE);
  return value === 'true';
}

/**
 * Set biometric authentication preference
 */
export async function setBiometricEnabled(enabled: boolean): Promise<boolean> {
  return setSecureItem(
    KEYCHAIN_KEYS.BIOMETRIC_ENABLED,
    enabled ? 'true' : 'false',
  );
}

/**
 * Check if biometric authentication is enabled
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await getSecureItem(KEYCHAIN_KEYS.BIOMETRIC_ENABLED);
  return value === 'true';
}

/**
 * Clear all wallet data (for testing/reset)
 */
export async function clearAllSecureData(): Promise<void> {
  await Promise.all([
    deleteSecureItem(KEYCHAIN_KEYS.MNEMONIC),
    deleteSecureItem(KEYCHAIN_KEYS.X25519_PRIVATE_KEY),
    deleteSecureItem(KEYCHAIN_KEYS.ONBOARDING_COMPLETE),
    deleteSecureItem(KEYCHAIN_KEYS.BIOMETRIC_ENABLED),
  ]);
}

/**
 * Check if wallet has been created (mnemonic exists)
 */
export async function hasWallet(): Promise<boolean> {
  return hasSecureItem(KEYCHAIN_KEYS.MNEMONIC);
}
