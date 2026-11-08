export const ACCOUNT_SNAPSHOT_KEY = 'open-prompts:account:v1';

const ACCOUNT_SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000;

export type AccountDisplaySnapshot = {
  version: 1;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isAdmin: boolean;
  balance: number | null;
  updatedAt: number;
};

type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function validSnapshot(value: unknown, now: number): value is AccountDisplaySnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.version === 1
    && typeof snapshot.userId === 'string'
    && snapshot.userId.length > 0
    && nullableString(snapshot.name)
    && nullableString(snapshot.email)
    && nullableString(snapshot.image)
    && typeof snapshot.isAdmin === 'boolean'
    && (snapshot.balance === null || (typeof snapshot.balance === 'number' && Number.isFinite(snapshot.balance)))
    && typeof snapshot.updatedAt === 'number'
    && Number.isFinite(snapshot.updatedAt)
    && snapshot.updatedAt <= now
    && snapshot.updatedAt >= now - ACCOUNT_SNAPSHOT_TTL_MS;
}

export function readAccountSnapshot(storage: ReadStorage, now = Date.now()): AccountDisplaySnapshot | null {
  try {
    const raw = storage.getItem(ACCOUNT_SNAPSHOT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (validSnapshot(parsed, now)) return parsed;
  } catch {
    // Invalid browser data is discarded below.
  }
  storage.removeItem(ACCOUNT_SNAPSHOT_KEY);
  return null;
}

export function writeAccountSnapshot(storage: WriteStorage, snapshot: AccountDisplaySnapshot): void {
  storage.setItem(ACCOUNT_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function clearAccountSnapshot(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(ACCOUNT_SNAPSHOT_KEY);
}
