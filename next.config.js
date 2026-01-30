/** @type {import('next').NextConfig} */
const nextConfig = {
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
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  poweredByHeader: false,
}

module.exports = nextConfig