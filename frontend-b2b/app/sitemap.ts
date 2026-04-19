import type { MetadataRoute } from 'next';

import { readExperimentPages } from '../lib/marketing';
import { SITE_URL } from '../lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/product', priority: 0.95, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.97, changeFrequency: 'weekly' },
    { path: '/faq', priority: 0.86, changeFrequency: 'weekly' },
    { path: '/pay', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/book', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
  ];
}
