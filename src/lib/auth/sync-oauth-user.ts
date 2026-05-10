import { and, eq } from 'drizzle-orm';
import type { Db } from '~/db/client';
import { accounts, users } from '~/db/schema';

export type OAuthLinkInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  providerAccountId: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  expiresAt?: number | null;
  tokenType?: string | null;
  scope?: string | null;
  idToken?: string | null;
};

export async function ensureOAuthUser(db: Db, input: OAuthLinkInput) {
  const email = input.email.toLowerCase().trim();

  const [existingAcc] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.provider, input.provider), eq(accounts.providerAccountId, input.providerAccountId)))
    .limit(1);

  if (existingAcc) {
    await db
      .update(accounts)
      .set({
        refreshToken: input.refreshToken ?? null,
        accessToken: input.accessToken ?? null,
        expiresAt: input.expiresAt ?? null,
        tokenType: input.tokenType ?? null,
        scope: input.scope ?? null,
        idToken: input.idToken ?? null,
      })
      .where(eq(accounts.id, existingAcc.id));

    const [u] = await db.select().from(users).where(eq(users.id, existingAcc.userId)).limit(1);
    if (!u) throw new Error('OAuth account has no user');
    return u;
  }

  const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  let userId: string;
  if (byEmail) {
    userId = byEmail.id;
    const patch: { name?: string | null; image?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (!byEmail.name && input.name) patch.name = input.name;
    if (!byEmail.image && input.image) patch.image = input.image;
    if (patch.name !== undefined || patch.image !== undefined) {
      await db.update(users).set(patch).where(eq(users.id, userId));
    }
  } else {
    const [created] = await db
      .insert(users)
      .values({
        email,
        name: input.name ?? null,
        image: input.image ?? null,
        emailVerified: new Date(),
      })
      .returning({ id: users.id });
    userId = created.id;
  }

  await db.insert(accounts).values({
    userId,
    type: 'oauth',
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    refreshToken: input.refreshToken,
    accessToken: input.accessToken,
    expiresAt: input.expiresAt ?? null,
    tokenType: input.tokenType,
    scope: input.scope,
    idToken: input.idToken,
  });

  const [out] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!out) throw new Error('Failed to load user after OAuth link');
  return out;
}
