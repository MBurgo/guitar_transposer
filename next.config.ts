// next.config.ts
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

/** Runtime caching rules — kept from your config */
const runtimeCaching = [
  {
    urlPattern: /^https?:\/\/[^/]+\/(?:$|print(?:\?.*)?$)/,
    handler: "NetworkFirst",
    options: {
      cacheName: "pages",
      networkTimeoutSeconds: 3,
      expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https?:\/\/[^/]+\/_next\/static\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "next-static",
      expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https?:\/\/[^/]+\/_next\/.*\.(?:js|css)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "next-assets",
      expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https?:\/\/[^/]+\/_next\/static\/media\/.*\.(?:woff2?|ttf|otf)$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "font-assets",
      expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https?:\/\/[^/]+\/.*\.(?:png|jpg|jpeg|gif|webp|svg)$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "images",
      expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
] as const;

/** Base Next config (headers live here so Next actually applies them) */
const baseConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow only what we need; this enables the Stage Mode Wake Lock.
          { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(), screen-wake-lock=(self)" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true,

  // Keep your offline fallback
  fallbacks: {
    document: "/offline",
  } as any, // keep as-is to satisfy TS in your setup

  // Keep your pre-cache list
  additionalManifestEntries: [
    { url: "/", revision: "1" },
    { url: "/print", revision: "1" },
    { url: "/offline", revision: "1" },
  ],

  runtimeCaching: runtimeCaching as unknown as any[], // keep your structure; next-pwa reads these at build
})(baseConfig);
