import { fold } from '@/lib/game/roster-search'
import { createHash } from 'node:crypto'

import type { MatchRecord, MomentRecord } from '@/lib/archive/match-master-types'
import type { PlayerMasterV2Record } from '@/lib/archive/player-identity'
import type { PlayerRecognition } from './recognition'
import type {
  BlindCowBank,
  BlindCowClue,
  BlindCowMode,
  BlindCowQuestion,
  ClueFamily,
  ClueType,
} from './types'

/**
 * בונה הבנק — Player Master + Match Master → `content/generated/blind-cow-bank.json`.
 *
 * Pure: the inputs are handed in (the script reads the files, the test reads the same
 * files), and the same inputs always give byte-identical output. No clock, no random.
 *
 * What it will NOT do (spec §4.2–§4.3, and the archive's own rules):
 *   · **no career total from partial coverage.** `archiveGoals.documentedGoals` is
 *     "documented rows only; never a career total" — it never becomes a clue. Goal clues
 *     name ONE match, or say "scored against X" — a fact, not a count.
 *   · **no shirt number without its season.** `clubNumbersUndated` is never read.
 *   · **no nationality from the foreign slot.** `foreignSlot` is the club's quota record;
 *     the identity clue reads `declaredNationality` / `origin` (squad sheet, research file).
 *   · **a match clue only from a clean match:** football, confidence ≥ 2, a day-precise
 *     date, a resolved opponent, a score, no open conflict or competing claim, scorers not
 *     disputed; the goal itself attached to the Player Master id with confidence ≥ 2 and
 *     not an own goal. A scorer written as a name with no id is never a clue — but he is
 *     counted as a possible OTHER answer (a "phantom"), so a clue that looks unique while
 *     an unresolved man also scored in that match is not treated as decisive.
 *
 * Ordering (§5.3): for each target, greedy over his candidate clues — at step i pick the
 * clue whose "how many men still fit" lands closest to N^((10 − i)/10) (≈340 → 25 → 1 for
 * a pool of 653), never a clue that narrows nothing, never two clues of one facet back to
 * back, never two clues about the same match or the same opponent, with a mild push for
 * three families and for at least one match/goal clue when the data has one.
 */

export const MIN_CONFIDENCE = 2
export const COMPETITIVE_CLUES = 10
export const COMPETITIVE_FAMILIES = 3
export const SOLO_MIN_CLUES = 5
export const SOLO_MAX_REMAINING = 3

const EURO = new Set(['גביע-אופא', 'הליגה-האירופית', 'ליגת-האלופות', 'גביע-האינטרטוטו', 'קונפרנס-ליג'])
const LEAGUE_TITLE = 'ליגת-העל'
const BASKETBALL = /כדורסל|יורוליג|יורוקאפ/

export type BuildInput = {
  players: readonly PlayerMasterV2Record[]
  matches: readonly MatchRecord[]
  moments: readonly MomentRecord[]
  /** opponent slug → Hebrew name, from the Entity Graph's `team:football:<slug>` rows */
  teamNames: ReadonlyMap<string, string>
  /** competition slug → Hebrew name, `content/manual/competitions.json` */
  competitionNames: ReadonlyMap<string, string>
  /** player id → Royal Rumble price + wiki appearances → tier (`recognition.ts`); absent = no tier */
  recognition?: ReadonlyMap<string, PlayerRecognition>
  /** player id → the title of the tune the terrace sings his song to (`player-song-tunes.json`) */
  songTunes?: ReadonlyMap<string, string>
  /** player id → reviewed clubs other than Hapoel Tel Aviv (`player-career-clubs.json`, the infobox `מועדונים`) */
  careerClubs?: ReadonlyMap<string, readonly string[]>
  playerMasterSha: string
  matchMasterSha: string
  /** the bank this build replaces — a question whose facts changed gets version + 1 */
  previous?: Pick<BlindCowBank, 'questions' | 'bankVersion'> | null
}

/* ------------------------------------------------------------------ bitsets */

type Bits = Uint32Array

function bits(n: number): Bits {
  return new Uint32Array(Math.ceil(n / 32))
}
function setBit(b: Bits, i: number): void {
  b[i >>> 5] = (b[i >>> 5] as number) | (1 << (i & 31))
}
function hasBit(b: Bits, i: number): boolean {
  return (((b[i >>> 5] as number) >>> (i & 31)) & 1) === 1
}
function and(a: Bits, b: Bits): Bits {
  const out = new Uint32Array(a.length)
  for (let k = 0; k < a.length; k++) out[k] = (a[k] as number) & (b[k] as number)
  return out
}
function popcount(b: Bits): number {
  let n = 0
  for (let k = 0; k < b.length; k++) {
    let v = b[k] as number
    v = v - ((v >>> 1) & 0x55555555)
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333)
    n += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
  }
  return n
}

/** The unresolved names that still fit after one more clue (a clue without phantoms keeps them). */
function narrowPhantoms(prev: Set<string> | null, next: Set<string> | null): Set<string> | null {
  if (!next) return prev
  if (!prev) return new Set(next)
  return new Set([...prev].filter((name) => next.has(name)))
}

function sha(text: string, length = 10): string {
  return createHash('sha1').update(text).digest('hex').slice(0, length)
}

/* ------------------------------------------------------------------ helpers */

function seasonStart(label: string): number | null {
  const m = /^(\d{4})/.exec(label)
  return m ? Number(m[1]) : null
}

