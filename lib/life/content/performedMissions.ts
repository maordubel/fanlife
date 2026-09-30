import type { ActivityMechanic } from '../../mechanics/types'
import type { ActivityId } from '../activities'
import type { RouteId, RouteStage } from '../routes'
import type { ReputationAudience, SkillId } from '../types'

/**
 * משימות מבוצעות — the authored situation around an activity (MASTER §20, PERFORMED §48–§50).
 *
 * A mission is PERSON + NEED + PLACE + TIME, written as the ask conversation in
 * `dialogueMissions.ts` — never a menu label. This file is metadata only: which activity it
 * rides on, which recipe the bench opens, what evidence it can leave, where the world shows
 * the result again. Three things it deliberately does NOT do:
 *
 *  · **No eligibility.** `routes.ts` stays the source of truth for who is on what. A mission
 *    names a `routeHint` so the opportunity resolver can rank it; it never locks a door.
 *  · **No economy.** Minutes, energy, skill and pay live on the `ActivityDef` the mission
 *    rides on (`activities.ts`), settled by the one `settleActivity`.
 *  · **No recipe→route binding.** The same `gate5-banner` recipe serves a boy helping Asaf
 *    in 1998 and a man running a tifo night in 2001.
 */

export type MissionMechanic = { kind: 'supporterCraft'; recipe: string } | { kind: Exclude<ActivityMechanic, 'supporterCraft'> }

export type MissionContextTag =
  | 'supporter'
  | 'work'
  | 'family'
  | 'relationship'
  | 'travel'
  | 'creator'
  | 'journalism'
  | 'founder'
  | 'owner'

export type PerformedMissionDef = {
  id: string
  /** the chapters this situation is authored for — the activity's own window narrows it further */
  chapters: readonly string[]
  titleHe: string
  hostHe: string
  /** the character behind `hostHe`, for the resolver's "who is nearby" question */
  hostId?: string
  activity: ActivityId
  mechanic: MissionMechanic
  routeHint?: RouteId
  minRouteStage?: RouteStage
  /**
   * The evidence this mission can leave, in the route ledger's own vocabulary
   * (`leadership_proof`, `creation_proof`). `proofAt: 'callback'` means the proof is written
   * the night the thing is USED, not the afternoon it is made (PERFORMED §23).
   */
  proofKind?: string
  proofAt?: 'settle' | 'callback'
  /**
   * The standing this earns and for whom. `witnessed: true` pays it out in the same breath
   * (the crew is standing there); otherwise it waits in `reputation.pending` until a callback
   * hears it (the stand sees the banner). MASTER §42/§43, the existing `reputation.heard` rule.
   */
  rep?: { audience: ReputationAudience; delta: number; witnessed: boolean }
  /** `banner:return:2000` — kind : verb : from-year; resolved by `lib/life/callbacks.ts` */
  callbackFlags?: readonly string[]
  /** the world key the output is kept under (`stand:banner`, `pugi:fan-shirt`) */
  outputId?: string
  contextTags?: readonly MissionContextTag[]
  /** the skill the doing itself teaches — applied by `settleActivity` once per chapter, whoever watched */
  skill?: { skill: SkillId; delta: number }
}

/** the mission's kind for the fatigue window — the mechanic, and the surface where it matters */
export function missionKind(mission: PerformedMissionDef): string {
  return mission.mechanic.kind === 'supporterCraft' ? `supporterCraft:${mission.mechanic.recipe}` : mission.mechanic.kind
}

