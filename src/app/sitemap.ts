import type { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://scct-damages.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://scct-damages.vercel.app/en',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: 'https://scct-damages.vercel.app/ar',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    }
  ]
}