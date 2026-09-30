import type { Metadata } from 'next'

import { SITE_URL } from '@/lib/brand'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * מטא־דאטה — one source of truth.
 *
 * Every gate's browser-tab title, share preview and canonical URL are built here, from
 * the same message keys the screen itself renders — never a second copy of the Hebrew.
 * Rule 23: a page's `title` is just its own name (`screen.<gate>.title`, the exact
 * string the `<Screen>` header prints); the root template in `app/layout.tsx`
 * (`'%s · The Worker'`) is what appends the product name, so nothing here may repeat it.
 *
 * `description` prefers an existing lede/blade key over a new one — `xi.lede`,
 * `topic.lede`, `tik.lede` and `uss.lede` already say what the gate IS in the terrace
 * voice, so duplicating them into a `seo.*` key would be a second copy of the same
 * sentence rather than a source of truth. Where no such key existed one was added
 * (`seo.<slug>.desc`, flat, appended to `/tmp/keys-seo.json` — `messages/he.json`
 * itself is owned by another agent right now).
 *
 * Every OG image lives at `/og/<image>.png`, rendered by `scripts/brand/og-cards.mjs`.
 */

export type GateSeoSlug =
  | 'xi'
  | 'archive'
  | 'trivia'
  | 'lineup'
  | 'kits'
  | 'kits-build'
  | 'kits-archive'
  | 'kits-closet'
  | 'kits-market'
  | 'kits-auction'
  | 'memory'
  | 'polls'
  | 'goal'
  | 'tik'
  | 'tik-file'
  | 'derby'
  | 'derby-file'
  | 'timeline'
  | 'timeline-order'
  | 'ussishkin'
  | 'hapoel'
  | 'life'
  | 'credits'

type GateSeoEntry = {
  path: string
  titleKey: MessageKey
  descriptionKey: MessageKey
  /** filename under `public/og/`, without the extension */
  image: string
}

