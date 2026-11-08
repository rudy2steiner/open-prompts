import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { creditAccounts, guestSessions } from '~/db/schema';

export const GUEST_COOKIE_NAME = 'op_guest';
const GUEST_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export async function hashGuestToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function guestSetCookie(token: string): string {
  return `${GUEST_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${GUEST_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function readGuestToken(request: Request): string | null {
  const header = request.headers.get('cookie') ?? '';
  for (const pair of header.split(';')) {
    const [name, ...value] = pair.trim().split('=');
    if (name === GUEST_COOKIE_NAME) return decodeURIComponent(value.join('='));
  }
  return null;
}

type GuestStore = {
  findGuestId(tokenHash: string): Promise<string | null>;
  createGuest(input: { tokenHash: string; guestId: string; expiresAt: Date }): Promise<void>;
};

function databaseStore(): GuestStore {
  return {
    findGuestId: async (tokenHash) => {
      const db = getDb();
      if (!db) return null;
      const row = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt })
        .from(guestSessions).where(eq(guestSessions.tokenHash, tokenHash)).get();
      if (!row || row.expiresAt.getTime() <= Date.now()) return null;
      return row.guestId;
    },
    createGuest: async (input) => {
      const db = getDb();
      if (!db) throw new Error('Database is unavailable');
      await db.insert(guestSessions).values(input);
      await db.insert(creditAccounts).values({ ownerId: input.guestId });
    },
  };
}

export async function resolveCheckoutIdentity(input: { userId: string | null; request: Request; store?: GuestStore }): Promise<{ ownerId: string; setCookie?: string }> {
  if (input.userId) return { ownerId: input.userId };
  const guest = await resolveGuestOwner(input.request, input.store);
  return { ownerId: guest.guestId, setCookie: guest.setCookie };
}

export async function resolveGuestOwner(request: Request, store: GuestStore = databaseStore()): Promise<{ guestId: string; setCookie?: string }> {
  const existing = readGuestToken(request);
  if (existing) {
    const guestId = await store.findGuestId(await hashGuestToken(existing));
    if (guestId) return { guestId };
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Buffer.from(bytes).toString('base64url');
  const guestId = crypto.randomUUID();
  await store.createGuest({
    tokenHash: await hashGuestToken(token),
    guestId,
    expiresAt: new Date(Date.now() + GUEST_MAX_AGE_SECONDS * 1000),
  });
  return { guestId, setCookie: guestSetCookie(token) };
}
