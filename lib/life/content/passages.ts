import type { Say } from './script'

import { QUEST_RIDES_B } from './adultQuestsB'
import { RIDES_PASS_D } from './ridesPassD'

/**
 * הדרך עצמה — a passage you ride, not a paragraph you read (Director V3 §9, 24.9.2026).
 *
 * `PassageScene` was written for the four years between 1986 and 1990: a bedroom, four
 * things to look at, the boy drawn older under a flash. V3 asked the same scene for the
 * winter of 1997, when Liron's old car takes a soldier to an away match with a curfew in
 * the passenger seat, and until today that night was a chain of four dialogue boxes.
 *
 * A ride is the car's own interior (`lironCar`), moving: the picture breathes the way a
 * car does at eighty, and things on the dashboard and through the windscreen come up one
 * at a time — a radio to tune by hand, the fuel needle, a junction, the ground. Each is a
 * STOP: it lights up, says what it is, and waits for the player's hand (a tap, or the
 * button). The decisions are the chapter's own conversations (`road-1`, `road-2`,
 * `road-3`), in the words they were written in; the ride only decides WHEN each one is
 * asked. A stop that is ignored plays by itself after `autoMs`, so a player who does
 * nothing still arrives: the road does not wait for you, and it does not strand you.
 *
 * Content only — `PassageScene` reads this row and nothing about 1997 lives in the scene.
 */
export type RideStop = {
  id: string
  /** where the stop lights up, as fractions of the painting */
  spot: { x: number; y: number }
  verb: 'look' | 'play' | 'watch' | 'hold' | 'listen'
  labelHe: string
  /** how long after the previous stop resolved this one comes up */
  gapMs: number
  /** a stop left alone plays by itself after this long */
  autoMs: number
  /** a hand on it this many times first — tuning a radio is not one press */
  taps?: number
  /** what each press before the last one sounds like */
  tapHe?: readonly string[]
  /** what it says once it is done (lines), or which conversation it opens */
  lines?: readonly Say[]
  conversation?: string
}

export type Ride = {
  id: string
  art: string
  titleHe: string
  hintHe: string
  stops: readonly RideStop[]
  /**
   * a room that does not move (V3 §12, 25.9.2026): the same stops, played over a painting
   * that is standing still — a kitchen with a transistor, a living room with a television.
   * Without it the picture breathes the way a car does on a long road.
   */
  still?: boolean
  /** the transistor plays under the whole passage (a car radio, a kitchen radio) */
  radio?: boolean
  /** where the world picks up again, and what the arrival writes into the log */
  land: { mapId: string; spawn: string }
  flags: readonly string[]
}

export const RIDE_PREFIX = 'ride:'

/** 1997 — Liron's car, to an away match, and back before the base notices */
export const RIDE_1997: Ride = {
  id: '1997',
  art: 'lironCar',
  titleHe: 'האוטו של לירון',
  hintHe: 'כביש, לילה, רדיו. מה שנדלק — לגעת בו.',
  stops: [
    {
      id: 'radio',
      spot: { x: 0.49, y: 0.61 },
      verb: 'play',
      labelHe: 'הרדיו',
      gapMs: 1800,
      autoMs: 9000,
      taps: 3,
      tapHe: ['רעש.', 'חצי מילה של שדר, ושוב רעש.'],
      lines: [
        { who: null, text: 'האוטו של לירון: ישן, נקי, עם שקית סוכריות בדלת ומברג בתא הכפפות. הרדיו תופס תחנה, מאבד, תופס.' },
        { who: 'לירון', text: 'פעם, בשער 7, ידיעה עברה מאיש לאיש. אחד עם טרנזיסטור, אחד שמעביר הלאה. היום יש פייג׳ר. יודעים מהר, לא יודעים יותר טוב.' },
        { who: 'לירון', text: 'אתה מסתכל כל הדרך על השעון. זה לא גורם לנו להגיע מהר יותר.' },
      ],
    },
    { id: 'fuel', spot: { x: 0.3, y: 0.52 }, verb: 'look', labelHe: 'מחוג הדלק', gapMs: 3200, autoMs: 8000, conversation: 'road-1' },
    { id: 'junction', spot: { x: 0.52, y: 0.34 }, verb: 'watch', labelHe: 'הצומת בחלון', gapMs: 3600, autoMs: 8000, conversation: 'road-2' },
    { id: 'ground', spot: { x: 0.5, y: 0.3 }, verb: 'watch', labelHe: 'האורות של המגרש', gapMs: 3600, autoMs: 7000, conversation: 'road-3' },
  ],
  land: { mapId: 'kiosk', spawn: 'start' },
  flags: ['a4:arrived', 'a4:done'],
  radio: true,
}

