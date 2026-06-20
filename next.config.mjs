import withSerwistInit from "@serwist/next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: repoRoot,
  images: {
    unoptimized: true,
  },
  turbopack: {},
};

export default withSerwist(nextConfig);
