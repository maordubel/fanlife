import { at } from '../clock'
import type { RandomEncounter } from '../encounters'
import { KOBI_LEAVES } from '../world/scenes'

/**
 * מה שקרה לך במקרה — the pool 1986 rolls from.
 *
 * Small, physical, period, and none of it changes the shape of the day. That restraint
 * is the design: a random event that could hand you the chapter would make the chapter a
 * lottery, and a random event that hands you nothing is a loading screen. Everything here
 * gives a little — a coin, a card, a sentence you did not have — and one of them takes
 * something away, because a Saturday where nothing goes wrong is not a Saturday.
 *
 * Weights are relative within a place, not global. Cooldowns are in game minutes; an
 * encounter with no cooldown fires once per life and never again, which is what makes
 * finding the card in the gutter something a player tells somebody about.
 *
 * **Nothing canonical is in here.** The championship is not a weighted row.
 */

export const ENCOUNTERS_1986: RandomEncounter[] = [
  // -------------------------------------------------------------------- the street --
  {
    id: 'street-coin',
    era: '1986',
    locations: ['street', 'route'],
    weight: 6,
    lineHe: 'משהו מבהיק בין אבני המדרכה. מטבע, שטוח מהצמיגים וחם מהשמש.',
    who: null,
    effects: [
      { e: 'money', agorot: 100, why: 'מהרחוב' },
      { e: 'give', item: 'coin' },
      { e: 'trait', trait: 'streetSmarts', delta: 3 },
    ],
  },
  {
    id: 'street-card',
    era: '1986',
    locations: ['street', 'pitch'],
    weight: 3,
    lineHe: 'קלף שחקן על המדרכה, פנים למטה. אתה הופך אותו — אדום. מישהו הפסיד אותו במשחק.',
    who: null,
    effects: [
      { e: 'give', item: 'football-card' },
      { e: 'redheart', key: 'footballLove', delta: 4 },
      { e: 'wellbeing', key: 'happiness', delta: 5 },
    ],
  },
  {
    id: 'street-radio',
    era: '1986',
    locations: ['street'],
    weight: 5,
    cooldown: 90,
    lineHe: 'רדיו ממרפסת, בקול מלא, ובו מישהו שמדבר מהר מדי. למעלה מקללים, ומיד אחר כך צוחקים.',
    who: null,
    effects: [
      { e: 'flag', flag: 'knows:match' },
      { e: 'redheart', key: 'historyMemory', delta: 3 },
    ],
  },
  {
    id: 'street-dog',
    era: '1986',
    locations: ['street', 'pitch'],
    weight: 4,
    cooldown: 60,
    lineHe: 'כלב חום יוצא מתחת למכונית, מריח אותך, ומחליט שאתה לא מעניין.',
    who: null,
    effects: [{ e: 'wellbeing', key: 'happiness', delta: 3 }],
  },
  {
    id: 'street-ask',
    era: '1986',
    locations: ['street'],
    weight: 4,
    cooldown: 120,
    requirements: [{ afterMinute: KOBI_LEAVES }],
    who: 'אוהד',
    lineHe: 'אחי, יש לך במקרה כרטיס מיותר? …לא. סליחה, חשבתי שאתה של מישהו.',
    effects: [
      { e: 'redheart', key: 'terraceCulture', delta: 4 },
      { e: 'wellbeing', key: 'belonging', delta: 4 },
    ],
  },
  {
    id: 'street-lost',
    era: '1986',
    locations: ['street', 'route'],
    weight: 2,
    requirements: [{ hasItem: 'coin' }],
    lineHe: 'החור בכיס. אתה ממשש שוב, ועוד פעם, ומבין.',
    who: null,
    effects: [
      { e: 'take', item: 'coin' },
      { e: 'money', agorot: -100, why: 'נפל' },
      { e: 'wellbeing', key: 'stress', delta: 6 },
    ],
  },

  // --------------------------------------------------------------------- the kiosk --
  {
    id: 'kiosk-queue',
    era: '1986',
    locations: ['kiosk'],
    weight: 5,
    cooldown: 80,
    who: 'אילן השכן',
    lineHe: 'אתה של קובי, נכון? תגיד לו שאני עוד מחכה לו עם הדבר ההוא.',
    effects: [
      { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 4 },
      { e: 'redheart', key: 'community', delta: 4 },
    ],
  },

  // ---------------------------------------------------------------------- the road --
  {
    id: 'route-bus',
    era: '1986',
    locations: ['route'],
    weight: 6,
    cooldown: 45,
    lineHe: 'אוטובוס עובר לאט, מלא, והחלונות פתוחים. מישהו שר משהו שכל האוטובוס יודע חוץ ממך.',
    who: null,
    effects: [
      { e: 'redheart', key: 'terraceCulture', delta: 6 },
      { e: 'redheart', key: 'travelDrive', delta: 5 },
      { e: 'wellbeing', key: 'belonging', delta: 5 },
    ],
  },
  {
    id: 'route-help',
    era: '1986',
    locations: ['route'],
    weight: 4,
    who: 'אוהד ותיק',
    lineHe: 'לבד? תישאר בצד שלי עד הפנייה, יש פה נהגים מטומטמים.',
    effects: [
      { e: 'wellbeing', key: 'stress', delta: -8 },
      { e: 'redheart', key: 'community', delta: 6 },
      { e: 'flag', flag: 'knows:route' },
    ],
  },
  {
    id: 'route-paper',
    era: '1986',
    locations: ['route', 'bloomfield-outside'],
    weight: 3,
    lineHe: 'דף עיתון נדבק לגדר, עמוד הספורט כלפי חוץ. אתה מקלף אותו ומקפל לרבע.',
    who: null,
    effects: [
      { e: 'give', item: 'folded-paper' },
      { e: 'trait', trait: 'knowledge', delta: 4 },
    ],
  },

  // -------------------------------------------------------------------- the ground --
  {
    id: 'gate-scarf',
    era: '1986',
    locations: ['bloomfield-outside'],
    weight: 3,
    requirements: [{ afterMinute: at(15, 20) }],
    who: 'אוהד',
    lineHe: 'קח, תחזיק לי רגע. …אה, עזוב. תשמור אותו, יש לי עוד אחד.',
    effects: [
      { e: 'give', item: 'scarf' },
      { e: 'redheart', key: 'terraceCulture', delta: 10 },
      { e: 'wellbeing', key: 'belonging', delta: 10 },
    ],
  },
  {
    id: 'gate-push',
    era: '1986',
    locations: ['bloomfield-outside'],
    weight: 4,
    cooldown: 50,
    lineHe: 'הקהל נדחף קדימה בבת אחת, ואתה מוצא את עצמך שלושה מטר מהמקום שעמדת בו בלי שהרגליים שלך זזו.',
    who: null,
    effects: [
      { e: 'wellbeing', key: 'stress', delta: 10 },
      { e: 'trait', trait: 'streetSmarts', delta: 4 },
    ],
  },
]
