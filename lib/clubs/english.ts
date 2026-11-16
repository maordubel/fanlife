import type {ClubData} from './contract'
import {englishName} from './rumble-xi/names'
import {greekToEnglish, hebrewToEnglish, isGreek, isHebrew} from './rumble-xi/translit'
import {enClub, enCompetition, enSponsor, isLatin} from '@/lib/trivia/names'
import phrases from '@/content/manual/names-en/phrases.json'
import {englishTitle} from './title-en'
import {OWNER_KNOWLEDGE_LABEL} from '@/lib/credits/groups'

/**
 * EVERY NAME ON SCREEN IS ENGLISH (owner, 16.11.2026: "make sure all names appear in English only, in all clubs").
 *
 * The archive keeps what its sources wrote (Hebrew for Hapoel Tel Aviv and Hapoel Petah Tikva, Greek for AEK) — that
 * is evidence and it never changes (rules 2, 11). This pass is DISPLAY ONLY: the compiled club the pages read gets
 * English names, in this order of trust:
 *   1. a reviewed dictionary — men (`player-names-en.json` + the editor overrides), clubs, competitions, sponsors and
 *      the archive's stock phrases (`content/manual/names-en/*`);
 *   2. a club name or competition found INSIDE a line ("הפועל תל אביב 2–1 מכבי יפו") is replaced piece by piece;
 *   3. what no dictionary holds is transliterated by the house convention (flagged in `english-coverage`, never
 *      presented as a translation of meaning).
 * The native spelling is kept where search needs it: a man's archive name joins his aliases.
 */
