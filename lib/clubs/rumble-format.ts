/** Rumble formats — no imports on purpose: client components read these, and `rumble.ts` pulls in the 1.3 MB price table. */
export type Pos='GK'|'DF'|'MF'|'FW'
/**
 * A FORMAT is the shape of a draft: which slots, what budget, how many offers per slot. `five` is the game today; `eleven` is the
 * 11-v-11 version the owner announced (10.10.2026) — a 4-3-3 with a budget at the same average price. Every function below takes a
 * format and defaults to `five`, so the engine, the readiness test and the duel are already shaped for eleven; only the stage is not.
 */
export type Format={id:'five'|'eleven';slots:readonly Pos[];budget:number;offers:number}
export const FIVE:Format={id:'five',slots:['GK','DF','MF','MF','FW'],budget:15,offers:3}
// Generic engine format only (kept for the head-to-head tests). The eleven players actually play lives in rumble-xi and its budget ROTATES 33/34/35 by round (budgetFor) — 11.10.2026.
export const ELEVEN:Format={id:'eleven',slots:['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'],budget:33,offers:3}
export const SLOTS:readonly Pos[]=FIVE.slots
export const BUDGET=FIVE.budget,OFFERS=FIVE.offers
