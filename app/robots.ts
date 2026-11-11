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
    // A URL with a query (?event= for each of thousands of archive entries, ?seed=, ?q=, ?lang=) is the same page as
    // the one without it: crawling every variant rendered the whole archive again each time and spent the Vercel
    // budget (the deployment was paused on 10.11.2026). Aggressive scrapers that send no visitors are refused outright.
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/qa/', '/master/', '/api/', '/*?'] },
      { userAgent: ['Bytespider', 'PetalBot', 'CCBot', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'DataForSeoBot'], disallow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
