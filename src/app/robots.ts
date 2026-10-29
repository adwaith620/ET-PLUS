import type { MetadataRoute } from 'next';

/**
 * robots.txt configuration for ET-PLUS
 * Production URL: https://et-plus.vercel.app/robots.txt
 * 
 * Rules:
 * - Allows public landing page (/) and authentication portal (/login).
 * - Disallows private API endpoints (/api/).
 * - Private dashboard pages (/dashboard/*) are protected by layout noindex metadata
 *   and authentication redirects, adhering to Google's guideline not to block
 *   pages that need to communicate noindex directives.
 * - Points directly to the XML sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://et-plus.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login'],
      disallow: ['/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
