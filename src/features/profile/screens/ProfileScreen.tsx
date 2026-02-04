/**
 * Profile Screen
 *
 * User settings: username, 6-digit ID, network selector, recovery phrase.
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

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

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
      setUsernameError('3-20 chars, start with letter');
      return;
    }
    if (!isConnected) {
      setUsernameError('Not connected to relay');
      return;
    }

    setIsSavingUsername(true);
    try {
      const privateKeyBase64 = await getX25519PrivateKey();
      if (!privateKeyBase64) throw new Error('Key not found');
      updateUsername(trimmed, privateKeyBase64);
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

  const handleCopy = useCallback((value: string, label: string) => {
    Clipboard.setString(value);
    Alert.alert('Copied', `${label} copied to clipboard`);
  }, []);

  const handleNetworkChange = useCallback(
    (network: NetworkId) => {
      setNetwork(network);
      clearProviderCache();
      clearSmartWalletCache();
      setShowNetworkPicker(false);
    },
    [setNetwork],
  );

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
    } catch {
      Alert.alert('Error', 'Failed to retrieve recovery phrase');
    }
  }, [authenticate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Username */}
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
              onPress={() => username && handleCopy(`@${username}`, 'Username')}
            >
              <Text style={styles.value}>
                {username ? `@${username}` : 'Not set'}
              </Text>
              <TouchableOpacity onPress={handleEditUsername}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>

        {/* 6-Digit ID */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your 6-Digit ID</Text>
          <TouchableOpacity
            style={styles.valueRow}
            onPress={() => sixDigitId && handleCopy(sixDigitId, '6-digit ID')}
          >
            <Text style={styles.value}>{sixDigitId || 'Not registered'}</Text>
            <Text style={styles.copyHint}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Address */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wallet Address</Text>
          <TouchableOpacity
            style={styles.valueRow}
            onPress={() =>
              walletAddress && handleCopy(walletAddress, 'Address')
            }
          >
            <Text style={styles.valueSmall}>
              {walletAddress ? shortenAddress(walletAddress, 8) : 'N/A'}
            </Text>
            <Text style={styles.copyHint}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Network */}
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

        <View style={styles.divider} />

        {/* Recovery Phrase */}
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
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Recovery Phrase Modal */}
      <Modal
        visible={showRecoveryPhrase}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRecoveryPhrase(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recovery Phrase</Text>
            <Text style={styles.warningText}>
              Never share this with anyone!
            </Text>
            {recoveryPhrase && (
              <View style={styles.phraseContainer}>
                {recoveryPhrase.map((word, i) => (
                  <View key={i} style={styles.wordItem}>
                    <Text style={styles.wordNumber}>{i + 1}.</Text>
                    <Text style={styles.word}>{word}</Text>
                  </View>
                ))}
              </View>
            )}
            <Button
              title="Close"
              onPress={() => {
                setShowRecoveryPhrase(false);
                setRecoveryPhrase(null);
              }}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  headerSpacer: { width: 70 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  section: { marginBottom: spacing.lg },
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
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  copyHint: { fontSize: typography.fontSize.xs, color: colors.primary },
  changeHint: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  editText: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  statusOnline: { backgroundColor: colors.success },
  statusOffline: { backgroundColor: colors.gray400 },
  statusText: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  modalButton: { marginTop: spacing.md },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  networkOptionSelected: { backgroundColor: colors.primary + '15' },
  networkOptionText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  networkOptionTextSelected: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  checkmark: { fontSize: typography.fontSize.lg, color: colors.primary },
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
  wordItem: { flexDirection: 'row', width: '50%', paddingVertical: spacing.xs },
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
});
