import { flagOn, relationshipOf, type LifeState } from '../types'
import { USSISHKIN } from './placeLifecycle'

import type { MapPlaceDef, MapPlaceId } from '../map'

/**
 * המפה היא ביוגרפיה — the same corner, named by the life that reached it.
 *
 * Both director's cuts ask for the same thing and both call it cheap (Stage A §7 and
 * §51, Stage B §92): a place on the map is not a location, it is what this particular
 * Pugi calls it. Bloomfield is "המגרש של אבא" to a boy his father took, "הבית" to one who
 * built the terrace himself, and "המקום שאסור היה לי להגיע אליו" to one who was told no and
 * obeyed. Ussishkin stays "האולם שאפי חפר עליו" until the day he goes inside and means it.
 * The kiosk becomes "איפה שמכרתי בקבוקים" the summer he works there.
 *
 * The rules read only what the engine already records — the Red Heart gauges, the
 * relationships, the flags scenes raise — so a label costs nothing at authoring time and
 * cannot go stale: change what the boy does, and the map renames itself.
 *
 * Order matters. Rules are tried in order and the first one that matches wins, so the
 * most specific and most earned label sits at the top of each list. A place with no
 * matching rule keeps the name it was drawn with, which is why every place still reads
 * correctly on a save that has barely started.
 *
 * The sub-line under Bloomfield is the same idea one level down: it says which gate this
 * life stands at, and it is the one place in the game where the closure of Gate 7 (Stage
 * B §26/§92) is written on the map instead of announced. A gate is never erased —
 * "פעם עמדנו פה" is a memory, not an unlock.
 */

export type PlaceLabel = {
  labelHe: string
  subHe: string
}

type Rule = {
  /** why this label exists, for the person reading the file in a year */
  whyHe: string
  when: (state: LifeState) => boolean
  labelHe?: string
  subHe?: string
}

const heart = (state: LifeState, key: keyof LifeState['redHeart']): number => state.redHeart[key] ?? 0

const bond = (state: LifeState, who: Parameters<typeof relationshipOf>[1]): number => relationshipOf(state, who).bond

/** he stood inside a ground on a day the archive knows — any of them */
const everGotIn = (state: LifeState): boolean => state.attendedAnchors.length > 0

/** told no, and did as he was told: the punishment days he never got out of */
const wasKeptHome = (state: LifeState): boolean =>
  (flagOn(state, 'permission:no') || flagOn(state, 'a7:refused')) && !everGotIn(state)

