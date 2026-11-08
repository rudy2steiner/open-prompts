import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { generations, guestSessions } from '~/db/schema';
import { getAuthSession, isSessionAdmin } from '~/lib/auth/session';
import { authorizeImageDownload, imageDownloadFilename } from '~/lib/billing/download';
import { hashGuestToken, readGuestToken } from '~/lib/billing/guest';

export async function GET(request: Request, context: { params: Promise<{ id: string; index: string }> }): Promise<Response> {
  const { id, index } = await context.params;
  const db = getDb();
  if (!db) return new Response('Not found', { status: 404 });
  const generation = await db.select().from(generations).where(eq(generations.id, id)).get();
  if (!generation) return new Response('Not found', { status: 404 });
  const session = await getAuthSession();
  let requesterId = session?.user?.id ?? null;
  if (!requesterId) {
    const token = readGuestToken(request);
    if (token) {
      const guest = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt }).from(guestSessions).where(eq(guestSessions.tokenHash, await hashGuestToken(token))).get();
      if (guest && guest.expiresAt.getTime() > Date.now()) requesterId = guest.guestId;
    }
  }
  const decision = authorizeImageDownload({
    generationOwnerId: generation.ownerId,
    requesterId,
    isAdmin: isSessionAdmin(session),
    status: generation.status,
    images: generation.images ?? [],
    index: Number(index),
  });
  if (!decision.ok) return new Response('Not found', { status: 404 });
  const image = await fetch(decision.url);
  if (!image.ok) return new Response('Not found', { status: 404 });
  const bytes = await image.arrayBuffer();
  const type = image.headers.get('content-type') || 'application/octet-stream';
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': type,
      'content-disposition': `attachment; filename="${imageDownloadFilename(index, image.headers.get('content-type'), decision.url)}"`,
    },
  });
}
