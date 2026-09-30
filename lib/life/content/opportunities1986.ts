import { at } from '../clock'
import type { LifeOpportunity } from '../opportunities'
import { KOBI_LEAVES } from '../world/scenes'

/**
 * ההתנגשות — one afternoon, five things worth doing, and no menu.
 *
 * This is the file the chapter lives or dies on. Everything here is open at the same
 * time, in different rooms, and every one of them costs the same currency: the minutes
 * between now and the moment the front door closes behind Kobi.
 *
 * The player is never shown this list. There is no screen that says "choose Ofir, Amit
 * or Efi" — Ofir is at the wall, Amit is outside the kiosk with a newspaper, Efi is on
 * the pitch and will be gone by two. Walking somewhere IS the choice, and the cost is
 * paid whether or not the player noticed they were paying it.
 *
 * Deliberately unbalanced. Ofir's game is the most fun and the most expensive; the
 * bottles are boring and the only reason there is money for a ticket. That asymmetry is
 * the content: a second playthrough exists because the first one had to give something
 * up, and the player knows exactly what.
 */

const DAY_START = at(12, 35)

export const OPPORTUNITIES_1986: LifeOpportunity[] = [
  // ------------------------------------------------------------------ the father ----
  {
    id: 'kobi-morning',
    titleHe: 'לשבת עם אבא',
    era: '1986',
    start: DAY_START,
    expires: KOBI_LEAVES,
    location: 'home',
    characters: ['kobi'],
    solutionFamilies: ['information', 'social'],
    costs: { minutes: 10 },
    noticeHe: 'אבא בכורסה עם העיתון.',
    goneHe: 'הכורסה ריקה. העיתון מקופל על המשענת.',
    outcomes: [
      {
        id: 'asked',
        when: { flag: 'knows:match' },
        effects: [
          { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 6 },
          { e: 'redheart', key: 'familyTradition', delta: 6 },
        ],
      },
      { id: 'quiet', effects: [{ e: 'rel', who: 'kobi', axis: 'familiarity', delta: 4 }] },
    ],
  },

  // -------------------------------------------------------------------- the game ----
  {
    id: 'ofir-game',
    titleHe: 'המשחק בסמטה',
    era: '1986',
    start: DAY_START,
    expires: at(14, 50),
    location: 'pitch',
    characters: ['ofir', 'efi', 'amit'],
    solutionFamilies: ['social', 'street'],
    costs: { minutes: 35, energy: 18 },
    noticeHe: 'שומעים כדור נבעט בסמטה.',
    goneHe: 'הסמטה שקטה. מישהו לקח את הכדור.',
    outcomes: [
      {
        id: 'played',
        effects: [
          { e: 'bond', who: 'ofir', delta: 14 },
          { e: 'redheart', key: 'footballLove', delta: 8 },
          { e: 'redheart', key: 'professionalFootball', delta: 5 },
          { e: 'wellbeing', key: 'happiness', delta: 8 },
          { e: 'remember', who: 'ofir', eventId: 'played-together', significance: 'notable' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------- the information ----
  {
    id: 'amit-paper',
    titleHe: 'העיתון של עמית',
    era: '1986',
    start: at(13, 0),
    expires: at(14, 40),
    location: 'street',
    characters: ['amit'],
    solutionFamilies: ['information'],
    costs: { minutes: 15 },
    noticeHe: 'עמית עומד ליד הקיוסק עם עיתון פתוח.',
    goneHe: 'המדרכה ליד הקיוסק ריקה. נשארו רק הארגזים.',
    outcomes: [
      {
        id: 'read',
        effects: [
          { e: 'flag', flag: 'knows:match' },
          { e: 'flag', flag: 'knows:gate7' },
          { e: 'trait', trait: 'knowledge', delta: 10 },
          { e: 'redheart', key: 'historyMemory', delta: 8 },
          { e: 'bond', who: 'amit', delta: 10 },
          { e: 'remember', who: 'amit', eventId: 'asked-for-information', significance: 'notable' },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- the other one ---
  {
    id: 'efi-hall',
    titleHe: 'אפי הולך לאולם',
    era: '1986',
    start: at(12, 50),
    expires: at(14, 0),
    location: 'pitch',
    characters: ['efi'],
    solutionFamilies: ['social'],
    costs: { minutes: 25 },
    noticeHe: 'אפי מסתובב עם כדור שהוא לא בועט בו.',
    goneHe: 'הכדור של אפי מונח ליד האבן. הוא לא כזה שמשאיר כדור.',
    outcomes: [
      {
        id: 'went',
        effects: [
          { e: 'bond', who: 'efi', delta: 16 },
          { e: 'redheart', key: 'basketballLove', delta: 14 },
          { e: 'redheart', key: 'community', delta: 8 },
          { e: 'flag', flag: 'saw:hall' },
          { e: 'remember', who: 'efi', eventId: 'came-to-the-hall', significance: 'major' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------- the mother ---
  {
    id: 'rachel-bottles',
    titleHe: 'הבקבוקים של אמא',
    era: '1986',
    start: DAY_START,
    expires: KOBI_LEAVES,
    location: 'kiosk',
    characters: ['rachel'],
    solutionFamilies: ['resource'],
    costs: { minutes: 20 },
    noticeHe: 'הארגז של הבקבוקים עומד ליד הדלת.',
    goneHe: 'הקיוסק כבר לא לוקח בקבוקים היום.',
    outcomes: [
      {
        id: 'returned',
        effects: [
          { e: 'personality', key: 'reliability', delta: 10 },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: 12 },
          { e: 'remember', who: 'rachel', eventId: 'kept-a-promise', significance: 'notable' },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------- the extra ---
  {
    id: 'keren-scarf',
    titleHe: 'קרן על המדרכה',
    era: '1986',
    start: at(13, 30),
    expires: at(15, 30),
    location: 'street',
    characters: ['keren'],
    solutionFamilies: ['social'],
    costs: { minutes: 10 },
    noticeHe: 'קרן יושבת על המדרגה עם משהו אדום בידיים.',
    goneHe: 'המדרגה ריקה. נשאר עליה חוט אדום אחד.',
    outcomes: [
      {
        id: 'talked',
        effects: [
          { e: 'bond', who: 'keren', delta: 12 },
          { e: 'redheart', key: 'terraceCulture', delta: 8 },
          { e: 'personality', key: 'empathy', delta: 6 },
        ],
      },
    ],
  },
]

export const OPPORTUNITY: Record<string, LifeOpportunity> = Object.fromEntries(
  OPPORTUNITIES_1986.map((entry) => [entry.id, entry]),
)
