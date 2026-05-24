import type { MetadataRoute } from 'next'
import { env } from '@/env.mjs'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ar`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    }
  ]
}