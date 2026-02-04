/**
 * Send Payment Screen
 *
 * Flow:
 * 1. Enter recipient (address, @username, or 6-digit ID)
 * 2. Enter amount
 * 3. Optional memo
 * 4. Confirm with biometrics
 * 5. Submit via ERC-4337 (gasless)
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../../app/theme';
import { Button } from '../../../shared/components';
import { useBiometrics } from '../../../shared/hooks';
import { AmountInput, RecipientInput } from '../components';
import { useSendPayment } from '../hooks/useSendPayment';
import { useAppStore } from '../../../store';
import type { RootStackParamList } from '../../../app/Navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SendScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { authenticate, getBiometricName } = useBiometrics();
  const { selectedNetwork } = useAppStore();

  const {
    recipientInput,
    resolvedAddress,
    resolvedUsername,
    amount,
    memo,
    isLookingUp,
    isSending,
    lookupError,
    sendError,
    balance,
    setRecipient,
    setAmount,
    setMemo,
    validate,
    send,
    reset,
  } = useSendPayment();

  const [memoInput, setMemoInput] = useState('');

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(async () => {
    // Validate payment first
    const validation = validate();
    if (!validation.isValid) {
      Alert.alert(
        'Invalid Payment',
        validation.error || 'Please check your input',
      );
      return;
    }

    // Prompt for biometric authentication
    const authenticated = await authenticate(
      `Confirm payment of $${amount} to ${
        resolvedUsername || resolvedAddress?.slice(0, 10) + '...'
      }`,
    );

    if (!authenticated) {
      Alert.alert('Authentication Failed', 'Payment cancelled');
      return;
    }

    // Send the payment
    const result = await send();

    if (result.success) {
      Alert.alert(
        'Payment Sent!',
        `Transaction submitted successfully.\n\nTx: ${result.txHash?.slice(
          0,
          20,
        )}...`,
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              navigation.goBack();
            },
          },
        ],
      );
    } else {
      Alert.alert('Payment Failed', result.error || 'Something went wrong');
    }
  }, [
    amount,
    resolvedAddress,
    resolvedUsername,
    validate,
    authenticate,
    send,
    reset,
    navigation,
  ]);

  const canSubmit =
    resolvedAddress &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) <= parseFloat(balance) &&
    !isSending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Button
            title="← Back"
            onPress={handleBack}
            variant="outline"
            size="small"
          />
          <Text style={styles.headerTitle}>Send Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipient Input */}
          <View style={styles.section}>
            <Text style={styles.label}>To</Text>
            <RecipientInput
              value={recipientInput}
              onChangeValue={setRecipient}
              resolvedAddress={resolvedAddress}
              resolvedUsername={resolvedUsername}
              isLookingUp={isLookingUp}
              error={lookupError}
            />
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <AmountInput
              value={amount}
              onChangeValue={setAmount}
              currency="dUSDT"
            />
            <Text style={styles.balanceText}>Available: ${balance} dUSDT</Text>
          </View>

          {/* Memo Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Memo (optional)</Text>
            <View style={styles.memoContainer}>
              <Text style={styles.memoInput} numberOfLines={2}>
                {memo || 'Add a note to this payment...'}
              </Text>
            </View>
          </View>

          {/* Error Display */}
          {sendError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{sendError}</Text>
            </View>
          )}

          {/* Network Info */}
          <View style={styles.networkInfo}>
            <Text style={styles.networkLabel}>Network:</Text>
            <Text style={styles.networkValue}>
              {selectedNetwork === 'polygon-amoy'
                ? 'Polygon Amoy (Testnet)'
                : 'Avalanche Fuji (Testnet)'}
            </Text>
          </View>

          {/* Gasless Notice */}
          <View style={styles.gaslessNotice}>
            <Text style={styles.gaslessText}>
              ✓ Gasless transaction - no MATIC/AVAX needed
            </Text>
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.footer}>
          <Button
            title={isSending ? 'Sending...' : `Confirm & Send`}
            onPress={handleConfirm}
            disabled={!canSubmit}
            loading={isSending}
            size="large"
          />
          <Text style={styles.footerHint}>
            Requires {getBiometricName()} to confirm
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
    width: 70, // Match back button width for centering
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
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  balanceText: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  memoContainer: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 60,
  },
  memoInput: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
  },
  errorContainer: {
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  networkLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  networkValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  gaslessNotice: {
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  gaslessText: {
    color: colors.success,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
