import { at } from '../clock'
import type { LifeOpportunity } from '../opportunities'
import { KICKOFF, KOBI_LEAVES } from '../world/scenes'

/**
 * The windows of 12.5.1990. Same rule as 1986: each one is a sentence about the world
 * when it opens and a sentence about the world when it shuts, never an objective.
 */
const DAY_START = at(12, 35)

export const OPPORTUNITIES_1990: LifeOpportunity[] = [
  {
    id: 'table-math',
    titleHe: 'החשבון על השולחן',
    era: '1990',
    start: DAY_START,
    expires: KOBI_LEAVES,
    location: 'kitchen',
    characters: ['kobi'],
    solutionFamilies: ['information'],
    costs: { minutes: 10 },
    noticeHe: 'העיתון פתוח על הטבלה. אבא מחזיק עיפרון.',
    goneHe: 'העיתון מקופל. העיפרון בכיס של אבא.',
    outcomes: [
      { id: 'careful', when: { flag: 'math:careful' }, effects: [{ e: 'trait', trait: 'knowledge', delta: 4 }] },
      { id: 'any', effects: [{ e: 'rel', who: 'kobi', axis: 'familiarity', delta: 3 }] },
    ],
  },
  {
    id: 'friends-kiosk',
    titleHe: 'החברים בקיוסק',
    era: '1990',
    start: at(14, 30),
    expires: at(15, 35),
    location: 'kiosk',
    characters: ['ofir', 'amit'],
    solutionFamilies: ['social'],
    costs: { minutes: 15 },
    noticeHe: 'צחוק מכיוון הקיוסק. שני קולות שאתה מכיר.',
    goneHe: 'הקיוסק שקט. הם כבר בדרך.',
    outcomes: [
      { id: 'went', when: { flag: 'went:withFriends' }, effects: [{ e: 'personality', key: 'sociability', delta: 6 }] },
      { id: 'talked', effects: [{ e: 'bond', who: 'ofir', delta: 3 }] },
    ],
  },
  {
    id: 'walk-with-kobi',
    titleHe: 'ללכת עם אבא',
    era: '1990',
    start: at(14, 40),
    expires: KOBI_LEAVES + 15,
    location: 'kitchen',
    characters: ['kobi'],
    solutionFamilies: ['social'],
    costs: { minutes: 0 },
    goneHe: 'הדלת נסגרת. אבא הלך. אמר שער 7.',
    outcomes: [
      { id: 'together', when: { flag: 'went:withKobi' }, effects: [{ e: 'redheart', key: 'familyTradition', delta: 6 }] },
      { id: 'alone', effects: [{ e: 'personality', key: 'independence', delta: 4 }] },
    ],
  },
  {
    id: 'radio-net',
    titleHe: 'רשת הטרנזיסטורים',
    era: '1990',
    start: KICKOFF,
    expires: KICKOFF + 120,
    location: 'bloomfield-inside',
    solutionFamilies: ['information', 'social'],
    costs: { minutes: 0 },
    outcomes: [
      { id: 'first', when: { flag: 'net:toldKobi' }, effects: [{ e: 'redheart', key: 'community', delta: 6 }] },
      { id: 'heard', effects: [{ e: 'redheart', key: 'terraceCulture', delta: 3 }] },
    ],
  },
]

export const OPPORTUNITY_1990: Record<string, LifeOpportunity> = Object.fromEntries(
  OPPORTUNITIES_1990.map((entry) => [entry.id, entry]),
)
