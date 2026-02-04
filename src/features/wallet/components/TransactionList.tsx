/**
 * Transaction List Component
 *
 * Displays recent transactions and pending requests.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../../app/theme';
import type { Transaction, PaymentRequest } from '../../../store';

interface TransactionListProps {
  transactions: Transaction[];
  pendingRequests: PaymentRequest[];
  onRequestPress?: (request: PaymentRequest) => void;
}

type ListItem =
  | { type: 'transaction'; data: Transaction }
  | { type: 'request'; data: PaymentRequest };

export function TransactionList({
  transactions,
  pendingRequests,
  onRequestPress,
}: TransactionListProps) {
  // Combine and sort by timestamp (pending requests first, then transactions)
  const items: ListItem[] = [
    ...pendingRequests
      .filter(r => r.status === 'pending')
      .map(r => ({ type: 'request' as const, data: r })),
    ...transactions.map(t => ({ type: 'transaction' as const, data: t })),
  ];

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recent activity</Text>
        <Text style={styles.emptySubtext}>
          Your transactions will appear here
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'request') {
      return (
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => onRequestPress?.(item.data)}
          activeOpacity={0.7}
        >
          <View style={[styles.icon, styles.pendingIcon]}>
            <Text style={styles.iconText}>⏳</Text>
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>
              Request from{' '}
              {item.data.counterpartyUsername ||
                shortenAddress(item.data.counterpartyAddress)}
            </Text>
            <Text style={styles.itemSubtitle}>Tap to respond</Text>
          </View>
          <Text style={styles.amount}>${item.data.amount}</Text>
        </TouchableOpacity>
      );
    }

    const tx = item.data;
    const isReceive = tx.type === 'receive';

    return (
      <View style={styles.itemContainer}>
        <View
          style={[
            styles.icon,
            isReceive ? styles.receiveIcon : styles.sendIcon,
          ]}
        >
          <Text style={styles.iconText}>{isReceive ? '↓' : '↑'}</Text>
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>
            {isReceive ? 'Received from' : 'Sent to'}{' '}
            {tx.counterpartyUsername || shortenAddress(tx.counterpartyAddress)}
          </Text>
          <Text style={styles.itemSubtitle}>
            {tx.status === 'pending' ? 'Pending...' : formatDate(tx.timestamp)}
          </Text>
        </View>
        <Text
          style={[
            styles.amount,
            isReceive ? styles.amountReceive : styles.amountSend,
          ]}
        >
          {isReceive ? '+' : '-'}${tx.amount}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item =>
          item.type === 'request' ? `req-${item.data.id}` : `tx-${item.data.id}`
        }
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sendIcon: {
    backgroundColor: colors.primary + '20',
  },
  receiveIcon: {
    backgroundColor: colors.success + '20',
  },
  pendingIcon: {
    backgroundColor: colors.warning + '20',
  },
  iconText: {
    fontSize: 18,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  itemSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  amount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  amountReceive: {
    color: colors.success,
  },
  amountSend: {
    color: colors.textPrimary,
  },
});
