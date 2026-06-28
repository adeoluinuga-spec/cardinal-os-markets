/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables instrumentation.ts (env validation at server startup) on Next 14.
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
