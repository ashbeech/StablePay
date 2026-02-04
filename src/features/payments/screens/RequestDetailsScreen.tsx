/**
 * Request Details Screen
 *
 * Shows details of a pending payment request with:
 * - Request info (amount, from, memo, expiry)
 * - Pay button (with biometric confirmation)
 * - Decline button (cancels the request)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../../app/theme';
import { Button } from '../../../shared/components';
import { useBiometrics } from '../../../shared/hooks';
import {
  cancelRequest,
  formatTimeRemaining,
  getTimeRemaining,
} from '../services/paymentRequestService';
import { sendPayment } from '../../wallet/services/walletService';
import { useAppStore, type PaymentRequest } from '../../../store';
import { shortenAddress } from '../../../core/blockchain';
import type { RootStackParamList } from '../../../app/Navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'RequestDetails'>;

export function RequestDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { requestId } = route.params;

  const { authenticate, getBiometricName } = useBiometrics();
  const { pendingRequests, selectedNetwork, updateRequest } = useAppStore();

  const [isPaying, setIsPaying] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  const request = pendingRequests.find(r => r.id === requestId);

  // Update countdown timer
  useEffect(() => {
    if (!request || request.status !== 'pending') return;

    const updateTime = () => {
      setTimeRemaining(formatTimeRemaining(request));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [request]);

  // Check if expired
  useEffect(() => {
    if (request && request.status === 'pending') {
      const { expired } = getTimeRemaining(request);
      if (expired) {
        updateRequest(request.id, { status: 'expired' });
      }
    }
  }, [request, updateRequest, timeRemaining]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePay = useCallback(async () => {
    if (!request) return;

    const authenticated = await authenticate(
      `Pay $${request.amount} to ${
        request.counterpartyUsername ||
        shortenAddress(request.counterpartyAddress)
      }`,
    );

    if (!authenticated) {
      Alert.alert('Authentication Failed', 'Payment cancelled');
      return;
    }

    setIsPaying(true);

    try {
      const txHash = await sendPayment(
        request.counterpartyAddress,
        request.amount,
        selectedNetwork,
      );

      updateRequest(request.id, { status: 'paid' });

      Alert.alert(
        'Payment Sent!',
        `Successfully paid $${request.amount}.\n\nTx: ${txHash.slice(0, 20)}...`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Something went wrong',
      );
    } finally {
      setIsPaying(false);
    }
  }, [request, authenticate, selectedNetwork, updateRequest, navigation]);

  const handleDecline = useCallback(() => {
    if (!request) return;

    Alert.alert(
      'Decline Request?',
      'The requester will be notified that you declined.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            setIsDeclining(true);
            cancelRequest(request.id);
            setIsDeclining(false);
            navigation.goBack();
          },
        },
      ],
    );
  }, [request, navigation]);

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Button title="← Back" onPress={handleBack} variant="outline" size="small" />
          <Text style={styles.headerTitle}>Request</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Request not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isExpired = request.status === 'expired';
  const isPaid = request.status === 'paid';
  const isCancelled = request.status === 'cancelled';
  const isActive = request.status === 'pending';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Button title="← Back" onPress={handleBack} variant="outline" size="small" />
        <Text style={styles.headerTitle}>Payment Request</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View
            style={[
              styles.statusBadge,
              isActive && styles.statusPending,
              isPaid && styles.statusPaid,
              isCancelled && styles.statusCancelled,
              isExpired && styles.statusExpired,
            ]}
          >
            <Text style={styles.statusText}>
              {isActive
                ? 'Pending'
                : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Text>
          </View>

          <Text style={styles.fromLabel}>
            {request.direction === 'received' ? 'From' : 'To'}
          </Text>
          <Text style={styles.fromValue}>
            {request.counterpartyUsername
              ? `@${request.counterpartyUsername}`
              : shortenAddress(request.counterpartyAddress)}
          </Text>

          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>${request.amount}</Text>
          <Text style={styles.currency}>dUSDT</Text>

          {request.memo && (
            <>
              <Text style={styles.memoLabel}>Note</Text>
              <Text style={styles.memoValue}>"{request.memo}"</Text>
            </>
          )}

          {isActive && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Expires in</Text>
              <Text style={styles.timerValue}>{timeRemaining}</Text>
            </View>
          )}
        </View>

        {isActive && request.direction === 'received' && (
          <View style={styles.actions}>
            <Button
              title="Decline"
              onPress={handleDecline}
              variant="outline"
              size="large"
              loading={isDeclining}
              style={styles.declineButton}
            />
            <Button
              title={isPaying ? 'Paying...' : 'Pay'}
              onPress={handlePay}
              size="large"
              loading={isPaying}
              style={styles.payButton}
            />
          </View>
        )}

        {isActive && request.direction === 'sent' && (
          <Button
            title="Cancel Request"
            onPress={handleDecline}
            variant="outline"
            size="large"
            loading={isDeclining}
          />
        )}

        {isActive && request.direction === 'received' && (
          <Text style={styles.biometricHint}>
            Requires {getBiometricName()} to pay
          </Text>
        )}
      </View>
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
  content: { flex: 1, padding: spacing.lg },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: typography.fontSize.md, color: colors.textSecondary },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  statusPending: { backgroundColor: colors.warning + '20' },
  statusPaid: { backgroundColor: colors.success + '20' },
  statusCancelled: { backgroundColor: colors.error + '20' },
  statusExpired: { backgroundColor: colors.gray200 },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  fromLabel: { fontSize: typography.fontSize.sm, color: colors.textTertiary },
  fromValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  amountLabel: { fontSize: typography.fontSize.sm, color: colors.textTertiary },
  amountValue: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  currency: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  memoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  memoValue: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  timerContainer: { marginTop: spacing.lg, alignItems: 'center' },
  timerLabel: { fontSize: typography.fontSize.xs, color: colors.textTertiary },
  timerValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  declineButton: { flex: 1 },
  payButton: { flex: 1 },
  biometricHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
