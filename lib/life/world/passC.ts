import type { LocationId } from '../types'

import { cast, partner } from './rooms2000'
import type { ActorDef, HotspotDef } from './scenes'
import type { Condition } from './types'

/**
 * ============================================ מעבר ג׳ — 2000–2012, בעולם (28.9.2026) ====
 *
 * `IMPLEMENTATION-PASS-PROGRAMMER` §21–§40: *"expose the primary hotspot/actor/exit in the
 * world; do not open a menu before the player sees the scene."* What the twenty chapters of
 * 2000–2012 ask of the hands stands here — the diary on the fridge, the sofa beside Kobi, the
 * chair at the café, the evidence on the café table, the correction on the proof — each with a
 * `when` that opens it when it can be done and closes it once it was.
 *
 * Same mechanism as `STAGED` and `QUEST_SPOTS` (`scenes.ts`, one loop): a row goes into the
 * room, or into the painting the room stands on in that year. The words live in the chapter
 * files; only the place lives here.
 */

const f = (flag: string): Condition => ({ flag })
const no = (flag: string): Condition => ({ notFlag: flag })
const is = (flag: string, value: string | number): Condition => ({ flagIs: { flag, value } })
const all = (...conditions: Condition[]): Condition => ({ all: conditions })
const any = (...conditions: Condition[]): Condition => ({ any: conditions })

/** the three partners `l-close` can write (2011) — named, because the flag is a value, not a raise */
const HAS_PARTNER = any(is('life:partner', 'melanie'), is('life:partner', 'dor'), is('life:partner', 'tamar'))
const NO_PARTNER = no('life:partner')
/** 2012-cups — the evening goes to whoever was promised the hour */
const CUPS_GOING = any(f('n:go'), is('n:plan', 'elsewhere'))

/** 2010-friends — Roma's three practical things are open until they are done, given, or refused */
const I_NEED_OPEN = (need: string): Condition => all(f('i:needs'), no(`i:need:${need}`), no('i:banner'))

