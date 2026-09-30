import { WEAR_CRAFTED_FLAG } from '../shirts'
import { SETS, stuckIn, type StickerSetId } from '../stickers'
import type { LocationId } from '../types'
import { ALL_SCENES, inEra } from '../world/scenes'
import type { Beat } from './beats'
import { CHAPTERS } from './chapters'
import type { FollowUp } from './followUps'
import { callbackFlag, madeFlag } from './performedMissions'

/**
 * הביטים שמראים את הדבר שוב (delta 91, PERFORMED §47 — the blocker before any rollout).
 *
 * A callback beat is attached to every chapter old enough for the thing to be due, the way
 * `HEARD_BEATS` are (`era.ts`): the flag the mission raised is the door, `cb:made:<output>`
 * (a day flag, erased at the chapter cut) keeps it shut in the chapter the thing was made,
 * and the `own:cb:<kind>:heard` flag the conversation raises keeps the LINE to once in a life.
 * The visual — the banner over the stand — is not a beat: `components/life/CraftCallback.tsx`
 * draws it whenever `callbacksAt` says it hangs.
 */

/**
 * The match chapters whose walk from the chapter's own start reaches the terrace — read off
 * `npm run life:worldlines` (a beat in a room the chapter's closure never reaches is a
 * `ROOM_ORPHANED` hole; 2010-cup, for one, has the door and not the walk). A chapter that
 * gains a way into the stand is added here by name, with the audit as the witness.
 */
const STAND_CHAPTERS: readonly string[] = [
  '2000-title',
  '2000-double',
  '2010-anthem',
  // '2018-return' — Bloomfield is shut until the jump to 2019 (rule 82); the banner waits for the reopened ground
  '2019-armchair',
  '2021-losses',
  '2021-promises',
  '2021-suitcase',
  '2023-abroad',
  '2023-quiet',
  '2023-tournament',
  '2023-visit',
  '2024-lina',
  '2024-terrace',
  '2025-abroad',
  '2025-eurocup',
  '2025-interview',
  '2025-owner',
  '2026-finale',
  '2026-plan',
]

const yearsFrom = (year: number): string[] =>
  STAND_CHAPTERS.filter((id) => CHAPTERS.some((row) => row.id === id && row.playable !== false && row.year >= year))

/** the chapters where this person stands in this room — narration about him is only honest there */
const chaptersWith = (room: LocationId, nameHe: string, among: readonly string[]): string[] =>
  among.filter((chapter) => ALL_SCENES.some((scene) => scene.id === room && scene.actors.some((actor) => actor.nameHe === nameHe && inEra(actor, chapter))))

/** the banner painted under the stand in 1998/99 is seen over the terrace from the first match of the new decade */
const bannerSeen = (id: string, owed: string): Beat => ({
  id,
  at: 'bloomfield-inside',
  trigger: 'enter',
  delayMs: 1400,
  when: { all: [{ flag: callbackFlag(owed) }], none: [{ flag: madeFlag('stand:banner') }, { flag: callbackFlag('banner:heard') }] },
  do: [{ a: 'talk', conversation: 'cb-banner-seen' }],
})

export const CALLBACK_BEATS: Readonly<Record<string, readonly Beat[]>> = (() => {
  const out: Record<string, Beat[]> = {}
  const add = (chapters: readonly string[], beat: Beat) => {
    for (const chapter of chapters) (out[chapter] ??= []).push(beat)
  }
  add(yearsFrom(2000), bannerSeen('cb-banner-2000', 'banner:return:2000'))
  add(yearsFrom(2002), bannerSeen('cb-banner-2002', 'banner:return:2002'))
  // Ofir turns up in the shirt made for him — in the street, in the chapters he stands there
  add(chaptersWith('street', 'אופיר', CHAPTERS.filter((row) => row.playable !== false && row.year >= 1996 && row.year < 2000).map((row) => row.id)), {
    id: 'cb-friend-shirt',
    at: 'street',
    trigger: 'enter',
    delayMs: 1100,
    when: { all: [{ flag: callbackFlag('shirt:ofir:next') }], none: [{ flag: madeFlag('ofir:fan-shirt') }, { flag: callbackFlag('shirt:ofir:heard') }] },
    do: [{ a: 'talk', conversation: 'cb-friend-shirt-seen' }],
  })
  /**
   * סופרגול, שלושים שנה אחר כך (delta 92, upgrade plan §5.6): DO → REMEMBER → SEE AGAIN.
   * A boy who stuck a page of the eighties into the album finds it in a box in the flat of
   * a grown man, and says one sentence — no collection count, no progress bar. The look is
   * read off the album at that moment (`derive`), so a life that never bought a packet
   * finds a box of exercise books and nothing more.
   */
  add(['2013-household'], {
    id: 'cb-album-look',
    at: 'home',
    trigger: 'enter',
    delayMs: 2600,
    when: { none: [{ flag: 'own:album:looked-2013' }] },
    do: [
      { a: 'flag', flag: 'own:album:looked-2013' },
      { a: 'derive', events: (state) => (EIGHTIES.some((set) => stuckIn(state, set) > 0) ? [{ t: 'flag.raised', flag: 'cb:album80s' }] : []) },
    ],
  })
  add(['2013-household'], {
    id: 'cb-album-line',
    at: 'home',
    trigger: 'clock',
    delayMs: 900,
    when: { all: [{ flag: 'cb:album80s' }], none: [{ flag: 'own:album:said-2013' }] },
    do: [
      { a: 'flag', flag: 'own:album:said-2013' },
      {
        a: 'lines',
        lines: [
          { who: null, text: 'בארגז מתחת למיטה, בין מחברות ישנות: האלבום. מדבקה אחת עקומה, בדיוק כמו שהדבקת אותה.' },
          { who: 'פוגי', text: 'יש לי את זה מאז שהייתי שמונה.' },
        ],
      },
    ],
  })
  return out
})()

/** the albums of the eighties — the pages a boy of eight could have filled */
const EIGHTIES = (Object.keys(SETS) as StickerSetId[]).filter((id) => SETS[id].era === '80s' && SETS[id].acquisition === 'packet')

/**
 * ומה שאנשים אומרים כשהם רואים (world/followUp.ts): a REACTION is news once, in the mouth of
 * the person you walked up to, and then it is the old conversation again.
 */
export const FOLLOW_UPS_MISSIONS: readonly FollowUp[] = [
  {
    id: 'cb-ofir-your-shirt',
    chapter: ['1993-cup', '1996-army', '1998-laces', '1999-cup'],
    on: ['ofir-1993', 'ofir-army', 'ofir-laces', 'ofir-cup99'],
    cls: 'REACTION',
    when: { flag: WEAR_CRAFTED_FLAG },
    lines: [{ who: 'אופיר', text: 'רגע. מה זה על הגב שלך? אתה צבעת את זה? תסתובב.' }],
  },
  {
    id: 'cb-ofir-stencil-still-there',
    chapter: ['1999-cup', '2000-title', '2000-double'],
    npc: 'ofir',
    cls: 'REACTION',
    when: { all: [{ flag: callbackFlag('stencil:wall:next') }], none: [{ flag: madeFlag('wall:stencil') }] },
    lines: [{ who: 'אופיר', text: 'הסטנסיל שלך עוד על הקיר ליד הקיוסק. מישהו ניסה למחוק, וויתר באמצע.' }],
  },
]
