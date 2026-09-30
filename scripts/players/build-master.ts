/**
 * npm run players:master — Player Master v2 (21.9.2026).
 *
 * One record per PERSON the football archive knows, keyed by the minted `p_…` id from
 * `content/manual/player-ids.json` (rule 35, for people). Every other file's way of
 * naming him — slug, spelling, Latin, a shirt-number spelling a reviewer attached — is
 * resolved to that id through the registry and nothing else (rule 7). A spelling that
 * reaches nobody is REPORTED in `unresolved`, never promoted to a person: Player Master v1
 * minted 61 phantom people out of `shirt-numbers.json` spellings, and that is the defect
 * this version exists to remove.
 *
 * What it keeps apart, because they are different claims:
 *   · `foreignSlot` — ויקיפועל's "שחקנים זרים (כדורגל)" category: the CLUB's record of who
 *     took a foreign slot. Never nationality.
 *   · `declaredNationality` / `nationalityClaims` — what a squad sheet or Hebrew Wikipedia
 *     declared. Never inferred from a birthplace or a Latin spelling.
 *   · `origin` — the pickers' legacy facet, exactly as `lib/game/roster-facets.ts` has
 *     always decided it, so the gates run unchanged while they move to `foreignSlot`.
 *   · `spells[].documentedGoals` / `archiveGoals` — scorer rows the archive holds, flagged
 *     `complete: false`. Never a career total.
 *
 * Deterministic: the same inputs give the same bytes (no timestamps; code-point order, not
 * `localeCompare`). `inputsSha` fingerprints every input file, and
 * `tests/player-master.test.ts` fails when it is stale — run this script, commit the output.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  buildIdentityIndex,
  identityKey,
  type FacetSource,
  type PlayerIdEntry,
  type PlayerKind,
  type PlayerLineupRef,
  type PlayerMasterV2File,
  type PlayerMasterV2Record,
  type PlayerSpellV2,
  type Position,
  type SeasonNumber,
  type SourceRef,
  type UnresolvedSpelling,
} from '@/lib/archive/player-identity'
import { fold } from '@/lib/game/roster-search'
import { byCodePoint, planPersons, type PlayerAliasesFile } from '@/scripts/ingest/lib/playerIds'

let ROOT = process.cwd()
const CONFIDENCE_FLOOR = 2
const OUT = 'content/generated/player-master.json'

/** Every file the master reads. Order is the fingerprint's order — append, never re-sort. */
export const PLAYER_MASTER_INPUTS = [
  'content/manual/player-ids.json',
  'content/manual/player-aliases.json',
  'content/manual/people.json',
  'content/manual/players-roster.json',
  'content/manual/association-roles.json',
  'content/manual/election-candidates.json',
  'content/manual/player-facts.json',
  'content/manual/player-facts-vikipoel.json',
  'content/manual/player-facts-seasons.json',
  'content/manual/squads.json',
  'content/manual/shirt-numbers.json',
  'content/manual/lineups.json',
  'content/manual/match-ids.json',
  'content/manual/match-scorers.json',
  'content/manual/trophies.json',
  'content/manual/competitions.json',
  'content/manual/kit-designs.json',
  'content/manual/kit-assembly.json',
  'content/raw/vikipoel-player-wikitext.json',
] as const

/** sha256 over (path, sha256(bytes)) for every input, in list order. */
export function inputsSha(root: string, inputs: readonly string[] = PLAYER_MASTER_INPUTS): string {
  const hash = createHash('sha256')
  for (const file of inputs) {
    const bytes = readFileSync(join(root, file))
    hash.update(`${file}\n${createHash('sha256').update(bytes).digest('hex')}\n`)
  }
  return hash.digest('hex')
}

type Row = Record<string, any>
const read = (file: string): any => JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
const recordsOf = (doc: any): Row[] => (Array.isArray(doc?.records) ? doc.records : Array.isArray(doc?.table) ? doc.table : [])
const confidenceOf = (row: Row, doc: any): number =>
  typeof row.confidence === 'number' ? row.confidence : typeof doc?.confidence === 'number' ? doc.confidence : 0

