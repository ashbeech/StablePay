/**
 * SQLite Database
 *
 * Local database for caching:
 * - Transaction history
 * - Payment requests
 * - User profile
 * - Contacts
 */

import { open, type DB } from '@op-engineering/op-sqlite';

let db: DB | null = null;

const DATABASE_NAME = 'stablepay.db';

/**
 * Initialize the database and create tables
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  db = open({ name: DATABASE_NAME });

  // Create tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT,
      six_digit_id TEXT,
      wallet_address TEXT NOT NULL,
      x25519_public_key TEXT NOT NULL,
      selected_network TEXT NOT NULL DEFAULT 'polygon-amoy',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('send', 'receive')),
      counterparty_address TEXT NOT NULL,
      counterparty_username TEXT,
      amount TEXT NOT NULL,
      network TEXT NOT NULL,
      block_number INTEGER,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
      counterparty_address TEXT NOT NULL,
      counterparty_username TEXT,
      amount TEXT NOT NULL,
      memo TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      address TEXT PRIMARY KEY,
      username TEXT,
      six_digit_id TEXT,
      x25519_public_key TEXT NOT NULL,
      display_name TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_synced_block INTEGER,
      last_sync_timestamp INTEGER
    );
  `);

  // Create indexes
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_transactions_timestamp 
    ON transactions(timestamp DESC);
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_transactions_network 
    ON transactions(network);
  `);

  console.log('[Database] Initialized');
}

/**
 * Get the database instance
 */
export function getDatabase(): DB {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================================
// Profile Operations
// ============================================================================

export interface ProfileData {
  username?: string;
  sixDigitId?: string;
  walletAddress: string;
  x25519PublicKey: string;
  selectedNetwork: string;
  createdAt: number;
  updatedAt: number;
}

export async function saveProfile(profile: ProfileData): Promise<void> {
  const database = getDatabase();
  await database.execute(
    `INSERT OR REPLACE INTO profile 
     (id, username, six_digit_id, wallet_address, x25519_public_key, selected_network, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.username || null,
      profile.sixDigitId || null,
      profile.walletAddress,
      profile.x25519PublicKey,
      profile.selectedNetwork,
      profile.createdAt,
      profile.updatedAt,
    ],
  );
}

export async function getProfile(): Promise<ProfileData | null> {
  const database = getDatabase();
  const result = await database.execute('SELECT * FROM profile WHERE id = 1');

  if (result.rows && result.rows.length > 0) {
    const row = result.rows[0];
    return {
      username: row.username as string | undefined,
      sixDigitId: row.six_digit_id as string | undefined,
      walletAddress: row.wallet_address as string,
      x25519PublicKey: row.x25519_public_key as string,
      selectedNetwork: row.selected_network as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }
  return null;
}

export async function updateProfileUsername(username: string): Promise<void> {
  const database = getDatabase();
  await database.execute(
    'UPDATE profile SET username = ?, updated_at = ? WHERE id = 1',
    [username, Date.now()],
  );
}

export async function updateProfileNetwork(network: string): Promise<void> {
  const database = getDatabase();
  await database.execute(
    'UPDATE profile SET selected_network = ?, updated_at = ? WHERE id = 1',
    [network, Date.now()],
  );
}

// ============================================================================
// Transaction Operations
// ============================================================================

export interface TransactionData {
  id: string;
  type: 'send' | 'receive';
  counterpartyAddress: string;
  counterpartyUsername?: string;
  amount: string;
  network: string;
  blockNumber?: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: number;
}

export async function saveTransaction(tx: TransactionData): Promise<void> {
  const database = getDatabase();
  await database.execute(
    `INSERT OR REPLACE INTO transactions 
     (id, type, counterparty_address, counterparty_username, amount, network, block_number, timestamp, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.type,
      tx.counterpartyAddress,
      tx.counterpartyUsername || null,
      tx.amount,
      tx.network,
      tx.blockNumber || null,
      tx.timestamp,
      tx.status,
      tx.createdAt,
    ],
  );
}

export async function saveTransactions(txs: TransactionData[]): Promise<void> {
  for (const tx of txs) {
    await saveTransaction(tx);
  }
}

export async function getTransactions(
  network: string,
  limit: number = 50,
): Promise<TransactionData[]> {
  const database = getDatabase();
  const result = await database.execute(
    `SELECT * FROM transactions 
     WHERE network = ? 
     ORDER BY timestamp DESC 
     LIMIT ?`,
    [network, limit],
  );

  if (!result.rows) return [];

  return result.rows.map(row => ({
    id: row.id as string,
    type: row.type as 'send' | 'receive',
    counterpartyAddress: row.counterparty_address as string,
    counterpartyUsername: row.counterparty_username as string | undefined,
    amount: row.amount as string,
    network: row.network as string,
    blockNumber: row.block_number as number | undefined,
    timestamp: row.timestamp as number,
    status: row.status as 'pending' | 'confirmed' | 'failed',
    createdAt: row.created_at as number,
  }));
}

export async function updateTransactionStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'failed',
): Promise<void> {
  const database = getDatabase();
  await database.execute('UPDATE transactions SET status = ? WHERE id = ?', [
    status,
    id,
  ]);
}

