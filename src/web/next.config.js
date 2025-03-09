/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables that will be available on the client-side
  env: {
    APP_VERSION: '1.0.0',
    BUILD_TIME: new Date().toISOString(),
  },
  
  // Enable React Strict Mode for development best practices
  reactStrictMode: true,
  
  // Output configuration for optimized builds
  output: 'standalone',
  
  // Custom directory for build output
  distDir: 'dist',
  
  // Image optimization configuration
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
    // Disable image optimization for local-first approach
    unoptimized: true,
  },
  
  // Custom webpack configuration for Electron compatibility
  webpack: (config, { isServer }) => {
    // Only apply modifications for server-side builds
    if (isServer) {
      // Add externals configuration for Node.js modules when used in Electron
      config.externals = [...(config.externals || []), 'electron'];
      
      // Provide fallbacks for Node.js core modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // URL rewrite configuration for API proxy and static assets
  async rewrites() {
    return [
      // Proxy API requests to local backend server
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      // Serve static assets
      {
        source: '/static/:path*',
        destination: '/static/:path*',
      },
    ];
  },
  
  // HTTP header configuration for security and caching
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy for local-first app
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: blob:;
              font-src 'self';
              connect-src 'self' http://localhost:8000 ws://localhost:8000;
              media-src 'self';
              object-src 'none';
              frame-ancestors 'self';
            `.replace(/\s+/g, ' ').trim(),
          },
        ],
      },
      {
        // Cache control for static assets
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;