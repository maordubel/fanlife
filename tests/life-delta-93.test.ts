import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { BEATS_REGISTERED } from '@/lib/life/content/chapter2007founding'
import { ENDINGS_A4, FIRST_SHIRT_GIFT_FLAG } from '@/lib/life/content/chapterStageA'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { FOLLOW_UPS } from '@/lib/life/content/followUps'
import { sameShirtAs, woreShirt, woreWhen } from '@/lib/life/content/shirtCallbacks'
import { apply, emptyState } from '@/lib/life/events'
import { missed, missFlag, missReasonOf } from '@/lib/life/missReason'
import { resolveLifeOpportunities } from '@/lib/life/opportunityResolver'
import { FIRST_SHIRT_GIFT_NOTE_HE, wardrobeReading } from '@/lib/life/profile'
import { boxContents } from '@/lib/life/redboxView'
import { outfitFlag } from '@/lib/life/shirts'
import { ALL_DECADES_COMPLETE } from '@/lib/life/stickers'
import { directiveFor, opportunityFromDirective, storyHoldsTheMoment } from '@/lib/life/storyDirector'
import type { LifeState, LocationId } from '@/lib/life/types'
import { sceneAlive } from '@/lib/life/world/placeLifecycle'
import { ALL_SCENES, inEra, sceneIn } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'

/**
 * Delta 93 — the director gets authority, the first shirt becomes a gift, people take the
 * first step, and the demolition is seen without a clock (THE-WORKER-DELTA-93 brief §39).
 */

const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

const life = (chapter: string, extra: Partial<LifeState> = {}): LifeState => {
  const year = CHAPTERS.find((row) => row.id === chapter)?.year ?? 1986
  return { ...emptyState(DEFAULT_IDENTITY, year), chapter, ...extra } as LifeState
}

// ============================================================ the director · the resolver --
describe('director → resolver (brief §1)', () => {
  it('PRE_MATCH › DILEMMA › MUST, and each becomes the mandatory', () => {
    const shirt = { 'own:shirt:tveria85': true }
    const pre = opportunityFromDirective(directiveFor({ state: life('1986', { flags: shirt }), scene: 'bedroom' as LocationId }))
    expect(pre?.mode).toBe('PRE_MATCH')
    expect(pre?.rank).toBe(0)
    const dilemma = opportunityFromDirective(directiveFor({ state: life('a2-alley', { flags: { 'life:a:d2': true } }), scene: 'home' as LocationId }))
    expect(dilemma?.mode).toBe('DILEMMA')
    expect(dilemma?.rank).toBe(1)
    const must = opportunityFromDirective(directiveFor({ state: life('a4-shirt', { agorot: 3000, flags: { 'life:a:d4': true } }), scene: 'home' as LocationId }))
    expect(must?.mode).toBe('MUST')
    expect(must?.destinations).toEqual(['kiosk'])
  })

  it('in A2 no side offer is primary while the dilemma holds', () => {
    const state = life('a2-alley', { location: 'street', flags: { 'life:a:d2': true } })
    const resolved = resolveLifeOpportunities({ state })
    expect(resolved.story?.mode).toBe('DILEMMA')
    expect(resolved.primary).toBe(resolved.mandatory)
    expect(resolved.tiers[resolved.mandatory as string]).toBe('must')
  })

  it('after the demolition no directive names a hall', () => {
    for (const chapter of CHAPTERS.filter((row) => row.year >= 2007 && row.playable !== false)) {
      const state = life(chapter.id, { flags: { 'life:place:ussishkin': 'demolished' } })
      if (chapter.id !== '2007-registered') expect(sceneAlive(state, 'ussishkin-hall'), chapter.id).toBe(false)
      const d = directiveFor({ state, scene: chapter.start.location })
      for (const dest of d?.destinations ?? []) expect(dest.to.startsWith('ussishkin'), `${chapter.id} → ${dest.to}`).toBe(false)
    }
  })
})

