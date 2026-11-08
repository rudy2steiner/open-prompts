import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { guestSessions } from '~/db/schema';
import { getAuthSession } from '~/lib/auth/session';
import { hashGuestToken, readGuestToken } from '~/lib/billing/guest';
import { parseAnalyticsEvent } from './events';

type D1 = {
  prepare(query: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> };
  };
};

function database(): D1 | null {
  try {
    return (getCloudflareContext().env as { DB?: D1 }).DB ?? null;
  } catch {
    return null;
  }
}

async function existingOwner(request: Request): Promise<string | null> {
  const session = await getAuthSession();
  if (session?.user?.id) return session.user.id;
  const token = readGuestToken(request);
  if (!token) return null;
  const db = getDb();
  if (!db) return null;
  const guest = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt })
    .from(guestSessions).where(eq(guestSessions.tokenHash, await hashGuestToken(token))).get();
  if (!guest || guest.expiresAt.getTime() <= Date.now()) return null;
  return guest.guestId;
}

export async function handleAnalyticsEvent(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > 4096) return new Response(null, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); }
  catch { return Response.json({ error: 'invalid_event' }, { status: 400 }); }
  const event = parseAnalyticsEvent(body);
  if (!event) return Response.json({ error: 'invalid_event' }, { status: 400 });
  const db = database();
  if (!db) return Response.json({ error: 'tracking_unavailable' }, { status: 503 });
  try {
    const ownerId = await existingOwner(request);
    await db.prepare(`INSERT OR IGNORE INTO p_analytics_events (id, event_name, owner_id, locale, page, subject, properties_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(event.id, event.name, ownerId, event.locale, event.page, event.subject, JSON.stringify(event.properties), Date.now()).run();
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Unable to record analytics event', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'tracking_unavailable' }, { status: 503 });
  }
}
