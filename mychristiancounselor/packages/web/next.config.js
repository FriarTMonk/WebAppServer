//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  // Enable standalone output for Docker deployments
  output: 'standalone',
  // Configure Turbopack root directory to silence lockfile warning
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // Image optimization for better SEO and performance
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Compression for faster page loads
  compress: true,
  // Power optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security
  // Optimize production builds
  swcMinify: true,
  // Compiler options for performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable strict mode for better React practices
  reactStrictMode: true,
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