const NONLATIN = /[Ͱ-Ͽἀ-῿Ѐ-ӿ֐-׿؀-ۿ]/
const P = phrases as {names: Record<string, string>}
const norm = (s: string) => s.normalize('NFC').replace(/[״"]/g, '').replace(/[׳’]/g, "'").replace(/\s+/g, ' ').trim()
const PHRASE = new Map(Object.entries(P.names).map(([k, v]) => [norm(k), v]))
// longest first, so "גביע המדינה" is not eaten by "גביע"
const PHRASE_KEYS = [...PHRASE.keys()].sort((a, b) => b.length - a.length)

/** set by the coverage audit to collect the lines that needed transliteration */
export let MISSES: Map<string, number> | null = null
export const collectMisses = () => (MISSES = new Map())
export const hasNonLatin = (s: unknown): s is string => typeof s === 'string' && NONLATIN.test(s)

const translit = (s: string) => (isGreek(s) ? greekToEnglish(s) : isHebrew(s) ? hebrewToEnglish(s) : s)

/** one name (a club, a competition, a sponsor, a phrase); never returns non-Latin text */
export function enName(s: string): string {
  if (!hasNonLatin(s)) return s
  const t = s.trim()
  return enClub(t) ?? enCompetition(t) ?? enSponsor(t) ?? PHRASE.get(norm(t)) ?? enLine(t)
}

/** a line that mixes names, scores and words: the longest known name wins, left to right; a word nobody knows is transliterated */
export function enLine(s: string): string {
  if (!hasNonLatin(s)) return s
  const whole = PHRASE.get(norm(s))
  if (whole) return whole
  const tokens = norm(s).split(' ')
  const out: string[] = []
  const known = (t: string) => {
    const k = t.replace(/^[(\[«"']+|[)\]»,:;.!?]+$/g, '')
    return k && NONLATIN.test(k) ? enClub(k) ?? enCompetition(k) ?? enSponsor(k) ?? PHRASE.get(norm(k)) ?? null : null
  }
  for (let i = 0; i < tokens.length; ) {
    if (!NONLATIN.test(tokens[i]!)) {
      out.push(tokens[i]!)
      i++
      continue
    }
    let hit: string | null = null
    let len = 0
    for (let j = Math.min(tokens.length, i + 7); j > i; j--) {
      const span = tokens.slice(i, j)
      if (span.some((t) => !NONLATIN.test(t))) continue
      const h = known(span.join(' '))
      if (h) {
        hit = h
        len = j - i
        break
      }
    }
    if (hit) {
      const lead = tokens[i]!.match(/^[(\[«"']+/)?.[0] ?? ''
      const tail = tokens[i + len - 1]!.match(/[)\]»,:;.!?]+$/)?.[0] ?? ''
      out.push(lead + hit + tail)
      i += len
    } else {
      const t = tokens[i]!
      if (MISSES) MISSES.set(s, (MISSES.get(s) ?? 0) + 1)
      out.push(t.replace(/[^\s\d\-–—:·,()/.!?|]+/g, (w) => (NONLATIN.test(w) ? translit(w) : w)))
      i++
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

/** a match line ("A 2 — B 1"): the timeline's own printer first (one format everywhere), then the general reader */
export function enTitle(s: string): string {
  if (!hasNonLatin(s)) return s
  const t = englishTitle(s)
  return hasNonLatin(t) ? enLine(s) : t
}

/** publishers as Hebrew sources name them */
const PUBLISHERS: [RegExp, string][] = [
  [/^ויקיפועל/, 'Vikipoel'], [/^וואלה ספורט|^וואלה/, 'Walla Sport'], [/^הארץ/, 'Haaretz'], [/^מעריב ספורט|^מעריב/, 'Maariv Sport'],
  [/^גלובס/, 'Globes'], [/^מוזיאון הפועל פתח[- ]תקו[ו]?ה/, 'Hapoel Petah Tikva Museum'], [/^מכביפדיה/, 'Maccabipedia'],
  [/^ספריית הפרויקט/, 'Project library'], [/^ידיעות אחרונות/, 'Yedioth Ahronoth'], [/^ספורט 5/, 'Sport 5'], [/^ההתאחדות לכדורגל/, 'Israel Football Association'],
]
/**
 * A citation in English: a Greek title is transliterated (they are mostly men's names), a Hebrew one keeps its publisher
 * in English and says the article is in Hebrew — a headline transliterated letter by letter would help nobody find it.
 */
export function enSource(title: string): string {
  if (!hasNonLatin(title)) return title
  if (title.startsWith(OWNER_KNOWLEDGE_LABEL)) return 'The FAN LIFE team'
  if (!isHebrew(title)) return enLine(title)
  const t = title.trim()
  for (const [rx, en] of PUBLISHERS) {
    if (!rx.test(t)) continue
    const game = /משחק\s+(\d+)/.exec(t)
    return game ? `${en} — match ${game[1]}` : `${en} (in Hebrew)`
  }
  const lead = t.split(/\s+[—·–|]\s+|,\s+/)[0] ?? ''
  return !hasNonLatin(lead) && lead ? `${lead} (in Hebrew)` : 'Hebrew source'
}

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v)

/** the display fields of a record, by kind; anything else (ids, keys, sources, approvals) is left as written */
const LINE_FIELDS = new Set(['name', 'title', 'hint', 'text', 'label', 'fact', 'a', 'b', 'note', 'position', 'round', 'venue', 'city', 'caption', 'opponent', 'stage', 'kind', 'value', 'answer', 'options', 'prompt', 'question', 'correct', 'choices', 'clue', 'subtitle', 'headline', 'story', 'design', 'colours', 'colour', 'trim', 'pattern', 'description', 'detail', 'details', 'collar', 'sleeves', 'nickname'])
const NAME_FIELDS = new Set(['home', 'away', 'competition', 'sponsor', 'maker', 'manufacturer', 'club', 'rival', 'team'])

function enValue(v: unknown, field: string, man: (s: string) => string): unknown {
  if (typeof v === 'string') {
    if (!hasNonLatin(v)) return v
    if (field === 'lineup' || field === 'scorers' || field === 'scorer' || field === 'player') return man(v)
    if (NAME_FIELDS.has(field)) return enName(v)
    if (field === 'title' || field === 'name') return enTitle(v)
    if (LINE_FIELDS.has(field)) return enLine(v)
    return v
  }
  if (Array.isArray(v)) {
    let changed = false
    const out = v.map((x) => {
      const y = enValue(x, field, man)
      if (y !== x) changed = true
      return y
    })
    return changed ? out : v
  }
  if (isRec(v)) {
    let changed = false
    const out: Rec = {}
    for (const [k, x] of Object.entries(v)) {
      // a question's printed citation
      if (k === 'source' && isRec(x) && typeof x.title === 'string' && hasNonLatin(x.title)) {
        out[k] = {...x, title: enSource(x.title)}
        changed = true
        continue
      }
      // provenance stays exactly as the source wrote it
      if (k === 'sources' || k === 'approvedBy' || k === 'notes' || k === 'aliases' || k === 'factKey' || k === 'scope' || k.startsWith('source') || k === 'id') {
        out[k] = x
        continue
      }
      const y = enValue(x, k, man)
      if (y !== x) changed = true
      out[k] = y
    }
    return changed ? out : v
  }
  return v
}

/**
 * The English edition of a compiled club. Pure: returns a new object where something changed, the same object where
 * nothing did (a club already written in Latin letters costs one walk and no copy).
 */
export function englishClub(data: ClubData): ClubData {
  const club = data.identity.id
  const byName = new Map<string, string>()
  const players = data.players?.map((f) => {
    const p = f.value
    if (!hasNonLatin(p.name)) return f
    const en = englishName(club, p.id, p.name)
    const name = hasNonLatin(en) ? translit(en) : en
    byName.set(norm(p.name), name)
    return {...f, value: {...p, name, aliases: p.aliases.includes(p.name) ? p.aliases : [...p.aliases, p.name]}}
  }) ?? null
  const man = (s: string) => byName.get(norm(s)) ?? enLine(s)
  const walk = <T,>(v: T): T => enValue(v, '', man) as T
  return {
    ...data,
    players,
    rivals: walk(data.rivals),
    competitions: walk(data.competitions),
    seasons: walk(data.seasons),
    matches: walk(data.matches),
    trophies: walk(data.trophies),
    kits: walk(data.kits),
    goals: walk(data.goals ?? null),
    stadiums: walk(data.stadiums),
    places: walk(data.places),
    culture: walk(data.culture),
    archive: walk(data.archive),
    timeline: walk(data.timeline),
    memory: walk(data.memory),
    mysteries: walk(data.mysteries),
    trivia: {...data.trivia, questions: walk(data.trivia.questions)},
    // a source's publisher and title are printed in the credits: English too; the owner's first-hand knowledge is the team's
    sources: data.sources.map((src) =>
      hasNonLatin(src.publisher) || hasNonLatin(src.title)
        ? {...src, publisher: enSource(src.publisher), title: enSource(src.title)}
        : src,
    ),
  }
}

/** for the coverage audit: every non-Latin string left on a display field after the pass (should be none) */
export function nonLatinLeft(data: ClubData): {path: string; value: string}[] {
  const out: {path: string; value: string}[] = []
  const go = (v: unknown, path: string, field: string) => {
    if (typeof v === 'string') {
      if (hasNonLatin(v) && (LINE_FIELDS.has(field) || NAME_FIELDS.has(field) || field === 'lineup')) out.push({path, value: v})
    } else if (Array.isArray(v)) v.forEach((x, i) => go(x, `${path}[${i}]`, field))
    else if (isRec(v)) for (const [k, x] of Object.entries(v)) if (!(k === 'sources' || k === 'approvedBy' || k === 'notes' || k === 'aliases' || k === 'factKey' || k === 'scope' || k.startsWith('source'))) go(x, `${path}.${k}`, k)
  }
  go(data, '', '')
  return out
}

export {isLatin}
