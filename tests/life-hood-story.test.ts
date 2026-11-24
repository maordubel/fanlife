/**
 * LIFE · the hood runs the story (rule life-story-watch): a bot plays the whole childhood THROUGH THE HOOD for every core
 * club — it walks to the giver, talks, picks a way in the conversation, does every step itself in the street, answers the
 * complication, and goes on to whatever is offered next — with no stuck state, always a mission in front of it; saves
 * round-trip mid-mission; the whole life, six to forty-eight, plays the same way; a date or a score is printed only from an archive row; the watch card holds only recorded ids.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {rushView} from '@/lib/clubs/life/rush'
import {LIFE_TIMELINE} from '@/lib/clubs/life/packs'
import {hoodLevel, type HoodClub} from '@/lib/life/hood/level'
import {personNear, startHood, stepHood, type HoodRun} from '@/lib/life/hood/run'
import {botInput, IDLE, type Input} from '@/lib/life/rush/sim'
import {rng} from '@/lib/life/rush/level'
import {advance, choose, nodeOf, type TalkScript} from '@/lib/life/hood/talk'
import {parseSave, restore, snapshot} from '@/lib/life/hood/save'
import {STORY_WORDS, storyNights, nextMissions, missionById, CHILDHOOD} from '@/lib/life/hood/story'
import {
  applyEffect, beatsAfter, complicationTalk, finishStory, keepOff, newPlay, openingBeat, planKey, stepDone, storyLevel, storyOver, storyTalk, syncOffers, walkToTalk, wantsComplication,
  type Beat, type StoryLevel, type StoryPlay,
} from '@/lib/life/hood/story/play'
import {HIGHLIGHTS, OUR_FILMS, slateOf, watchFor, watchForNight} from '@/lib/life/watch'
import {kindsOf} from '@/lib/life/rush/archive'
import type {ArchiveRef} from '@/lib/life/universal/types'
import type {PersonId} from '@/lib/life/hood/types'

type Club = {hood: HoodClub; nights: Record<string, ArchiveRef>}
const clubs = new Map<string, Promise<Club>>()
function clubOf(id: string): Promise<Club> {
  if (!clubs.has(id)) clubs.set(id, (async () => {
    const club = await loadClub(id)
    if (!club) throw new Error(`no club ${id}`)
    const pack = clubLife(club.data)
    const birth = (LIFE_TIMELINE as Record<string, {birthYear?: number} | undefined>)[id]?.birthYear
    return {hood: {id, skin: pack.skin, cast: pack.cast}, nights: storyNights(rushView(club.data), typeof birth === 'number' ? birth : null)}
  })())
  return clubs.get(id)!
}

/** a talk played by a chooser: taps through lines, picks choices, returns the effects it chose */
function playTalk(s: TalkScript, pick: (n: number, keys: string[]) => number): string[] {
  const effects: string[] = []
  let node = nodeOf(s, s.start), guard = 0
  while (node && guard++ < 20) {
    if (node.choices?.length) { const c = choose(s, node.id, pick(node.choices.length, node.choices.map(x => x.key))); if (c.effect) effects.push(c.effect); node = c.node }
    else node = advance(s, node.id).node
  }
  return effects
}

type Life = {play: StoryPlay; beats: Beat[]; missions: string[]; frames: number}