export const PASS_C_SPOTS: Partial<Record<LocationId, HotspotDef[]>> = {
  'ussishkin-hall': [
    // 2006-home · H01 S4 — a red scrap of confetti on the parquet, for whoever was there
    { id: 'h-confetti', era: '2006-home', x: 0.52, y: 0.9, w: 0.05, act: 'h-confetti', verb: 'take', labelHe: 'פתק קונפטי אדום על הפרקט', when: all(f('h:derby'), no('h:confetti'), no('h:tv'), no('h:door')), priority: 3 },
  ],
  newsroom: [
    // 2006-desk · J02 S1 — what 2002 left on the desk: the letter (after a rumour), or the envelope (after the truth)
    { id: 'j2-letter', era: '2006-desk', x: 0.44, y: 0.72, w: 0.06, act: 'j2-letter', verb: 'take', labelHe: 'המכתב בכתב יד', when: all(f('life:desk:unverified'), no('j2:read'), no('j:fix')), prop: { key: 'propNoteOpen', size: 0.022, at: { x: 0.44, y: 0.405 } }, priority: 5 },
    { id: 'j2-envelope', era: '2006-desk', x: 0.44, y: 0.72, w: 0.06, act: 'j2-envelope', verb: 'take', labelHe: 'המעטפה בלי שם', when: all(no('life:desk:unverified'), no('j2:read'), no('j:fix')), prop: { key: 'propPaperFolded', size: 0.022, at: { x: 0.44, y: 0.405 } }, priority: 5 },
    // J02 S2 — the phone (to call him first), the recorder (for a second, independent source)
    { id: 'j2-phone', era: '2006-desk', x: 0.64, y: 0.72, w: 0.05, act: 'j2-call', verb: 'take', labelHe: 'הטלפון — המספר מתחתית המכתב', when: all(f('j2:calling'), no('j:fix')), priority: 5 },
    { id: 'j2-recorder', era: '2006-desk', x: 0.575, y: 0.72, w: 0.05, act: 'j2-source', verb: 'hold', labelHe: 'ההקלטה והטלפון — מקור שני', when: all(f('j2:checking'), no('j:fix')), priority: 5 },
  ],
  'ticket-office': [
    // 2010-friends · I01 S2 — two tickets, his money, until the window closes at eight
    { id: 'i-tickets', era: '2010-friends', x: 0.5, y: 0.92, w: 0.07, act: 'i-tickets', verb: 'buy', labelHe: 'שני כרטיסים ללינה וניקו', when: all(I_NEED_OPEN('tickets'), { beforeMinute: 20 * 60 }), priority: 5 },
    // 2002-desk · J01 S2 — the second source: the cashier, and his list
    { id: 'j-second', era: '2002-desk', x: 0.5, y: 0.92, w: 0.07, act: 'j-second', verb: 'talk', labelHe: 'הקופאי — לשאול על הסוכן', when: all(f('j:verifying'), no('j:second'), no('j:first')), priority: 5 },
  ],
  home: [
    // 2010-friends · I01 S2 — the sofa, cleared for two
    { id: 'i-bed', era: '2010-friends', x: 0.73, y: 0.74, w: 0.12, act: 'i-bed', verb: 'hold', labelHe: 'הספה — לפנות אותה לשניים', when: I_NEED_OPEN('bed'), priority: 4 },
    // 2012-cups · N01.2 — the sofa, beside Kobi's armchair
    { id: 'n-sofa', era: '2012-cups', x: 0.73, y: 0.74, w: 0.12, act: 'n-tv', verb: 'sit', labelHe: 'הספה — לשבת עם אבא לגמר', when: all(is('n:plan', 'sofa'), no('n:watching')), priority: 4 },
  ],
  kitchen: [
    // 2012-cups · N01.1 — "לתאם את הבית מראש": the diary on the fridge, before the door
    { id: 'n-fridge', era: '2012-cups', x: 0.67, y: 0.8, w: 0.07, act: 'n-fridge', verb: 'hold', labelHe: 'היומן על המקרר — לכתוב את הערב', when: all(is('n:plan', 'there'), no('n:fridge'), no('n:final')), prop: { key: 'propPlanner', size: 0.03, at: { x: 0.672, y: 0.47 } }, priority: 4 },
  ],
  allenby: [
    // 2010-friends · I01 S2 — Roma: what is not done by hand is given to him, or refused out loud
    { id: 'i-roma', era: '2010-friends', x: 0.672, y: 0.8, w: 0.04, act: 'i-roma', verb: 'talk', labelHe: 'רומא — מה אתה נותן לו', when: all(f('i:needs'), no('i:banner'), any(no('i:need:bed'), no('i:need:tickets'), no('i:need:translate'))), priority: 4 },
    // 2002-desk · J01 S1 — three cards on the café table, each with where it comes from
    { id: 'j-phone', era: '2002-desk', x: 0.745, y: 0.8, w: 0.03, act: 'j-ev-phone', verb: 'take', labelHe: 'הטלפון של עמית — ההודעה מהיציע', when: all(f('j:brief'), no('j:ev:phone'), no('j:first')), priority: 4 },
    { id: 'j-notes', era: '2002-desk', x: 0.785, y: 0.8, w: 0.03, act: 'j-ev-notes', verb: 'take', labelHe: 'הפנקס שלך — מה ראית בשש בבוקר', when: all(f('j:brief'), no('j:ev:notes'), no('j:first')), priority: 4 },
    { id: 'j-tape', era: '2002-desk', x: 0.822, y: 0.8, w: 0.03, act: 'j-ev-tape', verb: 'hold', labelHe: 'ההקלטה — הקופאי, מאתמול', when: all(f('j:brief'), no('j:ev:tape'), no('j:first')), priority: 4 },
    // J01 S2 — asking Shani for her photograph, before and not after
    { id: 'j-photo', era: '2002-desk', x: 0.665, y: 0.8, w: 0.04, act: 'j-photo', verb: 'talk', labelHe: 'שני — לבקש רשות לתמונה', when: all(f('j:verifying'), no('j:photoOk'), no('j:first')), priority: 5 },
    // 2011-people · L01 S1 — Melanie's reflector, against the sun (she asked; he holds)
    { id: 'l-reflector', era: '2011-people', x: 0.63, y: 0.78, w: 0.06, act: 'l-reflector', verb: 'hold', labelHe: 'המחזיר של מלאני — להחזיק מול השמש', when: all(is('l:melanieKind', 'task'), no('l:reflector')), priority: 4 },
    // 2012-cups · L02 S3 — the café table where the partner waits
    { id: 'n-table', era: '2012-cups', x: 0.82, y: 0.77, w: 0.06, act: 'n-table', verb: 'sit', labelHe: 'השולחן בבית הקפה — לשבת', when: all(HAS_PARTNER, f('n:arrived'), no('n:sat')), priority: 4 },
  ],
  street: [
    // 2010-friends · I01 S2 — the banner's words, with Lina, line by line
    { id: 'i-translate', era: '2010-friends', x: 0.585, y: 0.745, w: 0.05, act: 'i-translate', verb: 'hold', labelHe: 'הנוסח של הבד — לתרגם עם לינה', when: I_NEED_OPEN('translate'), priority: 4 },
    // 2011-people · L01 S2 — Dor's posters on the wall: her plan, and a roll of tape for his hands
    { id: 'l-posters', era: '2011-people', x: 0.68, y: 0.74, w: 0.07, act: 'l-posters', verb: 'take', labelHe: 'הפוסטרים של דור — לתלות על הקיר', when: all(any(is('l:dorKind', 'task'), is('l:dorKind', 'asked')), no('l:posters')), priority: 4 },
    // 2012-cups · L02 S3 — Amit's boxes, if the first box was closed before the work started
    { id: 'n-boxes', era: '2012-cups', x: 0.56, y: 0.74, w: 0.06, act: 'n-boxes', verb: 'take', labelHe: 'הארגזים של עמית — לטנדר', when: all(NO_PARTNER, f('n:arrived'), no('n:moved')), priority: 4 },
  ],
}

export const PASS_C_STAGED: Partial<Record<LocationId, ActorDef[]>> = {
  allenby: [
    // 2012-cups · L02 — the partner at the café, from the moment the evening goes there
    ...partner('2012-cups', all(HAS_PARTNER, CUPS_GOING), { x: 0.75, y: 0.77, flip: true }),
  ],
  street: [
    // 2012-cups · L02 — Amit and his boxes, on the pavement in front of the wall
    ...cast('2012-cups', all(NO_PARTNER, CUPS_GOING), [{ who: 'עמית', x: 0.62, y: 0.745, flip: true }]),
  ],
}
