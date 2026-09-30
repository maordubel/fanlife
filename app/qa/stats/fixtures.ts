import { orderedFunnel, type FunnelRow, type Stats } from '@/lib/analytics/stats'

/**
 * `?demo=1` on a preview / `next dev` only: a clearly labelled SAMPLE so the page can be
 * looked at before the first real row exists. The page prints "נתוני דוגמה" over it; it
 * is never shown on the live site (the page checks `qaAllowed()` before it reads this).
 */
const rows: FunnelRow[] = [
  ['/xi', 412, 301, 188, 61, 5], ['/trivia', 655, 590, 402, 170, 4], ['/lineup', 233, 150, 71, 70, 7],
  ['/kits/build', 190, 120, 64, 50, 3], ['/kits', 280, 140, 90, 38, 2], ['/memory', 170, 150, 110, 36, 9],
  ['/polls', 140, 120, 99, 18, 1], ['/goal', 301, 260, 118, 140, 2], ['/royal-rumble', 122, 80, 30, 48, 4],
  ['/blind-cow', 388, 350, 211, 139, 4], ['/derby', 205, 170, 120, 44, 6], ['/archive', 520, 380, 0, 0, 0],
  ['/timeline', 160, 130, 70, 58, 5], ['/away-days', 240, 170, 0, 0, 0], ['/life', 300, 220, 40, 160, 3],
].map(([gate, visitors, starters, finishers, leaves, step]) => ({
  gate: gate as string,
  visitors: visitors as number,
  starters: starters as number,
  finishers: finishers as number,
  finishRate: (visitors as number) > 0 ? Math.round((1000 * (finishers as number)) / (visitors as number)) / 10 : null,
  leaves: leaves as number,
  topLeaveStep: (leaves as number) > 0 ? (step as number) : null,
  topLeaveCount: (leaves as number) > 0 ? Math.round((leaves as number) * 0.4) : null,
  crossClicks: Math.round((visitors as number) * 0.05),
  shares: Math.round((finishers as number) * 0.1),
}))

export const DEMO: Stats = {
  state: 'ok',
  days: 7,
  funnel: orderedFunnel(rows),
  daily: [],
  blindCow: {
    counts: { blind_cow_started: 420, blind_cow_solved: 211, blind_cow_gave_up: 139, blind_cow_duel_created: 40, blind_cow_duel_joined: 26, blind_cow_duel_completed: 21, blind_cow_result_shared: 33 },
    avgHintsToSolve: 4.3,
    medianSolveMs: 27400,
    duelJoinRate: 65,
    duelCompleteRate: 80.8,
  },
}
