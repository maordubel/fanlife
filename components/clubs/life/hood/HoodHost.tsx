'use client'
/**
 * LIFE · the hood — the game. A full shell around the open neighbourhood: title, new life, intro cinematic, pause, district map,
 * kit bag, conversations, job card. `lib/life/hood/shell.ts` is the flow, `run.ts` the street's rules, `talk.ts` the conversations,
 * `rush-render/stage.ts` the picture. This file owns the input and wires them; every string comes from `lib/life/hood/words.ts`.
 * Nothing here ends the game: a device that cannot draw the street shows a card, nothing else is a fail state.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {hoodLevel, hoodSpec, type HoodClub} from '@/lib/life/hood/level'
import {openStep, personNear, startHood, stepHood, type HoodEvent, type HoodRun} from '@/lib/life/hood/run'
import {hoodWord, type HoodKey} from '@/lib/life/hood/words'
import {IDLE, STEP, type Input} from '@/lib/life/rush/sim'
import type {PersonId, PlaceId} from '@/lib/life/hood/types'
import {accentFor, brandAccent, cleanName, initialShell, isCrane, isFull, NAVY, reduce, type Shell, type ShellEvent} from '@/lib/life/hood/shell'
import {advance, choose, feelOf, nodeOf, talkScript, type TalkScript} from '@/lib/life/hood/talk'
import {ballYours, hoodAmbient, stepAmbient, type AmbState} from '@/lib/life/hood/ambient'
import {bagOf} from '@/lib/life/hood/bag'
import {hudTarget, metresTo, ringProgress} from '@/lib/life/hood/district'
import {browserStore, DEFAULT_SETTINGS, readSave, readSettings, restore, snapshot, writeSave, writeSettings, type HoodSave, type HoodSettings} from '@/lib/life/hood/save'
import type {Quality, Stage} from '@/lib/life/rush-render/stage'
import {drawMap} from '@/lib/life/rush-render/minimap'
import {Hud, RING_LEN, type Banner} from './Hud'
import {Talk} from './Talk'
import {Boot, Cinematic, Help, NameEntry, Pause, Settings, StoryCard, Title, type StoryCardView} from './Screens'
import {MapScreen, type MapGiver} from './MapScreen'
import {WatchCard} from '../watch/WatchCard'
import {slateDate, slateOf, watchForNight, watchWord, type WatchKey} from '@/lib/life/watch'
import {chapter as chapterOf, missionById, stageOf as stageOfAge, storyWord} from '@/lib/life/hood/story'
import {applyEffect, beatsAfter, carried, complicationTalk, fastForward, finishStory, focusOf, giversOf, keepOff, newPlay, openingBeat, planKey, stepDone, storyLevel, storyTalk, syncOffers, wantsComplication, type Beat, type StoryPlay} from '@/lib/life/hood/story/play'
import {castFace, loadFlow, pick, PLATE_HINT, urlOf, type FlowManifest} from '@/lib/life/hood/flowRef'
import {CLUB_TOWN, TOWN_PEOPLE} from '@/lib/life/flowArtSpec'
import type {ArchiveRef} from '@/lib/life/universal/types'
import {WORKER_PAPER, workerBridge, workerDoc, workerFace, workerPlate, workerProp} from '@/lib/life/hood/workerArt'
import {BagScreen} from './BagScreen'
import {COLD_OPEN, feelAfterCards, feelEffect, feelFinish, feelHud, feelStart, feelStep, feelVars, newFeel, type FeelHud, type FeelNote, type FeelState} from '@/lib/life/hood/story/feel/session'
import {heartOf, recapOf} from '@/lib/life/hood/story/feel/voice'
import {clockAfter, clockForMission, clockLabel, dayPart, FIRST_CLOCK, wrapDay} from '@/lib/life/hood/daylight'
import {soundScene} from '@/lib/life/hood/soundScene'
import {resumeLine} from '@/lib/life/hood/resume'
import {streetLine, type StreetWho} from '@/lib/life/hood/streetTalk'
import {echoFor, momentOf} from '@/lib/life/hood/story/moments'
import {cardFound, cardsHeld, kitOfYear, yearOf, type CardThing} from '@/lib/life/hood/things'
import {LifeSound} from '../sound'
import css from './hood.module.css'

export type HoodHostProps = {club: HoodClub; /** the mark of the edition this page is served as (FAN LIFE's roundel; THE WORKER's badge only on Hapoel's own host: rule two-logos) */ mark?: string | null; seed?: number; time?: 'day' | 'night' | 'dusk'; /** the QA stand only: hold the street's clock at this minute of the day (the light does not move) */ clockAt?: number; quality?: Quality; reduced?: boolean; /** `classic` keeps the code-built figures (the skinned people are the default) */ people?: 'human' | 'classic'; /** the QA stand only: exposes the run as `window.__hood` and the shell as `window.__hoodShell` */ probe?: boolean; /** the QA stand only: start the story at this chapter (the director is walked on without the street) */ chapterAt?: string; /** `play`: skip the title and start roaming (the QA stand) */ start?: 'title' | 'play'}

/** where the intro's camera subject stands on each beat: along the main street, mid-block, never on a crossing */
const INTRO_Z = [8, -48, -108, -270]

/** a person's mark on the minimap, drawn over RUSH's own map in its projection (110 m across, centred on him) */
function drawGivers(ctx: CanvasRenderingContext2D, size: number, at: {x: number; z: number}, list: {x: number; z: number; main: boolean}[], accent: string, ink: string) {
  const k = size / 110, rMax = size / 2 - 7
  for (const g of list) {
    let x = size / 2 + (g.x - at.x) * k, y = size / 2 + (g.z - at.z) * k
    const dx = x - size / 2, dy = y - size / 2, d = Math.hypot(dx, dy)
    if (d > rMax) { if (!g.main) continue; x = size / 2 + dx / d * rMax; y = size / 2 + dy / d * rMax }
    ctx.beginPath(); ctx.arc(x, y, g.main ? 4.2 : 3, 0, Math.PI * 2)
    ctx.lineWidth = 1.6; ctx.strokeStyle = g.main ? ink : accent; ctx.fillStyle = accent
    if (g.main) ctx.fill(); ctx.stroke()
  }
}

