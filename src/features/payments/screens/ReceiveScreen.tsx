/**
 * Receive Screen (Request Payment)
 *
 * Allows users to:
 * 1. Request payment from another user
 * 2. View their @username and 6-digit ID for sharing
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../../app/theme';
import { Button } from '../../../shared/components';
import { AmountInput, RecipientInput } from '../components';
import { createPaymentRequest } from '../services/paymentRequestService';
import { useAppStore } from '../../../store';

export function ReceiveScreen() {
  const navigation = useNavigation();
  const { walletAddress, username, sixDigitId } = useAppStore();

  const [recipientInput, setRecipientInput] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSendRequest = useCallback(async () => {
    if (!recipientInput || !amount || !walletAddress) {
      setError('Please fill in recipient and amount');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await createPaymentRequest({
        recipientQuery: recipientInput,
        amount,
        memo: memo || undefined,
        senderAddress: walletAddress,
        senderUsername: username || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Request Sent',
          `Payment request for $${amount} sent successfully.\n\nExpires in 1 hour.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      } else {
        setError(result.error || 'Failed to send request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setIsSending(false);
    }
  }, [recipientInput, amount, memo, walletAddress, username, navigation]);

  const handleCopyUsername = useCallback(() => {
    if (username) {
      Clipboard.setString(`@${username}`);
      Alert.alert('Copied', '@username copied to clipboard');
    }
  }, [username]);

  const handleCopySixDigitId = useCallback(() => {
    if (sixDigitId) {
      Clipboard.setString(sixDigitId);
      Alert.alert('Copied', '6-digit ID copied to clipboard');
    }
  }, [sixDigitId]);

  const canSubmit = recipientInput && parseFloat(amount) > 0 && !isSending;

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
          <Text style={styles.headerTitle}>Request Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Request Form */}
          <View style={styles.section}>
            <Text style={styles.label}>From</Text>
            <RecipientInput
              value={recipientInput}
              onChangeValue={setRecipientInput}
              placeholder="@username, 6-digit ID, or 0x address"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <AmountInput
              value={amount}
              onChangeValue={setAmount}
              currency="dUSDT"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Note (optional)</Text>
            <View style={styles.noteContainer}>
              <Text
                style={[styles.noteText, !memo && styles.notePlaceholder]}
                numberOfLines={2}
              >
                {memo || "What's this for?"}
              </Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title={isSending ? 'Sending...' : 'Send Request'}
            onPress={handleSendRequest}
            disabled={!canSubmit}
            loading={isSending}
            size="large"
            style={styles.sendButton}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Your Info Section */}
          <Text style={styles.sectionTitle}>Share Your Info</Text>
          <Text style={styles.sectionSubtitle}>
            Others can send you payments using:
          </Text>

          {/* Username */}
          <TouchableOpacity
            style={styles.infoCard}
            onPress={handleCopyUsername}
            activeOpacity={0.7}
          >
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Your @username</Text>
              <Text style={styles.infoValue}>
                {username ? `@${username}` : 'Not set'}
              </Text>
            </View>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </TouchableOpacity>

          {/* 6-Digit ID */}
          <TouchableOpacity
            style={styles.infoCard}
            onPress={handleCopySixDigitId}
            activeOpacity={0.7}
          >
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Your 6-Digit ID</Text>
              <Text style={styles.infoValue}>
                {sixDigitId || 'Not registered'}
              </Text>
            </View>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </TouchableOpacity>

          {/* Note about registration */}
          {!sixDigitId && (
            <Text style={styles.registrationNote}>
              Connect to the relay server to get your 6-digit ID
            </Text>
          )}
        </ScrollView>
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
    width: 70,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  noteContainer: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 60,
  },
  noteText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  notePlaceholder: {
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
  sendButton: {
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  copyHint: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  registrationNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
