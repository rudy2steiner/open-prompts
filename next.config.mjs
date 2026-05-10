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
        ],
    },
    async rewrites(){
         return [
          {
               source: '/index.html',
               destination: '/en/',
          },
          {
             source: '/timestamp.html',
             destination: '/en',
          },
         ]
        }

};

export default withNextIntl(nextConfig);
