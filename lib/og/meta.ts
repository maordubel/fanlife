import type { Metadata } from 'next'

import { SITE_URL } from '@/lib/brand'

/**
 * A shared result link carries its card (delta 89): the gate page reads the card query
 * (`lib/og/params.ts`) and swaps its Open Graph / Twitter image for the generated card,
 * so the preview WhatsApp draws under the link IS the result — and the link still opens
 * the gate itself, the dare.
 */
export function withCard(base: Metadata, imagePath: string, title: string, description?: string): Metadata {
  const url = `${SITE_URL}${imagePath}`
  return {
    ...base,
    openGraph: {
      ...(base.openGraph ?? {}),
      title,
      ...(description ? { description } : {}),
      images: [{ url, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      ...(base.twitter ?? {}),
      card: 'summary_large_image',
      title,
      ...(description ? { description } : {}),
      images: [url],
    },
    // a result link is a moment, not a page to index
    robots: { index: false, follow: true },
  }
}
