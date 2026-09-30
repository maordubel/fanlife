import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { ACTIVITIES, activityChapters } from '@/lib/life/activities'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { CHAPTER } from '@/lib/life/content/chapters'
import { LifeEngine } from '@/lib/life/engine'
import { GIGS, gigChapters, gigConversations, isPaid, kindOf, offerFlag, offeredIn } from '@/lib/life/gigs'
import { MAP_PLACES, revealFlagOf } from '@/lib/life/map'
import { OFFER_KIND_HE, activityQuote, capHe, offerLineHe, offerNudgeHe, offerPlaces, offersNow, startable } from '@/lib/life/offers'
import { SCENE, inEra, sceneIn } from '@/lib/life/world/scenes'

/**
 * עבודה שאפשר למצוא (delta 90, §22) — the rotation stays, and what it dealt is VISIBLE.
 *
 * Owner's decision: *keep the daily rotation, but "today's offers" must be visible in the
 * world, in dialogue and in the "?" help, with the pay cap as the anti-grind rule.* So:
 * for every chapter a boy can earn in, over many saves, "?" names at least one paid thing
 * he can go and do, in a place he knows, as what it is (עבודה / התערבות / משחק / טובה);
 * the world draws the work while it is on offer; the handshake says the kind and the pay;
 * the pre-launch card exists; and the cap is a sentence, not a hiding place.
 */

/** the chapter, as a lived life stands in it: the rooms of the city it has seen, and the week's deal written */
function lived(chapter: string, seed: string): LifeEngine {
  const def = CHAPTER[chapter]
  if (!def) throw new Error(chapter)
  const engine = new LifeEngine(DEFAULT_IDENTITY, def.year)
  engine.dispatch({ t: 'rng.seeded', seed }, { t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute }, { t: 'chapter.entered', chapter })
  for (const place of MAP_PLACES) if (place.fromYear <= def.year) engine.dispatch({ t: 'flag.raised', flag: revealFlagOf(place.id) })
  for (const id of Object.keys(SCENE)) engine.dispatch({ t: 'flag.raised', flag: `life:been:${id}` })
  const dealt = offeredIn(chapter, engine.state.rng.seed)
  for (const gig of GIGS) if (dealt.has(gig.id)) engine.dispatch({ t: 'flag.raised', flag: offerFlag(gig) })
  engine.dispatch({ t: 'moved', to: def.start.location })
  return engine
}

/** every chapter some paid row exists in — the chapters a boy can earn in */
const EARNING = [...new Set(GIGS.filter((gig) => isPaid(gig)).flatMap((gig) => gigChapters(gig)))].filter((chapter) => CHAPTER[chapter])

describe('"?" — אפשר עכשיו', () => {
  it('names at least one paid thing to go and do, in every chapter a boy can earn in, for every save', () => {
    const missing: string[] = []
    for (const chapter of EARNING) {
      for (let n = 0; n < 40; n += 1) {
        const offers = offersNow(lived(chapter, `seed-${n}`).state).filter(startable)
        const paid = offers.filter((offer) => (offer.kind === 'work' || offer.kind === 'wager') && offer.payTop > 0)
        if (paid.length === 0) missing.push(`${chapter}/seed-${n}`)
      }
    }
    expect(missing, missing.slice(0, 12).join('\n')).toEqual([])
  })

  it('says every row as what it is, where it is and how long it takes', () => {
    for (const chapter of ['a4-shirt', '1986', '1993-cup', '1999-cup']) {
      for (const offer of offersNow(lived(chapter, 'seed-1').state)) {
        const line = offerLineHe(offer)
        expect(line.startsWith(OFFER_KIND_HE[offer.kind]), line).toBe(true)
        if (offer.minutes > 0) expect(line).toContain(`${offer.minutes} דק׳`)
      }
    }
  })

  it('never lists a game with a wage, nor a job the week did not deal', () => {
    for (const chapter of EARNING.slice(0, 12)) {
      const engine = lived(chapter, 'seed-7')
      const dealt = offeredIn(chapter, engine.state.rng.seed)
      for (const offer of offersNow(engine.state)) {
        if (offer.kind === 'play') expect(offer.payTop, `${offer.id}@${chapter}`).toBe(0)
        const gig = GIGS.find((row) => row.id === offer.gig)
        if (gig && isPaid(gig) && gig.rotates !== false) expect(dealt.has(gig.id), `${gig.id}@${chapter}`).toBe(true)
      }
    }
  })

  it('states the cap once the chapter’s paid work is taken, and the work rows say they are taken', () => {
    const engine = lived('1993-cup', 'seed-2')
    expect(capHe(engine.state)).toBeNull()
    engine.dispatch({ t: 'flag.raised', flag: 'work:paid:1993-cup' })
    expect(capHe(engine.state)).toBeTruthy()
    for (const offer of offersNow(engine.state)) {
      const gig = GIGS.find((row) => row.id === offer.gig)
      if (gig && isPaid(gig)) expect(offer.status, offer.id).toBe('taken')
    }
  })

  it('marks on the map only places this life knows', () => {
    const def = CHAPTER['1993-cup']
    const engine = new LifeEngine(DEFAULT_IDENTITY, def?.year ?? 0)
    engine.dispatch({ t: 'year.entered', year: def?.year ?? 0, weekday: def?.weekday ?? 6, minute: def?.minute ?? 600 }, { t: 'chapter.entered', chapter: '1993-cup' })
    for (const gig of GIGS) engine.dispatch({ t: 'flag.raised', flag: offerFlag(gig) })
    const marks = offerPlaces(engine.state)
    for (const where of marks.keys()) {
      const place = MAP_PLACES.find((p) => p.scenes.includes(where))
      if (place?.revealFlag) expect(engine.state.flags[revealFlagOf(place.id)], where).toBeTruthy()
    }
    const nudge = offerNudgeHe(engine.state)
    if (nudge) expect(offersNow(engine.state).some((offer) => nudge.includes(offer.placeHe) && offer.known)).toBe(true)
  })
})

