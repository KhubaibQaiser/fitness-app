/**
 * Tamagui runs in runtime mode (no optimizing compiler): the @tamagui/next-plugin
 * webpack loader is incompatible with Next 16's Turbopack builds. The compiler is
 * an optional optimization (ADR-0003); revisit when tamagui ships Turbopack support.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: [
    'react-native',
    'react-native-web',
    'tamagui',
    '@gymos/ui',
    '@gymos/app',
    '@gymos/contracts',
    'solito',
  ],
  turbopack: {
    resolveAlias: {
      'react-native': 'react-native-web',
    },
  },
  // Dev-only same-origin proxy to the API; production routing is Caddy's job.
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
