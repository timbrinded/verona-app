import nextPwa from "next-pwa";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "mapbox-tiles",
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\/api\/places(?:\?.*)?$/,
      handler: "NetworkFirst",
      options: {
        cacheName: "places-api",
        networkTimeoutSeconds: 3,
        expiration: {
          maxAgeSeconds: 60 * 10,
        },
      },
    },
    {
      urlPattern: /\/data\/places\.json$/,
      handler: "NetworkFirst",
      options: {
        cacheName: "places-data",
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
  outputFileTracingRoot: repoRoot,
  images: {
    unoptimized: true,
  },
  turbopack: {},
};

export default withPWA(nextConfig);