/** the whole childhood, played through the hood with seeded random choices */
function liveInTheHood(clubId: string, sl: StoryLevel, run: HoodRun, seed: number, nights: Record<string, ArchiveRef>, cap = 2_000_000): Life {
  const r = rng(seed)
  let play = newPlay(), frames = 0, target: PersonId | null = null, saidAt = -9, unstick = 0, last = {x: 0, z: 0}
  const beats: Beat[] = [openingBeat(play.state)], missions: string[] = []
  syncOffers(run, sl, play)
  while (!storyOver(play)) {
    if (++frames > cap) throw new Error(`seed ${seed}: stuck at ${play.plan ?? 'no plan'} (chapter ${play.state.done.length}, step ${run.sim.step}, target ${target}, at ${run.sim.x.toFixed(1)},${run.sim.z.toFixed(1)}, near ${personNear(run)?.id}, offers ${nextMissions(play.state).map(o => o.mission.id + ':' + o.mission.giver)})`)
    const offers = nextMissions(play.state)
    expect(offers.length).toBeGreaterThan(0)
    let input: Input = IDLE
    if (!play.plan) {
      if (!target) target = offers[Math.floor(r() * offers.length)]!.mission.giver
      input = walkToTalk(run, target)
    } else input = botInput(run.level, run.sim)
    // a player who walks into a corner steps out of it: still for two seconds → two seconds the other way
    if (frames % 120 === 0) { const moved = Math.hypot(run.sim.x - last.x, run.sim.z - last.z); last = {x: run.sim.x, z: run.sim.z}; if (moved < 0.3) unstick = 120 }
    if (unstick > 0) { unstick--; input = {...IDLE, x: Math.sin(seed + frames / 400), z: 0.6} }
    const ev = stepHood(run, input)
    for (const e of ev) {
      if (e.k === 'say' && !play.plan && e.who === target && run.sim.t - saidAt > 0.5) {
        saidAt = run.sim.t
        // the talk: a menu (any mission or a day off), then a way to do it; now and then "not now"
        for (const fx of playTalk(storyTalk(play, e.who), (n, keys) => (r() < 0.06 ? n - 1 : Math.floor(r() * (keys.at(-1) === 'story.talk.later' ? n - 1 : n))))) {
          const out = applyEffect(run, sl, play, fx); play = out.play
        }
        target = null
      } else if (e.k === 'step' && play.plan) play = stepDone(play)
      else if (e.k === 'job' && e.state === 'done' && play.plan) {
        const fin = finishStory(run, sl, play)
        missions.push(`${fin.mission.id}/${fin.approach}`)
        const night = fin.mission.kind === 'main' ? nights[fin.mission.id] ?? null : null
        beats.push(...beatsAfter({mission: fin.mission, approach: fin.approach, events: fin.events, delta: fin.delta, state: fin.play.state, night, canWatch: !!watchForNight(clubId, night)}))
        play = fin.play
      }
    }
    // the complication, put to him mid-mission; he answers (or now and then leaves it, and it comes back after the next step)
    const cm = wantsComplication(run, play)
    if (cm) {
      if (r() < 0.15) play = {...play, asked: true}
      else for (const fx of playTalk(complicationTalk(cm)!, n => Math.floor(r() * n))) play = applyEffect(run, sl, play, fx).play
    }
    // now and then he drops an open mission at its giver: it is offered again, nothing is lost
    if (play.plan && r() < 0.00002) play = applyEffect(run, sl, play, 'story:drop').play
  }
  return {play, beats, missions, frames}
}

describe('the hood plays the story', {timeout: 600_000}, () => {
  for (const id of CORE_CLUB_IDS) it(`${id}: a bot lives the whole life, six to forty-eight, in the street, always with a mission ahead`, async () => {
    const {hood, nights} = await clubOf(id)
    for (const seed of [1, 2]) {
      const sl = storyLevel(hoodLevel(hood, seed)), run = startHood(sl.level)
      const t0 = Date.now(), life = liveInTheHood(id, sl, run, seed * 7919 + [...id].reduce((h, c) => h * 31 + c.charCodeAt(0) | 0, 7), nights)
      console.log(`${id} seed ${seed}: ${life.missions.length} missions, ${life.frames} frames, ${Date.now() - t0} ms`)
      expect(life.play.state.keeps).toContain('box')
      expect(life.play.state.done).toEqual(expect.arrayContaining(['first-noise', 'the-box']))
      // the whole written life: every slot of the spine behind him, every stage closed with its card, and he is grown
      expect(life.play.state.age).toBeGreaterThanOrEqual(31)
      expect(life.beats.filter(b => b.k === 'stage-end').map(b => (b as {stage: string}).stage)).toEqual(['child', 'teen', 'young', 'adult'])
      // free roam after the written life: still a mission in front of him, and the focus job has a giver
      expect(nextMissions(life.play.state).length).toBeGreaterThan(0)
      expect(run.level.hood!.jobs.length).toBeGreaterThan(0)
      // the time cards follow the spine, and a stage ends with its card
      expect(life.beats.filter(b => b.k === 'chapter').length).toBeGreaterThanOrEqual(6)
      expect(life.beats.at(-1)?.k === 'stage-end' || life.beats.some(b => b.k === 'stage-end')).toBe(true)
      // a dated card only from the archive row of that very chapter
      for (const b of life.beats) if ((b.k === 'watch' || b.k === 'aftermath') && b.night) expect(b.night).toEqual(nights[b.mission])
    }
  })
})

