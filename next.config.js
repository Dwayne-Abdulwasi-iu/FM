/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Enable incremental static regeneration
   */
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.cdn.printful.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.printify.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-api.printify.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Disable optimization for images - let Cloudinary handle it
    unoptimized: process.env.NODE_ENV === 'production' ? false : true,
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  poweredByHeader: false,
}

module.exports = nextConfig