describe('the handshake says what it is', () => {
  it('prefixes every paid row’s choice with its kind, and leaves a game’s door exactly as the boy says it', () => {
    for (const conversation of gigConversations()) {
      const gig = GIGS.find((row) => conversation.id.startsWith(`gig-${row.id}-`))
      if (!gig) continue
      const offer = conversation.branches[conversation.branches.length - 1]?.choices?.find((choice) => choice.id === 'do' || choice.id.startsWith('do-'))
      if (!offer) continue
      const kind = kindOf(gig)
      if (kind === 'play') expect(offer.text, conversation.id).not.toContain('₪')
      else expect(offer.text.startsWith(`${OFFER_KIND_HE[kind]}:`), `${conversation.id}: ${offer.text}`).toBe(true)
    }
  })

  it('quotes every mechanic activity before the board opens: kind, time, pay, energy', () => {
    for (const def of ACTIVITIES) {
      for (const chapter of activityChapters(def).slice(0, 2)) {
        const engine = lived(chapter, 'seed-3')
        const quote = activityQuote(engine.state, def.id)
        expect(quote.kindHe).toBe(OFFER_KIND_HE[quote.kind])
        expect(quote.payHe.length, def.id).toBeGreaterThan(0)
        if (quote.kind === 'play') expect(quote.payHe).toBe('לא מרוויחים כסף')
      }
    }
    const sheet = readFileSync('components/life/MechanicSheet.tsx', 'utf8')
    expect(sheet).toContain('data-life="activity-card"')
    expect(sheet).toContain('data-life="activity-later"')
    const stage = readFileSync('app/life/LifeStage.tsx', 'utf8')
    expect(stage).toContain('onDecline=')
    expect(stage).toContain('activityQuote(')
  })

  it('settles a request once, whatever the board does twice', () => {
    expect(readFileSync('app/life/stage/useLifeLedger.ts', 'utf8')).toContain('alreadySettled(engine.state, request)')
  })
})

describe('the world draws the work while it is on offer (§22.4.1)', () => {
  it('gives every rotating paid row that has a look a prop on its hotspot, behind the same offer flag', () => {
    const art = readFileSync('lib/life/runtime/art.ts', 'utf8')
    for (const gig of GIGS) {
      if (!gig.look) continue
      expect(art, gig.look.key).toContain(`'${gig.look.key}'`)
      for (const chapter of gigChapters(gig).slice(0, 3)) {
        const base = SCENE[gig.where as keyof typeof SCENE]
        const spot = sceneIn(base, chapter).hotspots.find((row) => row.id === `${gig.id}-${chapter}` && inEra(row, chapter))
        if (!spot) continue
        expect(spot.prop?.key, `${gig.id}@${chapter}`).toBe(gig.look.key)
        if (isPaid(gig) && gig.rotates !== false) expect(JSON.stringify(spot.when)).toContain(offerFlag(gig))
      }
    }
  })
})

describe('dialogue mentions the day’s work (§22.4.2) — between beats, once, never over a handoff', () => {
  it('a person with nothing new to say names an open job in a known place, once; never on a story step', async () => {
    const { resolveFollowUp, followUpFlag } = await import('@/lib/life/world/followUp')
    const { eraFor } = await import('@/lib/life/content/era')
    const { liveGraph } = await import('@/lib/life/world/graph')
    const engine = lived('1993-cup', 'seed-2')
    const between = { ...liveGraph(engine.state, eraFor('1993-cup')), mainStep: null }
    const onStep = { ...between, mainStep: 'some-step' }
    // a speaker with no authored follow-up for this made-up conversation id
    const first = resolveFollowUp(engine.state, eraFor('1993-cup'), 'no-such-talk', 'רחל', between)
    const job = offersNow(engine.state).find((offer) => offer.kind === 'work' && offer.status === 'open' && !offer.here)
    expect(job, 'no open job away from the start room in 1993-cup').toBeTruthy()
    if (!job) return
    expect(first.id).toBe(`offer:${job.id}`)
    expect(first.lines[0]?.text).toContain(job.placeHe)
    expect(first.generic).toBe(false)
    // on a story step the handoff wins — the nudge never masks it
    expect(resolveFollowUp(engine.state, eraFor('1993-cup'), 'no-such-talk', 'רחל', onStep).id.startsWith('offer:')).toBe(false)
    // said once: after it was read, he closes in his own voice again
    engine.dispatch({ t: 'flag.raised', flag: followUpFlag(`offer:${job.id}`) })
    expect(resolveFollowUp(engine.state, eraFor('1993-cup'), 'no-such-talk', 'רחל', between).id).not.toBe(`offer:${job.id}`)
  })
})
