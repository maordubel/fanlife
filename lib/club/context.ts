/**
 * ClubContext — the one object every generator and screen reads club identity from.
 *
 * The engine (games, rules, UI) is shared; a club is DATA: `content/clubs/<id>/club.json`.
 * Code that needs the club's name, sport, founding year or derby rival takes a `ClubContext`
 * (default: `CLUB`, the club this deployment serves) and never types the name itself.
 * A second club is a second manifest, not a fork — see docs/22-club-agnostic-audit.md.
 */
import hapoel from '@/content/clubs/hapoel-tel-aviv/club.json'

export type Locale = 'he' | 'en'

export type ClubModule =
  | 'derby'
  | 'curva-gate5'
  | 'ussishkin'
  | 'black-file'
  | 'life'
  | 'royal-rumble'
  | 'blind-cow'
  | 'away-days'
  | 'kits'
  | 'collector-market'

export type ClubContext = {
  id: string
  sport: 'football' | 'basketball'
  /** the canonical-table slug (rule 7: matched through aliases, never fuzzily) */
  slug: string
  names: Record<Locale, string>
  short: Record<Locale, string>
  city: Record<Locale, string>
  founded: number
  locales: readonly Locale[]
  defaultLocale: Locale
  direction: 'rtl' | 'ltr'
  /** the ONE derby rival (rule 13); null when the club has none recorded */
  derbyRivalSlug: string | null
  modules: readonly ClubModule[]
  dataRoot: string
}

function fromManifest(m: typeof hapoel): ClubContext {
  return {
    id: m.id,
    sport: m.sport as ClubContext['sport'],
    slug: m.slug,
    names: m.names as Record<Locale, string>,
    short: m.short as Record<Locale, string>,
    city: m.city as Record<Locale, string>,
    founded: m.founded,
    locales: m.locales as Locale[],
    defaultLocale: m.defaultLocale as Locale,
    direction: m.direction as 'rtl' | 'ltr',
    derbyRivalSlug: m.derbyRivalSlug ?? null,
    modules: m.modules as ClubModule[],
    dataRoot: m.dataRoot,
  }
}

/** every club this build knows; add a manifest here to add a club */
export const CLUBS: readonly ClubContext[] = [fromManifest(hapoel)]

/** the club this deployment serves */
export const CLUB: ClubContext = CLUBS[0] as ClubContext

export function clubById(id: string): ClubContext | null {
  return CLUBS.find((c) => c.id === id) ?? null
}

export const clubName = (ctx: ClubContext = CLUB, locale: Locale = ctx.defaultLocale): string => ctx.names[locale]

/** does this club opt into a module (a gate, a chapter, a game)? */
export const hasModule = (module: ClubModule, ctx: ClubContext = CLUB): boolean => ctx.modules.includes(module)

/** `{club}`, `{short}`, `{city}`, `{founded}` placeholders — the shared vocabulary of every club-bearing string */
export function fillClub(template: string, ctx: ClubContext = CLUB, locale: Locale = ctx.defaultLocale): string {
  return template
    .replaceAll('{club}', ctx.names[locale])
    .replaceAll('{short}', ctx.short[locale])
    .replaceAll('{city}', ctx.city[locale])
    .replaceAll('{founded}', String(ctx.founded))
}