const RULES: Partial<Record<MapPlaceId, Rule[]>> = {
  bloomfield: [
    {
      whyHe: 'נכנס דרך היציע והוא שלו — לא של אבא ולא של אף אחד',
      when: (s) => heart(s, 'terraceCulture') >= 45 && everGotIn(s),
      labelHe: 'הבית',
    },
    {
      whyHe: 'אמרו לו לא, והוא נשאר בבית. המגרש הוא מקום שקרה בלעדיו',
      when: wasKeptHome,
      labelHe: 'המקום שאסור היה לי להגיע אליו',
    },
    {
      whyHe: 'הגיע לשם ביד של אבא, וזה עדיין המגרש של אבא',
      when: (s) => bond(s, 'kobi') >= 55 && heart(s, 'familyTradition') >= 30,
      labelHe: 'המגרש של אבא',
    },
  ],
  ussishkin: [
    {
      // World Lifecycle (27.9.2026): after 25.7.2007 the pin stays — and says what it is now
      whyHe: 'האולם נהרס ב-25.7.2007. הסמן נשאר, המקום לא',
      when: (s) => !USSISHKIN.canTravel(s),
      labelHe: 'אוסישקין הי"ד',
      subHe: 'המקום כבר איננו.',
    },
    {
      whyHe: 'האולם הפך לבית שני — קהילה, כדורסל, או שניהם',
      when: (s) => heart(s, 'basketballLove') >= 40 || heart(s, 'community') >= 45,
      labelHe: 'אוסישקין',
      subHe: 'גם פה זה הבית',
    },
    {
      whyHe: 'אפי סיפר עליו והוא עוד לא נכנס — או נכנס ולא התחבר',
      when: (s) => flagOn(s, 'life:knows:hall') && heart(s, 'basketballLove') < 15,
      labelHe: 'האולם שאפי חפר עליו',
    },
  ],
  kiosk: [
    {
      whyHe: 'עבד שם — בקבוקים, ארגזים, שליחויות',
      when: (s) => flagOn(s, 'a4:bottles') || flagOn(s, 'chore:bottles') || flagOn(s, 'rafi:work'),
      labelHe: 'איפה שמכרתי בקבוקים',
    },
    {
      whyHe: 'מכיר את רפי כאדם ולא כדלפק (בריף שלב א׳ §7: "רפי")',
      when: (s) => bond(s, 'shopkeeper') >= 40,
      labelHe: 'רפי',
    },
  ],
  route: [
    {
      whyHe: 'הדרך שלו עוברת בסמטה של אופיר, לא בכביש',
      when: (s) => flagOn(s, 'used:shortcut') || flagOn(s, 'route:ofir'),
      labelHe: 'דרום תל אביב',
      subHe: 'הקיצור של אופיר',
    },
  ],
  pitch: [
    {
      whyHe: 'המגרש השכונתי הוא איפה שגדל, לא איפה שעובר',
      when: (s) => heart(s, 'footballLove') >= 45 && flagOn(s, 'played:football'),
      labelHe: 'המגרש',
      subHe: 'איפה שלמדנו',
    },
  ],
  hatikva: [
    {
      whyHe: '13.5.2000 — אלופים, בשכונה של מישהו אחר',
      when: (s) => s.year >= 2000 && flagOn(s, 'm00:sang'),
      labelHe: 'שכונת התקווה',
      subHe: 'איפה שהיינו אלופים',
    },
  ],
  'ramat-gan': [
    {
      whyHe: 'גמר גביע — 1999 או 2000',
      when: (s) => s.year >= 1999 && (flagOn(s, 'c99:over') || flagOn(s, 'd:over')),
      labelHe: 'אצטדיון רמת גן',
      subHe: 'איפה שלקחנו גביע',
    },
  ],
  base: [
    {
      whyHe: 'הבסיס הוא מה שגזל ממנו שבתות',
      when: (s) => flagOn(s, 'life:awol') || flagOn(s, 'life:lied:army'),
      labelHe: 'הבסיס',
      subHe: 'איפה שלא הייתי בשבת',
    },
  ],
}

/**
 * השער — the sub-line under Bloomfield, which is the only place the map says where a
 * person stands. Gate 7 closes in the second half of the nineties and the map records it
 * rather than removing it (Stage B §92: "Do not erase it from map").
 */
function gateLine(state: LifeState): string | null {
  const knowsFive = flagOn(state, 'knows:gate5') || flagOn(state, 'life:family:gate5-builder')
  const knowsSeven = flagOn(state, 'knows:gate7') || flagOn(state, 'life:family:gate7-keeper')
  if (knowsFive && knowsSeven) return 'שער 5 · פעם עמדנו ב-7'
  if (knowsFive) return 'שער 5'
  if (knowsSeven && state.year >= 1997) return 'שער 7 — סגור'
  if (knowsSeven) return 'אבא עומד פה'
  return null
}

/**
 * מה קוראים למקום הזה בחיים האלה — the name and the line under it, for this save.
 *
 * Pure, and cheap enough to call while drawing every pin on every frame of the map.
 */
export function placeLabel(place: MapPlaceDef, state: LifeState): PlaceLabel {
  let labelHe = place.labelHe
  let subHe = place.subHe
  for (const rule of RULES[place.id] ?? []) {
    if (!rule.when(state)) continue
    labelHe = rule.labelHe ?? labelHe
    subHe = rule.subHe ?? subHe
    break
  }
  if (place.id === 'bloomfield') {
    const gate = gateLine(state)
    if (gate) subHe = gate
  }
  return { labelHe, subHe }
}

/** Every place that can be renamed by a life — for the test that keeps them honest. */
export const BIOGRAPHICAL_PLACES = Object.keys(RULES) as MapPlaceId[]

/** The rules themselves, so a test can assert each one is reachable and says something. */
export const LABEL_RULES = RULES
