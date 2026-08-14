/**
 * Tamagui runs in runtime mode (no optimizing compiler): the @tamagui/next-plugin
 * webpack loader is incompatible with Next 16's Turbopack builds. The compiler is
 * an optional optimization (ADR-0003); revisit when tamagui ships Turbopack support.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone layout is for Docker/VM (`apps/web/Dockerfile`). Vercel sets
  // VERCEL=1 and expects default Next output + NFT traces; standalone makes
  // onBuildComplete look for missing `.next/next-server.js.nft.json`.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  transpilePackages: [
    'react-native',
    'react-native-web',
    'react-native-svg',
    'tamagui',
    '@tamagui/lucide-icons-2',
    '@gymos/platform',
    '@gymos/ui',
    '@gymos/app',
    '@gymos/contracts',
    'solito',
    'react-native-ui-datepicker',
    'dayjs',
  ],
  turbopack: {
    resolveAlias: {
      'react-native': 'react-native-web',
      'react-native-svg': '@tamagui/react-native-svg',
    },
  },
  // Same-origin API proxy: local/dev → localhost; PaaS → API_ORIGIN (Render);
  // VM prod still uses Caddy for the public hostname.
  async redirects() {
    return [{ source: '/enter', destination: '/login', permanent: true }];
  },
  async rewrites() {
    const api = process.env.API_ORIGIN ?? 'http://localhost:8080';
    return [
      { source: '/v1/:path*', destination: `${api}/v1/:path*` },
      { source: '/gate/:path*', destination: `${api}/gate/:path*` },
      { source: '/health/:path*', destination: `${api}/health/:path*` },
    ];
  },
};

export default nextConfig;
