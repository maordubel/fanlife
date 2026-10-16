import type {CompetitionKind, FinalResult} from '@/lib/fixtures/types'

/** What the result means for THE CLUB the card is for — never assumed from which side is "home". */
export type Outcome = 'win' | 'draw' | 'loss'

/**
 * League / cup / friendly from the provider's competition name. Conservative: a name that is not clearly one of them is
 * `unknown`, and `unknown` never earns a points claim ("THE POINTS ARE OURS" says points were at stake).
 */
export function competitionKind(name: string | null): CompetitionKind {
  const s = (name ?? '').toLowerCase()
  if (!s) return 'unknown'
  if (/friendl|club friendlies|testimonial/.test(s)) return 'friendly'
  if (/\bcup\b|copa|coupe|pokal|kupa|trophy|shield|super ?cup|play-?off|qualif|champions league|europa|conference|uefa/.test(s)) return 'cup'
  if (/premier|super league|superleague|ligat|\bliga\b|league|serie [a-z]|bundesliga|ligue|eredivisie|superliga|primeira|prva|hnl/.test(s)) return 'league'
  return 'unknown'
}

export function clubScores(r: Pick<FinalResult, 'homeScore' | 'awayScore' | 'clubSide'>) {
  return r.clubSide === 'home' ? {club: r.homeScore, other: r.awayScore} : {club: r.awayScore, other: r.homeScore}
}

/** The club's outcome. A shoot-out decides a level match; without its kicks there is no outcome (null — needs review). */
export function outcomeOf(r: Pick<FinalResult, 'homeScore' | 'awayScore' | 'clubSide' | 'finalStatus' | 'penalties'>): Outcome | null {
  const {club, other} = clubScores(r)
  if (club !== other) return club > other ? 'win' : 'loss'
  if (r.finalStatus !== 'PEN') return 'draw'
  if (!r.penalties) return null
  const k = r.clubSide === 'home' ? [r.penalties.home, r.penalties.away] : [r.penalties.away, r.penalties.home]
  return k[0]! === k[1]! ? null : k[0]! > k[1]! ? 'win' : 'loss'
}

/** The line under the picture. Spec §4.4: points only where points are shared; "through" never — advancement is not known. */
export function emotionLine(o: Outcome, kind: CompetitionKind, status: 'FT' | 'AET' | 'PEN'): string {
  if (status === 'PEN') return o === 'win' ? 'WON ON PENALTIES.' : 'WE GO AGAIN.'
  if (o === 'loss') return 'WE GO AGAIN.'
  if (o === 'win') return kind === 'league' ? 'THE POINTS ARE OURS.' : 'THIS ONE IS OURS.'
  return kind === 'league' ? 'SHARED POINTS. SAME LOVE.' : 'LEVEL AT THE WHISTLE.'
}

/** Which picture. A loss or a draw never gets the celebrating terrace. */
export const artFor = (o: Outcome) => (o === 'win' ? 'terrace-crowd' : 'archive-objects') as 'terrace-crowd' | 'archive-objects'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
/** "16 OCT 2026" from the kick-off's UTC date; an honest date-only kick-off still has a date. */
export const dateLine = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
