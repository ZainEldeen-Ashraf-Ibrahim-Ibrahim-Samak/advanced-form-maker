import type { MetadataRoute } from 'next'
import { env } from '@/env.mjs'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = (env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}