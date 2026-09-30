import { SITE_URL } from '@/lib/brand'
import { t } from '@/lib/i18n'

/**
 * JSON-LD for `/` only.
 *
 * Two nodes, both true and nothing more: a `WebSite` (rule 23 — the product is called
 * The Worker, full stop) and a `VideoGame` describing what it actually is. No
 * `aggregateRating`, no `offers`, no `interactionStatistic` — rule 11 applies to
 * structured data exactly as it applies to a fact printed on screen, and this project
 * has no ratings, no price and no play count to report. `author`/`publisher` name the
 * studio that built it (`components/ui/BuiltByDubel.tsx` is the same credit, on screen).
 */
export function StructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'The Worker',
        url: SITE_URL,
        inLanguage: 'he',
      },
      {
        '@type': 'VideoGame',
        '@id': `${SITE_URL}/#game`,
        name: 'The Worker',
        description: t('app.description'),
        url: SITE_URL,
        inLanguage: 'he',
        genre: 'Sports Trivia',
        gamePlatform: 'Web browser',
        applicationCategory: 'GameApplication',
        author: { '@type': 'Organization', name: 'Dubel Team', url: 'https://dubelteam.com' },
        publisher: { '@type': 'Organization', name: 'Dubel Team', url: 'https://dubelteam.com' },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
