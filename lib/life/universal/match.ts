/**
 * LIFE, universal — reading a recorded match.
 *
 * A night from the archive stands on one row whose title is a scoreline ("A 2–1 B · note"). This
 * file turns that title into the facts it states — who was at home, who scored how many, which
 * side was the club's — and into nothing else. The competition is the row's own `hint`; the
 * date is the row's own day. A title it cannot read with certainty gives `null`, never a guess,
 * and then the night is told as a night and not as a match.
 *
 * It also picks which of a club's nights is THE night: the one the life is built to walk into.
 */
import type {ArchiveRef, MatchFacts} from './types'

const SCORE = /^(.+?)\s+(\d+)\s*[–—-]\s*(\d+)\s+(.+?)(?:\s+[·(|]\s*(.*))?$/
/** the other way an archive writes it: "A 2 — B 1" */
const SCORE_SPLIT = /^(.+?)\s+(\d+)\s*[–—-]\s*(.+?)\s+(\d+)$/

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Reads a recorded scoreline. Anything it cannot read with certainty is `null`. */
export function readMatch(title: string, clubNames: readonly string[]): MatchFacts | null {
  const t = title.trim()
  const a = SCORE.exec(t), b = a ? null : SCORE_SPLIT.exec(t)
  const m = a ? {home: a[1]!, hg: a[2]!, ag: a[3]!, away: a[4]!, note: a[5]} : b ? {home: b[1]!, hg: b[2]!, ag: b[4]!, away: b[3]!, note: undefined} : null
  if (!m) return null
  const names = clubNames.map(norm).filter(Boolean)
  // the short name is never used to read a scoreline: "Hapoel" is half the league
  const isUs = (side: string) => names.some(n => norm(side) === n || norm(side).startsWith(n + ' ') || n.startsWith(norm(side) + ' ') || n.endsWith(' ' + norm(side)))
  const home = isUs(m.home), away = isUs(m.away)
  if (home === away) return null
  const homeGoals = Number(m.hg), awayGoals = Number(m.ag)
  const ours = home ? homeGoals : awayGoals, theirs = home ? awayGoals : homeGoals
  const note = (m.note ?? '').replace(/[)\s]+$/u, '').trim()
  return {
    home: m.home.trim(), away: m.away.trim(), homeGoals, awayGoals, us: home ? 'home' : 'away',
    result: ours > theirs ? 'won' : ours < theirs ? 'lost' : 'drew', note: note || null,
  }
}

/** The words an archive uses for a night that mattered. Read from the row, never added to it. */
const BIG = /\b(final|title|champion|won|retained|secured|promotion|promoted|finale|derby)\b|גמר|אליפות|עלייה|דרבי/iu

/**
 * How well a night serves as THE night of a life: a result that can be told, then what the row
 * itself says about it. A defeat can be the night, but only when nothing else was readable.
 */
export function nightWeight(a: ArchiveRef): number {
  const m = a.match
  if (!m) return -1
  const base = m.result === 'won' ? 4 : m.result === 'drew' ? 1 : 0
  const said = `${a.title} ${a.hint}`
  return base + (BIG.test(said) ? 5 : 0) + (m.note ? 1 : 0)
}

/** The night the life walks into: the best-served readable row; ties go to the later one. An unreadable pool gives `null`. */
export function centrepieceOf(rows: readonly ArchiveRef[], chosen?: string): ArchiveRef | null {
  const readable = rows.filter(r => r.match)
  const forced = chosen ? readable.find(r => r.factId === chosen || r.factId.endsWith(':' + chosen) || r.on === chosen) : null
  if (forced) return forced
  let best: ArchiveRef | null = null, w = -1
  for (const r of readable) { const x = nightWeight(r); if (x > w || (x === w && best && (r.on ?? '') > (best.on ?? ''))) { best = r; w = x } }
  return best
}
