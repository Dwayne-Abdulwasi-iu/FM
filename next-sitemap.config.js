/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://fashionmarketplace.store',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/seller/dashboard', '/api', '/auth/signup', '/auth/login'],
      },
    ],
  },
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 50000,
  exclude: [
    '/admin',
    '/admin/*',
    '/seller/dashboard',
    '/seller/dashboard/*',
    '/api/*',
    '/auth/signup',
    '/auth/login',
    '/auth/forgot-password',
    '/404',
    '/500',
  ],
  transform: async (config, path) => {
    // Set priority based on path
    let priority = 0.7;
    let changefreq = 'daily';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path.startsWith('/boutique')) {
      priority = 0.9;
      changefreq = 'daily';
    } else if (path.startsWith('/seller')) {
      priority = 0.6;
      changefreq = 'weekly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
  additionalPaths: async () => {
    return [
      {
        loc: '/',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      },
    ];
  },
};
