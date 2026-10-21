/**
 * LIFE · RUSH — reading a club's approved archive for missions.
 *
 * The Fitter never sees a raw pack. It sees a `ClubArchiveView`: the club's approved archive rows
 * (`ArchiveRef`, the same rows a universal life stands on), its approved primary rival and its
 * recorded home ground. The club side builds the view (`lib/clubs/life/rush.ts`); this file only
 * reads it.
 *
 * What kind of night a row was is read from the row's OWN words — its title and its hint, in the
 * language it was recorded in. A row that does not say it was a final is not a final; a word list
 * that misses a language misses a row (it is never guessed into one).
 */
import type {ArchiveRef} from '../universal/types'
import type {AnchorKind} from './spec'

export type ClubArchiveView = {
  clubId: string
  name: string
  city: string
  /** how the club's own archive spells the club in a match title, in every script it was recorded in */
  ownNames: string[]
  /** the approved primary rival: its name and every spelling the archive uses for it */
  rival: {name: string; aliases: string[]} | null
  /** the recorded home ground's name, or null when the pack names none */
  ground: string | null
  anchors: ArchiveRef[]
}

const FINAL = /\bfinals?\b|גמר|τελικ|endspiel|finale\b|finalu\b/i
/** a semi-final, a quarter-final, the "final round" of a group or a league phase is not a final */
const NOT_FINAL = /semi[-\s]?finals?|quarter[-\s]?finals?|\bfinal\b[^,.;]{0,32}\b(round|tournament|group|stage|matchday|phase)\b|\bfinal (league )?match(day)?\b|phase final|חצי[-\s]?גמר|רבע[-\s]?גמר|שמינית[-\s]?הגמר|ημιτελ|halbfinal|viertelfinal|polufinal/i
const EUROPE = /european cup|champions league|uefa|cup winners|intertoto|europa league|conference league|fairs cup|גביעי? אירופה|ליגת האלופות|κύπελλο πρωταθλητριών|champions-league/i
/** a title is read from the row's own title; its hint counts only when it says the title was won on this night */
const TITLE = /\btitle\b|\bchampions\b(?! league)|\bchampionship\b(?![\s-]play)|league winners|won the league|אליפות|κατέκτησε το πρωτάθλημα|meisterschaft|deutscher meister|prvak/i
const TITLE_HINT = /title (secured|sealed|clinched|won)|(clinch|seal|secur)\w* the (league )?title|championship,? sealed|won the (league|title|championship)/i
const RELEGATION = /relegat|ירידה|ירדה|υποβιβ|abstieg|ispad/i
const PROMOTION = /promot|עלתה|עלייה לליגת|άνοδος|aufstieg|ulazak u/i
const GROUND = /(stadium|ground|arena|park)\b[^.]{0,40}\b(open|opens|opened|rebuilt|inaugurat|moved)|(opens|opened|inaugurates?)\b[^.]{0,40}\b(stadium|ground|arena)|אצטדיון.{0,20}(נחנך|נפתח)/i
const FOUNDING = /\bfound(ed|ing)\b|\bestablished\b|statute is approved|נוסד|ιδρύθηκε|gegründet|osnovan/i
const SCORELINE = /\d+\s*[–—-]\s*\d+/
/** "Home 2–1 Away[, note]" — the form most archives write */
const SIDES_A = /^(.+?)\s+\d+\s*[–—-]\s*\d+\s+([^,(]+?)\s*(?:[,(].*)?$/
/** "Home 2 — Away 1" — the form the Worker's Hebrew archive writes */
const PROSE = /\b(beat|beats|drew|draw|lost|won|win|defeated|in|at|on|after|against|to|with|the|over)\b|ניצח|הפסיד|ενίκησε|νίκησε/i
const SIDES_B = /^(.+?)\s+\d+\s+[–—-]\s+(.+?)\s+\d+\s*$/

const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()

const says = (text: string, names: readonly string[]) => names.map(fold).filter(n => n.length >= 3).some(n => fold(text).includes(n))

/** True when the row names the rival in any recorded spelling, or its HINT calls the night a derby ("Derby County" is a club, not a derby). */
export function namesRival(ref: ArchiveRef, rival: ClubArchiveView['rival']): boolean {
  if (/\bderby\b(?! county)|ντέρμπι|דרבי/i.test(ref.hint)) return true
  return !!rival && says(ref.title, [rival.name, ...rival.aliases])
}

/**
 * Which side the club was on, read from a scoreline title written home side first (the convention of
 * every archive in the packs). Only when exactly one side names the club; otherwise unknown.
 */
export function sideOf(ref: ArchiveRef, ownNames: readonly string[]): 'home' | 'away' | null {
  if (ref.match) return ref.match.us
  const m = SIDES_B.exec(ref.title) ?? SIDES_A.exec(ref.title)
  // a sentence with a score in it ("X beat Y 2-0 in the final") is prose, not a scoreline: no side is read from it
  if (!m || PROSE.test(m[1]!) || PROSE.test(m[2]!)) return null
  const home = says(m[1]!, ownNames), away = says(m[2]!, ownNames)
  return home === away ? null : home ? 'home' : 'away'
}

/** Every kind the row's own words support. Order is stable; a row may be several kinds at once. */
export function kindsOf(ref: ArchiveRef, view: Pick<ClubArchiveView, 'rival' | 'ownNames'>): AnchorKind[] {
  const text = `${ref.title} ${ref.hint}`
  const out: AnchorKind[] = []
  const isMatch = !!ref.match || SCORELINE.test(ref.title) || SIDES_B.test(ref.title)
  if (isMatch) out.push('match')
  const side = isMatch ? sideOf(ref, view.ownNames) : null
  if (side) out.push(side)
  if (isMatch && namesRival(ref, view.rival)) out.push('derby')
  if (FINAL.test(text) && !NOT_FINAL.test(text)) out.push('final')
  if (EUROPE.test(text)) out.push('europe')
  if ((TITLE.test(ref.title) || TITLE_HINT.test(ref.hint)) && !EUROPE.test(ref.title)) out.push('title')
  if (RELEGATION.test(text)) out.push('relegation')
  if (PROMOTION.test(text)) out.push('promotion')
  if (GROUND.test(text)) out.push('ground')
  if (FOUNDING.test(text)) out.push('founding')
  return out
}

/** The view read once: every row with its kinds, so the Fitter counts without re-reading text. */
export type ReadArchive = {view: ClubArchiveView; rows: {ref: ArchiveRef; kinds: Set<AnchorKind>}[]; counts: Record<AnchorKind, number>}

const ALL_KINDS: readonly AnchorKind[] = ['match', 'home', 'away', 'derby', 'final', 'europe', 'title', 'relegation', 'promotion', 'ground', 'founding']

export function readArchive(view: ClubArchiveView): ReadArchive {
  const counts = Object.fromEntries(ALL_KINDS.map(k => [k, 0])) as Record<AnchorKind, number>
  const rows = view.anchors.map(ref => {
    const kinds = new Set(kindsOf(ref, view))
    for (const k of kinds) counts[k]++
    return {ref, kinds}
  })
  return {view, rows, counts}
}