const POSITIONS: readonly Position[] = ['GK', 'DF', 'MF', 'FW']
const asPosition = (raw: unknown): Position | null =>
  typeof raw === 'string' && (POSITIONS as readonly string[]).includes(raw) ? (raw as Position) : null
/** `D1` → DF, `M3` → MF, `F2` → FW, `GK` → GK — the rule `roster-facets.ts` uses. */
function slotToPosition(slot: string): Position | null {
  if (slot.startsWith('GK') || slot.startsWith('G')) return 'GK'
  if (slot.startsWith('D')) return 'DF'
  if (slot.startsWith('M')) return 'MF'
  if (slot.startsWith('F')) return 'FW'
  return null
}
const seasonYear = (label: string): number => Number(label.slice(0, 4))
const labelYear = (label: string): number | null => {
  const m = label.match(/(\d{4})/)
  return m ? Number(m[1]) : null
}
const uniq = <T,>(values: Iterable<T>): T[] => [...new Set(values)]

/** Player Master v1's id for a name — kept only so a v1 id handed to a reader resolves. */
function legacyId(name: string): string {
  const key = name
    .normalize('NFKD')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[׳״'"’`._(),\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return `player-${createHash('sha1').update(key).digest('hex').slice(0, 12)}`
}

/**
 * Build the master in memory. Pure over the files under `root`; the test compares its
 * serialisation with the committed file byte for byte.
 */
export function buildPlayerMaster(root = process.cwd()): { out: PlayerMasterV2File; problems: string[] } {
  ROOT = root
  const registry = (read('content/manual/player-ids.json') as { records: PlayerIdEntry[] }).records
  const aliasesFile = read('content/manual/player-aliases.json') as PlayerAliasesFile
  const identity = buildIdentityIndex(registry)
  const plan = planPersons(ROOT)
  const planned = new Map(plan.persons.map((person) => [person.slug, person]))
  const resolveId = (name: string | null | undefined): string | null => identity.resolve(name)?.id ?? null

  /* ------------------------------------------------------------ the people */
  type Work = {
    entry: PlayerIdEntry
    displayName: string
    from: ('people' | 'roster')[]
    provenance: Map<string, SourceRef>
    // legacy facets, weakest first (roster-facets.ts)
    position: Position | null
    positions: Position[] | null
    positionFrom: FacetSource | null
    origin: 'israeli' | 'foreign' | null
    originFrom: FacetSource | null
    fromYear: number | null
    toYear: number | null
    fine: string[] | null
    foreignSlot: 'israeli' | 'foreign' | null
    nationality: Map<string, { origin: 'israeli' | 'foreign'; nationalityHe?: string; from: string }>
    declared: Set<string>
    squadSeasons: Set<string>
    shirtNumbers: SeasonNumber[]
    clubNumbers: Set<number>
    lineups: PlayerLineupRef[]
    goalsBySeason: Map<string, number>
    coach: boolean
    playerEvidence: string[]
    currentSquad?: PlayerMasterV2Record['currentSquad']
  }
  const work = new Map<string, Work>()
  for (const entry of registry) {
    const person = planned.get(entry.slug)
    if (!person) continue // a registry row whose person left the archive keeps its id, not a record
    work.set(entry.id, {
      entry,
      displayName: person.displayName,
      from: person.from,
      provenance: new Map(),
      position: null,
      positions: null,
      positionFrom: null,
      origin: null,
      originFrom: null,
      fromYear: null,
      toYear: null,
      fine: null,
      foreignSlot: null,
      nationality: new Map(),
      declared: new Set(),
      squadSeasons: new Set(),
      shirtNumbers: [],
      clubNumbers: new Set(),
      lineups: [],
      goalsBySeason: new Map(),
      coach: false,
      playerEvidence: [],
    })
  }
  const who = (name: string | null | undefined): Work | null => {
    const id = resolveId(name)
    return id ? (work.get(id) ?? null) : null
  }
  const cite = (w: Work, file: string, row?: Row) => {
    if (w.provenance.has(file)) return
    w.provenance.set(file, {
      file,
      ...(row?.sourceTitle ? { sourceTitle: String(row.sourceTitle) } : {}),
      ...(row?.sourceUrl ? { sourceUrl: String(row.sourceUrl) } : {}),
    })
  }
  for (const w of work.values()) {
    for (const list of w.from) cite(w, list === 'people' ? 'people.json' : 'players-roster.json')
    if (w.from.includes('roster')) w.playerEvidence.push('players-roster.json — ויקיפועל: שחקני הפועל תל אביב (כדורגל)')
  }

  const unresolved: UnresolvedSpelling[] = []
  const report = (nameHe: string, file: string, contextHe: string, reason: UnresolvedSpelling['reason']) => {
    const key = identityKey(nameHe)
    const ambiguous = identity.ambiguous.has(key)
    unresolved.push({ nameHe, file, contextHe, reason: ambiguous ? 'ambiguous' : reason })
  }

  /* ---- 1. shirt numbers — the Latin-spelling origin (weakest) and the season numbers */
  const shirtDoc = read('content/manual/shirt-numbers.json')
  const shirtMisses = new Map<string, Row[]>()
  for (const row of recordsOf(shirtDoc)) {
    const w = who(row.personNameHe)
    if (!w) {
      const list = shirtMisses.get(row.personNameHe) ?? []
      list.push(row)
      shirtMisses.set(row.personNameHe, list)
      continue
    }
    cite(w, 'shirt-numbers.json', row)
    w.playerEvidence.push('shirt-numbers.json')
    if (!w.shirtNumbers.some((s) => s.number === row.shirtNumber && s.seasonLabel === row.seasonLabel)) {
      w.shirtNumbers.push({
        number: row.shirtNumber,
        seasonLabel: row.seasonLabel,
        historical: true,
        ...(row.disputed === true ? { disputed: true } : {}),
        source: { file: 'shirt-numbers.json', sourceTitle: row.sourceTitle ?? null, sourceUrl: row.sourceUrl ?? null },
      })
    }
    if (confidenceOf(row, shirtDoc) < CONFIDENCE_FLOOR) continue
    const year = labelYear(row.seasonLabel)
    if (year !== null) {
      w.fromYear = w.fromYear === null ? year : Math.min(w.fromYear, year)
      w.toYear = w.toYear === null ? year : Math.max(w.toYear, year)
    }
    if (row.hebrewIsTransliteration === true && w.originFrom === null) {
      w.origin = 'foreign'
      w.originFrom = 'name'
    }
  }

  /* ---- 2. lineups — where he stood THAT night (an inference, labelled as one) */
  const lineupDoc = read('content/manual/lineups.json')
  const matchRegistry = (read('content/manual/match-ids.json') as {
    records: { id: string; dialects?: { dialect: string; key: string }[] }[]
  }).records
  const lineupMatch = new Map<string, string>()
  for (const entry of matchRegistry) {
    for (const d of entry.dialects ?? []) if (d.dialect === 'lineup') lineupMatch.set(d.key, entry.id)
  }
  for (const lineup of recordsOf(lineupDoc)) {
    const ok = confidenceOf(lineup, lineupDoc) >= CONFIDENCE_FLOOR
    const matchId = lineupMatch.get(lineup.matchId) ?? null
    for (const [slot, nameHe] of Object.entries(lineup.xi as Record<string, string>)) {
      const w = who(nameHe)
      if (!w) {
        report(nameHe, 'lineups.json', `${lineup.matchId} · ${slot}`, 'no-person')
        continue
      }
      if (!ok) continue
      cite(w, 'lineups.json', lineup)
      w.playerEvidence.push(`lineups.json ${lineup.matchId}`)
      w.lineups.push({ matchId, lineupKey: lineup.matchId, role: 'start', line: slotToPosition(slot) })
      const position = slotToPosition(slot)
      if (position !== null && (w.positionFrom === null || w.positionFrom === 'lineup')) {
        w.position = position
        w.positions = null
        w.positionFrom = 'lineup'
      }
    }
    for (const raw of (lineup.benchHe ?? []) as string[]) {
      const nameHe = raw.replace(/\s*\(.*$/, '').trim()
      const w = who(nameHe)
      if (!w) {
        report(nameHe, 'lineups.json', `${lineup.matchId} · bench`, 'no-person')
        continue
      }
      if (!ok) continue
      cite(w, 'lineups.json', lineup)
      w.playerEvidence.push(`lineups.json ${lineup.matchId}`)
      w.lineups.push({ matchId, lineupKey: lineup.matchId, role: 'sub', line: null })
    }
    for (const nameHe of (lineup.distractors ?? []) as string[]) {
      if (!who(nameHe)) report(nameHe, 'lineups.json', `${lineup.matchId} · distractor`, 'no-person')
    }
    if (typeof lineup.coachHe === 'string') {
      const w = who(lineup.coachHe)
      if (w) {
        w.coach = true
        cite(w, 'lineups.json', lineup)
      } else report(lineup.coachHe, 'lineups.json', `${lineup.matchId} · coach`, 'no-person')
    }
  }

  /* ---- 3. the research file — position, origin, years */
  const factsDoc = read('content/manual/player-facts.json')
  for (const row of recordsOf(factsDoc)) {
    const w = who(row.personNameHe)
    if (!w) {
      report(row.personNameHe, 'player-facts.json', 'research row', 'no-person')
      continue
    }
    cite(w, 'player-facts.json')
    if (confidenceOf(row, factsDoc) < CONFIDENCE_FLOOR) continue
    const position = asPosition(row.position)
    if (position !== null) {
      w.position = position
      const every = ((row.positions ?? []) as unknown[]).map(asPosition).filter((code): code is Position => code !== null)
      w.positions = every.length > 1 ? every : null
      w.positionFrom = 'database'
    }
    if (row.origin === 'israeli' || row.origin === 'foreign') {
      w.origin = row.origin
      w.originFrom = 'database'
      if (row.originFrom && row.originFrom !== 'vikipoel') {
        w.nationality.set(`${row.originFrom}`, { origin: row.origin, from: String(row.originFrom) })
      }
    }
    if (typeof row.fromYear === 'number') w.fromYear = w.fromYear === null ? row.fromYear : Math.min(w.fromYear, row.fromYear)
    if (typeof row.toYear === 'number') w.toYear = w.toYear === null ? row.toYear : Math.max(w.toYear, row.toYear)
  }

  /* ---- 4. the squad sheet — memberships (any confidence) and the stated facets (≥ 2) */
  const squadDoc = read('content/manual/squads.json')
  const squadRows = recordsOf(squadDoc)
  const currentSeason = squadRows.map((row) => String(row.seasonLabel)).sort(byCodePoint).at(-1)
  for (const row of squadRows) {
    const w = who(row.personSlug) ?? who(row.personName)
    if (!w) {
      report(row.personName, 'squads.json', row.seasonLabel, 'no-person')
      continue
    }
    cite(w, 'squads.json', row)
    w.playerEvidence.push('squads.json')
    w.squadSeasons.add(row.seasonLabel)
    if (row.seasonLabel === currentSeason) {
      const nat = typeof row.nationalityHe === 'string' && row.nationalityHe ? row.nationalityHe : undefined
      w.currentSquad = {
        active: true,
        season: row.seasonLabel,
        ...(typeof row.shirtNumber === 'number' ? { number: row.shirtNumber } : {}),
        ...(row.isCaptain === true ? { captain: true } : {}),
        ...(nat ? { declaredNationality: [nat] } : {}),
        source: { file: 'squads.json', sourceTitle: row.sourceTitle ?? null, sourceUrl: row.sourceUrl ?? null },
      }
      if (typeof row.shirtNumber === 'number' && !w.shirtNumbers.some((s) => s.number === row.shirtNumber && s.seasonLabel === row.seasonLabel)) {
        w.shirtNumbers.push({
          number: row.shirtNumber,
          seasonLabel: row.seasonLabel,
          historical: false,
          source: { file: 'squads.json', sourceTitle: row.sourceTitle ?? null, sourceUrl: row.sourceUrl ?? null },
        })
      }
    }
    if (typeof row.nationalityHe === 'string' && row.nationalityHe) {
      w.declared.add(row.nationalityHe)
      w.nationality.set(`squad:${row.nationalityHe}`, {
        origin: row.nationalityHe === 'ישראל' ? 'israeli' : 'foreign',
        nationalityHe: row.nationalityHe,
        from: 'squad',
      })
    }
    if (confidenceOf(row, squadDoc) < CONFIDENCE_FLOOR) continue
    const position = asPosition(row.position)
    if (position !== null) {
      w.position = position
      w.positions = null
      w.positionFrom = 'squad'
    }
    if (typeof row.nationalityHe === 'string' && row.nationalityHe !== '') {
      w.origin = row.nationalityHe === 'ישראל' ? 'israeli' : 'foreign'
      w.originFrom = 'squad'
    }
  }

  /* ---- 5. ויקיפועל's own records — the foreign SLOT, fine roles, undated club numbers */
  for (const row of recordsOf(read('content/manual/player-facts-vikipoel.json'))) {
    const w = who(row.personNameHe)
    if (!w) {
      report(row.personNameHe, 'player-facts-vikipoel.json', 'ויקיפועל category row', 'no-person')
      continue
    }
    cite(w, 'player-facts-vikipoel.json')
    if (row.origin === 'israeli' || row.origin === 'foreign') w.foreignSlot = row.origin
  }
  for (const page of read('content/raw/vikipoel-player-wikitext.json') as { title: string; revisions: { slots: { main: { content: string } } }[] }[]) {
    const w = who(page.title)
    if (!w) continue
    const text = page.revisions[0]?.slots.main.content ?? ''
    const field = (name: string): string | null => {
      // one field per line in both infobox templates (שחקן כדורגל / שחקן עבר)
      const m = text.match(new RegExp(`(?:^|\\n)\\s*\\|\\s*${name}\\s*=([^\\n]*)`))
      return m ? (m[1] as string).trim() : null
    }
    const role = field('תפקיד')
    if (role) {
      const terms = role
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .split(/[,/;]|\s+ו(?=[א-ת])/)
        .map((term) => term.replace(/[\[\]{}'"]/g, '').trim())
        .filter((term) => term.length > 1)
      if (terms.length) w.fine = uniq(terms)
    }
    for (const name of ['מספר בהפועל', 'מספרים נוספים']) {
      const value = field(name)
      if (!value) continue
      for (const m of value.replace(/\[\[[^\]|]*\|/g, '').matchAll(/\d{1,3}/g)) {
        const n = Number(m[0])
        if (n > 0 && n < 100) w.clubNumbers.add(n)
      }
    }
    cite(w, 'vikipoel-player-wikitext.json')
  }

  /* ---- 6. documented goals — the scorer rows, at the floor, never a total */
  const scorerDoc = read('content/manual/match-scorers.json')
  let scorerNamesUnresolved = 0
  for (const match of recordsOf(scorerDoc)) {
    if (confidenceOf(match, scorerDoc) < CONFIDENCE_FLOOR) continue
    for (const goal of (match.goals ?? []) as Row[]) {
      if (goal.ownGoal === true) continue
      const w = who(goal.playerSlug) ?? who(goal.scorerNameHe)
      if (!w) {
        scorerNamesUnresolved += 1
        continue
      }
      cite(w, 'match-scorers.json')
      w.playerEvidence.push('match-scorers.json')
      w.goalsBySeason.set(match.seasonLabel, (w.goalsBySeason.get(match.seasonLabel) ?? 0) + 1)
    }
  }

  /* ---- 7. titles and home kits, for the spells (lib/kit/playerKit.ts's rule) */
  const trophyDoc = read('content/manual/trophies.json')
  const competitionName = new Map<string, string>()
  for (const row of recordsOf(read('content/manual/competitions.json'))) competitionName.set(row.slug, row.nameHe)
  const titlesIn = new Map<string, { seasonLabel: string; competitionSlug: string; nameHe: string }[]>()
  for (const row of recordsOf(trophyDoc)) {
    if (confidenceOf(row, trophyDoc) < CONFIDENCE_FLOOR || row.result !== 'won') continue
    if (row.sport !== undefined && row.sport !== 'football') continue
    const list = titlesIn.get(row.seasonLabel) ?? []
    list.push({ seasonLabel: row.seasonLabel, competitionSlug: row.competitionSlug, nameHe: competitionName.get(row.competitionSlug) ?? row.competitionSlug })
    titlesIn.set(row.seasonLabel, list)
  }
  const kitDoc = read('content/manual/kit-designs.json')
  const homeKit = new Set<string>()
  for (const row of recordsOf(kitDoc)) {
    if (confidenceOf(row, kitDoc) >= CONFIDENCE_FLOOR && row.variant === 'home') homeKit.add(row.seasonLabel)
  }
  for (const row of (read('content/manual/kit-assembly.json').seasons ?? []) as Row[]) {
    if (row.variant === 'home') homeKit.add(row.seasonLabel)
  }
  const bestOf = (candidates: string[]): { seasonLabel: string; why: 'trophy' | 'run' } | null => {
    if (candidates.length === 0) return null
    const honoured = candidates.filter((season) => (titlesIn.get(season) ?? []).length > 0)
    if (honoured.length > 0) {
      const sorted = [...honoured].sort(
        (a, b) => (titlesIn.get(b)?.length ?? 0) - (titlesIn.get(a)?.length ?? 0) || seasonYear(a) - seasonYear(b),
      )
      return { seasonLabel: sorted[0] as string, why: 'trophy' }
    }
    return { seasonLabel: [...candidates].sort((a, b) => seasonYear(a) - seasonYear(b))[0] as string, why: 'run' }
  }
  const runsOf = (seasons: string[]): string[][] => {
    const runs: string[][] = []
    let current: string[] = []
    for (const season of seasons) {
      const previous = current[current.length - 1]
      if (previous !== undefined && seasonYear(season) !== seasonYear(previous) + 1) {
        runs.push(current)
        current = []
      }
      current.push(season)
    }
    if (current.length > 0) runs.push(current)
    return runs.sort((a, b) => b.length - a.length || seasonYear(a[0] as string) - seasonYear(b[0] as string))
  }
  const wonHe = (season: string) => (titlesIn.get(season) ?? []).map((row) => row.nameHe)

  /* ------------------------------------------------------------ assemble */
  const classifications = new Map(aliasesFile.classifications.map((row) => [row.slug, row]))
  const problems: string[] = [...plan.problems]
  const players: PlayerMasterV2Record[] = []
  for (const w of work.values()) {
    const seasons = [...w.squadSeasons].sort((a, b) => seasonYear(a) - seasonYear(b))
    const runs = runsOf(seasons)
    const longest = runs[0]
    const spells: PlayerSpellV2[] = runs
      .map((run) => {
        const picked = bestOf(run.filter((season) => homeKit.has(season)))
        const goals = run.reduce((sum, season) => sum + (w.goalsBySeason.get(season) ?? 0), 0)
        return {
          id: `${seasonYear(run[0] as string)}-${seasonYear(run[run.length - 1] as string)}`,
          from: seasonYear(run[0] as string),
          to: seasonYear(run[run.length - 1] as string),
          seasons: run,
          primary: run === longest,
          kitSeason: picked?.seasonLabel ?? null,
          kitWhy: picked?.why ?? null,
          wonHe: picked?.why === 'trophy' ? wonHe(picked.seasonLabel) : [],
          titles: run.flatMap((season) => titlesIn.get(season) ?? []),
          numbers: w.shirtNumbers
            .filter((s) => run.includes(s.seasonLabel))
            .map((s) => ({ number: s.number, seasonLabel: s.seasonLabel }))
            .sort((a, b) => byCodePoint(a.seasonLabel, b.seasonLabel) || a.number - b.number),
          ...(goals > 0 ? { documentedGoals: { count: goals, complete: false as const } } : {}),
        }
      })
      .sort((a, b) => a.from - b.from)

    // the whole-career shirt — spell first, then any season he played (playerKit.shirtIndex)
    const drawable = seasons.filter((season) => homeKit.has(season))
    let shirt: { seasonLabel: string; why: 'trophy' | 'run' | 'other'; wonHe: string[] } | undefined
    if (drawable.length > 0) {
      const inSpell = bestOf((longest ?? []).filter((season) => homeKit.has(season)))
      const picked = inSpell ?? { ...(bestOf(drawable) as { seasonLabel: string; why: 'trophy' | 'run' }), why: 'other' as const }
      shirt = { seasonLabel: picked.seasonLabel, why: picked.why, wonHe: picked.why === 'trophy' ? wonHe(picked.seasonLabel) : [] }
    }

    const classification = classifications.get(w.entry.slug)
    const isPlayer = w.playerEvidence.length > 0
    let kind: PlayerKind
    let kindEvidence: string
    const roles: string[] = []
    if (isPlayer) {
      kind = 'player'
      kindEvidence = uniq(w.playerEvidence)[0] as string
      roles.push('player')
      if (classification) problems.push(`${w.entry.slug} is classified ${classification.kind} but the archive holds player evidence`)
    } else if (w.coach) {
      kind = 'coach'
      kindEvidence = 'lineups.json coachHe'
    } else if (classification) {
      kind = classification.kind as PlayerKind
      kindEvidence = `player-aliases.json: ${classification.evidenceHe}`
      roles.push(classification.role)
    } else {
      kind = 'unknown'
      kindEvidence = 'no file places this person in a Hapoel squad, XI or number'
    }
    if (w.coach) roles.push('coach')

    const codes: Position[] = w.position === null ? [] : w.positions ?? [w.position]
    const allNames = uniq([w.displayName, ...w.entry.nameAliases])
    const latin = allNames.filter((name) => /[A-Za-z]/.test(name))
    const hebrew = allNames.filter((name) => !/[A-Za-z]/.test(name) && name !== w.displayName)
    const goalTotal = [...w.goalsBySeason.values()].reduce((a, b) => a + b, 0)

    players.push({
      id: w.entry.id,
      slug: w.entry.slug,
      slugAliases: [...w.entry.slugAliases],
      displayName: w.displayName,
      aliases: { he: hebrew.sort(byCodePoint), latin: latin.sort(byCodePoint) },
      kind,
      roles: uniq(roles),
      kindEvidence,
      positions: {
        codes,
        from: w.positionFrom,
        ...(w.fine ? { fine: { terms: w.fine, from: 'vikipoel-infobox' as const, scope: 'career' as const } } : {}),
      },
      foreignSlot: { status: w.foreignSlot ?? 'unknown', from: w.foreignSlot ? 'vikipoel-category' : null },
      foreignSlotStatus: w.foreignSlot ?? 'unknown',
      ...(w.declared.size ? { declaredNationality: [...w.declared].sort(byCodePoint) } : {}),
      ...(w.nationality.size
        ? { nationalityClaims: [...w.nationality.values()].sort((a, b) => byCodePoint(a.from, b.from)) }
        : {}),
      origin: { value: w.origin, from: w.originFrom },
      years: { from: w.fromYear, to: w.toYear },
      spells,
      ...(shirt ? { shirt } : {}),
      shirtNumbers: [...w.shirtNumbers].sort((a, b) => byCodePoint(a.seasonLabel, b.seasonLabel) || a.number - b.number),
      clubNumbersUndated: [...w.clubNumbers].sort((a, b) => a - b),
      lineups: w.lineups,
      ...(goalTotal > 0
        ? {
            archiveGoals: {
              documentedGoals: goalTotal,
              complete: false as const,
              scope: 'documented match-scorer rows only (confidence ≥ 2, own goals excluded); never a career total',
              source: { file: 'match-scorers.json', sourceTitle: scorerDoc.sources?.[0]?.title ?? null },
            },
          }
        : {}),
      ...(w.currentSquad ? { currentSquad: w.currentSquad } : {}),
      provenance: [...w.provenance.values()].sort((a, b) => byCodePoint(a.file, b.file)),
      legacyIds: uniq(allNames.filter((name) => !/[A-Za-z]/.test(name)).map(legacyId)).sort(byCodePoint),
    })
  }
  players.sort((a, b) => byCodePoint(a.displayName, b.displayName) || byCodePoint(a.slug, b.slug))

  /* ---- the shirt-number spellings nobody could be — with suggestions, never applied */
  const skeleton = (name: string) => fold(name).replace(/[ויאעה\s'"]/g, '')
  const bySkeleton = new Map<string, Set<string>>()
  for (const p of players) {
    for (const name of [p.displayName, ...p.aliases.he]) {
      const set = bySkeleton.get(skeleton(name)) ?? new Set<string>()
      set.add(p.slug)
      bySkeleton.set(skeleton(name), set)
    }
  }
  const bySlug = new Map(players.map((p) => [p.slug, p]))
  for (const [nameHe, rows] of [...shirtMisses].sort((a, b) => byCodePoint(a[0], b[0]))) {
    const context = rows.map((row) => `#${row.shirtNumber} ${row.seasonLabel}`).join(', ')
    const owners = [...(bySkeleton.get(skeleton(nameHe)) ?? [])]
    const candidates =
      owners.length === 1
        ? owners.map((slug) => {
            const p = bySlug.get(slug) as PlayerMasterV2Record
            const seasons = p.spells.flatMap((spell) => spell.seasons)
            const inSquad = rows.every((row) => seasons.includes(row.seasonLabel))
            const numbers = rows.every((row) => p.clubNumbersUndated.includes(row.shirtNumber))
            return {
              slug,
              evidence:
                `same consonant skeleton as '${p.displayName}'` +
                (inSquad ? '; squads.json places him in every season the row names' : '; NOT in the squad for every season the row names') +
                (numbers ? '; ויקיפועל lists the same club number' : ''),
            }
          })
        : undefined
    unresolved.push({
      nameHe,
      file: 'shirt-numbers.json',
      contextHe: context,
      reason: identity.ambiguous.has(identityKey(nameHe)) ? 'ambiguous' : 'no-person',
      ...(candidates ? { candidates } : {}),
      numbers: rows.map((row) => ({
        number: row.shirtNumber as number,
        seasonLabel: row.seasonLabel as string,
        sourceTitle: (row.sourceTitle as string | undefined) ?? null,
        sourceUrl: (row.sourceUrl as string | undefined) ?? null,
      })),
    })
  }

  const inputs = [...PLAYER_MASTER_INPUTS]
  const byKind = players.reduce<Record<string, number>>((acc, p) => ((acc[p.kind] = (acc[p.kind] ?? 0) + 1), acc), {})
  const out: PlayerMasterV2File = {
    schemaVersion: 2,
    inputsSha: inputsSha(ROOT, inputs),
    inputs,
    counts: {
      players: players.length,
      pickable: byKind.player ?? 0,
      coach: byKind.coach ?? 0,
      public: byKind.public ?? 0,
      unknown: byKind.unknown ?? 0,
      mergedSlugs: players.reduce((sum, p) => sum + p.slugAliases.length, 0),
      withPosition: players.filter((p) => p.positions.codes.length > 0).length,
      withForeignSlot: players.filter((p) => p.foreignSlot.status !== 'unknown').length,
      withDeclaredNationality: players.filter((p) => p.declaredNationality).length,
      withSpells: players.filter((p) => p.spells.length > 0).length,
      withManySpells: players.filter((p) => p.spells.length > 1).length,
      withShirtNumbers: players.filter((p) => p.shirtNumbers.length > 0).length,
      withLineups: players.filter((p) => p.lineups.length > 0).length,
      withArchiveGoals: players.filter((p) => p.archiveGoals).length,
      currentSquad: players.filter((p) => p.currentSquad).length,
      unresolvedSpellings: unresolved.length,
      unresolvedShirtNumberSpellings: shirtMisses.size,
      scorerEntriesUnresolved: scorerNamesUnresolved,
      ambiguousKeys: identity.ambiguous.size,
    },
    players,
    excluded: plan.excluded,
    unresolved,
  }
  return { out, problems }
}

/** The exact bytes `npm run players:master` writes. */
export function serialisePlayerMaster(out: PlayerMasterV2File): string {
  return `${JSON.stringify(out, null, 1)}\n`
}

function main(): void {
  const { out, problems } = buildPlayerMaster(process.cwd())
  if (problems.length > 0) {
    for (const problem of problems) console.error(`PROBLEM: ${problem}`)
    process.exitCode = 1
    return
  }
  const path = join(process.cwd(), OUT)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, serialisePlayerMaster(out), 'utf8')
  console.log(JSON.stringify(out.counts))
}

if (process.argv[1] && /build-master\.ts$/.test(process.argv[1])) main()
