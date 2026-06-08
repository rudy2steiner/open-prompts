import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // Required for root `instrumentation.ts` (e.g. bootstrap-admin on server start).
        instrumentationHook: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn-images.toolify.ai',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.twimg.com',
                pathname: '/**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/index.html',
                destination: '/en/',
            },
            {
                source: '/timestamp.html',
                destination: '/en',
            },
            // Locale-scoped APIs only (`app/[locale]/api/*`). Do NOT rewrite `/api/auth/*` (NextAuth lives at `app/api/auth`).
            { source: '/api/prompts', destination: '/en/api/prompts' },
            { source: '/api/x-import', destination: '/en/api/x-import' },
            { source: '/api/image-proxy', destination: '/en/api/image-proxy' },
            { source: '/api/generate', destination: '/en/api/generate' },
            { source: '/api/generations', destination: '/en/api/generations' },
            { source: '/api/generations/:path*', destination: '/en/api/generations/:path*' },
            { source: '/api/my/:path*', destination: '/en/api/my/:path*' },
            { source: '/api/admin/:path*', destination: '/en/api/admin/:path*' },
        ];
    },

};

export default withNextIntl(nextConfig);
