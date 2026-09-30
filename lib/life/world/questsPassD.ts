import type { LocationId } from '../types'

import type { HotspotDef } from './scenes'
import type { Condition } from './types'

/**
 * ============================================ pass D — המבוגר מחליט במקום (28.9.2026) ====
 *
 * `IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27` §41–§63: *"expose the primary hotspot/actor/exit
 * in the world; do not open a menu before the player sees the scene"*. אלה הנקודות שפרקי
 * 2013–2026 מדליקים בחדרים — ארבע הגישות של המשרד, ההכנות בדרייב-אין, השבוע על המקרר —
 * כל אחת עם `when` שנפתח מההתחייבות ונסגר מהמעשה, באותה לולאה של `quests90e.ts`
 * (`scenes.ts`). התוכן בקבצי הפרקים; כאן רק המקום.
 */

const f = (flag: string): Condition => ({ flag })
const no = (flag: string): Condition => ({ notFlag: flag })
const all = (...conditions: Condition[]): Condition => ({ all: conditions })

/** 2025 · O02 — the seller's hour: open while it runs, and each corner only until it is closed */
const HOUR = all(f('o:brief'), no('o:verdict'))
const MONEY_OPEN = all(HOUR, no('o:tri:money'), no('o:tri:partner'))

export const PASS_D_SPOTS: Partial<Record<LocationId, HotspotDef[]>> = {
  'flat-abroad': [
    // 2025 · X05 — the laptop on the low table: the leave for May, before the promise (`x-leave`)
    { id: 'x-spot-leave', era: '2025-abroad', x: 0.49, y: 0.66, w: 0.06, act: 'x-leave', verb: 'take', labelHe: 'המחשב — לבקש חופש במאי', prop: { key: 'propLaptop', size: 0.05, at: { x: 0.495, y: 0.447 } }, when: all(f('x:later'), no('x:leave')), priority: 4 },
  ],
  'drive-in': [
    // 2015 · N05 — before the crowd: four things in the empty hall, time for two (`chapter2015newhall.ts`)
    { id: 'nr-spot-banner', era: '2015-newhall', x: 0.3, y: 0.76, w: 0.06, act: 'nr-do-banner', verb: 'hold', labelHe: 'הבד הישן — למעקה מעל הכניסה', when: all(f('nr:prep'), no('nr:crowd'), no('nr:did:banner')), priority: 4 },
    { id: 'nr-spot-confetti', era: '2015-newhall', x: 0.86, y: 0.78, w: 0.06, act: 'nr-do-confetti', verb: 'take', labelHe: 'נייר אדום — למושבים מימין', when: all(f('nr:prep'), no('nr:crowd'), no('nr:did:confetti')), priority: 4 },
    { id: 'nr-spot-families', era: '2015-newhall', x: 0.16, y: 0.8, w: 0.05, act: 'nr-do-families', verb: 'talk', labelHe: 'הדלתות — לחכות למשפחות', when: all(f('nr:prep'), no('nr:crowd'), no('nr:did:families')), priority: 4 },
    { id: 'nr-spot-seat', era: '2015-newhall', x: 0.72, y: 0.76, w: 0.05, act: 'nr-do-seat', verb: 'sit', labelHe: 'שורה — לשבת', when: all(f('nr:prep'), no('nr:crowd'), no('nr:did:seat')), priority: 3 },
  ],
  home: [
    // 2017 · P06 — Kobi's question answered with a thing in his living room, not a line from a menu
    { id: 'p-spot-form', era: '2017-after', x: 0.72, y: 0.77, w: 0.06, act: 'p-do-central', verb: 'take', labelHe: 'טופס המנוי, על השולחן', when: all(f('p:asked'), no('p:choice')), priority: 4 },
    { id: 'p-spot-chair', era: '2017-after', x: 0.3, y: 0.78, w: 0.05, act: 'p-do-peripheral', verb: 'sit', labelHe: 'הכיסא ליד אבא, מול הטלוויזיה', when: all(f('p:asked'), no('p:choice')), priority: 4 },
    { id: 'p-spot-phone', era: '2017-after', x: 0.85, y: 0.77, w: 0.05, act: 'p-do-distance', verb: 'hold', labelHe: 'הטלפון על הספה — הקבוצה של שער 5', when: all(f('p:asked'), no('p:choice')), priority: 4 },
    // 2013 · L04 — the diary on the fridge, while the week is still half empty (`hh-week-resume`)
    { id: 'hh-diary-fridge', era: '2013-household', x: 0.31, y: 0.6, w: 0.05, act: 'hh-week-resume', verb: 'look', labelHe: 'היומן על המקרר', when: all(f('hh:week'), no('hh:planned')), priority: 4 },
  ],
  office: [
    { id: 'o-spot-money', era: '2025-owner', x: 0.45, y: 0.62, w: 0.08, act: 'o-tri-money', verb: 'look', labelHe: 'הלוח של מיכל — העתודה', when: MONEY_OPEN, priority: 4 },
    { id: 'o-spot-partner', era: '2025-owner', x: 0.52, y: 0.66, w: 0.05, act: 'o-tri-partner', verb: 'talk', labelHe: 'פרדי — הדרך המהירה', when: MONEY_OPEN, priority: 3 },
    { id: 'o-spot-squad', era: '2025-owner', x: 0.25, y: 0.64, w: 0.05, act: 'o-tri-squad', verb: 'watch', labelHe: 'המחשב — המנהל המקצועי בווידאו', when: all(HOUR, no('o:tri:squad')), priority: 4 },
    { id: 'o-spot-fans', era: '2025-owner', x: 0.9, y: 0.7, w: 0.06, act: 'o-tri-fans', verb: 'talk', labelHe: 'יבגני, ליד החלון', when: all(HOUR, no('o:tri:fans')), priority: 4 },
  ],
}
