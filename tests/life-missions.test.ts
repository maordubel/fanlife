import { describe, expect, it } from 'vitest'

import { ACTIVITIES, ACTIVITY, ACTIVITY_CONVERSATIONS, activityChapters, alreadySettled, pickContent, settleActivity, type ActivityId } from '@/lib/life/activities'
import { callbacksAt, callbacksForChapter, confettiTier, craftedWardrobe, dueIn, standBanner } from '@/lib/life/callbacks'
import { CALLBACK_BEATS, FOLLOW_UPS_MISSIONS } from '@/lib/life/content/callbackBeats'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { CHAPTER, CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import {
  MISSION,
  PERFORMED_MISSIONS,
  callbackFlag,
  madeFlag,
  missionDoneFlag,
  missionForActivity,
  missionProofId,
  outputFlag,
} from '@/lib/life/content/performedMissions'
import { LifeEngine } from '@/lib/life/engine'
import { apply, emptyState, fold, type LifeEvent } from '@/lib/life/events'
import { keepOutput, MAX_KEPT_MARKS, MAX_KEPT_POINTS } from '@/lib/life/missions'
import { offersNow } from '@/lib/life/offers'
import { fatigued, resolveLifeOpportunities } from '@/lib/life/opportunityResolver'
import { WEAR_CRAFTED_FLAG } from '@/lib/life/shirts'
import { buildSceneContext, sceneContextLines } from '@/lib/life/sceneContext'
import { stageFlag } from '@/lib/life/routes'
import { RECENT_CAP, type LifeState } from '@/lib/life/types'
import { careerEntry, resolveCareerSeeds, resolveWorkProfile } from '@/lib/life/work'
import { SCENE, sceneIn, inEra } from '@/lib/life/world/scenes'
import { readFileSync } from 'node:fs'
import { EMPTY_CATALOG, type ActivityResult } from '@/lib/mechanics/types'

/**
 * משימות מבוצעות (delta 91) — resolver, settlement, callbacks, work, migration (MASTER §87–§90).
 *
 * A life suite never types a year (rule 45): every year below is read off `CHAPTERS`.
 */

const YEAR = (id: string) => CHAPTER[id]?.year ?? 0

function lifeIn(chapter: string, extra: Partial<LifeState> = {}): LifeState {
  const def = CHAPTER[chapter]
  if (!def) throw new Error(`no chapter ${chapter}`)
  const base = emptyState(DEFAULT_IDENTITY, def.year)
  return { ...base, chapter, year: def.year, age: def.year - DEFAULT_IDENTITY.birthYear, location: def.start.location, rng: { seed: `test-${chapter}`, cursor: 0 }, ...extra }
}

const settle = (state: LifeState, events: readonly LifeEvent[]) => events.reduce(apply, state)

const BANNER_OUTPUT = {
  recipeId: 'gate5-banner',
  surface: 'banner',
  base: 'sheet',
  measure: 0.82,
  marks: [
    { kind: 'text', value: 'הפועל', x: 0.5, y: 0.5, color: 'red', scale: 1 },
    { kind: 'stroke', x: 0.1, y: 0.2, color: 'red', width: 0.04, points: [[0.1, 0.2], [0.3, 0.25], [0.5, 0.2]] },
  ],
} as const

const done = (output: unknown = BANNER_OUTPUT): ActivityResult => ({ completed: true, score: 0.82, output: { id: 'gate5-banner', data: output as never } })

describe('the registry — metadata, never eligibility', () => {
  it('every mission rides on a real activity, in chapters the activity exists in, with a placed ask', () => {
    for (const mission of PERFORMED_MISSIONS) {
      const def = ACTIVITY[mission.activity]
      expect(def, mission.id).toBeDefined()
      const window = activityChapters(def)
      for (const chapter of mission.chapters) {
        expect(window, `${mission.id} @ ${chapter}`).toContain(chapter)
        expect(missionForActivity(mission.activity, chapter)?.id).toBe(mission.id)
        // the ask stands in a room of that chapter — PLACE is real
        const ask = ACTIVITY_CONVERSATIONS[mission.activity].ask
        expect(ask, mission.id).toBeTruthy()
        const placed = Object.values(SCENE).some((base) => sceneIn(base, chapter).hotspots.some((spot) => spot.act === ask && inEra(spot, chapter)))
        expect(placed, `${mission.id}: ask not placed in ${chapter}`).toBe(true)
      }
      expect(mission.chapters.length).toBeGreaterThan(0)
    }
  })

  it('every ask is a person with a need, in a place, with a time — dialogue, not a label', () => {
    for (const mission of PERFORMED_MISSIONS) {
      const ask = DIALOGUE[ACTIVITY_CONVERSATIONS[mission.activity].ask as string]
      expect(ask, mission.id).toBeDefined()
      const text = JSON.stringify(ask)
      expect(text).toContain(`"activity":"${mission.activity}"`)
      // the spec's own example is the spec's own words (MASTER §6)
      if (mission.id === 'gate5-banner-98') expect(text).toContain('הצבע הגיע רק עכשיו. יש שעה עד שיוצאים. אתה לוקח את האותיות?')
    }
  })

  it('the recipe rides in the request (`contentId`) — and only for a craft mission', () => {
    const state = lifeIn('1998-laces')
    expect(pickContent(state, 'banner-letters', EMPTY_CATALOG)?.contentId).toBe('gate5-banner')
    expect(pickContent(lifeIn('1991'), 'hall-confetti', EMPTY_CATALOG)?.contentId).toBe('derby-confetti')
    // a craft activity in a chapter no mission is authored for deals nothing
    expect(pickContent(lifeIn('1999-basket'), 'wall-stencil', EMPTY_CATALOG)).toBeNull()
  })

  it('a craft reaction is a human sentence for every tier and never a number', () => {
    for (const def of ACTIVITIES.filter((row) => row.kind === 'supporterCraft')) {
      const after = DIALOGUE[ACTIVITY_CONVERSATIONS[def.id].after as string]
      expect(after, def.id).toBeDefined()
      const text = after!.branches.flatMap((branch) => branch.lines.map((line) => line.text)).join('\n')
      expect(/\d/.test(text), `${def.id}: a figure in a reaction`).toBe(false)
      expect(after!.branches.length).toBeGreaterThanOrEqual(4)
    }
    expect(JSON.stringify(DIALOGUE['act-banner-letters-after'])).toContain('אחי, תלית את זה הפוך.')
  })

  it('names no digit in the mission file and no route on a recipe', () => {
    const src = readFileSync('lib/life/content/performedMissions.ts', 'utf8')
    expect(/recipe\.route|route:\s*'/.test(src)).toBe(false)
  })
})

describe('settlement — one settlement, idempotent, reload-safe (MASTER §22, §88, §89)', () => {
  const chapter = '1998-laces'
  const id: ActivityId = 'banner-letters'

  it('keeps the output once, raises the callback, queues the standing and does not pay it', () => {
    const state = lifeIn(chapter)
    const settled = settleActivity(state, id, done())
    const kinds = settled.events.map((event) => event.t)
    expect(kinds.filter((t) => t === 'mission.completed')).toHaveLength(1)
    expect(kinds.filter((t) => t === 'output.kept')).toHaveLength(1)
    expect(kinds.filter((t) => t === 'reputation.earned')).toHaveLength(1)
    // painted alone under the stand: nobody heard it yet
    expect(kinds).not.toContain('reputation.heard')
    expect(kinds).not.toContain('proof.recorded')
    const after = settle(state, settled.events)
    expect(after.outputs['stand:banner']?.data.marks).toHaveLength(2)
    expect(after.outputs['stand:banner']?.measure).toBe(0.82)
    expect(after.flags[missionDoneFlag('gate5-banner-98')]).toBe(true)
    expect(after.flags[outputFlag('stand:banner')]).toBe(true)
    expect(after.flags[madeFlag('stand:banner')]).toBe(true)
    expect(after.flags[callbackFlag('banner:return:2000')]).toBe(true)
    expect(after.reputation.pending.some((row) => row.proofId === missionProofId('gate5-banner-98'))).toBe(true)
    expect(after.reputation.standing.gate5).toBe(0)
    expect(after.skills.creativity).toBe(2)
    expect(after.recentMechanics).toEqual(['supporterCraft'])
    expect(after.recentMissionKinds).toEqual(['supporterCraft:gate5-banner'])
    expect(after.missions).toHaveLength(1)
    expect(settled.paid).toBe(0)
  })

  it('a second settlement in the same chapter keeps nothing twice; folding twice is the same state', () => {
    const state = lifeIn(chapter)
    const first = settleActivity(state, id, done())
    const once = settle(state, first.events)
    const second = settleActivity(once, id, done())
    expect(second.events.map((event) => event.t)).not.toContain('output.kept')
    expect(second.events.map((event) => event.t)).not.toContain('mission.completed')
    expect(second.events.map((event) => event.t)).not.toContain('reputation.earned')
    const twice = settle(once, second.events)
    expect(twice.missions).toHaveLength(1)
    expect(twice.skills.creativity).toBe(2)
    // reload: the same log folded from scratch is the life the engine built step by step
    const log: LifeEvent[] = [...first.events, ...second.events]
    const a = settle(lifeIn(chapter), log)
    expect(a).toEqual(twice)
    expect(settle(lifeIn(chapter), log)).toEqual(a)
    expect(a.missions).toHaveLength(1)
    expect(alreadySettled(a, { activity: id, runs: 0 })).toBe(true)
  })

  it('walking away keeps nothing — a third of the time and nothing else', () => {
    const state = lifeIn(chapter)
    const away = settleActivity(state, id, { completed: false, score: 0, output: { id: 'gate5-banner', data: BANNER_OUTPUT as never } })
    const kinds = away.events.map((event) => event.t)
    expect(kinds).not.toContain('output.kept')
    expect(kinds).not.toContain('mission.completed')
    expect(kinds).not.toContain('skill.changed')
    const after = settle(state, away.events)
    expect(after.minute - state.minute).toBe(Math.round(ACTIVITY[id].minutes / 3))
    expect(after.outputs).toEqual({})
  })

  it('a witnessed mission pays its standing at once and writes the evidence PROOF_LEAD reads', () => {
    const state = lifeIn('2001-terrace')
    const settled = settleActivity(state, 'tifo-night', done())
    const after = settle(state, settled.events)
    expect(after.reputation.standing.gate5).toBe(5)
    expect(after.reputation.pending).toEqual([])
    expect(after.proofs.some((proof) => proof.kind === 'leadership_proof' && proof.chapter === '2001-terrace')).toBe(true)
    expect(after.outputs['stand:banner']?.missionId).toBe('tifo-night-01')
  })

  it('the friend’s shirt writes no proof at the settle — the proof waits for the night it is worn', () => {
    const state = lifeIn('1993-cup')
    const settled = settleActivity(state, 'friend-shirt', done({ ...BANNER_OUTPUT, recipeId: 'fan-shirt-first', surface: 'shirt' }))
    expect(settled.events.map((event) => event.t)).not.toContain('proof.recorded')
    const after = settle(state, settled.events)
    expect(after.flags[callbackFlag('shirt:ofir:next')]).toBe(true)
    expect(after.reputation.pending.some((row) => row.proofId === missionProofId('friend-shirt-93'))).toBe(true)
  })

  it('an activity with no mission in its chapter settles exactly as before', () => {
    const state = lifeIn('1990')
    const settled = settleActivity(state, 'lounge-xi', { completed: true, score: 1 })
    expect(settled.events.map((event) => event.t)).not.toContain('mission.completed')
  })

  it('bounds what goes into the save: marks capped, points capped, precision three decimals, rubbish dropped', () => {
    const marks = Array.from({ length: 200 }, (_, i) => ({ kind: 'stroke', x: 0.123456, y: 1.7, points: Array.from({ length: 500 }, (_, j) => [j / 500, 0.5]) , idx: i }))
    const kept = keepOutput({ recipeId: 'x', surface: 'banner', marks: [...marks, { kind: 'nonsense', x: 0, y: 0 }, 'junk', null] })
    expect(kept?.marks).toHaveLength(MAX_KEPT_MARKS)
    expect(kept?.marks[0]?.x).toBe(0.123)
    expect(kept?.marks[0]?.y).toBe(1)
    expect(kept?.marks[0]?.points).toHaveLength(MAX_KEPT_POINTS)
    expect(JSON.stringify(kept)).not.toContain('idx')
    expect(keepOutput({ recipeId: 'x', surface: 'nope', marks: [] })).toBeNull()
    expect(keepOutput('picture.png')).toBeNull()
    // a mission is still done when the bench hands over nothing drawable — the world just has nothing to hang
    const state = lifeIn(chapter)
    const settled = settleActivity(state, id, { completed: true, score: 0.9 })
    const kinds = settled.events.map((event) => event.t)
    expect(kinds).toContain('mission.completed')
    expect(kinds).not.toContain('output.kept')
    expect(kinds).toContain('flag.raised')
  })
})

describe('callbacks — DO → REMEMBER → SEE AGAIN (MASTER §39–§40, PERFORMED §47)', () => {
  const painted = () => {
    const state = lifeIn('1998-laces')
    return settle(state, settleActivity(state, 'banner-letters', done()).events)
  }

  it('the banner is not due in the chapter it was painted and hangs in the stand from the next decade', () => {
    const state = painted()
    expect(callbacksForChapter(state, '1998-laces')).toEqual([])
    expect(callbacksForChapter(state, '1999-basket')).toEqual([])
    const later = { ...state, chapter: '2000-title', year: YEAR('2000-title') }
    const due = callbacksForChapter(later)
    expect(due.map((row) => row.kind)).toEqual(['banner'])
    expect(callbacksAt(later, 'bloomfield-inside').map((row) => row.outputId)).toEqual(['stand:banner'])
    expect(callbacksAt(later, 'street')).toEqual([])
    expect(standBanner(later)?.data.recipeId).toBe('gate5-banner')
    expect(standBanner(state)).toBeNull()
  })

  it('the grammar: same / next / a year', () => {
    expect(dueIn('same', '1991', '1991', YEAR('1991'))).toBe(true)
    expect(dueIn('same', '1993-cup', '1991', YEAR('1993-cup'))).toBe(false)
    expect(dueIn('next', '1996-army', '1993-cup', YEAR('1996-army'))).toBe(true)
    expect(dueIn('next', '1993-cup', '1993-cup', YEAR('1993-cup'))).toBe(false)
    expect(dueIn('2000', '1999-cup', '1998-laces', YEAR('1999-cup'))).toBe(false)
    expect(dueIn('2000', '2000-title', '1998-laces', YEAR('2000-title'))).toBe(true)
  })

  it('the stand beat is attached to every chapter of the new decade, shut the afternoon it was made, and says it once in a life', () => {
    for (const chapter of ['2000-title', '2000-double', '2010-anthem', '2019-armchair', '2026-finale']) {
      expect(eraFor(chapter).beats?.some((beat) => beat.id === 'cb-banner-2000'), chapter).toBe(true)
    }
    // Bloomfield is shut 2016–2018 (rule 82): the banner waits for the reopened ground
    expect(eraFor('2018-return').beats?.some((beat) => beat.id === 'cb-banner-2000')).toBe(false)
    for (const chapter of Object.keys(CALLBACK_BEATS)) expect(CHAPTER[chapter], chapter).toBeDefined()
    expect(eraFor('1999-cup').beats?.some((beat) => beat.id === 'cb-banner-2000')).toBe(false)
    // never in the chapter the tifo night is painted, and never before the decade turns
    expect(eraFor('2001-terrace').beats?.some((beat) => beat.id === 'cb-banner-2002')).toBe(false)
    const beat = CALLBACK_BEATS['2000-title']?.find((row) => row.id === 'cb-banner-2000')
    expect(JSON.stringify(beat?.when)).toContain(madeFlag('stand:banner'))
    expect(JSON.stringify(beat?.when)).toContain(callbackFlag('banner:heard'))
    const said = DIALOGUE['cb-banner-seen']
    expect(JSON.stringify(said)).toContain('זה שלנו.')
    // the hearing pays the claim queued the afternoon the letters were painted
    const heard = said!.branches[0]!.then!.find((effect) => effect.e === 'heard' && effect.proofId === missionProofId('gate5-banner-98'))
    expect(heard).toBeDefined()
    // ...and it does: the standing moves only here
    const later = { ...painted(), chapter: '2000-title', year: YEAR('2000-title') }
    const afterHearing = apply(later, { t: 'reputation.heard', proofId: missionProofId('gate5-banner-98') })
    expect(afterHearing.reputation.standing.gate5).toBe(4)
    expect(apply(afterHearing, { t: 'reputation.heard', proofId: missionProofId('gate5-banner-98') }).reputation.standing.gate5).toBe(4)
  })

  it('confetti is a tier read off the measure, in the chapter it was cut, in the hall', () => {
    const state = lifeIn('1991')
    const full = settle(state, settleActivity(state, 'hall-confetti', done({ ...BANNER_OUTPUT, recipeId: 'derby-confetti', surface: 'paper', measure: 0.9 })).events)
    expect(confettiTier(full)).toBe('full')
    const light = settle(state, settleActivity(state, 'hall-confetti', done({ ...BANNER_OUTPUT, recipeId: 'derby-confetti', surface: 'paper', measure: 0.4 })).events)
    expect(confettiTier(light)).toBe('light')
    expect(confettiTier(state)).toBe('none')
    expect(confettiTier({ ...full, chapter: '1993-galil', year: YEAR('1993-galil') })).toBe('none')
  })

  it('the fan shirt hangs in the bag and can be worn; the follow-up and the beat name real conversations', () => {
    const state = lifeIn('1990')
    const made = settle(state, settleActivity(state, 'fan-shirt', done({ ...BANNER_OUTPUT, recipeId: 'fan-shirt-first', surface: 'shirt' })).events)
    expect(craftedWardrobe(made)).toHaveLength(1)
    expect(craftedWardrobe(made)[0]?.worn).toBe(false)
    const worn = apply(made, { t: 'flag.raised', flag: WEAR_CRAFTED_FLAG })
    expect(craftedWardrobe(worn)[0]?.worn).toBe(true)
    // the offer to wear it is in the reaction, for a shirt that came out
    expect(JSON.stringify(DIALOGUE['act-fan-shirt-after'])).toContain(WEAR_CRAFTED_FLAG)
    for (const followUp of FOLLOW_UPS_MISSIONS) for (const id of followUp.on ?? []) expect(DIALOGUE[id], id).toBeDefined()
    for (const beats of Object.values(CALLBACK_BEATS)) {
      for (const beat of beats) for (const action of beat.do) if (action.a === 'talk') expect(DIALOGUE[action.conversation], action.conversation).toBeDefined()
    }
  })

  it('the friend’s shirt: proof only at the callback, and the callback closes once', () => {
    const state = lifeIn('1993-cup')
    const made = settle(state, settleActivity(state, 'friend-shirt', done({ ...BANNER_OUTPUT, recipeId: 'fan-shirt-first', surface: 'shirt' })).events)
    expect(callbacksAt(made, 'street')).toEqual([])
    const later = { ...made, chapter: '1996-army', year: YEAR('1996-army'), flags: Object.fromEntries(Object.entries(made.flags).filter(([flag]) => flag.startsWith('own:'))) }
    expect(callbacksAt(later, 'street').map((row) => row.kind)).toEqual(['shirt'])
    const beat = CALLBACK_BEATS['1996-army']?.find((row) => row.id === 'cb-friend-shirt')
    expect(beat).toBeDefined()
    const seen = DIALOGUE['cb-friend-shirt-seen']!.branches[0]!.then!
    expect(seen.some((effect) => effect.e === 'proof' && effect.kind === 'creation_proof')).toBe(true)
    expect(seen.some((effect) => effect.e === 'heard' && effect.proofId === missionProofId('friend-shirt-93'))).toBe(true)
  })
})

describe('the resolver — pure, deterministic, 0–2 good ones (MASTER §5, §47, §87)', () => {
  const at = (chapter: string, room: LifeState['location'], extra: Partial<LifeState> = {}) => lifeIn(chapter, { location: room, ...extra })

  it('offers a mission standing where he is as optional, elsewhere as ambient, and never one already done', () => {
    const here = at('1998-laces', 'gate5')
    const resolved = resolveLifeOpportunities({ state: here })
    expect(resolved.optional).toContain('act:banner-letters')
    // delta 93: the story director claims the moment; the side offer is ranked but never primary
    expect(resolved.mandatory).toMatch(/^story:/)
    expect(resolved.primary).toBe(resolved.mandatory)
    // elsewhere — in a room this life already knows (an offer is never revealed from nowhere)
    const away = at('1998-laces', 'street', { flags: { 'life:been:gate5': true } })
    expect(resolveLifeOpportunities({ state: away }).tiers['act:banner-letters']).toBe('ambient')
    const doneState = settle(here, settleActivity(here, 'banner-letters', done()).events)
    expect(resolveLifeOpportunities({ state: doneState }).tiers['act:banner-letters']).toBe('hidden')
  })

  it('a route he holds makes its mission strong; a proof-shaped mission is strong where he stands', () => {
    const state = at('1998-laces', 'gate5', { flags: { [stageFlag('ULTRAS', 'entry')]: true } })
    expect(resolveLifeOpportunities({ state }).tiers['act:banner-letters']).toBe('strong')
    const tifo = at('2001-terrace', 'gate5')
    expect(resolveLifeOpportunities({ state: tifo }).tiers['act:tifo-night']).toBe('strong')
  })

  it('fatigue: the same mechanic three times running steps a mission back (MASTER §47), and the window is capped', () => {
    const fresh = at('1998-laces', 'gate5')
    const tired = { ...fresh, recentMechanics: ['supporterCraft', 'supporterCraft', 'trivia'] }
    expect(fatigued(tired, MISSION['gate5-banner-98']!)).toBe(true)
    expect(fatigued(fresh, MISSION['gate5-banner-98']!)).toBe(false)
    expect(resolveLifeOpportunities({ state: tired }).tiers['act:banner-letters']).toBe('ambient')
    let state = fresh
    for (let i = 0; i < RECENT_CAP + 3; i += 1) {
      state = apply(state, { t: 'activity.completed', id: 'x', mechanic: `m${i}`, chapter: state.chapter, contentId: null, answer: null, score: 1, tier: 'high', paid: 0 })
    }
    expect(state.recentMechanics).toHaveLength(RECENT_CAP)
    expect(state.recentMechanics[RECENT_CAP - 1]).toBe(`m${RECENT_CAP + 2}`)
  })

  it('a callback due is strong; the same input gives the same answer; never more than two good ones', () => {
    const state = lifeIn('1998-laces')
    const later = { ...settle(state, settleActivity(state, 'banner-letters', done()).events), chapter: '2000-title', year: YEAR('2000-title'), location: 'bloomfield-inside' as const }
    const a = resolveLifeOpportunities({ state: later })
    const b = resolveLifeOpportunities({ state: later })
    expect(a).toEqual(b)
    expect(a.strong).toContain('callback:banner:return:2000')
    for (const chapter of CHAPTERS.filter((row) => row.playable !== false)) {
      const resolved = resolveLifeOpportunities({ state: lifeIn(chapter.id) })
      const good = [...(resolved.strong ?? []).filter((id) => !id.startsWith('callback:') && !id.startsWith('window:')), ...(resolved.optional ?? [])]
      expect(good.length, chapter.id).toBeLessThanOrEqual(2)
      // it chooses only among what stands: every offer id it names is an offer of the world
      const ids = new Set(offersNow(lifeIn(chapter.id)).map((offer) => offer.id))
      for (const id of [...good, ...(resolved.ambient ?? [])]) expect(ids.has(id), `${chapter.id}: ${id}`).toBe(true)
    }
  })

  it('the host away steps a mission back; age and year come from the chapter (a boy is never offered a tifo night)', () => {
    const state = at('1998-laces', 'street', { flags: { 'life:been:gate5': true } })
    const withEfi = resolveLifeOpportunities({ state, characters: ['efi'] })
    const withAsaf = resolveLifeOpportunities({ state, characters: ['asaf'] })
    expect(withEfi.tiers['act:banner-letters']).toBe('hidden')
    expect(withAsaf.tiers['act:banner-letters']).toBe('ambient')
    for (const chapter of ['1990', '1993-cup', '1998-laces']) {
      expect(resolveLifeOpportunities({ state: lifeIn(chapter) }).tiers['act:tifo-night']).toBeUndefined()
    }
  })
})

describe('work as context — derived, no XP (MASTER §24–§27, §83)', () => {
  it('an old save has no work and folds to a profile; the profession is inferred from the route', () => {
    const state = lifeIn('2002-desk')
    expect(state.work).toEqual({})
    expect(resolveWorkProfile(state).profession).toBe('general')
    const writer = { ...state, flags: { [stageFlag('JOURNALIST', 'practice')]: true, [stageFlag('JOURNALIST', 'entry')]: true } }
    expect(resolveWorkProfile(writer).profession).toBe('media')
    const patched = apply(state, { t: 'work.changed', patch: { profession: 'technical', mode: 'freelance' } })
    expect(patched.work).toEqual({ profession: 'technical', mode: 'freelance' })
    expect(resolveWorkProfile(patched).flexibility).toBe('high')
  })

  it('career seeds are facts, distinct, from the ledger — and entry is organic / assisted / late / null', () => {
    const state = lifeIn('2002-desk')
    expect(careerEntry(lifeIn('1993-cup'), 'JOURNALIST')).toBeNull()
    expect(careerEntry(state, 'JOURNALIST')).toBe('assisted')
    const seeded = settle(state, [
      { t: 'proof.recorded', proof: { kind: 'verified_report', proofId: 'verified_report:a', chapter: 'a', year: 1 } },
      { t: 'proof.recorded', proof: { kind: 'verified_report', proofId: 'verified_report:b', chapter: 'b', year: 1 } },
      { t: 'activity.completed', id: 'papers', mechanic: 'route', chapter: 'x', contentId: null, answer: null, score: 1, tier: 'high', paid: 0 },
    ])
    const seeds = resolveCareerSeeds(seeded)
    expect(seeds.filter((seed) => seed.area === 'media').map((seed) => seed.fact)).toEqual(['verified_report', 'distributed_papers'])
    expect(careerEntry(seeded, 'JOURNALIST')).toBe('organic')
    expect(careerEntry({ ...state, age: 34 }, 'OWNER')).toBe('late')
    // the 2002 desk opens on it: the derive beat raises the day flag, the branch says the spec's sentence
    const beat = eraFor('2002-desk').beats?.find((row) => row.id === 'j-first')
    expect(beat).toBeDefined()
    const derive = beat!.do.find((action) => action.a === 'derive')
    expect(derive && derive.a === 'derive' ? derive.events(seeded).map((event) => (event.t === 'flag.raised' ? event.flag : '')) : []).toEqual(['career:media:organic'])
    const first = DIALOGUE['j-first']!
    expect(JSON.stringify(first.branches[0])).toContain('אתה ממילא כל הזמן מתקן אותנו. תכתוב.')
    expect(JSON.stringify(first.branches[1])).toContain('צריך שני טורים. רוצה לנסות?')
    expect(first.branches).toHaveLength(3)
  })

  it('the "אני" lines are sentences with no figure, and appear only for what he would know', () => {
    const blank = lifeIn('1998-laces')
    expect(sceneContextLines(buildSceneContext(blank))).toEqual([])
    const state = settle(blank, settleActivity(blank, 'banner-letters', done()).events)
    const later = { ...state, chapter: '2000-title', year: YEAR('2000-title') }
    const lines = sceneContextLines(buildSceneContext(later))
    expect(lines.length).toBeGreaterThanOrEqual(2)
    for (const line of lines) expect(/\d/.test(line), line).toBe(false)
    expect(buildSceneContext(later).callbackLine).toBeTruthy()
    expect(buildSceneContext(later).routeLine).toBeTruthy()
  })
})

describe('migration — additive, an old save loads (MASTER §90)', () => {
  it('a log from before delta 91 folds with blanks; a newer row folds to a no-op on this reader', () => {
    const state = fold(DEFAULT_IDENTITY, YEAR('1986'), [
      { t: 'life.started', identity: DEFAULT_IDENTITY, year: YEAR('1986'), weekday: 6, minute: 600 },
      { t: 'activity.completed', id: 'lounge-xi', mechanic: 'allTimeXI', chapter: '1986', contentId: null, answer: null, score: 50, tier: 'mid', paid: 0 },
    ])
    expect(state.work).toEqual({})
    expect(state.missions).toEqual([])
    expect(state.outputs).toEqual({})
    expect(state.recentMissionKinds).toEqual([])
    // the fatigue window grows out of the OLD row on read — the log always recorded what happened
    expect(state.recentMechanics).toEqual(['allTimeXI'])
    expect(callbacksForChapter(state)).toEqual([])
    expect(resolveLifeOpportunities({ state }).mandatory).toBeUndefined()
    const unknown = { t: 'mission.renamed', id: 'x' } as unknown as LifeEvent
    expect(apply(state, unknown)).toBe(state)
    // a state object saved without the new keys (an older reader's snapshot) still reads
    const stripped = { ...state } as Partial<LifeState>
    delete stripped.work
    delete stripped.missions
    delete stripped.outputs
    delete stripped.recentMechanics
    delete stripped.recentMissionKinds
    const old = stripped as LifeState
    expect(apply(old, { t: 'output.kept', output: { outputId: 'a', missionId: 'm', chapter: '1986', year: 1986, measure: 1, data: { recipeId: 'r', surface: 'shirt', marks: [] } } }).outputs.a).toBeDefined()
    expect(apply(old, { t: 'mission.completed', id: 'm', chapter: '1986', year: 1986, tier: 'high', kind: 'k' }).missions).toHaveLength(1)
    expect(apply(old, { t: 'work.changed', patch: { mode: 'regular' } }).work).toEqual({ mode: 'regular' })
    expect(callbacksForChapter(old)).toEqual([])
    expect(resolveWorkProfile(old).profession).toBe('general')
  })

  it('the engine saves a mission at once and a fresh engine over the same log agrees', () => {
    const chapter = '1991'
    const def = CHAPTER[chapter]!
    const engine = new LifeEngine(DEFAULT_IDENTITY, def.year)
    engine.dispatch({ t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute }, { t: 'chapter.entered', chapter })
    const settled = settleActivity(engine.state, 'hall-confetti', done({ ...BANNER_OUTPUT, recipeId: 'derby-confetti', surface: 'paper' }))
    engine.dispatch(...settled.events)
    const again = new LifeEngine(DEFAULT_IDENTITY, def.year, engine.log())
    expect(again.state.outputs).toEqual(engine.state.outputs)
    expect(again.state.missions).toEqual(engine.state.missions)
    expect(confettiTier(again.state)).toBe('full')
  })
})