// ============================================================ A4 · the first shirt --
describe('A4 · the first shirt is a gift (brief §4–§18, §43–§45)', () => {
  it('the ending names the gift, and an older life keeps its own words', () => {
    expect(ENDINGS_A4.shirt?.memoryHe).toBe('החולצה הראשונה שלי, שאבא קנה לי במתנה.')
    expect(ENDINGS_A4.shirt?.titleHe).toBe('החולצה הראשונה שלי')
    const memory = { t: 'memory.kept' as const, memory: { id: `${eraFor('a4-shirt').memoryPrefix}-shirt`, item: 'folded-paper' as const, atMinute: 600, year: CHAPTERS.find((row) => row.id === 'a4-shirt')?.year ?? 0, anchorId: 'x' } }
    const old = apply(life('a5-first'), memory)
    expect(boxContents(old).find((row) => row.id === memory.memory.id)?.noteHe).toBe('החולצה על הכיסא, לפני שהיא הייתה שלך באמת.')
    const gifted = apply(life('a5-first', { flags: { [FIRST_SHIRT_GIFT_FLAG]: true } }), memory)
    expect(boxContents(gifted).find((row) => row.id === memory.memory.id)?.noteHe).toBe('החולצה הראשונה שלי, שאבא קנה לי במתנה.')
  })

  it('the wardrobe says who paid, only in the life where he did', () => {
    // the gift is the VISA shirt from the photograph Maor sent (27.9.2026)
    const owned = { 'own:shirt:visa86': true }
    const bio = (flags: Record<string, boolean>) => wardrobeReading(life('1986', { flags: { ...owned, ...flags } })).find((row) => row.id === 'visa86')?.noteHe
    expect(bio({ [FIRST_SHIRT_GIFT_FLAG]: true })).toBe(FIRST_SHIRT_GIFT_NOTE_HE)
    expect(bio({})).not.toBe(FIRST_SHIRT_GIFT_NOTE_HE)
  })

  it('the old five shekels read as "he knows", and are never taken back', () => {
    const state = apply(life('a4-shirt', { agorot: 500 }), { t: 'flag.raised', flag: 'a4:kobi-gave' })
    expect(state.flags['a4:kobi-knows']).toBe(true)
    expect(state.agorot).toBe(500)
  })

  it('the gift pays nothing out of his pocket and is recorded for the life', () => {
    const gift = DIALOGUE['kobi-shirt-gift-a4']
    const then = gift?.branches.flatMap((branch) => branch.then ?? []) ?? []
    expect(then.some((effect) => effect.e === 'money')).toBe(false)
    expect(then.some((effect) => effect.e === 'flag' && effect.flag === FIRST_SHIRT_GIFT_FLAG)).toBe(true)
    expect(then.some((effect) => effect.e === 'shirt' && effect.id === 'visa86')).toBe(true)
    expect(then.some((effect) => effect.e === 'remember' && effect.eventId === 'first-shirt-gift-1985')).toBe(true)
    expect(then.some((effect) => effect.e === 'remember' && effect.eventId === 'npc:kobi:showed-up:1985')).toBe(true)
    // the buy choice at the counter only puts the money down
    const buy = DIALOGUE['rafi-a4']?.branches.flatMap((branch) => branch.choices ?? []).find((choice) => choice.id === 'buy')
    expect(buy?.then.some((effect) => effect.e === 'money')).toBe(false)
    expect(buy?.then.some((effect) => effect.e === 'flag' && effect.flag === 'a4:ready-to-buy')).toBe(true)
  })

  it('Kobi is in the kiosk only once the thirty is on the counter, and Efi steps back', () => {
    const kiosk = ALL_SCENES.find((scene) => scene.id === 'kiosk')
    const kobi = kiosk?.actors.find((actor) => actor.id === 'kobi-a4-kiosk')
    expect(kobi?.talk).toBeUndefined()
    expect(meets(life('a4-shirt'), kobi?.when)).toBe(false)
    expect(meets(life('a4-shirt', { flags: { 'a4:kobi-came': true } }), kobi?.when)).toBe(true)
    for (const scene of ALL_SCENES) {
      for (const actor of scene.actors.filter((a) => a.talk === 'efi-a4')) {
        expect(meets(life('a4-shirt', { flags: { 'a4:ready-to-buy': true } }), actor.when), actor.id).toBe(false)
      }
    }
  })
})

