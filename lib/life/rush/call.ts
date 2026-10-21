/**
 * LIFE · RUSH — the one step between a script asking for a mission and RUSH receiving a spec.
 *
 * The shell (LifeGame) holds the club's fitted missions (`RushDoor`, built on the server from the
 * club's own archive) and the chapter it is playing. When a choice asks for a mission, this decides:
 *  · whether this club can play that mission at all (HELD and IRRELEVANT cannot),
 *  · whether the supporter is the age the mission is for (a child does not drive the away day),
 *  · which night it stands on — the chapter's own, or none (`chapterFit`).
 * Anything that says no returns `null`, and the script's fallback (its small game, or nothing) plays.
 */
import type {ArchiveRef, MissionCall} from '../universal/types'
import type {ClubArchiveView} from './archive'
import {chapterFit, specFor, type Fit} from './fit'
import type {MissionSpec} from './spec'
import {templateById} from './templates'

/** what the server hands LIFE about RUSH for one club: every template's fit, and the club's names (no archive rows) */
export type RushDoor = {
  fits: Fit[]
  view: Omit<ClubArchiveView, 'anchors'>
  /** the club's gate as its own signs write it */
  gateLabel: string
}

/** a stable seed from strings: the same choice in the same life always deals the same street */
export function seedOf(...parts: string[]): number {
  let h = 2166136261
  for (const p of parts) for (let i = 0; i < p.length; i++) h = Math.imul(h ^ p.charCodeAt(i), 16777619)
  return h >>> 0
}

export function missionSpecFor(door: RushDoor | null | undefined, call: MissionCall, chapter: {id: string; age: number; anchor?: ArchiveRef}, ctx: {time: 'day' | 'night'; locale: 'en' | 'he'; playId: string}): MissionSpec | null {
  if (!door) return null
  const t = templateById(call.template)
  const fit = door.fits.find(f => f.template === call.template)
  if (!t || !fit) return null
  if (chapter.age < t.ages[0] || chapter.age > t.ages[1]) return null
  const local = chapterFit(t, fit, chapter.anchor ?? null, door.view)
  if (local.state !== 'READY' && local.state !== 'NEUTRAL') return null
  return specFor(t, local, {...door.view, anchors: []}, {seed: seedOf(door.view.clubId, chapter.id, ctx.playId), skin: door.view.clubId, age: chapter.age, mandatory: call.mandatory, time: ctx.time, locale: ctx.locale})
}

/** what a played mission leaves in the life: one flag for how it went, and the small proofs it carried home */
export function missionFlags(template: string, r: {outcome: string; evidence: string[]; skipped: boolean}): {k: string; v: string | boolean}[] {
  if (r.skipped) return [{k: `life:rush:${template}`, v: 'skipped'}]
  return [{k: `life:rush:${template}`, v: r.outcome}, ...r.evidence.map(e => ({k: `life:rush:${template}:${e}`, v: true}))]
}
