import type { MetadataRoute } from 'next';

/**
 * Dynamic Sitemap for ET-PLUS
 * Production Origin: https://et-plus.vercel.app
 * 
 * Only canonical, public, indexable routes are included.
 * Private student dashboards, profiles, attendance records,
 * and API endpoints are strictly excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://et-plus.vercel.app';
  const currentDate = new Date();

  return [
    {
      url: `${baseUrl}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
