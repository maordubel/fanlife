/**
 * The club side of LIFE · RUSH: one club's approved archive, shaped as the view the Fitter reads.
 *
 * A read-model over `ClubData`, like every game (rule 1): the nights are exactly the rows a universal
 * life may stand on (`lifeAnchors`), the rival is the approved primary rival, the ground is the
 * stadium the pack records as the home ground. Nothing here parses a page or adds a fact.
 */
import type {ClubData} from '@/lib/clubs/contract'
import {lifeAnchors} from './pack'
import {CLUB_SPELLINGS} from '@/lib/clubs/spellings'
import {clubWorld} from '@/lib/clubs/world'
import {namesOf, norm, sameClub} from '@/lib/fixtures/names'
import {REGISTRY} from '@/lib/master/registry'
import type {ClubArchiveView} from '@/lib/life/rush/archive'
import {fitClub, type Fit} from '@/lib/life/rush/fit'

type Named = {name?: unknown; aliases?: unknown; role?: unknown; city?: unknown}

const approved = <T,>(rows: {status: string; confidence: number; value: T}[] | null | undefined) =>
  (rows ?? []).filter(r => r.status === 'approved' && r.confidence >= 2).map(r => r.value)

/** Every spelling of a club: its own archive's, the Hebrew archive's, and (for a registry club) the spellings its own archive uses. */
function spellingsOf(name: string, id?: string): string[] {
  const reg = id ?? REGISTRY.find(c => sameClub(c.name, name))?.id
  return [...new Set([...namesOf(name), ...(reg ? CLUB_SPELLINGS[reg] ?? [] : [])])]
}

/** Words that never identify a club by themselves: a title that says only "Maccabi" is not a derby. */
const GENERIC = new Set(['maccabi', 'hapoel', 'beitar', 'bnei', 'fc', 'fk', 'sk', 'nk', 'sc', 'sv', 'ac', 'afc', 'cf', 'real', 'sporting', 'united', 'city', 'dinamo', 'dynamo', 'athletic', 'atletico'])

/**
 * The rival as the archive's titles shorten it: "FK Velež Mostar" is written "Velež" in Mostar's own
 * records. The club's own city and the club-form words come off; what is left must be a distinctive word.
 */
function shortRival(name: string, city: string): string | null {
  const cityWords = new Set(norm(city).split(' '))
  const left = norm(name).split(' ').filter(w => w && !cityWords.has(w) && !GENERIC.has(w))
  return left.length && left.join(' ').length >= 4 ? left.join(' ') : null
}

export function rushView(data: ClubData): ClubArchiveView {
  const rival = approved(data.rivals as {status: string; confidence: number; value: Named}[] | null)[0]
  const ground = approved(data.stadiums as {status: string; confidence: number; value: Named}[] | null)
    // a stadium is the home ground when the pack says so, or (no role recorded) when it stands in the club's own city —
    // a neutral final venue abroad is never mistaken for home
    .find(s => typeof s.name === 'string' && (s.role === 'home ground' || (s.role === undefined && s.city === data.identity.city)))
  return {
    clubId: data.identity.id,
    name: data.identity.name,
    city: data.identity.city,
    ownNames: spellingsOf(data.identity.name, data.identity.id),
    rival: rival && typeof rival.name === 'string'
      ? {name: rival.name, aliases: [...new Set([...(Array.isArray(rival.aliases) ? rival.aliases.filter((a): a is string => typeof a === 'string') : []), ...spellingsOf(rival.name), ...[shortRival(rival.name, data.identity.city)].filter((a): a is string => !!a)])].filter(a => a !== rival.name)}
      : null,
    // the pack's recorded home ground, else the ground the club's sourced world file names (two publishers, rule 100)
    ground: ground ? String(ground.name) : clubWorld(data.identity.id)?.ground?.name ?? null,
    anchors: lifeAnchors(data),
  }
}

/** Every mission template fitted to this club, most relevant first. */
export const clubMissions = (data: ClubData): Fit[] => fitClub(rushView(data))