function decadeHe(decade: number): string {
  return decade >= 2000 ? `שנות ה-${decade}` : `שנות ה-${decade % 100}`
}

function dateHe(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)}.${Number(m)}.${y}`
}

const POSITION_TERMS: Record<string, 'GK' | 'DF' | 'MF' | 'FW'> = {
  'שוער': 'GK',
  'בלם': 'DF',
  'בלם אחורי': 'DF',
  'מגן': 'DF',
  'מגן ימני': 'DF',
  'מגן שמאלי': 'DF',
  'הגנה': 'DF',
  'קשר': 'MF',
  'קשר אחורי': 'MF',
  'קשר הגנתי': 'MF',
  'קשר התקפי': 'MF',
  'קשר קדמי': 'MF',
  'קשר כנף': 'MF',
  'קשר שמאלי': 'MF',
  'קיצוני ימני': 'FW',
  'קיצוני שמאלי': 'FW',
  'ווינגר': 'FW',
  'חלוץ': 'FW',
}
const CODE_HE: Record<string, string> = { GK: 'שוער', DF: 'שחקן הגנה', MF: 'קשר', FW: 'חלוץ' }

type Derived = {
  p: PlayerMasterV2Record
  index: number
  seasons: string[]
  firstYear: number | null
  lastYear: number | null
  terms: string[]
  codes: string[]
  origin: 'israeli' | 'foreign' | null
  nationality: string | null
  titles: { slug: string; nameHe: string; season: string }[]
  decades: number[]
}

function derive(p: PlayerMasterV2Record, index: number): Derived {
  const seasons = [...new Set(p.spells.flatMap((s) => s.seasons))].sort()
  const firstYear = seasons.length ? seasonStart(seasons[0] as string) : p.years.from
  const lastYear = seasons.length ? seasonStart(seasons[seasons.length - 1] as string) : p.years.to
  const terms = (p.positions.fine?.terms ?? []).filter((term) => term in POSITION_TERMS)
  const codes = [...p.positions.codes]
  const origin =
    p.origin.value && (p.origin.from === 'database' || p.origin.from === 'squad') ? p.origin.value : null
  const declared = (p.declaredNationality ?? p.currentSquad?.declaredNationality ?? []).filter(Boolean)
  const nationality = declared.length === 1 && declared[0] !== 'ישראל' ? (declared[0] as string) : null
  const titles = p.spells
    .flatMap((s) => s.titles)
    .map((title) => ({ slug: title.competitionSlug, nameHe: title.nameHe, season: title.seasonLabel }))
    .sort((a, b) => a.season.localeCompare(b.season) || a.slug.localeCompare(b.slug))
  const decades = new Set<number>()
  for (const season of seasons) {
    const y = seasonStart(season)
    if (y !== null) decades.add(Math.floor(y / 10) * 10)
  }
  if (!seasons.length && p.years.from !== null) {
    for (let y = p.years.from; y <= (p.years.to ?? p.years.from); y += 1) decades.add(Math.floor(y / 10) * 10)
  }
  return {
    p,
    index,
    seasons,
    firstYear,
    lastYear,
    terms,
    codes,
    origin,
    nationality,
    titles,
    decades: [...decades].sort((a, b) => a - b),
  }
}

/* ------------------------------------------------------------------ candidates */

/** A clue fact, independent of the target, with who it fits. */
type Fact = {
  clue: Omit<BlindCowClue, 'difficulty' | 'exclusivity' | 'id'>
  ids: Bits
  /** unresolved scorer names that also fit a goal clue — possible other answers */
  phantoms: Set<string> | null
  /** at most one clue of a group per question (one per match, one per opponent…) */
  groups: string[]
}

export type GoalRow = { matchId: string; playerId: string; minute: number | null; penalty: boolean }

/** A match every match/goal clue may stand on (§4.3). */
export function eligibleMatch(match: MatchRecord, teamNames: ReadonlyMap<string, string>): boolean {
  return (
    match.sport === 'football' &&
    !BASKETBALL.test(match.competition) &&
    match.confidence >= MIN_CONFIDENCE &&
    match.playedOn.precision === 'day' &&
    typeof match.playedOn.value === 'string' &&
    match.opponent !== null &&
    teamNames.has(match.opponent) &&
    match.result !== null &&
    match.score !== null &&
    match.conflictRefs.length === 0 &&
    match.claims.length === 0
  )
}

/** Goals attached to a Player Master id — scorer rows, and a sourced event where the row has no id. */
export function goalsOf(match: MatchRecord): { goals: GoalRow[]; phantoms: string[] } {
  if (match.scorersDisputed) return { goals: [], phantoms: [] }
  const goals: GoalRow[] = []
  const phantoms: string[] = []
  const events = match.events.filter(
    (e) => (e.type === 'goal' || e.type === 'penalty_goal') && e.playerId && e.clubSlug === 'הפועל-תל-אביב',
  )
  for (const s of match.scorers) {
    if (s.ownGoal) continue
    if (s.playerId && s.confidence >= MIN_CONFIDENCE) {
      goals.push({ matchId: match.matchId, playerId: s.playerId, minute: s.minute, penalty: s.penalty })
      continue
    }
    const event = events.find((e) => e.minute === s.minute && e.playerId)
    if (event?.playerId) {
      goals.push({ matchId: match.matchId, playerId: event.playerId, minute: s.minute, penalty: s.penalty || event.type === 'penalty_goal' })
    } else if (s.nameHe) {
      phantoms.push(s.nameHe)
    }
  }
  for (const e of events) {
    if (!goals.some((g) => g.playerId === e.playerId && g.minute === e.minute)) {
      goals.push({ matchId: match.matchId, playerId: e.playerId as string, minute: e.minute, penalty: e.type === 'penalty_goal' })
    }
  }
  return { goals, phantoms }
}

export function buildBank(input: BuildInput): BlindCowBank {
  const pool = input.players.filter((p) => p.kind === 'player')
  const N = pool.length
  const indexOf = new Map(pool.map((p, i) => [p.id, i]))
  const all = pool.map(derive)
  const everyone = bits(N)
  for (let i = 0; i < N; i++) setBit(everyone, i)

  const facts = new Map<string, Fact>()
  const factsOf: Set<string>[] = pool.map(() => new Set())

  function fact(
    key: string,
    make: () => Omit<Fact, 'ids'> & { members: (d: Derived) => boolean },
    owner: number,
  ): void {
    if (!facts.has(key)) {
      const built = make()
      const ids = bits(N)
      for (const d of all) if (built.members(d)) setBit(ids, d.index)
      facts.set(key, { clue: built.clue, phantoms: built.phantoms, groups: built.groups, ids })
    }
    factsOf[owner]?.add(key)
  }
  function explicit(key: string, f: Omit<Fact, 'ids'>, members: Iterable<string>, owner: number): void {
    if (!facts.has(key)) {
      const ids = bits(N)
      for (const id of members) {
        const i = indexOf.get(id)
        if (i !== undefined) setBit(ids, i)
      }
      facts.set(key, { ...f, ids })
    }
    factsOf[owner]?.add(key)
  }

  const pmRef = (field: string) => `player-master#${field}`

  /* ---- A · identity ---- */
  for (const d of all) {
    if (d.nationality) {
      const nat = d.nationality
      fact(
        `nationality:${nat}`,
        () => ({
          clue: { type: 'nationality', family: 'A', labelHe: 'לאום', valueHe: nat, factKey: `nationality:${nat}`, facet: 'origin', sourceRefs: [pmRef('declaredNationality')], confidence: 2 },
          phantoms: null,
          groups: ['origin'],
          // conservative: a foreigner whose nationality nobody declared might be this too
          members: (o) => o.nationality === nat || (o.nationality === null && o.origin !== 'israeli'),
        }),
        d.index,
      )
    } else if (d.origin) {
      const origin = d.origin
      fact(
        `origin:${origin}`,
        () => ({
          clue: { type: 'origin', family: 'A', labelHe: 'מוצא', valueHe: origin === 'israeli' ? 'ישראלי' : 'שחקן זר', factKey: `origin:${origin}`, facet: 'origin', sourceRefs: [pmRef('origin')], confidence: 2 },
          phantoms: null,
          groups: ['origin'],
          members: (o) => o.origin === origin || o.origin === null,
        }),
        d.index,
      )
    }
    if (d.terms.length) {
      const term = d.terms[0] as string
      const code = POSITION_TERMS[term] as string
      fact(
        `position:${term}`,
        () => ({
          clue: { type: 'position', family: 'A', labelHe: 'עמדה', valueHe: term, factKey: `position:${term}`, facet: 'position', sourceRefs: [pmRef('positions.fine')], confidence: 2 },
          phantoms: null,
          groups: ['position'],
          members: (o) => o.terms.includes(term) || (o.terms.length === 0 && (o.codes.length === 0 || o.codes.includes(code))),
        }),
        d.index,
      )
    }
    // the broad line as well as the fine term — never back to back (one facet)
    if (d.codes.length && (!d.terms.length || CODE_HE[d.codes[0] as string] !== d.terms[0])) {
      const code = d.codes[0] as string
      fact(
        `position-code:${code}`,
        () => ({
          clue: { type: 'position', family: 'A', labelHe: 'עמדה', valueHe: CODE_HE[code] ?? code, factKey: `position-code:${code}`, facet: 'position', sourceRefs: [pmRef('positions.codes')], confidence: 2 },
          phantoms: null,
          groups: ['position-code'],
          members: (o) => o.codes.includes(code) || o.codes.length === 0,
        }),
        d.index,
      )
    }
  }

  /* ---- B · career ---- */
  for (const d of all) {
    if (d.firstYear !== null) {
      const decade = Math.floor(d.firstYear / 10) * 10
      fact(
        `era:${decade}`,
        () => ({
          clue: { type: 'era', family: 'B', labelHe: 'תקופה', valueHe: `הגיע להפועל ב${decadeHe(decade)}`, factKey: `era:${decade}`, facet: 'start', sourceRefs: [pmRef('spells')], confidence: 2 },
          phantoms: null,
          groups: ['era'],
          members: (o) => o.firstYear === null || Math.floor(o.firstYear / 10) * 10 === decade,
        }),
        d.index,
      )
    }
    if (d.seasons.length) {
      const debut = d.seasons[0] as string
      const debutYear = seasonStart(debut)
      fact(
        `debut:${debut}`,
        () => ({
          clue: { type: 'season_range', family: 'B', labelHe: 'עונת בכורה', valueHe: `עונת הבכורה שלו בהפועל: ${debut}`, factKey: `debut:${debut}`, facet: 'start', sourceRefs: [pmRef('spells.seasons')], confidence: 2 },
          phantoms: null,
          groups: ['debut'],
          members: (o) => (o.seasons.length ? o.seasons[0] === debut : o.firstYear === null || o.firstYear === debutYear),
        }),
        d.index,
      )
      const count = d.seasons.length
      fact(
        `seasons:${count}`,
        () => ({
          clue: { type: 'season_range', family: 'B', labelHe: 'ותק', valueHe: count === 1 ? 'עונה אחת בסגל הפועל' : `${count} עונות בסגל הפועל`, factKey: `seasons:${count}`, facet: 'length', sourceRefs: [pmRef('spells.seasons')], confidence: 2 },
          phantoms: null,
          groups: ['seasons'],
          members: (o) => o.seasons.length === count || o.seasons.length === 0,
        }),
        d.index,
      )
      if (d.p.currentSquad?.active) {
        const season = d.p.currentSquad.season
        fact(
          `current:${season}`,
          () => ({
            clue: { type: 'season_range', family: 'B', labelHe: 'היום', valueHe: `בסגל של הפועל בעונת ${season}`, factKey: `current:${season}`, facet: 'end', sourceRefs: [pmRef('currentSquad')], confidence: 2 },
            phantoms: null,
            groups: ['end'],
            members: (o) => o.p.currentSquad?.active === true,
          }),
          d.index,
        )
      } else if (count > 1) {
        const last = d.seasons[d.seasons.length - 1] as string
        fact(
          `last:${last}`,
          () => ({
            clue: { type: 'season_range', family: 'B', labelHe: 'עונה אחרונה', valueHe: `העונה האחרונה שלו בהפועל: ${last}`, factKey: `last:${last}`, facet: 'end', sourceRefs: [pmRef('spells.seasons')], confidence: 2 },
            phantoms: null,
            groups: ['end'],
            members: (o) => (o.seasons.length ? o.seasons[o.seasons.length - 1] === last && !o.p.currentSquad?.active : true),
          }),
          d.index,
        )
      }
    }
    if (d.decades.length >= 2) {
      const k = d.decades.length
      fact(
        `decades:${k}`,
        () => ({
          clue: { type: 'era', family: 'B', labelHe: 'עשורים', valueHe: `שיחק בהפועל ב-${k} עשורים שונים`, factKey: `decades:${k}`, facet: 'span', sourceRefs: [pmRef('spells.seasons')], confidence: 2 },
          phantoms: null,
          groups: ['decades'],
          members: (o) => o.decades.length === k || o.decades.length === 0,
        }),
        d.index,
      )
    }
    const now = d.p.currentSquad
    if (now?.active && typeof now.number === 'number' && !d.p.shirtNumbers.some((s) => s.seasonLabel === now.season)) {
      const number = now.number
      explicit(
        `shirt:${number}@${now.season}`,
        {
          clue: { type: 'shirt_number', family: 'B', labelHe: 'מספר חולצה', valueHe: `לובש את מספר ${number} בעונת ${now.season}`, factKey: `shirt:${number}@${now.season}`, facet: 'shirt', sourceRefs: [pmRef('currentSquad.number')], confidence: 2 },
          phantoms: null,
          groups: [`shirt:${number}`],
        },
        all.filter((o) => o.p.currentSquad?.active && o.p.currentSquad.season === now.season && o.p.currentSquad.number === number).map((o) => o.p.id),
        d.index,
      )
    }
    if (now?.active && now.captain) {
      explicit(
        `captain:${now.season}`,
        {
          clue: { type: 'achievement', family: 'C', labelHe: 'סרט הקפטן', valueHe: `קפטן הפועל בעונת ${now.season}`, factKey: `captain:${now.season}`, facet: 'captain', sourceRefs: [pmRef('currentSquad.captain')], confidence: 2 },
          phantoms: null,
          groups: ['captain'],
        },
        all.filter((o) => o.p.currentSquad?.active && o.p.currentSquad.captain && o.p.currentSquad.season === now.season).map((o) => o.p.id),
        d.index,
      )
    }
    if (d.p.spells.length >= 2) {
      const spells = d.p.spells.length
      fact(
        `spells:${spells}`,
        () => ({
          clue: { type: 'season_range', family: 'B', labelHe: 'קדנציות', valueHe: `${spells} תקופות נפרדות בהפועל`, factKey: `spells:${spells}`, facet: 'length', sourceRefs: [pmRef('spells')], confidence: 2 },
          phantoms: null,
          groups: ['spells'],
          members: (o) => o.p.spells.length === spells || o.seasons.length === 0,
        }),
        d.index,
      )
    }
    // a shirt number only with its season (§4.2 B): one clue per number, its latest season
    const byNumber = new Map<number, string>()
    for (const row of d.p.shirtNumbers) {
      if (!row.seasonLabel) continue
      const prev = byNumber.get(row.number)
      if (!prev || row.seasonLabel > prev) byNumber.set(row.number, row.seasonLabel)
    }
    for (const [number, season] of [...byNumber].sort((a, b) => a[0] - b[0]).slice(0, 2)) {
      explicit(
        `shirt:${number}@${season}`,
        {
          clue: { type: 'shirt_number', family: 'B', labelHe: 'מספר חולצה', valueHe: `לבש את מספר ${number} בעונת ${season}`, factKey: `shirt:${number}@${season}`, facet: 'shirt', sourceRefs: [pmRef('shirtNumbers')], confidence: 2 },
          phantoms: null,
          groups: [`shirt:${number}`],
        },
        all.filter((o) => o.p.shirtNumbers.some((s) => s.number === number && s.seasonLabel === season)).map((o) => o.p.id),
        d.index,
      )
    }
  }

  /* ---- G · the terrace — the TUNE of his song, a title and never a verse (rule 12) ---- */
  if (input.songTunes) {
    const tuneOf = input.songTunes
    for (const d of all) {
      const tune = tuneOf.get(d.p.id)
      if (!tune) continue
      // a tune that carries his own name would give him away (validator rule) — no clue
      const tuneText = fold(tune).toLowerCase()
      const nameTokens = [d.p.displayName, ...d.p.aliases.he, ...d.p.aliases.latin].flatMap((n) =>
        fold(n).toLowerCase().split(' ').filter((x) => x.length >= 3),
      )
      if (nameTokens.some((tok) => tuneText.split(' ').includes(tok))) continue
      explicit(
        `song:${tune}`,
        {
          clue: { type: 'song', family: 'G', labelHe: 'שיר היציע', valueHe: `היציע שר לכבודו על המנגינה של «${tune}»`, factKey: `song:${tune}`, facet: 'song', sourceRefs: ['player-song-tunes#tuneHe'], confidence: 2 },
          phantoms: null,
          groups: ['song'],
        },
        all.filter((o) => tuneOf.get(o.p.id) === tune).map((o) => o.p.id),
        d.index,
      )
    }
  }

  /* ---- B · the other clubs (infobox `מועדונים`, reviewed names only) ---- */
  if (input.careerClubs) {
    const clubsOf = input.careerClubs
    for (const d of all) {
      const nameTokens = [d.p.displayName, ...d.p.aliases.he, ...d.p.aliases.latin].flatMap((n) =>
        fold(n).toLowerCase().split(' ').filter((x) => x.length >= 3),
      )
      for (const club of clubsOf.get(d.p.id) ?? []) {
        if (fold(club).toLowerCase().split(' ').some((tok) => nameTokens.includes(tok))) continue
        explicit(
          `club:${club}`,
          {
            clue: { type: 'club', family: 'B', labelHe: 'מועדון אחר', valueHe: `שיחק גם ב${club}`, factKey: `club:${club}`, facet: 'club', sourceRefs: ['player-career-clubs#clubs'], confidence: 2 },
            phantoms: null,
            groups: ['club'],
          },
          all.filter((o) => clubsOf.get(o.p.id)?.includes(club)).map((o) => o.p.id),
          d.index,
        )
      }
    }
  }

  /* ---- C · achievements (squad-season attachment only) ---- */
  for (const d of all) {
    if (!d.titles.length) continue
    if (d.titles.some((t) => t.slug === LEAGUE_TITLE)) {
      fact(
        'title-any:league',
        () => ({
          clue: { type: 'achievement', family: 'C', labelHe: 'תואר', valueHe: 'היה בסגל שזכה באליפות', factKey: 'title-any:league', facet: 'title', sourceRefs: [pmRef('spells.titles')], confidence: 2 },
          phantoms: null,
          groups: ['title-any'],
          members: (o) => o.titles.some((t) => t.slug === LEAGUE_TITLE),
        }),
        d.index,
      )
    } else {
      const first = d.titles[0] as Derived['titles'][number]
      fact(
        `title-any:${first.slug}`,
        () => ({
          clue: { type: 'achievement', family: 'C', labelHe: 'תואר', valueHe: `היה בסגל שזכה ב${first.nameHe}`, factKey: `title-any:${first.slug}`, facet: 'title', sourceRefs: [pmRef('spells.titles')], confidence: 2 },
          phantoms: null,
          groups: ['title-any'],
          members: (o) => o.titles.some((t) => t.slug === first.slug),
        }),
        d.index,
      )
    }
    if (d.titles.length >= 2) {
      const n = d.titles.length
      fact(
        `title-count:${n}`,
        () => ({
          clue: { type: 'achievement', family: 'C', labelHe: 'תארים', valueHe: `היה בסגל של ${n} זכיות בתארים`, factKey: `title-count:${n}`, facet: 'title', sourceRefs: [pmRef('spells.titles')], confidence: 2 },
          phantoms: null,
          groups: ['title-count'],
          members: (o) => o.titles.length === n,
        }),
        d.index,
      )
    }
    for (const title of d.titles) {
      const what = title.slug === LEAGUE_TITLE ? 'באליפות' : `ב${title.nameHe}`
      fact(
        `title:${title.slug}@${title.season}`,
        () => ({
          clue: { type: 'achievement', family: 'C', labelHe: 'תואר', valueHe: `היה בסגל שזכה ${what} בעונת ${title.season}`, factKey: `title:${title.slug}@${title.season}`, facet: 'title', sourceRefs: [pmRef('spells.titles')], confidence: 2 },
          phantoms: null,
          groups: [`title-season:${title.season}`],
          members: (o) => o.titles.some((t) => t.slug === title.slug && t.season === title.season),
        }),
        d.index,
      )
    }
  }

  /* ---- D / E · matches, lineups, goals ---- */
  const teamOf = (slug: string) => input.teamNames.get(slug) as string
  const compOf = (slug: string) => input.competitionNames.get(slug) ?? slug.replace(/-/g, ' ')
  const eligible = input.matches.filter((m) => eligibleMatch(m, input.teamNames))
  const byId = new Map(eligible.map((m) => [m.matchId, m]))
  const goalsByMatch = new Map<string, { goals: GoalRow[]; phantoms: string[] }>()
  let eligibleGoals = 0
  for (const m of eligible) {
    const g = goalsOf(m)
    if (g.goals.length || g.phantoms.length) goalsByMatch.set(m.matchId, g)
    eligibleGoals += g.goals.length
  }
  const scorersWhere = (pred: (m: MatchRecord) => boolean) => {
    const ids = new Set<string>()
    const phantoms = new Set<string>()
    const refs: string[] = []
    for (const [matchId, g] of goalsByMatch) {
      const m = byId.get(matchId) as MatchRecord
      if (!pred(m)) continue
      for (const row of g.goals) ids.add(row.playerId)
      for (const name of g.phantoms) phantoms.add(name)
      if (g.goals.length) refs.push(`match-master:${matchId}#scorers`)
    }
    return { ids, phantoms, refs: refs.sort().slice(0, 6) }
  }
  const matchConfidence = (m: MatchRecord) => Math.min(m.confidence, 2)

  const goalsOfPlayer = new Map<string, GoalRow[]>()
  for (const g of goalsByMatch.values()) {
    for (const row of g.goals) {
      const list = goalsOfPlayer.get(row.playerId) ?? []
      list.push(row)
      goalsOfPlayer.set(row.playerId, list)
    }
  }
  const momentByMatchScorer = new Map<string, MomentRecord>()
  for (const moment of input.moments) {
    if (!moment.matchId || !moment.scorer?.playerId || moment.scorer.resolution !== 'exact') continue
    if (moment.conflictRefs.length || moment.confidence < MIN_CONFIDENCE || !byId.has(moment.matchId)) continue
    momentByMatchScorer.set(`${moment.matchId}|${moment.scorer.playerId}`, moment)
  }

  for (const d of all) {
    const id = d.p.id
    // D — lineups
    for (const ref of d.p.lineups) {
      const m = ref.matchId ? byId.get(ref.matchId) : undefined
      if (!m) continue
      const opp = teamOf(m.opponent as string)
      const verb = ref.role === 'start' ? 'פתח בהרכב' : 'נכנס כמחליף'
      explicit(
        `lineup:${m.matchId}:${ref.role}`,
        {
          clue: { type: 'lineup', family: 'D', labelHe: 'הרכב', valueHe: `${verb} מול ${opp} ב${compOf(m.competition)}, ${dateHe(m.playedOn.value as string)}`, factKey: `lineup:${m.matchId}:${ref.role}`, facet: 'lineup', sourceRefs: [`match-master:${m.matchId}#lineupRef`, pmRef('lineups')], confidence: matchConfidence(m) },
          phantoms: null,
          groups: [`match:${m.matchId}`],
        },
        all.filter((o) => o.p.lineups.some((l) => l.matchId === m.matchId && l.role === ref.role)).map((o) => o.p.id),
        d.index,
      )
    }
    // E — goals
    const mine = goalsOfPlayer.get(id) ?? []
    const opponents = new Set<string>()
    const comps = new Set<string>()
    for (const row of mine) {
      const m = byId.get(row.matchId) as MatchRecord
      opponents.add(m.opponent as string)
      comps.add(EURO.has(m.competition) ? 'euro' : m.competition)
    }
    for (const opp of [...opponents].sort()) {
      const s = scorersWhere((m) => m.opponent === opp)
      explicit(
        `goal-vs:${opp}`,
        {
          clue: { type: 'goal', family: 'E', labelHe: 'שער', valueHe: `כבש להפועל מול ${teamOf(opp)}`, factKey: `goal-vs:${opp}`, facet: 'goal', sourceRefs: s.refs, confidence: 2 },
          // a broad clue: an unresolved name cannot be picked in the drawer, and the
          // decisive clues (one match, one minute) still count him — see goal-match
          phantoms: null,
          groups: [`opp:${opp}`],
        },
        s.ids,
        d.index,
      )
    }
    for (const comp of [...comps].sort()) {
      const s = scorersWhere((m) => (comp === 'euro' ? EURO.has(m.competition) : m.competition === comp))
      const label = comp === 'euro' ? 'במפעל אירופי' : `ב${compOf(comp)}`
      explicit(
        `goal-in:${comp}`,
        {
          clue: { type: 'goal', family: 'E', labelHe: 'שער', valueHe: `כבש שער ${label}`, factKey: `goal-in:${comp}`, facet: 'goal', sourceRefs: s.refs, confidence: 2 },
          phantoms: null,
          groups: [`comp:${comp}`],
        },
        s.ids,
        d.index,
      )
    }
    const seenMatch = new Set<string>()
    for (const row of [...mine].sort((a, b) => a.matchId.localeCompare(b.matchId) || (a.minute ?? 0) - (b.minute ?? 0))) {
      const m = byId.get(row.matchId) as MatchRecord
      const opp = teamOf(m.opponent as string)
      const when = dateHe(m.playedOn.value as string)
      const g = goalsByMatch.get(m.matchId) as { goals: GoalRow[]; phantoms: string[] }
      const ref = `match-master:${m.matchId}#scorers`
      if (!seenMatch.has(m.matchId)) {
        seenMatch.add(m.matchId)
        const r = m.result as { hapoel: number; opponent: number }
        explicit(
          `goal-match:${m.matchId}`,
          {
            clue: { type: 'goal', family: 'E', labelHe: 'שער', valueHe: `כבש מול ${opp} ב${compOf(m.competition)} ${m.season}, במשחק שהסתיים ${r.hapoel}:${r.opponent} להפועל`, factKey: `goal-match:${m.matchId}`, facet: 'goal', sourceRefs: [ref], confidence: matchConfidence(m) },
            phantoms: new Set(g.phantoms),
            groups: [`match:${m.matchId}`, `opp:${m.opponent}`],
          },
          g.goals.map((x) => x.playerId),
          d.index,
        )
        const moment = momentByMatchScorer.get(`${m.matchId}|${id}`)
        if (moment) {
          explicit(
            `moment:${moment.momentId}`,
            {
              clue: { type: 'moment', family: 'E', labelHe: 'רגע בארכיון', valueHe: `השער שלו מול ${opp} (${when}) שמור ברגעי הארכיון`, factKey: `moment:${moment.momentId}`, facet: 'goal', sourceRefs: [`match-master:moments#${moment.momentId}`], confidence: 2 },
              phantoms: null,
              groups: [`match:${m.matchId}`],
            },
            [id],
            d.index,
          )
        }
      }
      if (row.minute !== null) {
        const how = row.penalty ? 'כבש בפנדל' : 'כבש'
        explicit(
          `goal-minute:${m.matchId}:${row.minute}`,
          {
            clue: { type: 'moment', family: 'E', labelHe: 'דקה', valueHe: `${how} בדקה ${row.minute} מול ${opp}, ${when}`, factKey: `goal-minute:${m.matchId}:${row.minute}`, facet: 'goal', sourceRefs: [ref], confidence: matchConfidence(m) },
            // an unresolved scorer in the same match might be the one with that minute
            phantoms: new Set(g.phantoms),
            groups: [`match:${m.matchId}`],
          },
          g.goals.filter((x) => x.minute === row.minute).map((x) => x.playerId),
          d.index,
        )
      }
    }
  }

  /* ---- ordering ---- */
  const exclusivityOf = (f: Fact) => {
    const n = popcount(f.ids) + (f.phantoms?.size ?? 0)
    return Math.max(0, Math.min(1, 1 - (n - 1) / Math.max(1, N - 1)))
  }
  const difficultyOf = (x: number): 1 | 2 | 3 | 4 | 5 =>
    x < 0.5 ? 1 : x < 0.85 ? 2 : x < 0.96 ? 3 : x < 0.995 ? 4 : 5

  const clueId = (key: string) => `c_${sha(`bc|${key}`)}`
  const usedFacts = new Set<string>()
  const questions: BlindCowQuestion[] = []
  const previous = new Map((input.previous?.questions ?? []).map((q) => [q.id, q]))

  for (const d of all) {
    const keys = [...(factsOf[d.index] ?? [])].sort()
    if (keys.length < SOLO_MIN_CLUES) continue
    const hasMatchFamily = keys.some((k) => {
      const fam = (facts.get(k) as Fact).clue.family
      return fam === 'D' || fam === 'E'
    })
    const tier = input.recognition?.get(d.p.id)?.tier ?? null
    let current = everyone
    let phantoms: Set<string> | null = null
    const chosen: string[] = []
    const remaining: number[] = []
    const groups = new Set<string>()
    const famCount: Record<string, number> = {}
    let lastFacet = ''
    const sizeOf = (ids: Bits, ph: Set<string> | null) => popcount(ids) + (ph?.size ?? 0)

    for (let step = 1; step <= COMPETITIVE_CLUES; step++) {
      const before = sizeOf(current, phantoms)
      const target = Math.max(1, Math.pow(N, (COMPETITIVE_CLUES - step) / COMPETITIVE_CLUES))
      let best: { key: string; cost: number; ids: Bits; ph: Set<string> | null; size: number } | null = null
      for (const key of keys) {
        if (chosen.includes(key)) continue
        const f = facts.get(key) as Fact
        if (f.groups.some((g) => groups.has(g))) continue
        if (f.clue.facet === lastFacet) continue
        if (!hasBit(f.ids, d.index)) continue
        const ids = and(current, f.ids)
        const ph = narrowPhantoms(phantoms, f.phantoms)
        const size = sizeOf(ids, ph)
        if (size > before || (size === before && before > 1)) continue // widens, or narrows nothing — a restatement
        const fam = f.clue.family
        let cost = Math.abs(Math.log(size) - Math.log(target))
        cost += Math.max(0, (famCount[fam] ?? 0) - 2) * 0.6
        if (!famCount[fam]) cost -= 0.25
        if ((fam === 'D' || fam === 'E') && !famCount.D && !famCount.E && step >= 5) cost -= 0.4
        // the clue order follows how well he is known: a familiar man is caught by a story (a goal,
        // a match, a title) a step or two earlier; a song is a treat for anyone, wherever it fits
        if (tier === 'familiar' && (fam === 'D' || fam === 'E' || fam === 'C') && step >= 3 && step <= 6) cost -= 0.3
        if (f.clue.type === 'song') cost -= 0.35
        if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) <= 1e-9 && key < best.key)) {
          best = { key, cost, ids, ph, size }
        }
      }
      if (!best) break
      const f = facts.get(best.key) as Fact
      chosen.push(best.key)
      remaining.push(best.size)
      for (const g of f.groups) groups.add(g)
      famCount[f.clue.family] = (famCount[f.clue.family] ?? 0) + 1
      lastFacet = f.clue.facet
      current = best.ids
      phantoms = best.ph
    }
    // pass 2 — the ORDER. Pass 1 chose which clues; now lay them broad → narrow: at each
    // step the clue that still leaves the most men standing while narrowing the field,
    // never the facet just shown. A clue that the others have made redundant is dropped.
    {
      const pool = [...chosen]
      const order: string[] = []
      const left: number[] = []
      let ids = everyone
      let ph: Set<string> | null = null
      let facet = ''
      while (pool.length) {
        const before = sizeOf(ids, ph)
        let pick: { key: string; ids: Bits; ph: Set<string> | null; size: number; breadth: number } | null = null
        for (const key of pool) {
          const f = facts.get(key) as Fact
          if (f.clue.facet === facet) continue
          const nextIds = and(ids, f.ids)
          const nextPh = narrowPhantoms(ph, f.phantoms)
          const size = sizeOf(nextIds, nextPh)
          if (size > before || (before > 1 && size === before)) continue
          // most men left first; among equals (the confirmations after he is found) the
          // broader fact first, so the tenth clue is the most particular one
          const breadth = popcount(f.ids)
          if (!pick || size > pick.size || (size === pick.size && breadth > pick.breadth)) {
            pick = { key, ids: nextIds, ph: nextPh, size, breadth }
          }
        }
        if (!pick) break
        order.push(pick.key)
        left.push(pick.size)
        pool.splice(pool.indexOf(pick.key), 1)
        ids = pick.ids
        ph = pick.ph
        facet = (facts.get(pick.key) as Fact).clue.facet
      }
      chosen.splice(0, chosen.length, ...order)
      remaining.splice(0, remaining.length, ...left)
    }
    if (chosen.length < SOLO_MIN_CLUES) continue
    const final = remaining[remaining.length - 1] as number
    if (final > SOLO_MAX_REMAINING) continue
    const families = [...new Set(chosen.map((k) => (facts.get(k) as Fact).clue.family))].sort() as ClueFamily[]
    const confident = chosen.every((k) => (facts.get(k) as Fact).clue.confidence >= MIN_CONFIDENCE)
    const competitive =
      chosen.length === COMPETITIVE_CLUES &&
      families.length >= COMPETITIVE_FAMILIES &&
      final === 1 &&
      (remaining[0] as number) >= 20 &&
      confident &&
      (!hasMatchFamily || families.includes('D') || families.includes('E'))
    const modes: BlindCowMode[] = ['solo']
    if (competitive) modes.push('daily', 'duel')
    if (competitive && d.seasons.length > 0 && d.seasons.length <= 3) modes.push('hardcore')

    for (const k of chosen) usedFacts.add(k)
    const clueIds = chosen.map(clueId)
    const fingerprint = sha(chosen.map((k) => `${k}=${(facts.get(k) as Fact).clue.valueHe}`).join('\n'), 16)
    const qid = `bq_${sha(`bq|${d.p.id}`, 12)}`
    const prev = previous.get(qid)
    const version = prev ? (prev.dataFingerprint === fingerprint ? prev.version : prev.version + 1) : 1
    questions.push({
      id: qid,
      version,
      targetPlayerId: d.p.id,
      targetDisplayNameHe: d.p.displayName,
      clueIds,
      remaining,
      families,
      eligibleModes: modes,
      ...(input.recognition?.get(d.p.id)
        ? (() => {
            const r = input.recognition.get(d.p.id) as PlayerRecognition
            return { recognition: { tier: r.tier, score: r.score, appearances: r.appearances, basis: r.basis } }
          })()
        : {}),
      tags: {
        origin: d.origin,
        decades: d.decades,
        legend: d.seasons.length >= 8 || d.titles.length >= 3,
      },
      dataFingerprint: fingerprint,
    })
  }
  questions.sort((a, b) => a.id.localeCompare(b.id))

  const clues: Record<string, BlindCowClue> = {}
  const byType: Record<string, number> = {}
  for (const key of [...usedFacts].sort()) {
    const f = facts.get(key) as Fact
    const x = exclusivityOf(f)
    const id = clueId(key)
    clues[id] = { id, ...f.clue, difficulty: difficultyOf(x), exclusivity: Math.round(x * 1000) / 1000 }
    byType[f.clue.type] = (byType[f.clue.type] ?? 0) + 1
  }
  const count = (mode: BlindCowMode) => questions.filter((q) => q.eligibleModes.includes(mode)).length
  const changed = questions.some((q) => (previous.get(q.id)?.version ?? 1) !== q.version) || previous.size !== questions.length

  return {
    schemaVersion: 1,
    bankVersion: input.previous ? input.previous.bankVersion + (changed ? 1 : 0) : 1,
    builtFrom: { playerMasterSha: input.playerMasterSha, matchMasterSha: input.matchMasterSha },
    rules: {
      minConfidence: MIN_CONFIDENCE,
      competitiveClues: COMPETITIVE_CLUES,
      competitiveFamilies: COMPETITIVE_FAMILIES,
      soloMinClues: SOLO_MIN_CLUES,
      pool: N,
    },
    counts: {
      players: N,
      withQuestion: questions.length,
      solo: count('solo'),
      daily: count('daily'),
      duel: count('duel'),
      hardcore: count('hardcore'),
      clues: Object.keys(clues).length,
      byType,
      eligibleMatches: eligible.length,
      eligibleGoals,
    },
    clues,
    questions,
  }
}

export type { ClueType }
