/**
 * סרטוני מעבר — the eight short clips Maor supplied on 30.9.2026.
 *
 * A clip is a CUT, not a fact: it says nothing about the match it leads into. Each one is
 * de-yellowed frame by frame and encoded lossless VP9 (webm) AND h.264 Main/yuv420p/faststart (mp4 — iOS and most phone browsers cannot play the lossless VP9; the mp4 is listed first, its yellow measured on the decoded frames = 0, rule 61) (rule 61 — the yellow is measured on
 * the DECODED frames, and is zero), 270×480 at 24fps so eight of them weigh 29MB together.
 * A clip that cannot play is simply skipped: the card underneath is complete without it.
 */
export type TransitionKey =
  | 'enter-stadium-a'
  | 'enter-stadium-b'
  | 'enter-stand'
  | 'take-ticket'
  | 'generic'
  | 'kobi-friends-road'
  | 'kobi-confetti'
  | 'player-celebrates'

export const TRANSITIONS: Record<TransitionKey, { src: string; mp4: string; ms: number }> = {
  'enter-stadium-a': { src: '/life/transitions/enter-stadium-a.webm', mp4: '/life/transitions/enter-stadium-a.mp4', ms: 2917 },
  'enter-stadium-b': { src: '/life/transitions/enter-stadium-b.webm', mp4: '/life/transitions/enter-stadium-b.mp4', ms: 1959 },
  'enter-stand': { src: '/life/transitions/enter-stand.webm', mp4: '/life/transitions/enter-stand.mp4', ms: 2417 },
  'take-ticket': { src: '/life/transitions/take-ticket.webm', mp4: '/life/transitions/take-ticket.mp4', ms: 1750 },
  generic: { src: '/life/transitions/generic.webm', mp4: '/life/transitions/generic.mp4', ms: 1417 },
  'kobi-friends-road': { src: '/life/transitions/kobi-friends-road.webm', mp4: '/life/transitions/kobi-friends-road.mp4', ms: 2084 },
  'kobi-confetti': { src: '/life/transitions/kobi-confetti.webm', mp4: '/life/transitions/kobi-confetti.mp4', ms: 2292 },
  'player-celebrates': { src: '/life/transitions/player-celebrates.webm', mp4: '/life/transitions/player-celebrates.mp4', ms: 1834 },
}