// ============================================================================
// Payment Request Operations
// ============================================================================

export interface PaymentRequestData {
  id: string;
  direction: 'sent' | 'received';
  counterpartyAddress: string;
  counterpartyUsername?: string;
  amount: string;
  memo?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export async function savePaymentRequest(
  req: PaymentRequestData,
): Promise<void> {
  const database = getDatabase();
  await database.execute(
    `INSERT OR REPLACE INTO payment_requests 
     (id, direction, counterparty_address, counterparty_username, amount, memo, status, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.id,
      req.direction,
      req.counterpartyAddress,
      req.counterpartyUsername || null,
      req.amount,
      req.memo || null,
      req.status,
      req.expiresAt,
      req.createdAt,
      req.updatedAt,
    ],
  );
}

export async function getPaymentRequests(
  status?: string,
): Promise<PaymentRequestData[]> {
  const database = getDatabase();
  let query = 'SELECT * FROM payment_requests';
  const params: (string | number)[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await database.execute(query, params);

  if (!result.rows) return [];

  return result.rows.map(row => ({
    id: row.id as string,
    direction: row.direction as 'sent' | 'received',
    counterpartyAddress: row.counterparty_address as string,
    counterpartyUsername: row.counterparty_username as string | undefined,
    amount: row.amount as string,
    memo: row.memo as string | undefined,
    status: row.status as 'pending' | 'paid' | 'cancelled' | 'expired',
    expiresAt: row.expires_at as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }));
}

export async function updatePaymentRequestStatus(
  id: string,
  status: 'pending' | 'paid' | 'cancelled' | 'expired',
): Promise<void> {
  const database = getDatabase();
  await database.execute(
    'UPDATE payment_requests SET status = ?, updated_at = ? WHERE id = ?',
    [status, Date.now(), id],
  );
}

// ============================================================================
// Sync State Operations
// ============================================================================

export async function getSyncState(): Promise<{
  lastSyncedBlock: number | null;
  lastSyncTimestamp: number | null;
} | null> {
  const database = getDatabase();
  const result = await database.execute(
    'SELECT * FROM sync_state WHERE id = 1',
  );

  if (result.rows && result.rows.length > 0) {
    const row = result.rows[0];
    return {
      lastSyncedBlock: row.last_synced_block as number | null,
      lastSyncTimestamp: row.last_sync_timestamp as number | null,
    };
  }
  return null;
}

export async function updateSyncState(
  lastSyncedBlock: number,
  lastSyncTimestamp: number,
): Promise<void> {
  const database = getDatabase();
  await database.execute(
    `INSERT OR REPLACE INTO sync_state (id, last_synced_block, last_sync_timestamp)
     VALUES (1, ?, ?)`,
    [lastSyncedBlock, lastSyncTimestamp],
  );
}

// ============================================================================
// Contact Operations
// ============================================================================

export interface ContactData {
  address: string;
  username?: string;
  sixDigitId?: string;
  x25519PublicKey: string;
  displayName?: string;
  createdAt: number;
}

export async function saveContact(contact: ContactData): Promise<void> {
  const database = getDatabase();
  await database.execute(
    `INSERT OR REPLACE INTO contacts 
     (address, username, six_digit_id, x25519_public_key, display_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      contact.address,
      contact.username || null,
      contact.sixDigitId || null,
      contact.x25519PublicKey,
      contact.displayName || null,
      contact.createdAt,
    ],
  );
}

export async function getContacts(): Promise<ContactData[]> {
  const database = getDatabase();
  const result = await database.execute(
    'SELECT * FROM contacts ORDER BY display_name, username, address',
  );

  if (!result.rows) return [];

  return result.rows.map(row => ({
    address: row.address as string,
    username: row.username as string | undefined,
    sixDigitId: row.six_digit_id as string | undefined,
    x25519PublicKey: row.x25519_public_key as string,
    displayName: row.display_name as string | undefined,
    createdAt: row.created_at as number,
  }));
}

export async function getContact(address: string): Promise<ContactData | null> {
  const database = getDatabase();
  const result = await database.execute(
    'SELECT * FROM contacts WHERE address = ?',
    [address],
  );

  if (result.rows && result.rows.length > 0) {
    const row = result.rows[0];
    return {
      address: row.address as string,
      username: row.username as string | undefined,
      sixDigitId: row.six_digit_id as string | undefined,
      x25519PublicKey: row.x25519_public_key as string,
      displayName: row.display_name as string | undefined,
      createdAt: row.created_at as number,
    };
  }
  return null;
}
