import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { users } from '~/db/schema';
import { resolveUserAvatarUrl } from '~/lib/auth/default-user-avatar';
import { isAdminEmail } from '~/lib/auth/session';
import { bootstrapAdminIfConfigured } from '~/lib/auth/bootstrap-admin';
import { buildOAuthProviders } from '~/lib/auth/oauth-providers';
import { ensureOAuthUser } from '~/lib/auth/sync-oauth-user';

function buildProviders() {
  const list: NextAuthOptions['providers'] = [...buildOAuthProviders()];

  list.push(
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const emailRaw = creds?.email;
        const password = creds?.password;
        if (!emailRaw || !password) return null;

        const db = getDb();
        if (!db) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[auth:credentials] DATABASE_URL is not set; credentials sign-in cannot run.');
          }
          return null;
        }

        // Ensures admin exists on first login attempt (serverless may skip `instrumentation.ts`).
        await bootstrapAdminIfConfigured();

        const email = String(emailRaw).toLowerCase().trim();
        const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!row?.passwordHash) return null;

        const ok = await bcrypt.compare(String(password), row.passwordHash);
        if (!ok) return null;

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          image: row.image,
        };
      },
    })
  );

  return list;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: buildProviders(),
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === 'credentials') return true;

      const email = user?.email?.trim();
      if (!email) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[auth] ${account.provider} sign-in missing email`);
        }
        return false;
      }

      const db = getDb();
      if (!db) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[auth] DATABASE_URL not set; OAuth sign-in cannot persist user');
        }
        return false;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      const db = getDb();
      if (!db) return token;

      if (account && user) {
        if (account.provider === 'credentials' && user.id) {
          token.sub = user.id;
          if (user.email) token.email = user.email;
          token.name = user.name;
          token.picture = user.image;
        } else if (user.email) {
          const u = await ensureOAuthUser(db, {
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refreshToken: account.refresh_token as string | undefined,
            accessToken: account.access_token as string | undefined,
            expiresAt: account.expires_at as number | undefined,
            tokenType: account.token_type as string | undefined,
            scope: account.scope as string | undefined,
            idToken: account.id_token as string | undefined,
          });
          token.sub = u.id;
          token.email = u.email;
          token.name = u.name;
          token.picture = u.image;
        }
      }

      if (typeof token.email === 'string') {
        token.isAdmin = isAdminEmail(token.email);
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        if (typeof token.email === 'string') session.user.email = token.email;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name;
        session.user.isAdmin = Boolean(token.isAdmin);
        const picture = (token.picture as string | null | undefined) ?? session.user.image;
        const seed =
          (typeof token.email === 'string' && token.email) ||
          (typeof token.sub === 'string' && token.sub) ||
          session.user.email ||
          session.user.id;
        session.user.image = resolveUserAvatarUrl(picture, seed);
      }
      return session;
    },
  },
};
