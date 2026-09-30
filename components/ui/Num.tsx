import type { ReactNode } from 'react'

/**
 * Numbers inside RTL text.
 *
 * A bare "2:1" in an RTL paragraph is reordered by the bidi algorithm and reads
 * "1:2" — the scoreline is literally reversed on screen. Every number that contains a
 * separator (score, date, ratio, range) must be isolated LTR. `<bdi dir="ltr">` does
 * both: it isolates the run and fixes its direction.
 *
 * Use Score for anything with a colon, Num for plain figures.
 */

export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={`tabular-nums ${className ?? ''}`}>
      {children}
    </bdi>
  )
}

/**
 * A match line in Hebrew.
 *
 * `<bdi dir="ltr">2:1</bdi>` fixes the digits' internal order but NOT the thing that
 * actually confuses a reader: in an RTL line the home team is written first, on the
 * right, while an LTR score puts the home number on the LEFT — right next to the away
 * team. "לוקומוטיב 0:1 הפועל" is read as Lokomotiv winning. The score was never
 * reversed; its adjacency was.
 *
 * So no separator score is ever printed between two names. Each number sits immediately
 * beside the team it belongs to, where adjacency cannot lie:
 *
 *     הפועל תל אביב 2 — לוקומוטיב מוסקבה 1
 */
export function matchLine(
  homeName: string,
  homeScore: number | null,
  awayName: string,
  awayScore: number | null,
): string {
  if (homeScore === null || awayScore === null) return `${homeName} — ${awayName}`
  return `${homeName} ${homeScore} — ${awayName} ${awayScore}`
}

/** The same line as elements, for a screen. */
export function MatchLine({
  homeName,
  homeScore,
  awayName,
  awayScore,
  className,
}: {
  homeName: string
  homeScore: number | null
  awayName: string
  awayScore: number | null
  className?: string
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className ?? ''}`}>
      <span>{homeName}</span>
      {homeScore !== null && <Num className="font-bold text-red">{homeScore}</Num>}
      <span aria-hidden="true">—</span>
      <span>{awayName}</span>
      {awayScore !== null && <Num className="font-bold text-red">{awayScore}</Num>}
    </span>
  )
}
