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
import {lookAt} from '../universal/cast'
import type {ArchiveRef, CastMember, Look, MissionCall} from '../universal/types'
import type {ClubArchiveView} from './archive'
import {chapterFit, specFor, type Fit} from './fit'
import type {KnownLook, MissionSpec} from './spec'
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

/** who a find mission is looking for, when the player already knows him: the father on the pitch, the friend abroad */
export const KNOWN_FOR: Readonly<Record<string, string>> = {'title-night': 'dad', 'europe-night': 'friend'}

/** a LIFE cast member as RUSH draws him, at the age the supporter is now (so a father of seventy is grey in the crowd) */
export function knownLook(role: string, look: Look, age: number): KnownLook {
  const l = lookAt(role, look, age)
  const grey = !!l.hair && /^#8a8a90$/i.test(l.hair)
  return {role, cap: !!l.cap, scarf: !!l.scarf, kit: !!l.kit, beard: !!(l.beard || l.mustache), tall: (l.h ?? 6.3) >= 6.5, grey,
    hex: {...(l.skin ? {skin: l.skin} : {}), ...(l.hair && !grey ? {hair: l.hair} : {}), ...(l.shirt && !l.kit ? {top: l.shirt} : {}), ...(l.pants ? {pants: l.pants} : {})}}
}

export function missionSpecFor(door: RushDoor | null | undefined, call: MissionCall, chapter: {id: string; age: number; anchor?: ArchiveRef}, ctx: {time: 'day' | 'night'; locale: 'en' | 'he'; playId: string; cast?: Readonly<Record<string, Pick<CastMember, 'look'>>>}): MissionSpec | null {
  if (!door) return null
  const t = templateById(call.template)
  const fit = door.fits.find(f => f.template === call.template)
  if (!t || !fit) return null
  if (chapter.age < t.ages[0] || chapter.age > t.ages[1]) return null
  const local = chapterFit(t, fit, chapter.anchor ?? null, door.view)
  if (local.state !== 'READY' && local.state !== 'NEUTRAL') return null
  const spec = specFor(t, local, {...door.view, anchors: []}, {seed: seedOf(door.view.clubId, chapter.id, ctx.playId), skin: door.view.clubId, age: chapter.age, mandatory: call.mandatory, time: ctx.time, locale: ctx.locale})
  const role = KNOWN_FOR[call.template], member = role ? ctx.cast?.[role] : undefined
  const who = role && member ? knownLook(role, member.look, chapter.age) : null
  return {...spec, ...(call.beat ? {beat: call.beat} : {}), ...(who ? {who} : {})}
}

/** what a played mission leaves in the life: one flag for how it went, and the small proofs it carried home */
export function missionFlags(template: string, r: {outcome: string; evidence: string[]; skipped: boolean}): {k: string; v: string | boolean}[] {
  if (r.skipped) return [{k: `life:rush:${template}`, v: 'skipped'}]
  return [{k: `life:rush:${template}`, v: r.outcome}, ...r.evidence.map(e => ({k: `life:rush:${template}:${e}`, v: true}))]
}
