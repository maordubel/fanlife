import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/brand'

/**
 * חוקי הסריקה.
 *
 * Everything under `/qa/` renders `notFound()` in production (rule 19's harnesses, and
 * every screen like them) — real code, not secret code, but a page that 404s for every
 * reader and exists only for the owner to proof a screen by hand. A crawler indexing
 * one would send a search result to a page that does not work.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/qa/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
