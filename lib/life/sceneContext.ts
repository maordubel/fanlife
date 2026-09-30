import { t, type MessageKey } from '../i18n'
import { callbacksForChapter, confettiTier, craftedWardrobe } from './callbacks'
import { callbackFlag } from './content/performedMissions'
import { isActive, routeAtLeast } from './routes'
import { flagOn, type LifeState } from './types'
import { careerEntry, leadingArea, resolveWorkProfile } from './work'

/**
 * הרכב הסצנה (MASTER §34) — one scene, several modifiers, never forty versions of it.
 *
 * `buildSceneContext` reads the state and returns up to six LINES, each a human sentence
 * (`messages/he.stage.life91m.json`), never a figure: what the terrace makes of him, what
 * his work is, who he made something for, what of his is hanging in the world right now,
 * what he has on. The "אני" sheet prints them under the identity sentence; a scene can
 * read the same object to colour an opening line. Everything here is derived — nothing is
 * stored, and a line appears only when Pugi would know it himself (MASTER §80).
 */

export type SceneContext = {
  routeLine?: string
  workLine?: string
  familyLine?: string
  relationshipLine?: string
  callbackLine?: string
  presenceLine?: string
}

const WORK_LINE: Record<string, MessageKey> = {
  media: 'life91m.me.work.media',
  organization: 'life91m.me.work.organization',
  business: 'life91m.me.work.business',
  creative: 'life91m.me.work.creative',
  technical: 'life91m.me.work.technical',
  international: 'life91m.me.work.international',
}
const LEAN_LINE: Record<string, MessageKey> = {
  media: 'life91m.me.lean.media',
  business: 'life91m.me.lean.business',
  creative: 'life91m.me.lean.creative',
}

const SUPPORTER_MISSIONS: ReadonlySet<string> = new Set(['hall-confetti-91', 'gate5-banner-98', 'wall-stencil-98', 'tifo-night-01'])

export function buildSceneContext(state: LifeState): SceneContext {
  const out: SceneContext = {}
  const missions = state.missions ?? []

  // --- the terrace: trust is what people did with you, said as people say it (MASTER §42)
  const helped = missions.filter((row) => SUPPORTER_MISSIONS.has(row.id)).length
  if (isActive(state, 'ULTRAS') && routeAtLeast(state, 'ULTRAS', 'entry')) out.routeLine = t('life91m.me.route.trusted')
  else if (state.reputation.standing.gate5 >= 10 || missions.some((row) => row.id === 'tifo-night-01')) out.routeLine = t('life91m.me.route.trusted')
  else if (helped >= 2) out.routeLine = t('life91m.me.route.known')
  else if (helped === 1) out.routeLine = t('life91m.me.route.helped')

  // --- work: a profession he holds, or the direction the evidence already leans (never before eighteen)
  const profile = resolveWorkProfile(state)
  if (state.age >= 18) {
    const work = WORK_LINE[profile.profession]
    if (work) out.workLine = t(work)
    else {
      const area = leadingArea(state)
      const entry = area === 'media' ? careerEntry(state, 'JOURNALIST') : area === 'business' ? careerEntry(state, 'OWNER') : area === 'creative' ? careerEntry(state, 'CREATOR') : null
      const lean = area ? LEAN_LINE[area] : undefined
      if (lean && entry === 'organic') out.workLine = t(lean)
    }
  }

  // --- somebody uses what he made
  if (flagOn(state, callbackFlag('shirt:ofir:heard'))) out.relationshipLine = t('life91m.me.rel.ofirShirt')
  else if ((state.outputs ?? {})['ofir:fan-shirt']) out.relationshipLine = t('life91m.me.rel.ofirShirtMade')

  // --- what of his is in the world this chapter
  const due = callbacksForChapter(state)
  if (due.some((row) => row.kind === 'banner')) out.callbackLine = t('life91m.me.callback.banner')
  else if (confettiTier(state) !== 'none') out.callbackLine = t('life91m.me.callback.confetti')
  else if (due.some((row) => row.kind === 'stencil')) out.callbackLine = t('life91m.me.callback.stencil')

  // --- what he has on
  const worn = craftedWardrobe(state).find((row) => row.worn)
  if (worn) out.presenceLine = t('life91m.me.presence.ownShirt')

  return out
}

/** the lines in reading order, for a sheet that prints them one under the other */
export function sceneContextLines(context: SceneContext): string[] {
  return [context.routeLine, context.workLine, context.relationshipLine, context.callbackLine, context.presenceLine, context.familyLine].filter(
    (line): line is string => Boolean(line),
  )
}
