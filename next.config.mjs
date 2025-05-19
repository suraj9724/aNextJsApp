// next.config.js

// Import the scheduler setup function
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable experimental features that might cause issues
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [],
  },
  // Add output configuration to help with build stability
  output: 'standalone',
  // Disable webpack optimization temporarily
  webpack: (config) => {
    return config;
  },
  // ... any other configurations you have
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;