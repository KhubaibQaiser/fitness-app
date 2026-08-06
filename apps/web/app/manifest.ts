import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  name: 'GymOS Coach',
  short_name: 'GymOS',
  description: 'Coaching-first client management with adaptive AI meal planning.',
  start_url: '/',
  display: 'standalone',
  background_color: '#f7f8f7',
  theme_color: '#0f766e',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
});

export default manifest;
