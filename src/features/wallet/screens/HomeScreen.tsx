/**
 * Home Screen
 *
 * Main wallet interface showing:
 * - Header with profile button and logo
 * - Balance display (fetched from blockchain)
 * - Pay/Receive action buttons
 * - Recent activity list
 */

import React, { useCallback } from 'react';
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
import { BalanceDisplay } from '../components/BalanceDisplay';
import { ActionButtons } from '../components/ActionButtons';
import { TransactionList } from '../components/TransactionList';
import { useBalance } from '../hooks/useBalance';
import { useAppStore } from '../../../store';
import type { RootStackParamList } from '../../../app/Navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { transactions, pendingRequests } = useAppStore();
  const { balance, isLoading, refreshBalance } = useBalance();

  const handlePay = useCallback(() => {
    navigation.navigate('Send');
  }, [navigation]);

  const handleReceive = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'Request payment functionality will be implemented in Phase 3.',
    );
  }, []);

  const handleProfilePress = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'Profile screen will be implemented in Phase 4.',
    );
  }, []);

  const handleRequestPress = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'Request details will be implemented in Phase 3.',
    );
  }, []);

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

        <Logo size="small" />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
});
