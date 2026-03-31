import type { MetadataRoute } from 'next';

import { readExperimentPages } from '../lib/marketing';
import { SITE_URL } from '../lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/demo', priority: 0.96, changeFrequency: 'weekly' },
    { path: '/product', priority: 0.95, changeFrequency: 'weekly' },
    { path: '/compare', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/platform', priority: 0.93, changeFrequency: 'weekly' },
    { path: '/security', priority: 0.82, changeFrequency: 'weekly' },
    { path: '/pay', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/start', priority: 0.72, changeFrequency: 'weekly' },
    { path: '/book', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/experiments', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/login', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/register', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
  ];

  const experiments = await readExperimentPages();

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...experiments.map((experiment) => ({
      url: `${SITE_URL}/experiments/${experiment.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.76,
    })),
  ];
}