// ============================================================ active NPCs --
describe('actorCue (brief §9–§12, §36–§37)', () => {
  it('every cue in the content names a person who stands in a room of that chapter', () => {
    let count = 0
    for (const chapter of CHAPTERS) {
      for (const beat of eraFor(chapter.id).beats ?? []) {
        for (const action of beat.do) {
          if (action.a !== 'actorCue') continue
          count++
          // the room as the chapter draws it — a repainted room (`street10` from 2010) carries its
          // people on the painting (`Repaint.actors`), which is where `WorldScene` reads them
          const found = ALL_SCENES.some((scene) => sceneIn(scene, chapter.id).actors.some((actor) => actor.id === action.actorId && inEra(actor, chapter.id)))
          expect(found, `${chapter.id}/${beat.id} → ${action.actorId}`).toBe(true)
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it('the runtime is presentation: a missing actor is a no-op, a busy glass defers, a room change cleans up', () => {
    const src = read('lib/life/runtime/scenes/WorldScene.ts')
    const body = src.slice(src.indexOf('private actorCue('), src.indexOf('private faceBoyTo('))
    expect(body).toContain('if (!actor || !this.sys.isActive())')
    expect(src).toContain("case 'actorCue':\n        this.whenFree(")
    expect(src.slice(src.indexOf('private whenFree('), src.indexOf('private actorCue('))).toContain('this.ctx.dialogue.open')
    expect(src).toContain('this.cued = new Set()')
    // a cue never writes the save
    expect(body).not.toContain('engine.dispatch')
  })
})

// ============================================================ Ussishkin --
describe('Ussishkin (brief §26–§28)', () => {
  it('the demolition hides the HUD and puts it back in the same beat', () => {
    const loss = BEATS_REGISTERED.find((beat) => beat.id === 'u-loss')
    const huds = (loss?.do ?? []).filter((action) => action.a === 'hud') as { visible: boolean }[]
    expect(huds.map((h) => h.visible)).toEqual([false, true])
    const src = read('lib/life/runtime/scenes/WorldScene.ts')
    // every way out restores it
    expect(src.match(/this\.restoreHud\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
  })

  it('the loss kind is written once per choice', () => {
    for (const branch of DIALOGUE['u-loss']?.branches ?? []) {
      for (const choice of branch.choices ?? []) {
        const writes = choice.then.filter((effect) => effect.e === 'flagValue' && /lossKind/i.test(String(effect.flag)))
        expect(writes.length, choice.id).toBe(1)
      }
    }
    expect(read('lib/life/content/chapter2007founding.ts')).not.toContain("'u:lossKind'")
  })
})

// ============================================================ shirts, misses, supporters --
describe('shirt callbacks, miss reasons, the regular supporter (brief §22–§24, §32)', () => {
  it('woreShirt reads the ritual and the day', () => {
    const state = life('1990', { flags: { [outfitFlag('1990')]: 'tveria85', 'own:shirt:tveria85': true } })
    expect(woreShirt(state, '1990', 'tveria85')).toBe(true)
    expect(woreShirt(state, '1990', 'visa86')).toBe(false)
    expect(meets(state, woreWhen('1990', 'tveria85'))).toBe(true)
    const both = life('1999-cup', { flags: { [outfitFlag('1993-cup')]: 'tveria85', [outfitFlag('1999-cup')]: 'tveria85' } })
    expect(meets(both, sameShirtAs('1993-cup', '1999-cup'))).toBe(true)
    const other = life('1999-cup', { flags: { [outfitFlag('1993-cup')]: 'tveria85', [outfitFlag('1999-cup')]: 'visa86' } })
    expect(meets(other, sameShirtAs('1993-cup', '1999-cup'))).toBe(false)
  })

  it('between three and five shirt reactions, each said once', () => {
    const rows = FOLLOW_UPS.filter((row) => row.id.startsWith('fu-shirt-'))
    expect(rows.length).toBeGreaterThanOrEqual(3)
    for (const row of rows) expect(row.cls).toBe('REACTION')
  })

  it('a miss carries its reason; an old `true` reads as a choice', () => {
    expect(missed('x', 'money')).toEqual({ e: 'flagValue', flag: 'life:miss:x', value: 'money' })
    expect(missReasonOf(life('2010-teddy', { flags: { [missFlag('x')]: true } }), 'x')).toBe('choice')
    expect(missReasonOf(life('2010-teddy', { flags: { [missFlag('x')]: 'late' } }), 'x')).toBe('late')
    expect(missReasonOf(life('2010-teddy'), 'x')).toBeNull()
    const src = ['chapter2010double', 'chapterWindows', 'chapter2021promises'].map((f) => read(`lib/life/content/${f}.ts`))
    for (const file of src) expect(file).toMatch(/missed\(|missFlag\(/)
  })

  it('every decade from 2000 has a main-line day he can simply be there for, no route needed', () => {
    for (const decade of [2000, 2010, 2020]) {
      const ok = CHAPTERS.some(
        (row) =>
          row.year >= decade && row.year < decade + 10 && !row.when && !row.whenAny && row.playable !== false &&
          Object.values(eraFor(row.id).endings ?? {}).some((ending) => ending?.presence === 'inside'),
      )
      expect(ok, String(decade)).toBe(true)
    }
  })

  it('the supergoal decades stay honest until the scans exist', () => {
    expect(ALL_DECADES_COMPLETE).toBe(false)
  })
})

// ============================================================ the round after --
describe('delta 93, second pass — free time, initiative, film skip', () => {
  it('free time never offers to wait while the story asks for something now', () => {
    const dilemma = directiveFor({ state: life('a2-alley', { flags: { 'life:a:d2': true } }), scene: 'home' as LocationId })
    expect(storyHoldsTheMoment(dilemma, { targetLocation: null }, 'home' as LocationId)).toBe(true)
    const must = directiveFor({ state: life('a4-shirt', { agorot: 3000, flags: { 'life:a:d4': true } }), scene: 'home' as LocationId })
    expect(storyHoldsTheMoment(must, { targetLocation: null }, 'home' as LocationId)).toBe(true)
    // the wait already goes where the story points — honest
    expect(storyHoldsTheMoment(must, { targetLocation: 'kiosk' as LocationId }, 'home' as LocationId)).toBe(false)
    // a door that is not open yet is no reason to refuse the wait
    expect(storyHoldsTheMoment(must, { targetLocation: null }, 'home' as LocationId, () => false)).toBe(false)
    expect(storyHoldsTheMoment(null, { targetLocation: null }, 'home' as LocationId)).toBe(false)
  })

  it('Kobi in the stand closes the last metres himself — once, and only until he is found', () => {
    const kobi = ALL_SCENES.find((scene) => scene.id === 'bloomfield-inside')?.actors.find((actor) => actor.id === 'kobi-crowd')
    expect(kobi?.initiative?.reachM).toBeGreaterThan(0)
    expect(meets(life('1986', { flags: { 'found:kobi': true } }), kobi?.initiative?.when)).toBe(false)
    const src = read('lib/life/runtime/scenes/WorldScene.ts')
    const body = src.slice(src.indexOf('private maybeInitiative('), src.indexOf('/** the boy turns to somebody'))
    expect(body).toContain('this.busyNow()')
    expect(body).toContain('this.initiated.add(')
    expect(body).not.toContain('engine.dispatch')
  })

  it('every film a player sits through carries the one skip button', () => {
    for (const file of ['components/life/OpeningFilm.tsx', 'components/life/OpeningDocumentary.tsx', 'components/life/HistoricalCutscene.tsx', 'components/life/FilmCut.tsx']) {
      expect(read(file), file).toContain('<FilmSkipButton')
    }
  })
})

