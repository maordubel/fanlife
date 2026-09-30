import type { CharacterId } from '../types'
import type { Condition } from '../world/types'
import type { Say } from './script'
import { FOLLOW_UPS_1991 } from './followUps1991'
import { FOLLOW_UPS_ADULT } from './followUpsAdult'
import { FOLLOW_UPS_STAGE_A } from './followUpsStageA'
import { FOLLOW_UPS_STAGE_B } from './followUpsStageB'
import { FOLLOW_UPS_MISSIONS } from './callbackBeats'
import { FOLLOW_UPS_SHIRTS } from './shirtCallbacks'

/**
 * השיחה השנייה — authored follow-ups for a conversation the player comes back to
 * (design pass v2 §20.4). Resolved by `world/followUp.ts`, read by `DialogueRunner.start`
 * only when the branch it landed on was already heard to its end.
 *
 * A follow-up is a few lines in the character's own voice, keyed on:
 *   - `on`      — the conversation ids it can answer (the ones the world's people `talk:`),
 *                 or `npc` — any repeated conversation of that person in that chapter;
 *   - `step`    — the checklist step that must be the live graph's MAIN action right now
 *                 (`graph.ts`); a line with a step can therefore never point anywhere the
 *                 "?" sheet and the flow layer do not already point;
 *   - `when`    — whatever else must hold (a clock, a flag the WORLD raised);
 *   - `knows`   — how this speaker could know what `when` asserts, when it is private.
 *
 * Classes (§20.6): HANDOFF points at the person/place already established; CHECK-IN asks
 * whether it happened; REACTION says something changed (heard once); DEADLINE names a
 * real clock; RECOVERY restates the actionable part plainer for somebody who already got
 * the handoff and is back; CLOSED is this conversation's own "that's all".
 *
 * The files per era live beside this one and are keyed by conversation ID only — they do
 * not edit the chapter files, which other people rewrite (`tests/life-dialogue-followups`
 * re-checks that every id and every step still exists).
 */

export type FollowUpClass = 'HANDOFF' | 'CHECK-IN' | 'REACTION' | 'DEADLINE' | 'RECOVERY' | 'CLOSED'

export type FollowUp = {
  id: string
  /** the chapter(s) it belongs to; '*' for a stranger who says the same in every year */
  chapter: string | readonly string[]
  /** the conversation ids it answers — or, with `npc`, none: then any repeated conversation of that person */
  on?: readonly string[]
  /**
   * The person, whatever conversation of his was repeated. For chapters whose rooms are
   * being rewritten (2007–2026): a new `yosef-room` actor added next week is answered by
   * these lines the first time he is pressed twice, with nobody re-keying anything.
   */
  npc?: CharacterId | readonly CharacterId[]
  cls: FollowUpClass
  step?: string | readonly string[]
  when?: Condition
  /**
   * How the speaker knows what `when` asserts. Omitted, every private fact in `when` must
   * have the speaker among its witnesses (`PRIVATE_FACTS`). `toldBy: 'player'` is the
   * other honest way: the boy says it himself, in the first line of this follow-up.
   */
  knows?: Condition
  toldBy?: 'player'
  lines: readonly Say[]
}

/**
 * מי יודע מה — facts that happened in a room, with the people who were in it.
 *
 * A flag listed here may be ASSERTED by a follow-up (`when: { flag }`) only in the mouth
 * of a witness, or with `knows`/`toldBy`. Everything not listed is public in the fiction
 * (the teacher gave homework to the whole class; the street saw who walked with whom).
 * `tests/life-dialogue-followups` walks every follow-up against this table.
 */
export const PRIVATE_FACTS: Record<string, readonly CharacterId[]> = {
  // 1991 — the flat on Monday evening: what the notebook holds and what the mother said
  // the notebook is seen by whoever is home: Rachel opens it, Kobi hears how it went from the armchair
  'hw:done': ['rachel', 'kobi'],
  'hw:half': ['rachel', 'kobi'],
  'hw:faked': ['rachel', 'kobi'],
  'asked:mum': ['rachel', 'kobi'],
  'permission:yes': ['rachel', 'kobi'],
  'permission:no': ['rachel', 'kobi'],
  'kobi:nudged': ['kobi'],
  'sneak:ready': [],
  'night:home': ['rachel', 'kobi'],
  'curfew:broken': ['rachel'],
  'curfew:kept': ['rachel'],
}

/**
 * איך כל אחד אומר "זהו" — the last authored answer before the generic pool: short, in the
 * person's voice, true in any year he is on screen. A friend of twelve and of forty says
 * "יאללה" the same way; a father folds the paper the same way.
 */