/**
 * חורף 1985/86 · A6 — the kitchen transistor, played by hand (Director V3 §12, 25.9.2026).
 *
 * Not a road: a kitchen standing still (`still`), the same stops a car has. The antenna is
 * turned three times before a voice holds, the case is held in both hands (the chapter's
 * own `radio-a6` line, with the shirt in it for the boy who bought one), and the match
 * arrives in half-sentences (`a6-half`). Where the radio sits on the table is where the
 * marks light (`TABLE_RADIO` in `world/scenes.ts`, 0.86 × 0.476). Then the kitchen again,
 * and the clock that kills it at 15:35.
 */
export const RIDE_RADIO_86: Ride = {
  id: 'radio-86',
  art: 'kitchen',
  titleHe: 'הטרנזיסטור במטבח',
  hintHe: 'גשם על התריס. מה שנדלק — לגעת בו.',
  still: true,
  radio: true,
  stops: [
    {
      id: 'antenna',
      spot: { x: 0.86, y: 0.46 },
      verb: 'play',
      labelHe: 'האנטנה, לכיוון החלון',
      gapMs: 1200,
      autoMs: 9000,
      taps: 3,
      tapHe: ['רעש.', 'חצי קול, ושוב רעש.'],
      lines: [{ who: null, text: 'רעש. ואז קול. ואז רעש. תחזיק את האנטנה.' }],
    },
    { id: 'hold', spot: { x: 0.86, y: 0.48 }, verb: 'hold', labelHe: 'אותו בשתי ידיים', gapMs: 2600, autoMs: 8000, taps: 2, tapHe: ['האנטנה רועדת עם הגשם.'], conversation: 'radio-a6' },
    { id: 'half', spot: { x: 0.86, y: 0.46 }, verb: 'listen', labelHe: 'לשדר, בין הרעש', gapMs: 3000, autoMs: 7000, conversation: 'a6-half' },
  ],
  land: { mapId: 'kitchen', spawn: 'start' },
  flags: ['a6:tuned'],
}

/**
 * 19.5.1999 · B10 — Liron's car again, three years on, to Ramat Gan (V3 §12 "travel"). The
 * same interior and the same radio that catches half; two stops and the lights of the
 * national stadium over the road. Nothing to decide: the decision was getting in.
 */
export const RIDE_LIRON_99: Ride = {
  id: 'liron-99',
  art: 'lironCar',
  titleHe: 'האוטו של לירון',
  hintHe: 'אותו אוטו. אותו רדיו. מה שנדלק — לגעת בו.',
  radio: true,
  stops: [
    {
      id: 'radio',
      spot: { x: 0.49, y: 0.61 },
      verb: 'play',
      labelHe: 'הרדיו',
      gapMs: 1600,
      autoMs: 8000,
      taps: 2,
      tapHe: ['רעש, ואז פרסומת.'],
      lines: [
        { who: null, text: 'אותו אוטו, אותו רדיו שתופס חצי. לירון מכוון בלי להסתכל, ביד אחת.' },
        { who: 'לירון', text: 'הפעם בלי ויכוח בדרך, בסדר? בסדר.' },
      ],
    },
    {
      id: 'ground',
      spot: { x: 0.5, y: 0.3 },
      verb: 'watch',
      labelHe: 'האורות מעל הכביש',
      gapMs: 3400,
      autoMs: 7000,
      lines: [{ who: null, text: 'מעל הכביש, לפני שרואים את האצטדיון, רואים את האורות שלו. ואז את האנשים — מכל הכיוונים, לאותו מקום.' }],
    },
  ],
  land: { mapId: 'ramat-gan', spawn: 'start' },
  flags: ['c99:rode'],
}

export const RIDES: Record<string, Ride> = { [RIDE_1997.id]: RIDE_1997, [RIDE_RADIO_86.id]: RIDE_RADIO_86, [RIDE_LIRON_99.id]: RIDE_LIRON_99, ...QUEST_RIDES_B, ...RIDES_PASS_D }
