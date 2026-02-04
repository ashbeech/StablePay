/**
 * Home Screen
 *
 * Main wallet interface showing:
 * - Header with profile button and logo
 * - Balance display (fetched from blockchain)
 * - Pay/Receive action buttons
 * - Recent activity list
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, header as headerConfig } from '../../../app/theme';
import { Logo } from '../../../shared/components';
import { useWebSocket } from '../../../shared/hooks';
import { BalanceDisplay } from '../components/BalanceDisplay';
import { ActionButtons } from '../components/ActionButtons';
import { TransactionList } from '../components/TransactionList';
import { useBalance } from '../hooks/useBalance';
import { onIncomingRequest } from '../../../core/websocket';
import { expireOldRequests } from '../../payments/services/paymentRequestService';
import { useAppStore, type PaymentRequest } from '../../../store';
import type { RootStackParamList } from '../../../app/Navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { transactions, pendingRequests } = useAppStore();
  const { balance, isLoading, refreshBalance } = useBalance();
  const { isAuthenticated, connectionState } = useWebSocket();

  // Handle incoming payment requests
  useEffect(() => {
    const unsubscribe = onIncomingRequest((request: PaymentRequest) => {
      // Show alert for incoming request
      Alert.alert(
        'Payment Request',
        `${
          request.counterpartyUsername
            ? `@${request.counterpartyUsername}`
            : 'Someone'
        } is requesting $${request.amount}${
          request.memo ? `\n\n"${request.memo}"` : ''
        }`,
        [
          {
            text: 'View',
            onPress: () =>
              navigation.navigate('RequestDetails', { requestId: request.id }),
          },
          { text: 'Later', style: 'cancel' },
        ],
      );
    });

    return unsubscribe;
  }, [navigation]);

  // Expire old requests periodically
  useEffect(() => {
    expireOldRequests();
    const interval = setInterval(expireOldRequests, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handlePay = useCallback(() => {
    navigation.navigate('Send');
  }, [navigation]);

  const handleReceive = useCallback(() => {
    navigation.navigate('Receive');
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'Profile screen will be implemented in Phase 4.',
    );
  }, []);

  const handleRequestPress = useCallback(
    (request: PaymentRequest) => {
      navigation.navigate('RequestDetails', { requestId: request.id });
    },
    [navigation],
  );

  const handleRefresh = useCallback(async () => {
    await refreshBalance();
  }, [refreshBalance]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Logo size="small" />
          {/* Connection status indicator */}
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.statusDot,
                isAuthenticated ? styles.statusOnline : styles.statusOffline,
              ]}
            />
            <Text style={styles.statusText}>
              {isAuthenticated ? 'Online' : connectionState}
            </Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Balance */}
        <BalanceDisplay
          balance={balance}
          currency="dUSDT"
          isLoading={isLoading}
        />

        {/* Action Buttons */}
        <ActionButtons onPay={handlePay} onReceive={handleReceive} />

        {/* Transactions */}
        <TransactionList
          transactions={transactions}
          pendingRequests={pendingRequests}
          onRequestPress={handleRequestPress}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: headerConfig.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusOnline: {
    backgroundColor: colors.success,
  },
  statusOffline: {
    backgroundColor: colors.gray400,
  },
  statusText: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
});