export function HoodHost({club, mark = null, seed = 1, time = 'dusk', clockAt, quality, reduced = false, probe, start = 'title', people = 'human', chapterAt}: HoodHostProps) {
  // the street with every story plan laid in once (story/play.ts): the picture is built once, the story moves through it
  const sl = useMemo(() => storyLevel(hoodLevel(club, seed)), [club, seed])
  const level = sl.level
  // the street is always built as the dusk street: the day turns on it (look/daylight.ts), so `time` only names the hour it opens at
  const spec = useMemo(() => hoodSpec(club.id, seed, 'dusk'), [club.id, seed])
  const clock0 = clockAt ?? (time === 'day' ? 12 * 60 + 30 : time === 'night' ? 21 * 60 + 30 : FIRST_CLOCK)
  const clockRef = useRef<number>(clock0)
  const runRef = useRef<HoodRun | null>(null)
  if (!runRef.current || runRef.current.level !== level) runRef.current = startHood(level)
  const canvasRef = useRef<HTMLCanvasElement | null>(null), stageRef = useRef<Stage | null>(null)
  const keys = useRef<Record<string, boolean>>({}), act = useRef(false), stick = useRef({id: -1, ox: 0, oy: 0, x: 0, y: 0})
  const camRef = useRef<'chase' | 'eyes'>('chase'), sprintRef = useRef(false)
  const hud = {arrow: useRef<HTMLElement | null>(null), dist: useRef<HTMLElement | null>(null), map: useRef<HTMLCanvasElement | null>(null), ring: useRef<SVGCircleElement | null>(null), clock: useRef<HTMLElement | null>(null)}

  const shellRef = useRef<Shell>(initialShell)
  const [shell, setShell] = useState<Shell>(initialShell)
  const [settings, setSettings] = useState<HoodSettings>(DEFAULT_SETTINGS)
  const [osReduced, setOsReduced] = useState(false), [touch, setTouch] = useState(false), [coarse, setCoarse] = useState(false)
  const [cam, setCam] = useState<'chase' | 'eyes'>('chase'), [error, setError] = useState(false), [ready, setReady] = useState(false), [bootGone, setBootGone] = useState(false)
  const [sprintOn, setSprintOn] = useState(false), [ghost, setGhost] = useState(true), [stickAt, setStickAt] = useState<{x: number; y: number; dx: number; dy: number} | null>(null)
  const [jobState, setJobState] = useState<HoodRun['job']>('idle'), [objIx, setObjIx] = useState(-1)
  const [place, setPlace] = useState<string | null>(null), [nearId, setNearId] = useState<PersonId | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [talk, setTalk] = useState<{script: TalkScript; id: string} | null>(null)
  const [waypoint, setWaypoint] = useState<PlaceId | null>(null), [wear, setWear] = useState(true), [mapKey, setMapKey] = useState(0)
  const [savedName, setSavedName] = useState(''), [coach, setCoach] = useState(true)
  // the story: the director's state and the open plan (a ref for the loop, a state for the screen), the cards waiting to be shown
  const playRef = useRef<StoryPlay>(newPlay()), [play, setPlayState] = useState<StoryPlay>(playRef.current)
  const setPlay = useCallback((p: StoryPlay) => { playRef.current = p; setPlayState(p) }, [])
  const [beats, setBeats] = useState<Beat[]>([]), [flow, setFlow] = useState<FlowManifest | null>(null)
  const nights: Readonly<Record<string, ArchiveRef>> = useMemo(() => club.nights ?? {}, [club.nights])
  const [caps, setCaps] = useState<{id: number; spot: string; key: string}[]>([]), [kick, setKick] = useState(false)
  const ambRef = useRef<AmbState | null>(null), talkRef = useRef<{script: TalkScript; id: string} | null>(null), typingRef = useRef(false), capEls = useRef<Record<number, HTMLElement | null>>({}), capsRef = useRef<{id: number; spot: string; key: string}[]>([])
  const waypointRef = useRef<PlaceId | null>(null), wayLabelRef = useRef(''), pendingDone = useRef(false), wearRef = useRef(true)
  const storeRef = useRef<ReturnType<typeof browserStore>>(null)
  const timers = useRef<{banner: number; place: number; voice: number}>({banner: 0, place: 0, voice: 0}), bannerId = useRef(0)
  // the feel layer (feel/session.ts): the mission's challenge, his voice, the era; the HUD's clock; the sound when allowed
  const feelRef = useRef<FeelState>(newFeel({born: club.born, country: club.country}))
  const [feelHudV, setFeelHud] = useState<FeelHud | null>(null), [voice, setVoice] = useState<{id: number; text: string} | null>(null)
  const soundRef = useRef<LifeSound | null>(null), soundOn = useRef(true)
  // THE ALBUM's stickers found in the street (things.ts): kept with the life, shown in the kit bag
  const cardsRef = useRef<string[]>([]), [cards, setCards] = useState<string[]>([]), [found, setFound] = useState<CardThing | null>(null), foundT = useRef(0)

  /** a cue, when sound is on (every cue is one of the game's own recordings, with a synthesised fallback) */
  const cue = useCallback((name: string) => { if (soundOn.current) soundRef.current?.play(name) }, [])
  const reducedEff = reduced || settings.reduced || osReduced
  soundOn.current = settings.sound
  useEffect(() => {
    // synthesised cues only (sound.ts); browsers refuse audio nobody asked for, so the first gesture wakes it
    const wake = () => { if (!soundOn.current) return; if (!soundRef.current) soundRef.current = new LifeSound(); soundRef.current.wake() }
    window.addEventListener('pointerdown', wake, {once: true}); window.addEventListener('keydown', wake, {once: true})
    return () => { window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); soundRef.current?.close(); soundRef.current = null }
  }, [])
  const qualityEff: Quality = settings.quality ?? quality ?? (coarse ? 'lite' : 'high')
  // the street's small lives: one state per street and picture quality (the picture draws the same spots)
  const amb = useMemo(() => hoodAmbient(level, qualityEff === 'lite'), [level, qualityEff])
  ambRef.current = amb; talkRef.current = talk
  const {accent, on: onAccent} = useMemo(() => accentFor(club.skin), [club.skin])
  const brand = useMemo(() => brandAccent(club.skin), [club.skin])
  const accentRef = useRef(accent); accentRef.current = accent

  /** the names the words print: the cast's first name, or the role's own word */
  const names = useMemo(() => {
    const out: Record<string, string> = {}
    for (const p of level.hood!.people) out[p.id] = p.name ?? hoodWord(`hood.who.${p.id}` as HoodKey)
    return out
  }, [level])
  const namesRef = useRef(names); namesRef.current = names
  const vars = useMemo(() => ({mate: names.mate!, kiosk: names.kiosk === hoodWord('hood.who.kiosk') ? hoodWord('hood.who.kiosk').toLowerCase() : `${names.kiosk}’s kiosk`, name: shell.name || hoodWord('hood.name.default')}), [names, shell.name])
  // the story's words name people by their first names (or the role's own word, lower case, mid-sentence)
  const storyVars = useMemo(() => {
    const own = (id: string) => level.hood!.people.find(p => p.id === id)?.name ?? hoodWord(`hood.who.${id}` as HoodKey).toLowerCase()
    return {mate: own('mate'), kiosk: own('kiosk'), neighbour: own('neighbour'), name: shell.name || hoodWord('hood.name.default')}
  }, [level, shell.name])
  // a line made for this talk alone (the street's own words about the club's record): printed as prepared
  const saidRef = useRef<Record<string, string>>({}), talksRef = useRef<Record<string, number>>({})
  const w = useCallback((k: string, extra: Record<string, string> = {}) => k.startsWith('say:') ? saidRef.current[k] ?? '' : k.startsWith('story.') || k.startsWith('feel.') || k.startsWith('era.') ? storyWord(k, {...storyVars, ...feelVars(feelRef.current, playRef.current), ...extra}) : k.startsWith('watch.') ? watchWord(k as WatchKey, extra) : hoodWord(k, {...vars, ...extra}), [vars, storyVars])

  /* the flow */
  const go = useCallback((e: ShellEvent) => {
    const next = reduce(shellRef.current, e)
    if (next === shellRef.current) return
    // every screen has its sound: a panel opens and closes, a card turns like a page, the street comes back
    const to = next.screen, was = shellRef.current.screen
    if (soundOn.current && to !== was) soundRef.current?.play(to === 'pause' || to === 'map' || to === 'bag' || to === 'settings' || to === 'help' ? 'open' : to === 'story' ? 'page' : to === 'dialogue' ? 'click' : to === 'playing' && (was === 'pause' || was === 'map' || was === 'bag') ? 'close' : to === 'jobdone' ? 'reveal' : '')
    shellRef.current = next
    if (next.screen !== 'playing') { stick.current = {id: -1, ox: 0, oy: 0, x: 0, y: 0}; act.current = false; keys.current = {}; sprintRef.current = false; setSprintOn(false); setStickAt(null) }
    setShell(next)
  }, [])
  const persist = useCallback(() => {
    const run = runRef.current!
    const p = playRef.current
    writeSave(storeRef.current, club.id, snapshot(run, shellRef.current.name, waypointRef.current, wearRef.current, {state: p.state, plan: p.plan, choice: p.choice}, clockRef.current, cardsRef.current))
  }, [club.id])
  const freshRun = useCallback((p: StoryPlay = newPlay()) => {
    runRef.current = startHood(level)
    clockRef.current = clock0
    cardsRef.current = []; setCards([]); setFound(null)
    feelRef.current = newFeel({born: club.born, country: club.country, name: shellRef.current.name})
    if (probe) (window as unknown as {__hood?: unknown}).__hood = runRef.current
    setPlay(p); syncOffers(runRef.current, sl, p)
    setJobState(runRef.current.job); setObjIx(-1); setWaypoint(null); waypointRef.current = null; setWear(true); wearRef.current = true; pendingDone.current = false; setPlace(null); setTalk(null); setBeats([])
  }, [level, probe, sl, setPlay, club.born, club.country, clock0])
  const loadSave = useCallback((s: HoodSave) => {
    freshRun()
    const run = runRef.current!
    restore(run, s)
    if (clockAt === undefined && typeof s.clock === 'number') clockRef.current = wrapDay(s.clock)
    cardsRef.current = s.cards ?? []; setCards(cardsRef.current)
    // the story: a save from before it starts the story at its beginning; an open mission comes back where it stood
    const st = s.story, plan = st?.plan && sl.plans[st.plan] && st.state.open && planKey(st.state.open.id, st.state.open.approach) === st.plan ? sl.plans[st.plan]! : null
    const p: StoryPlay = st ? {state: plan ? st.state : {...st.state, open: null}, plan: plan ? st!.plan : null, choice: plan ? st!.choice : null, asked: false} : newPlay()
    setPlay(p)
    if (plan) {
      const h = run.level.hood!
      h.jobs.splice(0, h.jobs.length, plan.job)
      run.job = 'active'; run.board[plan.job.id] = 'active'
      run.sim.step = Math.min(Math.max(s.step, plan.job.from), plan.job.from + plan.job.steps - 1)
      keepOff(run, sl, p)
    } else { run.job = 'idle'; syncOffers(run, sl, p) }
    setJobState(run.job); setObjIx(openStep(run)); setWaypoint(s.waypoint); waypointRef.current = s.waypoint; setWear(s.wear); wearRef.current = s.wear
  }, [freshRun, sl, setPlay, clockAt])

  const showBanner = useCallback((kind: Banner['kind'], title: string, sub?: string) => {
    window.clearTimeout(timers.current.banner)
    setBanner({id: ++bannerId.current, kind, title, sub})
    timers.current.banner = window.setTimeout(() => setBanner(null), kind === 'major' ? 2600 : 1700)
  }, [])

  /** what the feel layer noticed: his voice as a line over the street, a banner, a sound (when sound is on) */
  const showNotes = useCallback((notes: readonly FeelNote[]) => {
    for (const n of notes) {
      const v = Object.fromEntries(Object.entries(n.vars ?? {}).map(([k, x]) => [k, /^(hood|story|feel|era)\./.test(x) ? w(x) : namesRef.current[x] ?? x]))
      if (n.what === 'cold-open' || n.what === 'home-next-day' || n.what.startsWith('chapter:')) continue
      const text = w(n.what, v)
      if (n.show === 'caption') { window.clearTimeout(timers.current.voice); setVoice({id: ++bannerId.current, text}); timers.current.voice = window.setTimeout(() => setVoice(null), 4200) }
      else if (n.show === 'major' || n.show === 'minor') showBanner(n.show, text)
      if (n.sound && soundOn.current) soundRef.current?.play(n.sound)
    }
  }, [w, showBanner])
  const openTalk = useCallback((who: PersonId, key: string) => {
    // a step's own line is played as written; anything else a person says comes from the story (offers, ways, idle words)
    let script = key.startsWith('story.s.') ? talkScript(who, key, {job: 'active', giver: who, offerKey: ''}) : storyTalk(playRef.current, who)
    // The street knows (streetTalk.ts): before anybody offers him anything he talks about the club, from its own record
    // for the year this life is in. A mission is reached through a conversation, not picked off a list.
    if (!key.startsWith('story.s.') && !playRef.current.plan && (who === 'dad' || who === 'mate' || who === 'kiosk' || who === 'neighbour')) {
      const st = playRef.current.state, turn = (talksRef.current[who] = (talksRef.current[who] ?? 0) + 1) - 1
      const lived = st.done.flatMap(id => { const n = nights[id], sl8 = n ? slateOf(n) : null; return n && sl8?.result ? [{date: n.on ? slateDate(n.on) : String(n.year), result: sl8.result}] : [] })
      const line = streetLine({who: who as StreetWho, things: club.things, year: yearOf(club.born, st.age), have: cardsRef.current, lived, turn})
      if (line) { saidRef.current = {'say:street': hoodWord(line.key, line.vars)}; script = {...script, start: 'street', nodes: {...script.nodes, street: {id: 'street', who, line: 'say:street', next: script.start}}} }
    }
    setTalk({script, id: script.start}); go({t: 'talk'})
  }, [go, nights, club.things, club.born])
  const openScript = useCallback((script: TalkScript) => { setTalk({script, id: script.start}); go({t: 'talk'}) }, [go])

  /** the night under a mission, when the Fitter dated it (an archive row, printed as recorded) */
  const nightOf = useCallback((id: string | null | undefined): ArchiveRef | null => (id ? nights[id] ?? null : null), [nights])
  const nightLine = useCallback((n: ArchiveRef) => `${n.on ? slateDate(n.on) : String(n.year)} · ${slateOf(n)?.result ?? n.title}`, [])

  /**
   * After a talk closes, a card closes, or the street moves: the open mission's end (its cards), else its complication.
   * Nothing here moves him; it only opens what his own last step asked for.
   */
  const afterward = useCallback(() => {
    if (shellRef.current.screen !== 'playing') return
    const run = runRef.current!
    if (pendingDone.current && playRef.current.plan) {
      pendingDone.current = false
      const ff = feelFinish(feelRef.current, {run, sl, play: playRef.current})
      showNotes(ff.notes)
      const fin = finishStory(run, sl, ff.play)
      // a new week's stickers are out on the pavements when a mission is done
      for (const i of sl.free) run.sim.got[i] = false
      setPlay(fin.play); setJobState(run.job); setObjIx(-1)
      const night = fin.mission.kind === 'main' ? nightOf(fin.mission.id) : null
      const list = beatsAfter({mission: fin.mission, approach: fin.approach, events: fin.events, delta: fin.delta, state: fin.play.state, night, canWatch: !!(night && watchForNight(club.id, night))})
      persist()
      if (fin.mission.kind === 'standing') showBanner('minor', w(`story.m.${fin.mission.id}.title`), w(`story.m.${fin.mission.id}.aftermath`))
      // the paper the morning after, the stage's recap, and the next offer made at the high (the giver calls him over)
      const fa = feelAfterCards(feelRef.current, {run, sl, play: fin.play, cards: list, mission: fin.mission, delta: fin.delta, events: fin.events, night})
      showNotes(fa.notes)
      feelRef.current.pending = fa.talk
      if (fa.cards.length) { setBeats(fa.cards); go({t: 'story'}) }
      else if (fa.talk) { feelRef.current.pending = null; openScript(fa.talk) }
      return
    }
    const cm = wantsComplication(run, playRef.current)
    if (cm) { setPlay({...playRef.current, asked: true}); const c = complicationTalk(cm); if (c) openScript(c) }
  }, [sl, setPlay, nightOf, club.id, persist, showBanner, w, go, openScript, showNotes])

  const handle = useCallback((evs: HoodEvent[]) => {
    const run = runRef.current!, j = run.level.hood!.jobs[0]
    for (const e of evs) {
      if (e.k === 'say') { if (shellRef.current.screen === 'playing') openTalk(e.who, e.key) }
      else if (e.k === 'job') {
        setJobState(run.job)
        if (e.state === 'done') pendingDone.current = true
        persist()
      } else if (e.k === 'step') {
        setObjIx(openStep(run))
        if (run.job === 'active' && j && e.next > j.from) { setPlay(stepDone(playRef.current)); showBanner('minor', w('hood.banner.step')); cue('objective') }
        persist()
      } else if (e.k === 'pickup') {
        // a sticker in the street is a man who wore the shirt in the year this life has reached (THE ALBUM's own stickers)
        const card = e.kind === 'sticker' ? cardFound(club.things, yearOf(club.born, playRef.current.state.age), cardsRef.current) : null
        if (card) {
          cardsRef.current = [...cardsRef.current, card.id]; setCards(cardsRef.current); setFound(card); cue('envelope-tear')
          window.clearTimeout(foundT.current); foundT.current = window.setTimeout(() => setFound(null), 4200); persist()
        } else { showBanner('minor', w(`story.item.${e.kind}`)); cue(e.kind === 'coin' ? 'coin' : 'pickup') }
      }
      else if (e.k === 'hit') showBanner('minor', w('hood.ev.hit'))
      else if (e.k === 'place') {
        window.clearTimeout(timers.current.place)
        if (e.id) {
          setPlace(e.id); timers.current.place = window.setTimeout(() => setPlace(null), 2600)
          if (waypointRef.current === e.id) { setWaypoint(null); waypointRef.current = null; showBanner('minor', w('hood.hud.arrived', {place: w(`hood.place.${e.id}`)})) }
        } else setPlace(null)
      }
    }
    if (evs.length) afterward()
  }, [openTalk, persist, showBanner, w, setPlay, afterward, cue, club.things, club.born])

  const endTalk = useCallback(() => {
    setTalk(null); go({t: 'talkEnd'})
    persist()
    afterward()
  }, [go, persist, afterward])
  const onGo = useCallback(() => { if (!talk) return; const s = advance(talk.script, talk.id); if (s.node) setTalk({...talk, id: s.node.id}); else endTalk() }, [talk, endTalk])
  const onChoose = useCallback((i: number) => {
    if (!talk) return
    const s = choose(talk.script, talk.id, i)
    cue('choice')
    const run = runRef.current!
    if (s.effect?.startsWith('story:feel:')) { const fe = feelEffect(feelRef.current, {run, sl, play: playRef.current}, s.effect); if (fe.play !== playRef.current) setPlay(fe.play); showNotes(fe.notes) }
    const out = applyEffect(run, sl, playRef.current, s.effect)
    if (out.play !== playRef.current) setPlay(out.play)
    const a = out.act
    if (a?.k === 'accepted') {
      const n = a.mission.kind === 'main' ? nightOf(a.mission.id) : null
      cue('stamp-new')
      showBanner('major', w('story.banner.accepted'), n ? `${w(`story.m.${a.mission.id}.title`)} · ${nightLine(n)}` : w(`story.m.${a.mission.id}.title`))
      setJobState(run.job); setObjIx(openStep(run)); persist()
    } else if (a?.k === 'day') { showBanner(a.events.some(e => e.k === 'week') ? 'major' : 'minor', w(`story.day.${out.play.state.day}`), a.events.some(e => e.k === 'week') ? w('story.banner.week') : undefined); setJobState(run.job); persist() }
    else if (a?.k === 'dropped') { setJobState(run.job); setObjIx(-1); persist() }
    if (s.node) setTalk({...talk, id: s.node.id}); else endTalk()
  }, [talk, endTalk, sl, setPlay, nightOf, nightLine, showBanner, w, persist, showNotes, cue])

  /** the cards after a mission, one after another; the last one gives the street back */
  const nextBeat = useCallback(() => {
    setBeats(b => {
      const rest = b.slice(1)
      if (!rest.length) window.setTimeout(() => {
        go({t: 'storyDone'}); persist(); afterward()
        const t = feelRef.current.pending
        if (t && shellRef.current.screen === 'playing') { feelRef.current.pending = null; openScript(t) }
      }, 0)
      return rest
    })
  }, [go, persist, afterward, openScript])

  const finishIntro = useCallback(() => {
    // the QA stand may start at a later chapter (the director walked on without the street); a life always starts on its title card
    const p = chapterAt && missionById(chapterAt) ? newPlay(fastForward(newPlay().state, chapterAt)) : newPlay()
    freshRun(p); go({t: 'introDone'}); persist()
    // the cold open: Dad's offer is in his ear the moment the chapter card closes
    feelRef.current = feelStart({club, born: club.born ?? null, name: shellRef.current.name, run: runRef.current!, sl, play: p}).feel
    setBeats([openingBeat(p.state)]); go({t: 'story'})
  }, [freshRun, go, persist, chapterAt, club, sl])
  const startNew = useCallback((raw: string) => { go({t: 'name', name: cleanName(raw)}) }, [go])
  const doContinue = useCallback(() => {
    const s = readSave(storeRef.current, club.id)
    if (!s) return
    loadSave(s); go({t: 'continue', name: s.name})
    // he comes back to a thing or a person, in one line, before any list (resume.ts)
    const r = resumeLine({keeps: playRef.current.state.keeps, giver: focusOf(playRef.current)?.giver ?? null})
    if (r) {
      const thing = r.key === 'hood.resume.keep' ? w(r.thing) : '', text = r.key === 'hood.resume.keep' ? w(r.key, {thing: thing.charAt(0).toLowerCase() + thing.slice(1)}) : w(r.key, {who: namesRef.current[r.who] ?? ''})
      window.clearTimeout(timers.current.voice); setVoice({id: ++bannerId.current, text}); timers.current.voice = window.setTimeout(() => setVoice(null), 5200)
    }
  }, [club.id, loadSave, go, w])
  const changeSettings = useCallback((s: HoodSettings) => { setSettings(s); writeSettings(storeRef.current, s) }, [])

  /* start: storage, preferences, the first screen */
  useEffect(() => {
    storeRef.current = browserStore()
    setSettings(readSettings(storeRef.current))
    let live = true
    loadFlow().then(m => { if (live) setFlow(m) }).catch(() => undefined)
    try { setTouch(window.matchMedia('(pointer: coarse)').matches); setCoarse(window.matchMedia('(pointer: coarse)').matches) } catch { /* no media queries */ }
    let mq: MediaQueryList | null = null
    const f = () => setOsReduced(!!mq?.matches)
    try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); f(); mq.addEventListener('change', f) } catch { /* nothing */ }
    return () => { live = false; try { mq?.removeEventListener('change', f) } catch { /* nothing */ } }
  }, [])
  useEffect(() => { camRef.current = cam }, [cam])
  useEffect(() => { sprintRef.current = sprintOn }, [sprintOn])
  useEffect(() => { waypointRef.current = waypoint; wayLabelRef.current = waypoint ? w(`hood.place.${waypoint}`) : '' }, [waypoint, w])
  useEffect(() => { wearRef.current = wear }, [wear])
  useEffect(() => {
    if (!ready || shellRef.current.screen !== 'boot') return
    const s = readSave(storeRef.current, club.id)
    setSavedName(s?.name ?? '')
    go({t: 'booted', hasSave: !!s, play: start === 'play', name: s?.name ?? ''})
    // the QA stand goes straight to the street: a fresh life there, on its first card
    if (start === 'play') { const p = chapterAt && missionById(chapterAt) ? newPlay(fastForward(newPlay().state, chapterAt)) : newPlay(); freshRun(p); feelRef.current = feelStart({club, born: club.born ?? null, name: shellRef.current.name, run: runRef.current!, sl, play: p}).feel; setBeats([openingBeat(p.state)]); go({t: 'story'}) }
  }, [ready, club, go, start, chapterAt, freshRun, sl])
  useEffect(() => { if (shell.screen !== 'boot') { const t = window.setTimeout(() => setBootGone(true), 900); return () => window.clearTimeout(t) } }, [shell.screen])
  useEffect(() => () => { window.clearTimeout(timers.current.banner); window.clearTimeout(timers.current.place) }, [])
  useEffect(() => { if (probe) { const win = window as unknown as {__hood?: unknown; __hoodShell?: unknown}; win.__hood = runRef.current; win.__hoodShell = {go, get screen() { return shellRef.current.screen }, openTalk, get story() { return playRef.current }, get giver() { return focusOf(playRef.current)?.giver ?? null }, nextBeat} } }, [probe, go, openTalk, nextBeat])

  /* the picture */
  useEffect(() => {
    let alive = true
    const canvas = canvasRef.current
    if (!canvas) return
    // the people are real skinned humans: the boy and his father are fetched before the picture is built (the rest arrive
    // behind them); a kit that cannot be had leaves the code-built figures, and nothing waits on a file for ever
    const humans = people === 'classic' ? Promise.resolve(false) : import('@/lib/life/rush-render/human/kit').then(k => k.preloadHumans(qualityEff === 'lite')).catch(() => false)
    Promise.all([import('@/lib/life/rush-render/stage'), humans]).then(([{createStage}, ok]) => {
      if (!alive) return
      try { const mk = (q: Quality) => createStage({canvas, level, spec, skin: club.skin, quality: q, reduced: reducedEff, gateLabel: club.skin.strings.gate ?? club.skin.strings.ground ?? '', people: ok ? 'human' : 'classic'}); let st: Stage; try { st = mk(qualityEff) } catch (e) { if (qualityEff === 'lite') throw e; st = mk('lite') /* a device that cannot draw the full street draws the light one, never the error card */ } stageRef.current = st; st.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight); setReady(true) } catch { setError(true) }
    }).catch(() => { if (alive) setError(true) })
    const onResize = () => stageRef.current?.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize); stageRef.current?.dispose(); stageRef.current = null }
  }, [level, spec, club.skin, qualityEff, reducedEff, people])
  // the player's body follows the story's age: a boy, a teenager, a man (time passing is seen, not only told)
  const age = play.state.age
  useEffect(() => { if (ready) stageRef.current?.setAge(age) }, [ready, age])
  // the story sets the hour: taking a mission moves the clock to the time of day it happens at (school in the morning,
  // the walk to the ground in the gold hour before kick-off); after that the street only keeps it running
  const hourOf = play.plan ? play.state.open?.id ?? null : null
  useEffect(() => {
    if (!hourOf || clockAt !== undefined) return
    const m = missionById(hourOf)
    if (m) clockRef.current = clockForMission(clockRef.current, {day: m.day, place: m.place, kind: m.kind})
  }, [hourOf, clockAt])
  // The slate. A documentary says where and when before it shows anything: the town, the part of the day and the year the
  // life has reached, each time the street is given back to him at a new hour (a new life, a mission taken, a new chapter).
  const [slate, setSlate] = useState<{id: number; place: string; when: string} | null>(null), slateKey = useRef('')
  useEffect(() => {
    if (shell.screen !== 'playing') return
    const part = dayPart(clockRef.current), yr = yearOf(club.born, play.state.age), key = `${part}:${play.state.age}:${play.plan ?? ''}`
    if (key === slateKey.current) return
    slateKey.current = key
    setSlate({id: Date.now(), place: club.town ?? club.skin.name, when: [w(`hood.slate.day.${part}`), clockLabel(clockRef.current), yr ? String(yr) : ''].filter(Boolean).join(' · ')})
    const t = window.setTimeout(() => setSlate(null), 5200)
    return () => window.clearTimeout(t)
  }, [shell.screen, play.state.age, play.plan, club.born, club.town, club.skin.name, w])
  // the QA stand reads what a frame costs
  useEffect(() => { if (probe && ready) (window as unknown as {__hoodGl?: unknown}).__hoodGl = () => ({...stageRef.current?.stats(), clock: clockLabel(clockRef.current)}); if (probe && ready) (window as unknown as {__hoodProfile?: unknown}).__hoodProfile = () => stageRef.current?.profile() }, [probe, ready])

  /* the loop: fixed steps for the simulation, one picture per frame */
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, tick = 0, ph = '', kickNow = false, capSig = '', drawn = '', fno = 0, stepGap = 0, stepIn = 0
    const redraw = () => { drawn = '' }
    window.addEventListener('resize', redraw)
    const pad = (): Input => {
      const k = keys.current
      const x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + stick.current.x
      const z = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0) + stick.current.y
      return {x, z, sprint: !!(k.ShiftLeft || k.ShiftRight) || sprintRef.current, act: act.current}
    }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const real = Math.min((now - last) / 1000, 0.25); last = now
      const stage = stageRef.current, run = runRef.current!
      if (!stage) return
      const {sim} = run, scr = shellRef.current.screen
      const playing = scr === 'playing'
      // the day turns only while he is in the street: a menu, a card or a conversation never costs him the light
      if (playing && clockAt === undefined) clockRef.current = clockAfter(clockRef.current, real)
      stage.setClock(clockRef.current)
      if (playing || isCrane(scr)) {
        acc += real
        let n = 0
        while (acc >= STEP && n < 12) {
          const raw = shellRef.current.screen === 'playing' ? pad() : IDLE
          // carrying something: no running with it (the challenge says so on the HUD)
          const input = feelRef.current.ch?.c.kind === 'carry' ? {...raw, sprint: false} : raw
          const ev = stepHood(run, input)
          if (shellRef.current.screen === 'playing' && ambRef.current) stepAmbient(ambRef.current, run.sim, input.act, STEP)
          if (input.act) act.current = false
          if (shellRef.current.screen === 'playing') handle(ev)
          if (shellRef.current.screen === 'playing') {
            const fe = feelStep(feelRef.current, {run, sl, play: playRef.current, ev})
            if (fe.play !== playRef.current) setPlay(fe.play)
            if (fe.notes.length) showNotes(fe.notes)
            if (fe.talk) { openScript(fe.talk); acc = 0; break }
          }
          acc -= STEP; n++
          if (shellRef.current.screen !== scr) break
        }
        if (acc > STEP * 12) acc = 0
      } else acc = 0
      if (playing && tick % 15 === 0) setFeelHud(feelHud(feelRef.current, run))
      // the sound of where he is: the street's air by the hour, the ground's crowd growing as he nears it, his own steps
      const snd = soundOn.current ? soundRef.current : null
      if (snd && fno % 20 === 0) {
        const g = level.goal, sc = soundScene({clock: clockRef.current, toGround: Math.hypot(sim.x - g.x, sim.z - g.z), matchday: playRef.current.state.day === 6, speed: sim.speed, sprinting: sim.sprinting, covered: isFull(scr) || isCrane(scr), talking: scr === 'dialogue'})
        snd.loop('street', sc.street.name, sc.street.level); snd.loop('ground', sc.ground?.name ?? null, sc.ground?.level ?? 0)
        stepGap = sc.stepEvery
      }
      if (snd && playing && stepGap > 0) { stepIn -= real; if (stepIn <= 0) { stepIn = stepGap; snd.setSurface('street'); snd.play('step') } } else stepIn = 0.1
      if (playing) {
        const fm = playRef.current.plan ? null : focusOf(playRef.current)
        const tg = hudTarget(run, waypointRef.current, fm?.giver ?? null)
        if (hud.arrow.current) { hud.arrow.current.style.opacity = tg ? '1' : '0'; if (tg) hud.arrow.current.style.transform = `rotate(${-(Math.atan2(tg.x - sim.x, tg.z - sim.z) - sim.heading)}rad)` }
        if (hud.dist.current) hud.dist.current.textContent = tg ? (tg.kind === 'waypoint' && wayLabelRef.current ? `${wayLabelRef.current} · ` : '') + `${metresTo(run, tg)} m` : ''
        if (fm && hud.dist.current && tg?.kind === 'giver') hud.dist.current.textContent = `${namesRef.current[fm.giver] ?? ''} · ${metresTo(run, tg)} m`
        const np = personNear(run)?.id ?? null
        const by = !!ambRef.current && !np && ballYours(ambRef.current, sim)
        if (by !== kickNow) { kickNow = by; setKick(by) }
        if ((np ?? '') !== ph) { ph = np ?? ''; setNearId(np) }
        tick++
        if (hud.map.current && tick % 3 === 0) {
          const c = hud.map.current.getContext('2d'), size = hud.map.current.clientWidth || 80
          if (c) {
            drawMap(c, level, sim, club.skin, size)
            // the givers: who has the next mission (filled), who has a small job (hollow)
            const gv = giversOf(playRef.current), ppl = level.hood!.people
            const list = [...(gv.main ? [gv.main] : []).map(id => ({id, main: true})), ...gv.side.map(id => ({id, main: false}))].flatMap(g => { const p = ppl.find(q => q.id === g.id); return p ? [{x: p.x, z: p.z, main: g.main}] : [] })
            const dpr = hud.map.current.width / size
            c.setTransform(dpr, 0, 0, dpr, 0, 0); c.save(); c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2); c.clip()
            drawGivers(c, size, sim, list, accentRef.current, NAVY); c.restore()
          }
        }
        if (tick % 6 === 0) {
          if (hud.ring.current) hud.ring.current.style.strokeDashoffset = String(RING_LEN * (1 - ringProgress(run)))
          if (hud.clock.current) { hud.clock.current.textContent = clockLabel(clockRef.current); hud.clock.current.dataset.part = dayPart(clockRef.current) }
        }
      }
      const live = playing || isCrane(scr) || scr === 'dialogue'
      // What is not seen is not drawn. Behind a full panel (pause, map, bag, a story card) the street is a still: it is
      // drawn once and kept, so a menu never runs the phone hot. The title's slow crane is drawn every other frame.
      fno++
      if (isFull(scr) || document.hidden) { if (drawn === scr) return; drawn = scr } else { drawn = ''; if (isCrane(scr) && scr !== 'cutscene' && fno % 2) return }
      // the conversation as the picture plays it: who speaks, the line's feeling, the lips while the words are typed
      const tk = scr === 'dialogue' ? talkRef.current : null, tn = tk ? nodeOf(tk.script, tk.id) : null, feel = tn ? feelOf(tn) : null
      const a = ambRef.current
      stage.render(sim, {cam: playing || scr === 'dialogue' ? camRef.current : 'chase', ending: false, endT: 0, outcome: null, intro: 0, brief: isCrane(scr), hood: {job: run.job, scarf: playRef.current.state.keeps.includes('scarf') && wearRef.current, amb: playing || scr === 'dialogue' ? a : null,
        talk: tn && feel && !tk!.script.narration ? {who: tn.who, key: `${tk!.script.who}:${tn.id}:${tn.line}`, mood: feel.mood, gesture: feel.gesture ?? null, you: feel.you, shot: feel.shot, beat: feel.beat ?? null, speak: typingRef.current ? 1 : 0} : null}}, live ? (isCrane(scr) && scr !== 'cutscene' ? Math.min(0.25, real * 2) : real) : 0)
      // street voices: soft captions beside whoever spoke (DOM, placed from the picture)
      const list = playing && a ? a.captions : [], sig = list.map(c => c.id).join(',')
      if (sig !== capSig) { capSig = sig; capsRef.current = list.map(c => ({id: c.id, spot: c.spot, key: c.key})); setCaps(capsRef.current) }
      for (const c of capsRef.current) { const el = capEls.current[c.id], at = el ? stage.captionAt(c.spot) : null; if (el) { el.style.opacity = at?.visible && at.y > 90 ? '1' : '0'; if (at) el.style.transform = `translate(${Math.round(Math.max(84, Math.min((canvasRef.current?.clientWidth ?? 390) - 84, at.x)))}px, ${Math.round(Math.max(120, at.y))}px) translate(-50%, -100%)` } }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', redraw) }
  }, [level, club.skin, handle, sl, setPlay, showNotes, openScript, clockAt])

  /* progress is saved while he plays, and when the page goes away */
  useEffect(() => {
    const id = window.setInterval(() => { if (shellRef.current.screen === 'playing') persist() }, 8000)
    const hide = () => { if (document.visibilityState === 'hidden' && shellRef.current.screen !== 'title' && shellRef.current.screen !== 'boot' && shellRef.current.screen !== 'name' && shellRef.current.screen !== 'intro') persist() }
    document.addEventListener('visibilitychange', hide)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', hide) }
  }, [persist])

  /* the keyboard */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const scr = shellRef.current.screen, t = e.target as HTMLElement | null
      if (e.code === 'Escape') {
        e.preventDefault()
        if (scr === 'intro') finishIntro(); else if (scr === 'cutscene') go({t: 'cutDone'}); else if (scr === 'dialogue') endTalk(); else if (scr === 'story') nextBeat(); else { if (scr === 'playing') persist(); go({t: 'esc'}) }
        return
      }
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (scr === 'playing') {
        keys.current[e.code] = true
        if (e.code === 'KeyV') setCam(c => c === 'chase' ? 'eyes' : 'chase')
        if (e.code === 'KeyE' || e.code === 'Space') { act.current = true; e.preventDefault() }
        if (e.code === 'KeyP') go({t: 'open', to: 'pause'})
        if (e.code === 'KeyM') go({t: 'open', to: 'map'})
        if (e.code === 'KeyB') go({t: 'open', to: 'bag'})
        if (e.code.startsWith('Arrow')) e.preventDefault()
      } else if (scr === 'map' || scr === 'bag' || scr === 'pause') {
        if (e.code === 'KeyM') go(scr === 'map' ? {t: 'back'} : {t: 'open', to: 'map'})
        if (e.code === 'KeyB') go(scr === 'bag' ? {t: 'back'} : {t: 'open', to: 'bag'})
      }
    }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const blur = () => { keys.current = {} }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [go, finishIntro, endTalk, persist, nextBeat])

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => { setGhost(false); stick.current = {id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0}; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setStickAt({x: e.clientX, y: e.clientY, dx: 0, dy: 0}) }
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stick.current.id) return
    let dx = e.clientX - stick.current.ox, dy = e.clientY - stick.current.oy
    const d = Math.hypot(dx, dy), m = 52
    if (d > m) { dx *= m / d; dy *= m / d }
    stick.current.x = dx / m; stick.current.y = dy / m
    setStickAt(s => s ? {...s, dx, dy} : s)
  }
  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => { if (e.pointerId !== stick.current.id) return; stick.current = {id: -1, ox: 0, oy: 0, x: 0, y: 0}; setStickAt(null) }

  /* what the HUD says */
  const run = runRef.current!, job = level.hood!.jobs[0] ?? null
  const stepKey = objIx >= 0 ? level.steps[objIx]?.key : null
  const active = jobState === 'active' && !!stepKey && !!job
  const wayName = waypoint ? w(`hood.place.${waypoint}`) : ''
  // the HUD names what is in front of him: the step of the open mission, or the PERSON who has something for him.
  // Never the next mission's title: he reaches it by walking up and talking (streetTalk.ts), not off a list.
  const focus = play.plan ? null : focusOf(play)
  const openId = play.plan?.split('/')[0] ?? null, openNight = nightOf(openId)
  const stageWord = w(`story.stage.${stageOfAge(play.state.age)}`)
  const kicker = active ? (openNight ? nightLine(openNight) : w('story.active.kicker', {title: w(job!.titleKey), n: String(objIx - job!.from + 1), m: String(job!.steps)}))
    : focus ? w('story.next.kicker', {stage: stageWord, n: String(play.state.age), day: w(`story.day.${play.state.day}`)}) : waypoint ? w('hood.hud.waypoint') : w('hood.kicker')
  const objective = active ? w(stepKey!) : focus ? w('story.next.life', {who: names[focus.giver] ?? w(`hood.who.${focus.giver}`)}) : waypoint ? wayName : w('hood.free')
  const nearPerson = nearId ? w('hood.hud.talk.to', {name: names[nearId] ?? ''}) : null
  const placeName = place ? w(`hood.place.${place}`) : null
  const screen = shell.screen
  const lookV = screen === 'title' || screen === 'name' || screen === 'intro' || screen === 'boot' ? 'title' : isFull(screen) ? 'dim' : 'none'
  const introLines = COLD_OPEN.lines.map(k => w(k)), outroLines = [1, 2].map(n => w(`hood.outro.${n}`))
  const onIntroBeat = (i: number) => { const r = runRef.current!; r.sim.x = 0; r.sim.z = INTRO_Z[i] ?? INTRO_Z[0]!; r.sim.vx = 0; r.sim.vz = 0 }
  const clubHref = `/clubs/${club.id}`
  const talkNode = talk ? nodeOf(talk.script, talk.id) : null

  /* the story's cards */
  const beat = screen === 'story' ? beats[0] ?? null : null
  // a painted Flow plate first, else THE WORKER's universal room or street (Tel Aviv's own streets only for Tel Aviv)
  // the town this club's pictures were painted for, and the people of that part of the world (rule life-flow-art)
  const flowTown = CLUB_TOWN[club.id] ?? null, folk = flowTown ? TOWN_PEOPLE[flowTown] : null
  /** the face of whoever is speaking: his Flow portrait when it has been painted (the mate grows up with the boy), else THE WORKER's */
  const faceOf = (who: string): string | null => {
    const a = play.state.age, as = who === 'dad' ? 'father' : who === 'mate' ? (a >= 19 ? 'man' : a >= 13 ? 'teen' : 'mate') : who === 'kiosk' ? 'kiosk' : who === 'neighbour' ? 'neighbour' : who === 'mum' ? 'mother' : who
    return castFace(flow, folk, as) ?? workerFace(who)
  }
  // the first shirt is the one the club wore the season he was seven (the kit archive's own studio-cut SVG)
  const shirt = kitOfYear(club.things, yearOf(club.born, 7))
  const plateFor = (id: string | null, salt: number) => { const p = pick(flow, {kind: 'story', club: club.id, town: flowTown, hint: id ? PLATE_HINT[id] ?? [id] : [], salt}); return p && flow ? urlOf(flow, p, 1080) : workerPlate(id, club.town) }
  const aerialP = pick(flow, {kind: 'aerial', club: club.id, town: flowTown})
  const aerial = aerialP && flow ? {href: urlOf(flow, aerialP, 1600), world: aerialP.world} : null
  const cardOf = (b: Beat): StoryCardView | null => {
    if (b.k === 'chapter') {
      const n = chapterOf(play.state) + 1, yrs = b.from === null ? 0 : b.to - b.from
      // what somebody remembers of him from a chapter ago (moments.ts)
      const echo = echoFor(play.state, b.next)
      const when = b.from === null ? w('story.begin') : yrs === 1 ? w('story.later.1') : w('story.later.n', {k: w(`story.num.${Math.min(6, yrs)}`)})
      return {kind: 'chapter', kicker: `${w(`story.stage.${b.stage}`)} · ${w('story.chapter', {n: String(n)})}`, title: b.next ? w(`story.m.${b.next}.title`) : w(`story.stage.${b.stage}`), lines: [`${when} ${w('story.age', {n: String(b.to)})}.`, ...(b.from === null || stageOfAge(b.from) !== b.stage ? [w(`story.theme.${b.stage}`)] : []), ...(echo ? [w(`story.moment.${echo.mission}.${echo.id}.later`)] : [])], chips: [], archive: null, plate: plateFor(b.next, n), film: b.from === null ? null : workerBridge(n, club.town), go: w('story.card.continue')}
    }
    if (b.k === 'stage-end') return {kind: 'stage-end', kicker: w(`story.stage.${b.stage}`), title: w(`story.stage-end.${b.stage}`), lines: [w(b.stage === 'adult' ? 'story.stage-end.last' : 'story.stage-end.line')], chips: [], archive: null, plate: plateFor('the-box', 0), go: w('story.card.go')}
    if (b.k === 'paper') {
      // the paper the morning after: its headline is the archive row's own; his name is in the crowd photo's caption
      const s8 = slateOf(b.night)
      return {kind: 'aftermath', kicker: w('feel.paper.kicker'), title: s8?.result ?? b.night.title, lines: [w('feel.paper.caption', {name: shell.name || hoodWord('hood.name.default'), age: String(b.age)}), w('feel.paper.line')], chips: [],
        archive: s8 ? {kicker: w('story.archive.paper'), date: s8.date ? slateDate(s8.date) : null, result: s8.result, title: s8.title, titleLocale: s8.titleLocale, source: s8.publisher ? w('story.archive.source', {publisher: s8.publisher}) : null} : null, plate: plateFor(b.mission, 2), paper: WORKER_PAPER, go: w('story.card.continue')}
    }
    if (b.k === 'recap') {
      // the stage looked back on: his name and age, the ways he chose, the Box, who stood by him, the Heart
      const r = recapOf(play.state, b.stage as 'child' | 'teen' | 'young' | 'adult')
      const ways = r.ways.map(x => w(`story.m.${x.mission}.a.${x.approach}`)).filter(x => !x.startsWith('story.')).slice(-4)
      return {kind: 'stage-end', kicker: w('feel.recap.kicker', {stage: w(`story.stage.${b.stage}`).toLowerCase()}), title: w('feel.recap.title', {name: shell.name || hoodWord('hood.name.default'), age: String(r.age)}),
        lines: [`${w('feel.recap.ways')}: ${ways.join(' · ')}`, w('feel.recap.heart', {n: String(r.heart)}), ...(r.slips ? [w('feel.recap.slips', {n: String(r.slips)})] : [])],
        chips: [...r.keeps.map(k => ({label: w('feel.recap.box'), value: w(`story.keep.${k}`), tone: 'box' as const})), ...r.people.map(x => ({label: w('feel.recap.people'), value: names[x.who] ?? w(`hood.who.${x.who}`), tone: 'up' as const}))],
        archive: null, plate: plateFor('the-box', 3), go: w('story.card.continue')}
    }
    if (b.k !== 'aftermath') return null
    const d = b.delta, sign = (n: number) => (n > 0 ? `+${n}` : String(n))
    const chips: StoryCardView['chips'] = [
      ...d.bonds.map(x => ({label: names[x.who] ?? w(`hood.who.${x.who}`), value: sign(x.n), tone: x.n > 0 ? 'up' as const : 'down' as const})),
      ...(d.money ? [{label: w('story.delta.money'), value: sign(d.money), tone: d.money > 0 ? 'up' as const : 'down' as const}] : []),
      ...(d.rep ? [{label: w('story.delta.rep'), value: sign(d.rep), tone: d.rep > 0 ? 'up' as const : 'down' as const}] : []),
      ...d.kept.map(k => ({label: w('story.delta.kept'), value: w(`story.keep.${k}`), tone: 'box' as const})),
    ]
    const sl8 = b.night ? slateOf(b.night) : null
    const archive = b.night && sl8 ? {kicker: w(b.approach === 'radio' || b.approach === 'next-door' ? 'story.archive.radio' : 'story.archive.paper'), date: sl8.date ? slateDate(sl8.date) : null, result: sl8.result, title: sl8.title, titleLocale: sl8.titleLocale, source: sl8.publisher ? w('story.archive.source', {publisher: sl8.publisher}) : null} : null
    const art = d.kept.map(k => (k === 'shirt' ? shirt?.src : null) ?? workerProp(`keep:${k}`)).find(Boolean) ?? workerDoc(b.mission, club.town)
    return {kind: 'aftermath', kicker: w('story.aftermath'), title: w(`story.m.${b.mission}.title`), lines: [w(`story.m.${b.mission}.aftermath`), ...(momentOf(play.state, b.mission) ? [w(`story.moment.${b.mission}.${momentOf(play.state, b.mission)}.after`)] : []), ...(chips.length ? [] : [w('story.delta.none')])], chips, archive, plate: plateFor(b.mission, 1), art, paper: archive ? WORKER_PAPER : null, go: w('story.card.continue')}
  }
  const watchAns = beat?.k === 'watch' ? watchForNight(club.id, beat.night) : null
  const giverMarks: MapGiver[] = (() => { const g = giversOf(play), ppl = level.hood!.people; return [...(g.main ? [{id: g.main, kind: 'main' as const}] : []), ...g.side.map(id => ({id, kind: 'side' as const}))].flatMap(x => { const p = ppl.find(q => q.id === x.id); return p ? [{id: x.id, x: p.x, z: p.z, kind: x.kind, label: `${names[x.id] ?? ''} · ${w(x.kind === 'main' ? 'story.map.next' : 'story.map.side')}`, letter: x.kind === 'main' ? '!' : '·'}] : [] }) })()

  return (
    <div className={css.lgRoot} style={{'--lg-brand': brand, '--lg-accent': accent, '--lg-on-accent': onAccent} as React.CSSProperties} role="application" aria-label={w('hood.brand')} data-life="hood" data-screen={screen} data-job={jobState} data-reduced={reducedEff}>
      <canvas ref={canvasRef} className={css.lgCanvas} data-look={lookV} aria-hidden="true" />
      <div className={css.lgVeil} data-v={screen === 'dialogue' ? 'talk' : lookV === 'title' ? 'title' : 'none'} />
      {/* a conversation is a scene: the frame closes to a film's shape while somebody speaks */}
      <div className={css.lgBars} data-on={screen === 'dialogue' || screen === 'cutscene'} aria-hidden="true"><i /><i /></div>
      {/* the documentary's slate: where, when, and that it happened */}
      {slate && screen === 'playing' && <p className={css.lgSlate} key={slate.id} role="status" data-life="hood-slate"><b>{slate.place}</b><span>{slate.when}</span><i>{w('hood.true')}</i></p>}
      <Hud
        w={w} refs={hud} hidden={screen !== 'playing'} touch={touch} cam={cam} sprintOn={sprintOn} ghost={coach && ghost} onCoachOk={() => setCoach(false)}
        kicker={kicker} objective={objective} free={!active} hasTarget={!!hudTarget(run, waypoint, focus?.giver ?? null)}
        place={placeName} banner={banner} near={kick ? w('hood.hud.kick') : nearPerson ?? (feelHudV?.find && run.level.searches.some((q, i) => q.for === run.sim.step && !run.sim.searched[i] && Math.hypot(q.x - run.sim.x, q.z - run.sim.z) < 1.15) ? w('feel.find.search') : null)} cash={play.state.money} stickAt={stickAt}
        onMap={() => go({t: 'open', to: 'map'})} onPause={() => { persist(); go({t: 'open', to: 'pause'}) }} onBag={() => go({t: 'open', to: 'bag'})} onCam={() => setCam(c => c === 'chase' ? 'eyes' : 'chase')}
        onTalk={() => { act.current = true }} onSprint={setSprintOn}
        feel={play.plan ? feelHudV : null} voice={voice} heart={heartOf(play.state)}
        stick={{down: onStickDown, move: onStickMove, up: onStickUp}}
      />
      {found && screen === 'playing' && (
        <div className={css.lgFound + ' z-[40]'} role="status" key={found.id} data-life="hood-card">
          <span className={css.lgFoundCard}>{found.src ? <img src={found.src} alt="" decoding="async" /> : found.kit ? <img src={found.kit} alt="" data-kit="true" decoding="async" /> : null}</span>
          <span className={css.lgFoundText}><small>{w('hood.card.found')}</small><b>{found.name}</b><i>{found.code}{found.code ? ' · ' : ''}{w('hood.card.years', {from: String(found.from), to: String(found.to)})}</i></span>
        </div>
      )}
      {screen === 'title' && <Title w={w} mark={mark} crest={club.things?.crest ?? null} club={club.skin.name} clubHref={clubHref} hasSave={shell.hasSave} saveName={savedName} onContinue={doContinue} onNew={() => go({t: 'new'})} onSettings={() => go({t: 'open', to: 'settings'})} />}
      {screen === 'name' && <NameEntry w={w} clean={cleanName} onGo={startNew} onBack={() => go({t: 'esc'})} />}
      {screen === 'intro' && <Cinematic lines={introLines} w={w} reduced={reducedEff} ms={COLD_OPEN.ms} onBeat={onIntroBeat} onDone={finishIntro} />}
      {screen === 'cutscene' && <Cinematic lines={outroLines} w={w} reduced={reducedEff} ms={3000} onDone={() => go({t: 'cutDone'})} />}
      {screen === 'dialogue' && talkNode && <Talk portrait={talkNode.who} face={talk!.script.narration ? null : faceOf(talkNode.who)} key={`${talk!.script.who}-${talkNode.id}`} node={talkNode} name={talk!.script.narration ? w('story.complication') : names[talkNode.who] ?? ''} w={w} reduced={reducedEff} onGo={onGo} onChoose={onChoose} onLeave={endTalk} onTyping={v => { typingRef.current = v }} />}
      {screen === 'playing' && caps.length > 0 && <div className={css.lgCaps} role="log" aria-label={w('hood.amb.label')}>{caps.map(c => <p key={c.id} ref={el => { capEls.current[c.id] = el }} className={css.lgCap}>{w(c.key)}</p>)}</div>}
      {screen === 'pause' && <Pause w={w} mark={mark} crest={club.things?.crest ?? null} club={club.skin.name} name={shell.name} onResume={() => go({t: 'resume'})} onMap={() => { setMapKey(k => k + 1); go({t: 'open', to: 'map'}) }} onBag={() => go({t: 'open', to: 'bag'})} onSettings={() => go({t: 'open', to: 'settings'})} onHelp={() => go({t: 'open', to: 'help'})} onQuit={() => { persist(); setSavedName(shell.name); go({t: 'quit'}) }} />}
      {screen === 'settings' && <Settings w={w} s={settings} quality={qualityEff} onChange={changeSettings} onBack={() => go({t: 'back'})} />}
      {screen === 'help' && <Help w={w} onBack={() => go({t: 'back'})} />}
      {screen === 'map' && <MapScreen w={w} run={run} waypoint={waypoint} wayLabel={wayName} accent={accent} mapKey={mapKey} reduced={reducedEff} givers={giverMarks} aerial={aerial} onWaypoint={id => { setWaypoint(id); waypointRef.current = id; persist() }} onClose={() => go({t: 'back'})} onTab={() => go({t: 'open', to: 'bag'})} />}
      {screen === 'bag' && <BagScreen w={w} items={bagOf({batteries: 0, dadsScarf: false}, wear, {keeps: play.state.keeps, carried: carried(run, sl, play)}).map(i => ({...i, art: (i.id === 'keep:shirt' ? shirt?.src : null) ?? workerProp(i.id), ...(i.id === 'keep:shirt' && shirt ? {note: w('hood.bag.shirt', {season: shirt.season})} : {})}))} cards={cardsHeld(club.things, cards)} cardsAll={club.things?.cards.length ?? 0} accent={accent} second={accentFor({...club.skin, p: club.skin.s, s: club.skin.p}).accent} onWear={v => { setWear(v); wearRef.current = v; persist() }} onClose={() => go({t: 'back'})} onTab={() => go({t: 'open', to: 'map'})} />}
      {beat?.k === 'watch' && (watchAns
        ? <div className={css.lgWatch} data-life="hood-watch"><WatchCard highlights={watchAns.highlights} more={watchAns.moreHighlights} ourFilm={watchAns.ourFilm} ourFilmFit={watchAns.ourFilmFit} slate={slateOf(beat.night)} accent={accent} onContinue={nextBeat} /></div>
        : <StoryCard view={cardOf({k: 'aftermath', mission: beat.mission, night: beat.night, delta: {bonds: [], money: 0, rep: 0, kept: []}, approach: ''})!} onGo={nextBeat} />)}
      {beat && beat.k !== 'watch' && cardOf(beat) && <StoryCard key={`${beat.k}-${beats.length}`} view={cardOf(beat)!} onGo={nextBeat} reduced={reducedEff} />}
      {!bootGone && <Boot w={w} out={screen !== 'boot'} />}
      {error && <div className={css.lgErr}><section className={css.lgCard} role="alertdialog" aria-label={w('hood.boot.err')}><h2>{w('hood.brand')}</h2><p>{w('hood.err')}</p></section></div>}
    </div>
  )
}
