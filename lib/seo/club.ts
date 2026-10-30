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

/** What each page inside a club is, in one sentence a search result can show (club name filled in). */
const SUB_COPY: Record<string, { title: string; description: (name: string) => string }> = {
  history: { title: 'History', description: (n) => `${n}'s history on FAN LIFE: seasons, honours, grounds and the people who shaped the club, from its own sourced records.` },
  timeline: { title: 'Timeline', description: (n) => `Put ${n}'s great days in order. A timeline game built from dated, sourced moments in the club's history.` },
  'away-days': { title: 'Away Days', description: (n) => `${n}'s European away days on a map: every recorded trip abroad, the ground, the date and the result.` },
  'kit-archive': { title: 'Kit archive', description: (n) => `${n}'s shirts season by season: home, away and keeper kits with maker and sponsor, drawn from the club's records.` },
  play: { title: 'Play', description: (n) => `All the ${n} games on FAN LIFE in one place: trivia, line-ups, kits, the timeline and more.` },
  terrace: { title: 'The terrace', description: (n) => `${n}'s terrace on FAN LIFE: the supporters' vote, songs by name and the stand's own history.` },
  meetings: { title: 'Head to head', description: (n) => `Every meeting between ${n} and an opponent that the archives record: dates, venues and scores.` },
}

/** Metadata for a page inside a club: club name in the title, a real description, the main address as canonical. */
export function clubSubMetadata(input: { id: string; name: string; sub: string; title?: string; description?: string }): Metadata {
  const copy = SUB_COPY[input.sub]
  const title = `${input.title ?? copy?.title ?? input.sub} · ${input.name}`
  const description = input.description ?? copy?.description(input.name) ?? `${input.name} on FAN LIFE.`
  const url = clubCanonical(input.id, input.sub)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'FAN LIFE', locale: 'en_GB', type: 'website', images: [{ url: '/brand/fanlife/og.png', width: 1200, height: 630, alt: `${input.name} on FAN LIFE` }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/brand/fanlife/og.png'] },
  }
}

/** One line per shared gate (lib/clubs/gates.ts), for a club's gate page in search results. */
export const GATE_DESCRIPTION: Record<string, (name: string) => string> = {
  xi: (n) => `Pick ${n}'s all-time XI from every player the archive records, then share your eleven.`,
  trivia: (n) => `${n} trivia: rounds of questions built from the club's own sourced matches, players and kits.`,
  lineup: (n) => `Rebuild the exact starting eleven of a real ${n} match, from line-ups two sources agree on.`,
  'kit-builder': (n) => `Build a real ${n} shirt: pick the season's body, sleeves, maker, sponsor and crest.`,
  kits: (n) => `Collect ${n}'s shirts season by season and design your own.`,
  memory: (n) => `A memory game of matching pairs from ${n}'s history.`,
  polls: (n) => `The ${n} terrace vote: pick your greatest players, goals and nights on a printed ballot.`,
  goal: (n) => `Rebuild a famous ${n} goal touch by touch, from match reports that describe it.`,
  'royal-rumble': (n) => `Royal Rumble: draft a ${n} five or eleven of legends on a budget and play it out.`,
  'blind-cow': (n) => `Blind Cow: guess the ${n} player from clues, one at a time.`,
  derby: (n) => `${n}'s derby: every meeting with the club's main rival that the archives record.`,
  archive: (n) => `${n}'s living archive: matches, players, kits and moments with their sources.`,
  timeline: (n) => `Put ${n}'s great days in order in the timeline game.`,
}