const GATE_SEO: Record<GateSeoSlug, GateSeoEntry> = {
  // The club's own wing — the third tab. It has no gate number because it is not a
  // game; it is the archive with a front door on it.
  hapoel: {
    path: '/hapoel',
    titleKey: 'screen.hapoel.title',
    descriptionKey: 'hapoel.lede',
    image: 'default',
  },
  xi: { path: '/xi', titleKey: 'screen.xi.title', descriptionKey: 'xi.lede', image: 'xi' },
  // שער 12 — the archive wing. It takes the default card rather than one of its own:
  // there is no OG artwork for it yet, and a card that pictured a gate we have not
  // drawn would be a second kind of invention (rule 11). One line changes when the
  // artwork lands.
  archive: {
    path: '/archive',
    titleKey: 'screen.archive.title',
    descriptionKey: 'archive.lede',
    image: 'default',
  },
  trivia: {
    path: '/trivia',
    titleKey: 'screen.trivia.title',
    descriptionKey: 'topic.lede',
    image: 'trivia',
  },
  lineup: {
    path: '/lineup',
    titleKey: 'screen.lineup.title',
    descriptionKey: 'seo.lineup.desc',
    image: 'lineup',
  },
  kits: {
    path: '/kits',
    titleKey: 'screen.kits.title',
    descriptionKey: 'seo.kits.desc',
    image: 'kits',
  },
  // The photograph archive shares gate 5's card rather than getting one of its own: it
  // is the same wing, and an OG card that said something different would be inventing a
  // gate. The route is separate because it is swept and because it is linkable.
  'kits-archive': {
    path: '/kits/archive',
    titleKey: 'screen.kitarchive.title',
    descriptionKey: 'screen.kitarchive.sub',
    image: 'kits',
  },
  // הארון — the collector's own closet, grown out of the archive (spec §10, §71). The archive's
  // card: it is the same wing, and a card of its own would be inventing a gate.
  'kits-closet': {
    path: '/kits/closet',
    titleKey: 'collector.closet.title',
    descriptionKey: 'collector.closet.seo',
    image: 'kits',
  },
  // שוק האדומים — the archive's shirts with the copies fans hold hung under them (spec §12). The
  // gate-5 card, for the same reason as the archive: it is the same wing, not a new gate.
  'kits-market': {
    path: '/kits/market',
    titleKey: 'market.title',
    descriptionKey: 'market.seo.desc',
    image: 'kits',
  },
  // המכירה הפומבית — the lots are events on the same wing (spec §71), so it takes gate 5's
  // card too. `/kits/admin` is deliberately NOT here: it is noindex and in no menu (§65).
  'kits-auction': {
    path: '/kits/auction',
    titleKey: 'screen.auction.title',
    descriptionKey: 'auction.lede',
    image: 'kits',
  },
  'kits-build': {
    path: '/kits/build',
    titleKey: 'screen.kitgame.title',
    // "חמישה חלקים. חולצה אחת. עונה אחת נכונה." — already a real sentence, on voice.
    descriptionKey: 'screen.kitgame.sub',
    image: 'kits-build',
  },
  memory: {
    path: '/memory',
    titleKey: 'screen.memory.title',
    descriptionKey: 'seo.memory.desc',
    image: 'memory',
  },
  polls: {
    path: '/polls',
    titleKey: 'screen.polls.title',
    // "שמונה ויכוחים. פתק אחד. הקול שלך." — already a real sentence, on voice.
    descriptionKey: 'screen.polls.sub',
    image: 'polls',
  },
  goal: {
    path: '/goal',
    titleKey: 'screen.goal.title',
    descriptionKey: 'seo.goal.desc',
    image: 'goal',
  },
  tik: { path: '/tik', titleKey: 'screen.tik.title', descriptionKey: 'tik.lede', image: 'tik' },
  // ONE RED WORLD §24 — the second destination of the personal area
  'tik-file': { path: '/tik/file', titleKey: 'personal.file.title', descriptionKey: 'personal.file.sub', image: 'tik' },
  derby: {
    path: '/derby',
    titleKey: 'screen.derby.title',
    descriptionKey: 'hate.lede',
    image: 'derby',
  },
  'derby-file': {
    path: '/derby/file',
    titleKey: 'screen.file.title',
    descriptionKey: 'seo.derbyFile.desc',
    image: 'derby-file',
  },
  // שער 13 — החוט האדום is the gate's game (owner decision, 21.9.2026); the chronology
  // game it replaced is the gate's second mode and keeps its own copy.
  timeline: {
    path: '/timeline',
    titleKey: 'screen.thread.title',
    descriptionKey: 'seo.thread.desc',
    image: 'timeline',
  },
  'timeline-order': {
    path: '/timeline/order',
    titleKey: 'screen.timeline.title',
    descriptionKey: 'seo.timeline.desc',
    image: 'timeline',
  },
  ussishkin: {
    path: '/ussishkin',
    titleKey: 'screen.ussishkin.title',
    descriptionKey: 'uss.lede',
    image: 'ussishkin',
  },
  life: {
    path: '/life',
    titleKey: 'life.title',
    descriptionKey: 'life.sub',
    image: 'life',
  },
  // המקורות — not a gate: the one page every source and credit lives on (spec §0.3,
  // 22.9.2026). The default card, for the same reason as the archive wing.
  credits: {
    path: '/credits',
    titleKey: 'screen.credits.title',
    descriptionKey: 'seo.credits.desc',
    image: 'default',
  },
}

function buildMetadata(title: string, description: string, path: string, image: string): Metadata {
  const url = `${SITE_URL}${path}`
  const imageUrl = `${SITE_URL}/og/${image}.png`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'The Worker',
      locale: 'he_IL',
      type: 'website',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

/**
 * One gate, one call: `export const metadata = gateMetadata('xi')`.
 *
 * Covers every gate, including the three this agent may not edit directly
 * (`polls`, `derby`, `derby-file`) and `life` — their entries are here so the file
 * that owns each route only has to import and call this, never re-type the copy.
 */
export function gateMetadata(slug: GateSeoSlug): Metadata {
  const entry = GATE_SEO[slug]
  return buildMetadata(t(entry.titleKey), t(entry.descriptionKey), entry.path, entry.image)
}

/**
 * `/trivia/[topic]` is dynamic — same shape, built from the topic's own spec
 * (`lib/game/topics.ts`) rather than a fixed slug, so a new topic needs no change here.
 */
export function topicMetadata(titleKey: MessageKey, descriptionKey: MessageKey, topic: string): Metadata {
  return buildMetadata(t(titleKey), t(descriptionKey), `/trivia/${topic}`, 'trivia')
}
