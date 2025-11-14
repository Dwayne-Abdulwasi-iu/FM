/** @type {import('next').NextConfig} */
// Workbox runtime caching rules for critical routes and images
const runtimeCaching = [
  {
    // API routes: prefer network but fallback to cache
    urlPattern: /\/api\/.*$/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 5, // 5 minutes
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    // Cloudinary-hosted images: serve stale while revalidating
    urlPattern: /^https:\/\/res\.cloudinary\.com\/.*\.(?:png|jpg|jpeg|webp|svg)$/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'cloudinary-images',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      },
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  {
    // Next.js static assets
    urlPattern: /\/_next\/_static\/.*$/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-resources',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
    },
  },
  {
    // App icons
    urlPattern: /\/icons\/.*\.(?:png|jpg|jpeg|svg)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'app-icons',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      },
    },
  },
]

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching,
})
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
  // Ensure Prisma engines and public assets are included in standalone output
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/.prisma/client/**/*',
      './node_modules/@prisma/engines/**',
      './public/**/*',
    ],
  },
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

module.exports = withPWA(nextConfig)