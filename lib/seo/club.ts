import type { Metadata } from 'next'

import { SITE_URL } from '@/lib/brand'

/**
 * ADR-U03: `fanlife.dubelteam.com/clubs/{id}` is the one address a search engine is told about.
 * A club's own sub-domain is a branded way IN and serves the same page, so every page there
 * names the main address as canonical — never a second copy to index.
 */
export const clubCanonical = (id: string, sub = ''): string => `${SITE_URL}/clubs/${id}${sub ? `/${sub}` : ''}`

/** Only a published club is indexable; research, review and paused clubs are not asked about. */
export const indexableStatus = (status: string | undefined): boolean => status === 'live'

export function clubMetadata(input: { id: string; name: string; city: string; description?: string | null; status?: string }): Metadata {
  const title = `${input.name} — ${input.city}`
  const description = input.description || `${input.name}: the club's history, games and supporters on FAN LIFE.`
  const url = clubCanonical(input.id)
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: indexableStatus(input.status) ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: 'FAN LIFE',
      locale: 'en_GB',
      type: 'website',
      images: [{ url: '/brand/fanlife/og.png', width: 1200, height: 630, alt: `${input.name} on FAN LIFE` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/brand/fanlife/og.png'] },
  }
}
