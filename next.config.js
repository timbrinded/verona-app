const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-tiles',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\/api\/places(?:\?.*)?$/,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'places-api',
      },
    },
    {
      urlPattern: /\/data\/places\.json$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'places-data',
        networkTimeoutSeconds: 3,
        expiration: {
          maxAgeSeconds: 60 * 10,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {},
};

module.exports = withPWA(nextConfig);