describe('the story in the street', {timeout: 120_000}, () => {
  it('every plan lies where he can walk, and every talk the story prints has words', async () => {
    const {hood} = await clubOf('hapoel-tel-aviv')
    const sl = storyLevel(hoodLevel(hood, 3)), run = startHood(sl.level)
    const inArea = (x: number, z: number) => sl.level.areas.some(a => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1)
    for (const [k, p] of Object.entries(sl.plans)) {
      for (const q of p.pickups) expect(inArea(q.x, q.z), k).toBe(true)
      for (const s of p.steps) expect(inArea(s.x, s.z) || s.kind === 'talk', k).toBe(true)
    }
    // nothing of a plan lies about until its mission is accepted
    syncOffers(run, sl, newPlay())
    expect(run.sim.got.every(Boolean)).toBe(true)
    for (const who of ['dad', 'mate', 'kiosk', 'neighbour'] as const) {
      const s = storyTalk(newPlay(), who)
      for (const n of Object.values(s.nodes)) for (const k of [n.line, ...(n.choices ?? []).map(c => c.key)]) expect(k in STORY_WORDS, k).toBe(true)
    }
    for (const m of CHILDHOOD) { const c = complicationTalk(m)!; for (const n of Object.values(c.nodes)) for (const k of [n.line, ...(n.choices ?? []).map(x => x.key)]) expect(k in STORY_WORDS, k).toBe(true) }
  })

  it('a mission starts only from its giver\'s talk, by a choice of approach, and can always be left', async () => {
    const {hood} = await clubOf('celtic')
    const sl = storyLevel(hoodLevel(hood, 1)), run = startHood(sl.level)
    let play = newPlay(); syncOffers(run, sl, play)
    expect(run.level.hood!.jobs[0]!.id).toBe('first-noise'); expect(run.job).toBe('idle')
    const t = storyTalk(play, 'dad')
    expect(t.start).toBe('menu')
    const offer = t.nodes['m:first-noise']!
    expect(offer.choices!.map(c => c.key)).toEqual(['story.m.first-noise.a.kiosk-first', 'story.m.first-noise.a.scarf-first', 'story.m.first-noise.a.next-door', 'story.talk.later'])
    expect(offer.choices!.at(-1)!.effect).toBeUndefined()
    play = applyEffect(run, sl, play, 'story:accept:first-noise:next-door').play
    expect(play.plan).toBe(planKey('first-noise', 'next-door')); expect(run.job).toBe('active')
    expect(run.sim.step).toBe(sl.plans[play.plan!]!.job.from)
    // the giver lets him leave it; it is offered again, untouched
    play = applyEffect(run, sl, play, 'story:drop').play
    expect(play.plan).toBeNull(); expect(run.job).toBe('idle'); expect(nextMissions(play.state)[0]!.mission.id).toBe('first-noise')
    expect(run.sim.got.every(Boolean)).toBe(true)
  })

  it('saves round-trip mid-mission: the director state, the plan, the complication answer and the street', async () => {
    const {hood} = await clubOf('olympiacos')
    const sl = storyLevel(hoodLevel(hood, 2)), run = startHood(sl.level)
    let play = newPlay(); syncOffers(run, sl, play)
    play = applyEffect(run, sl, play, 'story:accept:first-noise:kiosk-first').play
    let n = 0
    while (run.sim.step === sl.plans[play.plan!]!.job.from && n++ < 20_000) stepHood(run, botInput(run.level, run.sim))
    play = applyEffect(run, sl, play, 'story:answer:ask').play
    const save = snapshot(run, 'Noa', null, true, {state: play.state, plan: play.plan, choice: play.choice})
    const back = parseSave(JSON.stringify(save))!
    expect(back.story).toEqual({state: play.state, plan: play.plan, choice: 'ask'})
    const run2 = startHood(sl.level); restore(run2, back)
    expect(run2.sim.step).toBe(run.sim.step); expect(run2.sim.got).toEqual(run.sim.got)
    // an old save (before the story) and a garbled story both load
    const old = parseSave(JSON.stringify({...save, story: undefined}))!
    expect(old.story).toBeUndefined()
    expect(parseSave(JSON.stringify({...save, story: {state: {v: 9}}}))!.story).toBeUndefined()
    void personNear; void keepOff; void missionById
  })
})

