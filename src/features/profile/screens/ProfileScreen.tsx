/**
 * Profile Screen
 *
 * Shows:
 * - @username (editable)
 * - 6-digit ID (read-only, copy)
 * - Wallet address (read-only, copy)
 * - Network selector
 * - View recovery phrase (requires biometric)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../../app/theme';
import { Button } from '../../../shared/components';
import { useBiometrics } from '../../../shared/hooks';
import { useAppStore, type NetworkId } from '../../../store';
import { updateUsername, isValidUsername } from '../../../core/websocket';
import { getMnemonic, getX25519PrivateKey } from '../../../core/storage';
import {
  shortenAddress,
  NETWORKS,
  clearProviderCache,
} from '../../../core/blockchain';
import { clearSmartWalletCache } from '../../wallet/services/walletService';

export function ProfileScreen() {
  const navigation = useNavigation();
  const { authenticate, getBiometricName } = useBiometrics();

  const {
    walletAddress,
    username,
    sixDigitId,
    selectedNetwork,
    setUsername,
    setNetwork,
    isConnected,
  } = useAppStore();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[] | null>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Username editing
  const handleEditUsername = useCallback(() => {
    setUsernameInput(username || '');
    setUsernameError(null);
    setIsEditingUsername(true);
  }, [username]);

  const handleCancelEditUsername = useCallback(() => {
    setIsEditingUsername(false);
    setUsernameError(null);
  }, []);

  const handleSaveUsername = useCallback(async () => {
    const trimmed = usernameInput.trim().toLowerCase();

    if (!trimmed) {
      setUsernameError('Username cannot be empty');
      return;
    }

    if (!isValidUsername(trimmed)) {
      setUsernameError(
        '3-20 chars, letters/numbers/underscores, must start with letter',
      );
      return;
    }

    if (!isConnected) {
      setUsernameError('Not connected to relay server');
      return;
    }

    setIsSavingUsername(true);

    try {
      // Get X25519 public key
      const privateKeyBase64 = await getX25519PrivateKey();
      if (!privateKeyBase64) {
        throw new Error('Encryption key not found');
      }

      // Update on relay server
      updateUsername(trimmed, privateKeyBase64);

      // Update local state
      setUsername(trimmed);
      setIsEditingUsername(false);
    } catch (error) {
      setUsernameError(
        error instanceof Error ? error.message : 'Failed to save',
      );
    } finally {
      setIsSavingUsername(false);
    }
  }, [usernameInput, isConnected, setUsername]);

  // Copy functions
  const handleCopyUsername = useCallback(() => {
    if (username) {
      Clipboard.setString(`@${username}`);
      Alert.alert('Copied', 'Username copied to clipboard');
    }
  }, [username]);

  const handleCopySixDigitId = useCallback(() => {
    if (sixDigitId) {
      Clipboard.setString(sixDigitId);
      Alert.alert('Copied', '6-digit ID copied to clipboard');
    }
  }, [sixDigitId]);

  const handleCopyAddress = useCallback(() => {
    if (walletAddress) {
      Clipboard.setString(walletAddress);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
    }
  }, [walletAddress]);

  // Network switching
  const handleNetworkChange = useCallback(
    (network: NetworkId) => {
      setNetwork(network);
      clearProviderCache();
      clearSmartWalletCache();
      setShowNetworkPicker(false);
    },
    [setNetwork],
  );

  // Recovery phrase viewing
  const handleViewRecoveryPhrase = useCallback(async () => {
    const authenticated = await authenticate('View your recovery phrase');

    if (!authenticated) {
      Alert.alert(
        'Authentication Required',
        'Please authenticate to view your recovery phrase',
      );
      return;
    }

    try {
      const mnemonic = await getMnemonic();
      if (mnemonic) {
        setRecoveryPhrase(mnemonic.split(' '));
        setShowRecoveryPhrase(true);
      } else {
        Alert.alert('Error', 'Recovery phrase not found');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to retrieve recovery phrase');
    }
  }, [authenticate]);

  const handleCloseRecoveryPhrase = useCallback(() => {
    setShowRecoveryPhrase(false);
    setRecoveryPhrase(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={handleBack}
          variant="outline"
          size="small"
        />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Username Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>@username</Text>
          {isEditingUsername ? (
            <View>
              <View style={styles.inputRow}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={styles.input}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  placeholder="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
              </View>
              {usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
              <View style={styles.editButtons}>
                <Button
                  title="Cancel"
                  onPress={handleCancelEditUsername}
                  variant="outline"
                  size="small"
                />
                <Button
                  title={isSavingUsername ? 'Saving...' : 'Save'}
                  onPress={handleSaveUsername}
                  size="small"
                  loading={isSavingUsername}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.valueRow}
              onPress={handleCopyUsername}
            >
              <Text style={styles.value}>
                {username ? `@${username}` : 'Not set'}
              </Text>
              <TouchableOpacity
                onPress={handleEditUsername}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>

        {/* 6-Digit ID Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your 6-Digit ID</Text>
          <TouchableOpacity
            style={styles.valueRow}
            onPress={handleCopySixDigitId}
          >
            <Text style={styles.value}>{sixDigitId || 'Not registered'}</Text>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wallet Address</Text>
          <TouchableOpacity style={styles.valueRow} onPress={handleCopyAddress}>
            <Text style={styles.valueSmall}>
              {walletAddress
                ? shortenAddress(walletAddress, 8)
                : 'Not available'}
            </Text>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </TouchableOpacity>
        </View>

        {/* Network Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Network</Text>
          <TouchableOpacity
            style={styles.valueRow}
            onPress={() => setShowNetworkPicker(true)}
          >
            <Text style={styles.value}>
              {NETWORKS[selectedNetwork]?.displayName || selectedNetwork}
            </Text>
            <Text style={styles.changeHint}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Recovery Phrase Section */}
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleViewRecoveryPhrase}
        >
          <Text style={styles.dangerButtonText}>View Recovery Phrase</Text>
          <Text style={styles.dangerButtonHint}>
            Requires {getBiometricName()}
          </Text>
        </TouchableOpacity>

        {/* Connection Status */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                isConnected ? styles.statusOnline : styles.statusOffline,
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected to relay' : 'Disconnected'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Network Picker Modal */}
      <Modal
        visible={showNetworkPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNetworkPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Network</Text>

            {Object.entries(NETWORKS).map(([key, network]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.networkOption,
                  selectedNetwork === key && styles.networkOptionSelected,
                ]}
                onPress={() => handleNetworkChange(key as NetworkId)}
              >
                <Text
                  style={[
                    styles.networkOptionText,
                    selectedNetwork === key && styles.networkOptionTextSelected,
                  ]}
                >
                  {network.displayName}
                </Text>
                {selectedNetwork === key && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <Button
              title="Cancel"
              onPress={() => setShowNetworkPicker(false)}
              variant="outline"
              style={styles.modalCancelButton}
            />
          </View>
        </View>
      </Modal>

      {/* Recovery Phrase Modal */}
      <Modal
        visible={showRecoveryPhrase}
        animationType="fade"
        transparent
        onRequestClose={handleCloseRecoveryPhrase}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recovery Phrase</Text>
            <Text style={styles.warningText}>
              Never share this with anyone!
            </Text>

            {recoveryPhrase && (
              <View style={styles.phraseContainer}>
                {recoveryPhrase.map((word, index) => (
                  <View key={index} style={styles.wordItem}>
                    <Text style={styles.wordNumber}>{index + 1}.</Text>
                    <Text style={styles.word}>{word}</Text>
                  </View>
                ))}
              </View>
            )}

            <Button
              title="Close"
              onPress={handleCloseRecoveryPhrase}
              style={styles.modalCloseButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 70,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  value: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  valueSmall: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  copyHint: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  changeHint: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  atSymbol: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  dangerButton: {
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
  },
  dangerButtonHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  statusSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusOnline: {
    backgroundColor: colors.success,
  },
  statusOffline: {
    backgroundColor: colors.gray400,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  networkOptionSelected: {
    backgroundColor: colors.primary + '15',
  },
  networkOptionText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  networkOptionTextSelected: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  checkmark: {
    fontSize: typography.fontSize.lg,
    color: colors.primary,
  },
  modalCancelButton: {
    marginTop: spacing.md,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  phraseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  wordItem: {
    flexDirection: 'row',
    width: '50%',
    paddingVertical: spacing.xs,
  },
  wordNumber: {
    width: 24,
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  word: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    marginTop: spacing.sm,
  },
});
