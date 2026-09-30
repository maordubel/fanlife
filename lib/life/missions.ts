import type { CraftMark, CraftOutput, CraftSurface } from '../game/craft/types'
import { CRAFT_SURFACES } from '../game/craft/types'
import type { ActivityResult } from '../mechanics/types'
import type { ActivityId, ActivityTier } from './activities'
import {
  callbackFlag,
  madeFlag,
  missionDoneFlag,
  missionForActivity,
  missionKind,
  missionProofId,
  outputFlag,
  type PerformedMissionDef,
} from './content/performedMissions'
import type { LifeEvent } from './events'
import type { KeptOutput, LifeState } from './types'

/**
 * הסליקה של משימה — the mission half of `settleActivity` (MASTER §22, PERFORMED §51–§52).
 *
 * One settlement, extended and never duplicated: `settleActivity` writes the afternoon (time,
 * energy, pay, the activity's own skill and relationship) and then asks this file what the
 * SITUATION the activity was played as leaves behind — a mission row, evidence, a thing kept,
 * a callback owed, a claim on somebody's opinion. Every row is guarded by `mission:<id>:done`
 * so a remount, a reload or a board that answers twice leaves exactly one of each.
 *
 * Nothing here is money. Nothing here reads the recipe registry: the output arrives from the
 * bench already shaped (`ActivityResult.output.data`), and `keepOutput` only makes sure what
 * goes into the save is small — a bounded list of marks in 0..1, three decimals, capped
 * points — never a picture and never a pointer trail (MASTER §44–§45).
 */

/** the bench's own caps, repeated here so the SAVE is bounded whatever a future bench sends */
export const MAX_KEPT_MARKS = 40
export const MAX_KEPT_POINTS = 12

const round3 = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const MARK_KINDS: ReadonlySet<string> = new Set(['text', 'stamp', 'stripe', 'shape', 'stroke', 'spray', 'cut', 'stencil'])
const COLORS: ReadonlySet<string> = new Set(['red', 'ink', 'sheet', 'concrete', 'sign'])

/** one mark, validated and clamped — null when it is not a mark at all */
function normaliseMark(raw: unknown): CraftMark | null {
  if (!raw || typeof raw !== 'object') return null
  const mark = raw as Record<string, unknown>
  if (typeof mark.kind !== 'string' || !MARK_KINDS.has(mark.kind)) return null
  if (!isNumber(mark.x) || !isNumber(mark.y)) return null
  const out: CraftMark = { kind: mark.kind as CraftMark['kind'], x: round3(mark.x), y: round3(mark.y) }
  if (typeof mark.value === 'string') out.value = mark.value.slice(0, 24)
  if (typeof mark.color === 'string' && COLORS.has(mark.color)) out.color = mark.color as CraftMark['color']
  if (isNumber(mark.scale)) out.scale = Math.round(Math.max(0.05, Math.min(4, mark.scale)) * 1000) / 1000
  if (isNumber(mark.rotate)) out.rotate = Math.round(Math.max(-180, Math.min(180, mark.rotate)))
  if (isNumber(mark.width)) out.width = round3(mark.width)
  if (Array.isArray(mark.points)) {
    const points: (readonly [number, number])[] = []
    for (const point of mark.points) {
      if (!Array.isArray(point) || !isNumber(point[0]) || !isNumber(point[1])) continue
      points.push([round3(point[0]), round3(point[1])])
      if (points.length >= MAX_KEPT_POINTS) break
    }
    out.points = points
  }
  return out
}

/**
 * מה נכנס לשמירה — the output the bench handed over, bounded. Null when the result carries no
 * output, or one that is not a `CraftOutput` (a future bench, a corrupted save): the mission
 * is still done, the world just has nothing to hang.
 */
export function keepOutput(raw: unknown): CraftOutput | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  if (typeof data.recipeId !== 'string' || typeof data.surface !== 'string') return null
  if (!(CRAFT_SURFACES as readonly string[]).includes(data.surface)) return null
  if (!Array.isArray(data.marks)) return null
  const marks: CraftMark[] = []
  for (const mark of data.marks) {
    const kept = normaliseMark(mark)
    if (kept) marks.push(kept)
    if (marks.length >= MAX_KEPT_MARKS) break
  }
  const out: CraftOutput = { recipeId: data.recipeId, surface: data.surface as CraftSurface, marks }
  if (typeof data.base === 'string' && COLORS.has(data.base)) out.base = data.base as CraftOutput['base']
  if (isNumber(data.measure)) out.measure = round3(data.measure)
  return out
}

/** the measure the world tiers off: the bench's own, else the score the life graded */
export function measureOf(result: ActivityResult, output: CraftOutput | null): number {
  const raw = output?.measure ?? result.score
  return round3(Number.isFinite(raw) ? raw : 0)
}

/** the id a mission's proof is recorded under — the kind, the chapter, and the mission, so two led nights in one year are two rows */
export const missionProofRecordId = (mission: PerformedMissionDef, chapter: string) =>
  `${mission.proofKind ?? 'mission'}:${chapter}:${mission.id}`

/**
 * The events a completed activity's MISSION adds to its settlement, or none: an activity with
 * no mission in this chapter, a mission already done this chapter, or a result that was not
 * completed all leave the settlement exactly as `settleActivity` wrote it.
 */
export function missionEvents(state: LifeState, id: ActivityId, result: ActivityResult, tier: ActivityTier): LifeEvent[] {
  if (!result.completed) return []
  const chapter = state.chapter
  const mission = missionForActivity(id, chapter)
  if (!mission) return []
  if (state.flags[missionDoneFlag(mission.id)]) return []

  const events: LifeEvent[] = [
    { t: 'mission.completed', id: mission.id, chapter, year: state.year, tier, kind: missionKind(mission) },
    { t: 'flag.raised', flag: missionDoneFlag(mission.id) },
  ]

  // the skill the doing teaches — immediately, whoever watched (MASTER §43)
  if (mission.skill) events.push({ t: 'skill.changed', skill: mission.skill.skill, delta: mission.skill.delta, why: mission.titleHe })

  // evidence written at the settle: a night led with the crew standing there
  if (mission.proofKind && mission.proofAt !== 'callback') {
    events.push({
      t: 'proof.recorded',
      proof: { kind: mission.proofKind, proofId: missionProofRecordId(mission, chapter), chapter, year: state.year, subjectHe: mission.titleHe },
    })
  }

  // the standing: earned now, paid only when the audience saw or heard (the existing rule)
  if (mission.rep) {
    const proofId = missionProofId(mission.id)
    events.push({ t: 'reputation.earned', proofId, audience: mission.rep.audience, delta: mission.rep.delta, why: mission.titleHe })
    if (mission.rep.witnessed) events.push({ t: 'reputation.heard', proofId })
  }

  // the thing made, kept under its world key — only a real output, only when the mission has a place for it
  const output = keepOutput(result.output?.data)
  if (mission.outputId && output) {
    const kept: KeptOutput = {
      outputId: mission.outputId,
      missionId: mission.id,
      chapter,
      year: state.year,
      measure: measureOf(result, output),
      data: output,
    }
    events.push(
      { t: 'output.kept', output: kept },
      { t: 'flag.raised', flag: outputFlag(mission.outputId) },
      { t: 'flag.raised', flag: madeFlag(mission.outputId) },
    )
    // a callback is owed only when there is something to see again
    for (const flag of mission.callbackFlags ?? []) events.push({ t: 'flag.raised', flag: callbackFlag(flag) })
  }

  return events
}
