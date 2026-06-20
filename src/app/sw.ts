import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const thirtyDays = 60 * 60 * 24 * 30;

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url }) => url.origin === "https://api.mapbox.com",
    handler: new CacheFirst({
      cacheName: "mapbox-assets",
      plugins: [new ExpirationPlugin({ maxAgeSeconds: thirtyDays, maxEntries: 500, purgeOnQuotaError: true })],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
