import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

if (process.env.NODE_ENV === 'development') initOpenNextCloudflareForDev();

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Pin the file-tracing root to this project (a stray ~/package-lock.json otherwise
    // makes Next infer the wrong workspace root, which breaks the OpenNext bundle).
    outputFileTracingRoot: new URL('.', import.meta.url).pathname,
    // 首次访问无需等待额外样式表请求，避免高延迟线路阻塞首屏。
    experimental: { inlineCss: true },
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
    async redirects() {
        return [
            { source: '/gallery', destination: '/image-prompts', permanent: true },
            ...['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt'].map(locale => ({
                source: `/${locale}/gallery`,
                destination: `/${locale}/image-prompts`,
                permanent: true,
            })),
        ];
    },
    async headers() {
        return [{ source: '/motion-previews/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }, { source: '/motion-posters/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] }];
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