export const PERFORMED_MISSIONS: readonly PerformedMissionDef[] = [
  // ------------------------------------------------------------- ULTRAS, across time ----
  {
    /** 1991 · אפי · ליל אוסישקין — a stack of old papers and a pair of scissors. Small help. */
    id: 'hall-confetti-91',
    chapters: ['1991', '1993-galil'],
    titleHe: 'לחתוך קונפטי',
    hostHe: 'אפי',
    hostId: 'efi',
    activity: 'hall-confetti',
    mechanic: { kind: 'supporterCraft', recipe: 'derby-confetti' },
    routeHint: 'ULTRAS',
    outputId: 'hall:confetti',
    callbackFlags: ['confetti:hall:same'],
    contextTags: ['supporter'],
    skill: { skill: 'organization', delta: 1 },
  },
  {
    /** 1998 · אסף · מתחת ליציע — "הצבע הגיע רק עכשיו. יש שעה עד שיוצאים. אתה לוקח את האותיות?" */
    id: 'gate5-banner-98',
    chapters: ['1998-laces', '1999-basket'],
    titleHe: 'לעזור עם השלט',
    hostHe: 'אסף',
    hostId: 'asaf',
    activity: 'banner-letters',
    mechanic: { kind: 'supporterCraft', recipe: 'gate5-banner' },
    routeHint: 'ULTRAS',
    outputId: 'stand:banner',
    // painted alone under the stand: the skill moves now, gate 5's opinion waits for the stand
    rep: { audience: 'gate5', delta: 4, witnessed: false },
    callbackFlags: ['banner:return:2000'],
    contextTags: ['supporter', 'creator'],
    skill: { skill: 'creativity', delta: 2 },
  },
  {
    /** 1998–2000 · אופיר, with Asaf's stencil — the wall by the kiosk. Trusted with the letters. */
    id: 'wall-stencil-98',
    chapters: ['1998-laces', '1999-cup', '2000-title', '2000-double'],
    titleHe: 'להכין סטנסיל',
    hostHe: 'אופיר',
    hostId: 'ofir',
    activity: 'wall-stencil',
    mechanic: { kind: 'supporterCraft', recipe: 'wall-stencil' },
    routeHint: 'ULTRAS',
    minRouteStage: 'entry',
    outputId: 'wall:stencil',
    callbackFlags: ['stencil:wall:next'],
    contextTags: ['supporter', 'creator'],
    skill: { skill: 'creativity', delta: 2 },
  },
  {
    /**
     * 2001 / 2012 · ארז · שער 5 — three people, one cloth, two hours. You are responsible.
     * Coordinate (who takes what) and craft. The crew is standing there, so the standing is
     * heard at once; the evidence is `leadership_proof`, the shape `PROOF_LEAD` reads.
     */
    id: 'tifo-night-01',
    chapters: ['2001-terrace', '2012-terrace'],
    titleHe: 'ערב תפאורה',
    hostHe: 'ארז',
    hostId: 'crowd-erez',
    activity: 'tifo-night',
    mechanic: { kind: 'supporterCraft', recipe: 'gate5-banner' },
    routeHint: 'ULTRAS',
    minRouteStage: 'entry',
    proofKind: 'leadership_proof',
    proofAt: 'settle',
    rep: { audience: 'gate5', delta: 5, witnessed: true },
    outputId: 'stand:banner',
    callbackFlags: ['banner:return:2002'],
    contextTags: ['supporter'],
    skill: { skill: 'organization', delta: 3 },
  },
  // ------------------------------------------------------------------- CREATOR ----------
  {
    /** 1990–1995 · the bedroom · Kobi's old white shirt and a marker — a shirt of your own */
    id: 'fan-shirt-first-90',
    chapters: ['1990', '1991', '1993-cup', '1993-galil', '1995-sinai'],
    titleHe: 'חולצה משלי',
    hostHe: 'החדר שלך',
    activity: 'fan-shirt',
    mechanic: { kind: 'supporterCraft', recipe: 'fan-shirt-first' },
    routeHint: 'CREATOR',
    outputId: 'pugi:fan-shirt',
    callbackFlags: ['shirt:wear:same'],
    contextTags: ['creator'],
    skill: { skill: 'creativity', delta: 2 },
  },
  {
    /**
     * 1993–1999 · אופיר · the street — "תכין גם לי." Made for a friend; the proof is written
     * only the day he wears it where people can see (`cb-friend-shirt-seen`), because
     * `PROOF_CREATE` is *"יצירה מקורית שנעשה בה שימוש"*.
     */
    id: 'friend-shirt-93',
    chapters: ['1993-cup', '1996-army', '1998-laces', '1999-cup'],
    titleHe: 'תכין גם לי',
    hostHe: 'אופיר',
    hostId: 'ofir',
    activity: 'friend-shirt',
    mechanic: { kind: 'supporterCraft', recipe: 'fan-shirt-first' },
    routeHint: 'CREATOR',
    proofKind: 'creation_proof',
    proofAt: 'callback',
    rep: { audience: 'public', delta: 3, witnessed: false },
    outputId: 'ofir:fan-shirt',
    callbackFlags: ['shirt:ofir:next'],
    contextTags: ['creator', 'relationship'],
    skill: { skill: 'creativity', delta: 2 },
  },
]

export const MISSION: Record<string, PerformedMissionDef> = Object.fromEntries(PERFORMED_MISSIONS.map((row) => [row.id, row]))

export const missionById = (id: string): PerformedMissionDef | null => MISSION[id] ?? null

/**
 * The mission an activity is played AS in this chapter, or null: an activity with no mission
 * is an ordinary afternoon and settles exactly as it always did.
 */
export function missionForActivity(activityId: ActivityId, chapter: string): PerformedMissionDef | null {
  return PERFORMED_MISSIONS.find((row) => row.activity === activityId && row.chapters.includes(chapter)) ?? null
}

/** `mission:<id>:done` — chapter-local (no surviving prefix), so a mission is once per chapter, never twice */
export const missionDoneFlag = (id: string) => `mission:${id}:done`

/** `own:output:<outputId>` — the world has this thing; survives every day and year */
export const outputFlag = (outputId: string) => `own:output:${outputId}`

/** `cb:made:<outputId>` — made THIS chapter; a day flag, so a "later" callback cannot fire the afternoon the thing was made */
export const madeFlag = (outputId: string) => `cb:made:${outputId}`

/** `own:cb:<flag>` — a callback owed; survives every day and year */
export const callbackFlag = (flag: string) => `own:cb:${flag}`

/** `proofId` a mission's pending standing is queued under — one per mission, so a hearing can name it */
export const missionProofId = (id: string) => `mission:${id}`
