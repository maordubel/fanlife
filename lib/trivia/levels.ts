/**
 * The four levels of FAN LIFE trivia (owner, 12.10.2026: "four levels, everything in English"). Client-safe, no imports.
 * The shared engine keeps its 1–5 scale and its three stages of four; a level is a NAME over that scale, so a run still
 * climbs Easy → Medium → Hard/Expert and Hard mode deals Medium and up.
 *   Easy   — a casual fan gets it without thinking
 *   Medium — a regular follower knows it; a casual fan guesses
 *   Hard   — you have to have followed the club closely
 *   Expert — deep archive: a league night decades ago, a starting eleven, a shirt number in one season
 */
export const LEVELS=['Easy','Medium','Hard','Expert'] as const
export type Level=typeof LEVELS[number]
/** level 1–4 → the engine's difficulty (2–5) */
export const difficultyOf=(level:1|2|3|4):2|3|4|5=>(level+1) as 2|3|4|5
/** any engine difficulty → its level name (1 reads as Easy) */
export const levelOf=(difficulty:number):Level=>LEVELS[Math.max(0,Math.min(3,difficulty-2))]!
export const clampLevel=(n:number):1|2|3|4=>Math.max(1,Math.min(4,Math.round(n))) as 1|2|3|4
