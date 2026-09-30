import type { RandomEncounter } from '../encounters'
import { KICKOFF } from '../world/scenes'

/**
 * מה יכול לקרות לך ברחוב ב-1990 — rolled off the seed, like 1986, and mostly about
 * information: this is a day when every second person carries a radio, and a rumour
 * travels faster than a bus. A rumour encounter sets a `rumor:*` flag, never a fact.
 */
export const ENCOUNTERS_1990: RandomEncounter[] = [
  {
    id: 'street-radio-1990',
    era: '1990',
    locations: ['street', 'route', 'bloomfield-outside'],
    weight: 6,
    cooldown: 40,
    requirements: [{ beforeMinute: KICKOFF }],
    lineHe: 'רדיו מחלון פתוח. קול של קריין, בלי מילים — רק הטון של מישהו שמסביר למה זה מסובך.',
    who: null,
    effects: [{ e: 'redheart', key: 'terraceCulture', delta: 2 }],
  },
  {
    id: 'street-rumor-1990',
    era: '1990',
    locations: ['street', 'kiosk', 'route'],
    weight: 5,
    cooldown: 60,
    lineHe: 'שני גברים על מדרגה. אחד אומר שיבנה כבר סגרה את זה בשבוע שעבר, השני אומר שזה שטויות. שניהם בטוחים באותה מידה.',
    who: null,
    effects: [{ e: 'flagValue', flag: 'rumor:yavneDone', value: true }],
  },
  {
    id: 'street-coin-1990',
    era: '1990',
    locations: ['street', 'route'],
    weight: 3,
    lineHe: 'מטבע בין האבנים. שווה פחות ממה שהיה שווה פעם, אבל מטבע.',
    who: null,
    effects: [
      { e: 'money', agorot: 200, why: 'מהרחוב' },
      { e: 'give', item: 'coin' },
    ],
  },
  {
    id: 'route-bus-1990',
    era: '1990',
    locations: ['route'],
    weight: 4,
    cooldown: 50,
    lineHe: 'אוטובוס מלא אדום עובר לאט. מישהו בחלון האחורי מצביע עליך, ואז על עצמו, ואז על השמיים.',
    who: null,
    effects: [
      { e: 'redheart', key: 'community', delta: 3 },
      { e: 'wellbeing', key: 'belonging', delta: 3 },
    ],
  },
  {
    id: 'ground-old-1990',
    era: '1990',
    locations: ['bloomfield-outside'],
    weight: 4,
    lineHe: 'זקן עם צעיף שנראה מבוגר ממך פי שניים. "אני עומד פה מלפני שנולדת, ואני אעמוד פה גם אחריך."',
    who: null,
    effects: [
      { e: 'redheart', key: 'historyMemory', delta: 4 },
      { e: 'redheart', key: 'loyaltyReturn', delta: 3 },
    ],
  },
]
