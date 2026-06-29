import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
  runtimeCaching: [
    {
      urlPattern: /\/api\/(products\/list|customers\/list|orders\/list|dashboard\/stats)(\?.*)?$/,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "cardinal-api-cache",
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 4,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/app(\/.*)?$/,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "cardinal-app-pages",
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        networkTimeoutSeconds: 4,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables instrumentation.ts (env validation at server startup) on Next 14.
  experimental: {
    instrumentationHook: true,
  },
};

export default withPWA(nextConfig);
