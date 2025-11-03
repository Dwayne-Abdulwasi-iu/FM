const path = require('path')
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set the monorepo/workspace root to avoid Next.js selecting a parent folder
  // when multiple lockfiles are present on Windows/OneDrive setups.
  outputFileTracingRoot: path.join(__dirname),
  // Produce a smaller, self-contained server build that is easier to deploy
  output: 'standalone',
  // Allow production builds to complete even if ESLint finds issues.
  // We track and fix lint errors separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  async headers() {
    // Security headers applied to all routes in production
    const securityHeaders = [
      // Enable HSTS for 6 months (only over HTTPS deployments)
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=15552000; includeSubDomains; preload',
      },
      // Prevent MIME type sniffing
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Clickjacking protection
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      // Saner referrer policy
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Reduce available browser features to only what's commonly needed
      {
        key: 'Permissions-Policy',
        value: [
          'accelerometer=()',
          'autoplay=(self)',
          'camera=()',
          'display-capture=() ',
          'encrypted-media=(self)',
          'fullscreen=(self)',
          'geolocation=()',
          'gyroscope=()',
          'microphone=()',
          'payment=()',
          'usb=()'
        ].join(', '),
      },
    ]

    if (process.env.NODE_ENV !== 'production') {
      // No custom headers in development
      return []
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig