import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

export type OAuthProviderFlags = {
  github: boolean;
  google: boolean;
};

export function getOAuthProviderFlags(): OAuthProviderFlags {
  return {
    github: Boolean(process.env.GITHUB_ID?.trim() && process.env.GITHUB_SECRET?.trim()),
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
    ),
  };
}

/** OAuth apps must register these callback URLs (see `.env.example`). */
export function oauthCallbackUrls(baseUrl: string): { github: string; google: string } {
  const base = baseUrl.replace(/\/$/, '');
  return {
    github: `${base}/api/auth/callback/github`,
    google: `${base}/api/auth/callback/google`,
  };
}

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility?: string;
};

async function fetchGithubPrimaryEmail(accessToken: string): Promise<string | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'open-prompts-auth',
  };
  const res = await fetch('https://api.github.com/user/emails', { headers });
  if (!res.ok) return null;
  const emails = (await res.json()) as GithubEmail[];
  const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
  return primary?.email?.trim() ?? emails[0]?.email?.trim() ?? null;
}

export function buildOAuthProviders(): NextAuthOptions['providers'] {
  const list: NextAuthOptions['providers'] = [];
  const flags = getOAuthProviderFlags();

  if (flags.github) {
    const clientId = process.env.GITHUB_ID!.trim();
    const clientSecret = process.env.GITHUB_SECRET!.trim();

    list.push(
      GitHubProvider({
        clientId,
        clientSecret,
        authorization: {
          params: {
            scope: 'read:user user:email',
          },
        },
        // Use native fetch for token + profile on Cloudflare Workers (openid-client HTTPS can fail).
        token: {
          url: 'https://github.com/login/oauth/access_token',
          async request({ params, provider }) {
            const code = typeof params.code === 'string' ? params.code : '';
            const body = new URLSearchParams({
              client_id: provider.clientId!,
              client_secret: provider.clientSecret!,
              code,
              redirect_uri: provider.callbackUrl,
            });
            const res = await fetch('https://github.com/login/oauth/access_token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
              },
              body,
            });
            const tokens = (await res.json()) as Record<string, string>;
            if (!res.ok || !tokens.access_token) {
              throw new Error(tokens.error ?? 'github_token_exchange_failed');
            }
            return { tokens };
          },
        },
        userinfo: {
          url: 'https://api.github.com/user',
          async request({ tokens }) {
            const accessToken = tokens.access_token;
            if (!accessToken) throw new Error('github_missing_access_token');

            const headers = {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'open-prompts-auth',
            };
            const profileRes = await fetch('https://api.github.com/user', { headers });
            const profile = (await profileRes.json()) as Record<string, unknown>;
            if (!profileRes.ok) {
              throw new Error('github_profile_fetch_failed');
            }

            let email = typeof profile.email === 'string' ? profile.email.trim() : '';
            if (!email) {
              email = (await fetchGithubPrimaryEmail(accessToken)) ?? '';
            }
            if (!email) {
              throw new Error('github_email_required');
            }

            return { ...profile, email };
          },
        },
        profile(profile) {
          return {
            id: String(profile.id),
            name: (profile.name as string | null) ?? (profile.login as string),
            email: profile.email as string,
            image: profile.avatar_url as string,
          };
        },
      }),
    );
  }

  if (flags.google) {
    const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();

    // Raw OAuth config (not GoogleProvider()) — avoids wellKnown/Issuer.discover on Workers.
    const google = {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      clientId,
      clientSecret,
      issuer: 'https://accounts.google.com',
      checks: ['pkce', 'state'],
      idToken: false,
      authorization: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
      token: {
        url: 'https://oauth2.googleapis.com/token',
        async request({ params, provider, checks }) {
          const code = typeof params.code === 'string' ? params.code : '';
          const body = new URLSearchParams({
            client_id: provider.clientId!,
            client_secret: provider.clientSecret!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: provider.callbackUrl,
          });
          const codeVerifier = (checks as { code_verifier?: string }).code_verifier;
          if (codeVerifier) body.set('code_verifier', codeVerifier);

          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          const tokens = (await res.json()) as Record<string, string>;
          if (!res.ok || !tokens.access_token) {
            const detail = tokens.error_description ?? tokens.error ?? `status_${res.status}`;
            throw new Error(`google_token_exchange_failed:${detail}`);
          }
          return { tokens };
        },
      },
      userinfo: {
        url: 'https://openidconnect.googleapis.com/v1/userinfo',
        async request({ tokens }) {
          const accessToken = tokens.access_token;
          if (!accessToken) throw new Error('google_missing_access_token');

          const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const profile = (await res.json()) as Record<string, unknown>;
          if (!res.ok) throw new Error('google_profile_fetch_failed');

          const email = typeof profile.email === 'string' ? profile.email.trim() : '';
          if (!email) throw new Error('google_email_required');

          return profile;
        },
      },
      profile(profile) {
        return {
          id: profile.sub as string,
          name: profile.name as string | null,
          email: profile.email as string,
          image: profile.picture as string | null,
        };
      },
    } as NextAuthOptions['providers'][number];

    list.push(google);
  }

  return list;
}
