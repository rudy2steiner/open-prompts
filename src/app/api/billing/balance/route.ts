import { getAuthSession } from '~/lib/auth/session';
import { readCreditAccount, usableBalance } from '~/lib/billing/accounts';
import { hashGuestToken, readGuestToken } from '~/lib/billing/guest';
import { getDb } from '~/db/client';
import { guestSessions } from '~/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request): Promise<Response> {
  const session = await getAuthSession();
  let ownerId = session?.user?.id ?? null;
  if (!ownerId) {
    const token = readGuestToken(request);
    const db = getDb();
    if (token && db) {
      const row = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt })
        .from(guestSessions).where(eq(guestSessions.tokenHash, await hashGuestToken(token))).get();
      if (row && row.expiresAt.getTime() > Date.now()) ownerId = row.guestId;
    }
  }
  if (!ownerId) return Response.json({ balance: 0, identified: false });
  const account = await readCreditAccount(ownerId);
  return Response.json({ balance: account ? usableBalance(account) : 0, identified: true });
}
