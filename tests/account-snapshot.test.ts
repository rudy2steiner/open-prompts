import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ACCOUNT_SNAPSHOT_KEY,
  clearAccountSnapshot,
  readAccountSnapshot,
  writeAccountSnapshot,
  type AccountDisplaySnapshot,
} from '../src/lib/auth/account-snapshot';

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const now = Date.UTC(2026, 10, 8, 12);
const snapshot: AccountDisplaySnapshot = {
  version: 1,
  userId: 'user-1',
  name: 'Ada',
  email: 'ada@example.com',
  image: 'https://example.com/ada.png',
  isAdmin: true,
  balance: 42,
  updatedAt: now,
};

test('account snapshot round-trips valid display data', () => {
  const storage = new MemoryStorage();
  writeAccountSnapshot(storage, snapshot);
  assert.deepEqual(readAccountSnapshot(storage, now + 1), snapshot);
});

for (const [name, raw] of [
  ['malformed JSON', '{'],
  ['wrong version', JSON.stringify({ ...snapshot, version: 2 })],
  ['missing user id', JSON.stringify({ ...snapshot, userId: '' })],
  ['future timestamp', JSON.stringify({ ...snapshot, updatedAt: now + 1 })],
  ['expired timestamp', JSON.stringify({ ...snapshot, updatedAt: now - 12 * 60 * 60 * 1000 - 1 })],
] as const) {
  test(`account snapshot discards ${name}`, () => {
    const storage = new MemoryStorage();
    storage.setItem(ACCOUNT_SNAPSHOT_KEY, raw);
    assert.equal(readAccountSnapshot(storage, now), null);
    assert.equal(storage.getItem(ACCOUNT_SNAPSHOT_KEY), null);
  });
}

test('account snapshot can be explicitly cleared', () => {
  const storage = new MemoryStorage();
  writeAccountSnapshot(storage, snapshot);
  clearAccountSnapshot(storage);
  assert.equal(storage.getItem(ACCOUNT_SNAPSHOT_KEY), null);
});