export const CLOSERS: Partial<Record<CharacterId, readonly string[]>> = {
  kobi: ['נו. יאללה.', 'הוא מקפל את העיתון לחצי, ולא אומר כלום. זה גם תשובה.', 'דיברנו. עכשיו תעשה.'],
  rachel: ['שמעת אותי פעם אחת. זה מספיק.', 'אני לא אומרת את זה פעמיים.', 'יאללה, אני באמצע משהו.'],
  ofir: ['יאללה, נדבר.', 'מה, אתה רוצה שאני אגיד את זה שוב? לא אגיד.', 'נו, זוז. אתה מסתיר לי.'],
  amit: ['אמרתי מה שאני יודע. השאר זה ניחושים.', 'תבדוק בעצמך. אני כבר בדקתי.'],
  efi: ['נו? אני לא מחכה כל היום.', 'אמרתי לך. באחד הימים תבין.'],
  keren: ['אתה עוד פה?', 'זהו. גמרנו לדבר על זה.'],
  shopkeeper: ['קונים או הולכים, ילד. אין שלישי.', 'אני לא רדיו. אני אומר כל דבר פעם אחת.'],
  barry: ['נו, קטן. תסתכל קדימה, לא עליי.', 'שמעת. עכשיו תזכור.'],
  veteran: ['נו, קטן. תסתכל קדימה, לא עליי.'],
  usher: ['קדימה, לא לעמוד בפתח.', 'אמרתי כבר. תזוז, יש מאחוריך אנשים.'],
  vendor: ['לא קונה — לא עומד פה.', 'אותו מחיר כמו לפני דקה.'],
  teacher: ['אנחנו באמצע שיעור. גם אתה.', 'שב.'],
  neighbour: ['שמעת מה אמרתי. תגיד לאמא שלך.'],
  liron: ['אני פה. אני תמיד פה.', 'תחזיק את זה ואל תדבר.'],
  'crowd-limor': ['אמרתי מה שידעתי. לימור לא חוזרת על עצמה.'],
  shachor: ['לא מדברים. עושים.', 'אמרתי פעם אחת.'],
  michel: ['יש לי רשימה, לא זמן.', 'שמעת את השעה. זה מה שיש.'],
  freddy: ['אמרתי את זה בסעיפים. תקרא את הסעיפים.'],
  soko: ['אני כותב. אחר כך.'],
  asaf: ['אמרתי. פה עובדים.', 'תעשה, אחר כך נדבר.'],
  melamed: ['(שלוש מכות, הפסקה, שתיים.) זהו.'],
  'omer-hermesh': ['אחר כך. עכשיו מקשיבים.'],
  'crowd-dudu': ['אני הרעש. לא המידע.'],
  yaron: ['שמעת כבר. תעבור נושא.'],
  yosef: ['מה שאמרנו — עומד.', 'יש לך את הדף. זה הכול.'],
  metuki: ['הכול כתוב אצלי. תסתכל.'],
  uli: ['הרכב לא הולך לשום מקום. גם אני לא.'],
  // (27.9.2026) השכנה, לא הארכיון ולא ההסעה — אוכל וקללה אוהבת, ולא מידע
  batya: ['שמעת. אני לא מבשלת פעמיים.', 'יאללה, זוז, מנוול. ותאכל משהו.'],
}

/**
 * Strangers without a row in the registry (a record seller, a man at a café table, the
 * ticket window) have no CLOSERS entry, so their conversations carry their own last word.
 */
const STRANGERS: FollowUp[] = [
  {
    id: 'x-allenby-records',
    chapter: '*',
    on: ['allenby-records'],
    cls: 'CLOSED',
    lines: [{ who: 'המוכר', text: 'אותה חנות, אותו מוט. תיכנס או תזוז מהדלת.' }],
  },
  {
    id: 'x-allenby-rival',
    chapter: '*',
    on: ['allenby-rival'],
    cls: 'CLOSED',
    lines: [{ who: 'הגבר', text: 'אמרתי מה שהיה לי להגיד. בשבת נדבר.' }],
  },
  {
    id: 'x-fan-queue',
    chapter: '*',
    on: ['uss-queue'],
    cls: 'CLOSED',
    lines: [{ who: 'אוהד', text: 'לא עכשיו, חביבי. עכשיו מקשיבים.' }],
  },
  {
    id: 'x-radio-walker',
    chapter: '*',
    on: ['radio-walker-1990'],
    cls: 'CLOSED',
    lines: [{ who: 'אוהד עם רדיו', text: 'שששש. תן לשמוע.' }],
  },
  {
    id: 'x-ticket-window',
    chapter: '*',
    on: ['ticket-window-1990'],
    cls: 'CLOSED',
    lines: [{ who: 'הקופאי', text: 'אותו מחיר. הבא בתור.' }],
  },
]

export const FOLLOW_UPS: readonly FollowUp[] = [
  ...FOLLOW_UPS_STAGE_A,
  ...FOLLOW_UPS_1991,
  ...FOLLOW_UPS_STAGE_B,
  ...FOLLOW_UPS_ADULT,
  ...FOLLOW_UPS_MISSIONS,
  ...FOLLOW_UPS_SHIRTS,
  ...STRANGERS,
]