describe('history and the watch card', {timeout: 300_000}, () => {
  it('a date or a score appears only from the archive row the Fitter bound, per club', async () => {
    const lines: string[] = []
    for (const id of CORE_CLUB_IDS) {
      const {nights} = await clubOf(id)
      for (const [mission, a] of Object.entries(nights)) {
        expect(missionById(mission)?.template, mission).toBeTruthy()
        expect(a.factId.length).toBeGreaterThan(3); expect(a.sources.length).toBeGreaterThan(0)
      }
      const w = Object.entries(nights).map(([m, a]) => { const x = watchForNight(id, a); return `${m} ${a.on ?? a.year}${x ? ` → ${x.highlights ? 'highlights' : x.ourFilmFit}` : ''}` })
      lines.push(`${id.padEnd(20)} ${w.join(' · ') || 'personal (no bound night)'}`)
    }
    console.log(`BOUND NIGHTS\n${lines.join('\n')}`)
    // the story's own words carry none (tests/life-story-director.test.ts holds the words to that)
  })

  it('hapoel-tel-aviv: the age-8 chapter stands on the 24.5.1986 title night, read from its curated row and its recorded match', async () => {
    const {nights} = await clubOf('hapoel-tel-aviv')
    const n = nights['the-way-in']!
    expect(n).toMatchObject({on: '1986-05-24', precision: 'day', title: 'minute 86', match: {home: 'Hapoel Tel Aviv', away: 'Maccabi Haifa', homeGoals: 1, awayGoals: 0, us: 'home', note: 'The title decider · against Maccabi Haifa'}})
    expect(n.sources.map(x => x.publisher)).toContain('ynet (in Hebrew)')
    const club = await loadClub('hapoel-tel-aviv'), view = rushView(club!.data)
    expect(kindsOf(n, view)).toEqual(expect.arrayContaining(['match', 'home', 'title']))
    const card = watchForNight('hapoel-tel-aviv', n)!
    expect(card.highlights).toMatchObject({id: '1986-championship', youtubeId: 'dFykPEa8NAE', status: 'verified'})
    expect(slateOf(n)).toMatchObject({date: '1986-05-24', result: 'Hapoel Tel Aviv 1–0 Maccabi Haifa', title: 'minute 86'})
  })

  it('the watch card holds only recorded ids, and the 24.5.1986 title night resolves to the recorded highlights', () => {
    const recorded = new Set([...HIGHLIGHTS, ...OUR_FILMS].map(m => m.youtubeId))
    for (const id of CORE_CLUB_IDS) for (const day of [null, '1986-05-24', '2000-05-17', '2024-05-29', '1990-01-01']) {
      const a = watchForNight(id, day ? {factId: `none-${day}`, on: day} : null)
      if (!a) continue
      for (const m of [a.highlights, a.ourFilm, ...a.moreHighlights]) if (m) { expect(recorded.has(m.youtubeId)).toBe(true); expect(m.clubId).toBe(id) }
    }
    const t = watchForNight('hapoel-tel-aviv', {factId: 'ca4aa4d00c5c', on: '1986-05-24'})!
    expect(t.highlights).toMatchObject({id: '1986-championship', youtubeId: 'dFykPEa8NAE'})
    expect(t.highlights).toEqual(watchFor('hapoel-tel-aviv', {matchDate: '1986-05-24'})!.highlights)
    // a night with nothing recorded falls back to our own club film, labelled as such, or to nothing
    expect(watchForNight('hapoel-tel-aviv', {factId: 'none', on: '1986-12-06'})).toMatchObject({highlights: null, ourFilmFit: 'club'})
    // a night the hunt checked is served by its row id (Hapoel v Maccabi, 9.3.1991, the no-ticket night)
    expect(watchForNight('hapoel-tel-aviv', {factId: 'ac435574bd8c', on: '1991-03-09'})!.highlights!.youtubeId).toBe('celQonvaW8g')
  })
})

describe('THE WORKER\'s pictures in the story', () => {
  it('names only imported files of the universal and Tel Aviv classes, and Tel Aviv only for Tel Aviv', async () => {
    const {readFileSync, existsSync} = await import('node:fs')
    const {WORKER_ART_USED, workerPlate, workerDoc, isTelAviv} = await import('@/lib/life/hood/workerArt')
    const imported = JSON.parse(readFileSync('lib/life/worker-art/imported.json', 'utf8')) as {files: {out: string; cls: string}[]}
    const cls = new Map(imported.files.map(f => [`/${f.out.replace(/^public\//, '')}`, f.cls]))
    for (const f of WORKER_ART_USED) {
      expect(existsSync(`public${f}`), f).toBe(true)
      expect(['universal', 'tlv'], f).toContain(cls.get(f))
    }
    for (const m of [...CHILDHOOD.map(x => x.id), 'papers']) {
      for (const town of ['Glasgow', 'Athens', 'Casablanca', null]) {
        for (const f of [workerPlate(m, town), workerDoc(m, town)]) if (f) expect(cls.get(f), `${m} in ${town}`).toBe('universal')
      }
    }
    expect(isTelAviv('Tel Aviv')).toBe(true); expect(isTelAviv('Petah Tikva')).toBe(false)
    expect(workerPlate('first-noise', 'Tel Aviv')).toBe('/life/worker/tlv/introBeacon.webp')
  })
})
