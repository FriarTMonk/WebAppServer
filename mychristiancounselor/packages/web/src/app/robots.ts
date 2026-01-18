import { MetadataRoute } from 'next';

/**
 * Robots.txt Configuration for SEO
 *
 * Tells search engine crawlers which pages to index and where to find the sitemap.
 * Allows all major search engines to crawl public pages while protecting private routes.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.mychristiancounselor.online';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/counseling/',
          '/account/',
          '/marketing/',
          '/sales/',
          '/support/',
          '/_next/',
          '/static/',
        ],
      },
      // Special rules for major search engines
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/counseling/',
          '/account/',
          '/marketing/',
          '/sales/',
          '/support/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/counseling/',
          '/account/',
          '/marketing/',
          '/sales/',
          '/support/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
