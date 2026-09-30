import { at } from '../clock'
import type { LifeOpportunity } from '../opportunities'

import { BELL, CURFEW, SCHOOL_STARTS, TIP_OFF } from './chapter1991'

/**
 * החלונות של 11.3.1991 — five things worth doing, and a day that only fits three.
 *
 * Same rule as the two Saturdays: a window is a sentence about the world when it opens
 * and a sentence about the world when it shuts, never an objective and never a number.
 * What is new here is that two of them compete for the SAME twenty minutes at the same
 * end of the evening — the queue at the vendor and the place on the step — which is the
 * brief's §36 in the only form a game can state it.
 */
export const OPPORTUNITIES_1991: LifeOpportunity[] = [
  {
    id: 'the-note',
    titleHe: 'הפתק',
    era: '1991',
    start: SCHOOL_STARTS,
    expires: BELL,
    location: 'classroom',
    solutionFamilies: ['social'],
    costs: { minutes: 6 },
    noticeHe: 'נייר מקופל לארבע נוחת על השולחן שלך.',
    goneHe: 'הצלצול. הפתק כבר לא רלוונטי — או שהוא אצל המורה.',
    outcomes: [
      { id: 'answered', when: { flag: 'note:answered' }, effects: [{ e: 'bond', who: 'ofir', delta: 4 }] },
      { id: 'caught', when: { flag: 'note:caught' }, effects: [{ e: 'personality', key: 'riskTolerance', delta: 4 }] },
      { id: 'kept', effects: [{ e: 'personality', key: 'responsibility', delta: 3 }] },
    ],
  },
  {
    id: 'homework',
    titleHe: 'עמוד ארבעים ואחת',
    era: '1991',
    start: at(15, 0),
    expires: at(19, 30),
    location: 'bedroom',
    solutionFamilies: ['information'],
    costs: { minutes: 50 },
    noticeHe: 'המחברת בתיק, והתיק ליד הדלת.',
    goneHe: 'מאוחר מדי. מה שנשאר פתוח יישאר פתוח עד הבוקר.',
    outcomes: [
      { id: 'all', when: { flag: 'hw:done' }, effects: [{ e: 'personality', key: 'reliability', delta: 6 }] },
      { id: 'part', effects: [{ e: 'wellbeing', key: 'stress', delta: 4 }] },
    ],
  },
  {
    id: 'permission',
    titleHe: 'לשאול את אמא',
    era: '1991',
    start: at(15, 30),
    expires: TIP_OFF,
    location: 'home',
    characters: ['rachel'],
    solutionFamilies: ['social'],
    costs: { minutes: 5 },
    noticeHe: 'היא במטבח. הדלת פתוחה.',
    goneHe: 'מאוחר. גם אם תשאל עכשיו, זאת כבר שאלה אחרת.',
    outcomes: [
      { id: 'granted', when: { flag: 'permission:yes' }, effects: [{ e: 'rel', who: 'rachel', axis: 'trust', delta: 4 }] },
      { id: 'refused', effects: [{ e: 'wellbeing', key: 'regret', delta: 4 }] },
    ],
  },
  {
    id: 'save-the-spot',
    titleHe: 'לשמור מקום',
    era: '1991',
    start: at(19, 10),
    expires: TIP_OFF,
    location: 'ussishkin-hall',
    characters: ['amit'],
    solutionFamilies: ['social'],
    costs: { minutes: 0 },
    noticeHe: 'עמית מצא מדרגה טובה, ורוצה ללכת להביא משהו.',
    goneHe: 'טיפ־אוף. מה שתפוס — תפוס.',
    outcomes: [
      { id: 'held', when: { flag: 'spot:held' }, effects: [{ e: 'bond', who: 'amit', delta: 5 }] },
      { id: 'lost', effects: [{ e: 'wellbeing', key: 'happiness', delta: -3 }] },
    ],
  },
  {
    id: 'the-curfew',
    titleHe: 'השעה שהיא אמרה',
    era: '1991',
    start: CURFEW,
    expires: CURFEW + 60,
    location: 'ussishkin-hall',
    solutionFamilies: ['social'],
    costs: { minutes: 0 },
    noticeHe: 'תשע וחצי.',
    goneHe: 'עבר.',
    outcomes: [
      { id: 'left', when: { flag: 'curfew:kept' }, effects: [{ e: 'personality', key: 'reliability', delta: 8 }] },
      { id: 'stayed', effects: [{ e: 'redheart', key: 'terraceCulture', delta: 8 }] },
    ],
  },
]

export const OPPORTUNITY_1991: Record<string, LifeOpportunity> = Object.fromEntries(
  OPPORTUNITIES_1991.map((entry) => [entry.id, entry]),
)
