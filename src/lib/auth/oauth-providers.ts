import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

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

export function buildOAuthProviders(): NextAuthOptions['providers'] {
  const list: NextAuthOptions['providers'] = [];
  const flags = getOAuthProviderFlags();

  if (flags.github) {
    list.push(
      GitHubProvider({
        clientId: process.env.GITHUB_ID!.trim(),
        clientSecret: process.env.GITHUB_SECRET!.trim(),
        authorization: {
          params: {
            scope: 'read:user user:email',
          },
        },
        profile(profile) {
          return {
            id: String(profile.id),
            name: profile.name ?? profile.login,
            email: profile.email,
            image: profile.avatar_url,
          };
        },
      }),
    );
  }

  if (flags.google) {
    list.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
          },
        },
      }),
    );
  }

  return list;
}
