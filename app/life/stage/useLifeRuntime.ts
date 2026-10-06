'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

import type { HistoricalAnchor } from '@/lib/life/anchors'
import { CONSEQUENCE_KICKER_HE } from '@/lib/life/consequence'
import type { CutsceneOutcome } from '@/lib/life/cutscenes'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { loadLife } from '@/lib/life/engine'
import { lifeHasBegun } from '@/lib/life/opening'
import { LifeAudio, type AmbienceKey } from '@/lib/life/runtime/audio'
import { LifeBus, type HudState, type LifeBusEvents } from '@/lib/life/runtime/bus'
import type { LifeRuntime } from '@/lib/life/runtime/game'
import { lifeStore } from '@/lib/life/save'
import { packetReplay } from '@/lib/life/stickers'
import type { Achievement } from '@/lib/life/achievements'
import type { LifeState } from '@/lib/life/types'
import type { MechanicCatalog } from '@/lib/mechanics/types'

/**
 * הגשר, מצד המעטפת — the bus, the synthesiser, the Phaser instance, and every sentence the
 * three of them have to say, in one hook.
 *
 * This is deliberately ONE seam and not the four it looks like, and the reason is the reason
 * the whole boundary exists. `bus.ts` calls itself the one channel between the canvas and the
 * DOM: the runtime speaks in intents and the shell decides what they look like. A channel with
 * one end in three different effects is not a channel. Everything below happens inside a
 * single `useEffect` — the bus is constructed, the audio is constructed, forty listeners are
 * attached, and only then, asynchronously, is the game created and pointed at the same bus —
 * because that order is load-bearing. A listener attached one effect later is a `place` event
 * missed on the first room of a life, and a teardown in a different order is a scene emitting
 * into a bus that has already been cleared.
 *
 * So the split here is not by TOPIC (sound over here, overlays over there, the game over
 * there) but by DIRECTION. Everything in this file is the game talking to React. The things
 * React says back live elsewhere: what a thumb does is `useLifeInput`, what a player opens is
 * `useLifeSheets`, what the shell writes into the log is `useLifeLedger`. That line can be
 * held. A line drawn through the middle of the subscription block cannot.
 *
 * What comes out is a large typed object, and that is honest rather than unfortunate: the
 * shell really does draw thirty-odd different things this game can put on a glass, and the
 * alternative — a reducer, a store, a context — would be a second state system sitting between
 * a bus that already is one and a React tree that already re-renders correctly. The brief's
 * own rule for the split was "do not move Phaser world state into React"; a store would be
 * exactly that, one indirection later.
 *
 * One consequence of handing them in: they now appear in the dependency arrays below, where
 * before they were component-local and the linter left them alone. Nothing re-runs because of
 * it — a `useRef` box keeps one identity for the life of the component — and naming them is
 * cheaper than a file full of suppressions that would one day hide a real missing dependency.
 *
 * The audio, the engine, the bus and the runtime are handed IN as refs rather than created
 * here, because the shell's JSX holds them too — a dialogue box that advances the runtime, a
 * shop till that dispatches to the engine, an album that emits on the bus. One canonical
 * handle each, owned by `LifeStage`, borrowed by whoever needs it.
 */

const EMPTY_HUD: HudState = { clock: '', date: '', agorot: 0, showMoney: false, energy: 100, showEnergy: false, place: '', objective: null, year: 1986, scene: 'bedroom', hint: '', waitingHe: null }
/** the decade the glass is dressed for — type and texture follow it (`app/globals.css`) */
export const decadeOf = (year: number) => (year >= 2000 ? '00s' : year >= 1990 ? '90s' : '80s')
/**
 * a preference about the glass, not about the life — so it is not in the save.
 *
 * It is written as `on`/`off` since 16.9.2026, and `0`/`1` are still READ because that is
 * what is on the devices of everyone who ever opened the menu: `0` meant shown and `1`
 * meant hidden, which is the inversion that made flipping the DEFAULT dangerous rather
 * than a one-character edit. Anything else — absent, corrupt, a value from a build that
 * does not exist yet — falls to the default, and the default is now SHOWN.
 */

export function useLifeRuntime({
  holder,
  runtime,
  engineRef,
  busRef,
  audio,
  anchor,
  prologueAnchor,
  anchors,
  catalog,
}: {
  /** the box the canvas is parented into — the shell owns it, Phaser only fills it */
  holder: MutableRefObject<HTMLDivElement | null>
  runtime: MutableRefObject<LifeRuntime | null>
  engineRef: MutableRefObject<Awaited<ReturnType<typeof loadLife>> | null>
  busRef: MutableRefObject<LifeBus | null>
  audio: MutableRefObject<LifeAudio | null>
  anchor: HistoricalAnchor
  prologueAnchor: HistoricalAnchor
  /** every chapter's anchor, by era key — resolved on the server like the two above */
  anchors: Record<string, HistoricalAnchor>
  /** what the archive holds before each year, for the activities — resolved on the server too */
  catalog: MechanicCatalog
}) {
  const [ready, setReady] = useState(false)
  const [hud, setHud] = useState<HudState>(EMPTY_HUD)
  const [dialogue, setDialogue] = useState<LifeBusEvents['dialogue']>(null)
  const [prompt, setPrompt] = useState<LifeBusEvents['prompt']>(null)
  const [teach, setTeach] = useState<LifeBusEvents['teach']>(null)
  /** the pre-match wardrobe (delta 92) — opened by the world, closed only by a choice */
  const [ritual, setRitual] = useState<LifeBusEvents['ritual']>(null)
  const [toast, setToast] = useState<LifeBusEvents['toast']>(null)
  const toastNow = useRef<LifeBusEvents['toast']>(null)
  const toastQueue = useRef<NonNullable<LifeBusEvents['toast']>[]>([])
  const [sound, setSound] = useState(true)
  const [ending, setEnding] = useState<LifeBusEvents['ending']>(null)
  const [retry, setRetry] = useState<LifeBusEvents['retry']>(null)
  const [match, setMatch] = useState<LifeBusEvents['match']>(null)
  const [doc, setDoc] = useState<LifeBusEvents['doc']>(null)
  /** הפתק — the note he sorts what he has heard on (`lib/life/noteBoards.ts`) */
  const [board, setBoard] = useState<LifeBusEvents['board']>(null)
  const [box, setBox] = useState(false)
  const [book, setBook] = useState<LifeBusEvents['book']>(null)
  const [cutscene, setCutscene] = useState<LifeBusEvents['cutscene']>(null)
  const [finale, setFinale] = useState<LifeBusEvents['finale']>(null)
  const [coda, setCoda] = useState<LifeBusEvents['coda']>(null)
  const [gaugeBeat, setGaugeBeat] = useState<LifeBusEvents['gauge'] | null>(null)
  const [love, setLove] = useState<LifeBusEvents['love']>({ value: 0, bump: 0 })
  /** a flash frame on the biggest beats — a goal's roar, a final whistle */
  const [flash, setFlash] = useState<{ tone: 'white' | 'red'; nonce: number }>({ tone: 'red', nonce: 0 })
  const [titleCard, setTitleCard] = useState<LifeBusEvents['card']>(null)
  const [shirt, setShirt] = useState<LifeBusEvents['shirt']>(null)
  /** שני משחקי הכסף — the Toto slip and the coin in the alley (5.9.2026) */
  const [toto, setToto] = useState<LifeBusEvents['toto']>(null)
  /** פעילות — a gate game opened from a room, over the paused world (`lib/life/activities.ts`) */
  const [mechanic, setMechanic] = useState<LifeBusEvents['mechanic']>(null)
  /** the bag asked for from the bedroom — the shell opens the same card ☰ does */
  const [bagAsked, setBagAsked] = useState(0)
  const [coin, setCoin] = useState<LifeBusEvents['coin']>(null)
  const [penalty, setPenalty] = useState<LifeBusEvents['penalty']>(null)
  const [hoops, setHoops] = useState<LifeBusEvents['hoops']>(null)
  /** המגרש — the 3D football reconstruction, opened from a beat and closed by its own card */
  const [pitch, setPitch] = useState<LifeBusEvents['pitch']>(null)
  const [shop, setShop] = useState<LifeBusEvents['shop']>(null)
  /**
   * המנוי — the season ticket, announced between chapters and sold at one window.
   *
   * It carries the season ID and nothing else: everything on the card is read out of
   * `lib/life/subscription.ts` by the card itself, so the bus never carries a price
   * (rule 59 — one runtime concept, one canonical file). The world stops behind it for
   * the same reason the shop does: a decision about a whole year is not something to take
   * while a clock is running at you.
   */
  const [season, setSeason] = useState<LifeBusEvents['season']>(null)
  /** the state the season card is drawn against, re-read after a renewal */
  const [seasonState, setSeasonState] = useState<LifeState | null>(null)
  /** האלבום — open over a stopped world, drawn from a snapshot like the profile is */
  const [album, setAlbum] = useState<LifeBusEvents['album']>(null)
  const [albumState, setAlbumState] = useState<LifeState | null>(null)
  const [packet, setPacket] = useState<LifeBusEvents['packet']>(null)
  /* what came out of the red box, waiting behind whatever is already on screen */
  const [kept, setKept] = useState<LifeBusEvents['kept']>(null)
  /* the day's next beat is waiting for the clock and the room has gone quiet */
  const [freeTime, setFreeTime] = useState<LifeBusEvents['freeTime']>(null)
  const [cast, setCast] = useState<LifeBusEvents['cast']>(null)
  const [film, setFilm] = useState<LifeBusEvents['film']>(null)
  /** the state the shop screen is drawn against, re-read after every purchase */
  const [shopState, setShopState] = useState<LifeState | null>(null)
  const [pano, setPano] = useState<LifeBusEvents['pano']>(null)
  const [route, setRoute] = useState<LifeBusEvents['route']>(null)
  /**
   * התור של ההישגים — a queue that lives on the engine, mirrored into React.
   *
   * `LifeEngine` gains rows on `earned` inside `dispatch` and hands them back one at a
   * time; the shell is the only thing that can draw one, so it subscribes to the engine
   * rather than to the bus. One purchase can make two rows true at once and two cards at
   * once is a list, so `AchievementQueue` shows the head and the rest wait — which is why
   * the whole array is mirrored and not just its first element.
   */
  const [earned, setEarned] = useState<readonly Achievement[]>([])
  const [tunnel, setTunnel] = useState<LifeBusEvents['tunnel']>(null)
  /** the plate that names a room as you step into it — not on the first room of a session */
  const [placeCard, setPlaceCard] = useState<{ titleHe: string; subHe: string | null } | null>(null)
  const lastPlace = useRef<string | null>(null)
  const [card, setCard] = useState<HistoricalAnchor | null>(null)
  const [controls, setControls] = useState(true)
  /** (delta 93) a beat can take the HUD off the glass for a moment — the demolition */
  const [hudOn, setHudOn] = useState(true)
  const [touch, setTouch] = useState(false)
  const [persisted, setPersisted] = useState(true)
  /**
   * המסגרת — where the painting ends, in CSS pixels; 0 means "it does not end".
   *
   * The world scene fills the glass and reports 0; the street-ball minigame still frames
   * its pitch and reports the height of the strip it occupies. Everything below lays out
   * from this one number: a framed picture gets its dialogue and deck UNDER it, a full-bleed
   * one gets them floating OVER it.
   */
  const [frame, setFrame] = useState(0)
  const [stage, setStage] = useState(0)
  /** the state the map and the reveal draw from — a snapshot taken when they open */
  const [mapState, setMapState] = useState<LifeState | null>(null)
  const [reveal, setReveal] = useState<LifeBusEvents['reveal']>(null)
  /**
   * הגוייסטיק על המסך — ON by default, because Maor said so in those words (16.9.2026):
   * *"הגוייסטיק והמקשים מחויביים להיות על המסך."*
   *
   * The full-bleed pass turned this off on the reasoning that the picture is the
   * controller — touch a place and the boy walks — and that reasoning is still true and is
   * still how the game plays. What it got wrong is that a control nobody can SEE is not a
   * control, which is the same sentence rule 41 is built out of and the same one that put
   * housekeeping into ☰. A player who has never met this game cannot discover a tap-to-walk
   * world from a blank picture, and the console was three taps deep in a menu.
   *
   * So the hardware is on the glass and the toggle stays for whoever wants the painting
   * clean — the opposite way round from where it was, which is the only part that changed.
   */
  /**
   * הפתיח — five pictures before the game, once per sitting.
   *
   * `null` while we have not yet asked (the server render, and the first paint), so the
   * sequence never flashes on for a frame before being told it has already played.
   * `sessionStorage` rather than the save file: a reload during one sitting has already
   * seen it, and a player who comes back next week is opening this game again. It also
   * keeps the opening out of the append-only life log, which records what the CHILD did.
   */
  const [opening, setOpening] = useState<boolean | null>(null)

  /**
   * העשור לאוזן — the street is coloured by the year the life is in (`audio.setDecade`).
   *
   * One recording, filtered: 1984 has less top end and a tighter bottom than 2000, which
   * is true of the street and not of the tape. It rides on the HUD's year because that is
   * the one number in the shell that is always the life's own, and it is idempotent — the
   * audio ignores a decade it is already in.
   */
  useEffect(() => {
    audio.current?.setDecade(decadeOf(hud.year))
  }, [audio, hud.year])

  // --- boot -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    const bus = new LifeBus()
    busRef.current = bus
    const unsubscribe: Array<() => void> = []

    setPersisted(lifeStore.usable())
    setTouch(
      typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window),
    )

    // --- the sound -------------------------------------------------------------------
    const sfx = new LifeAudio()
    audio.current = sfx
    setSound(!sfx.muted)
    const wake = () => sfx.wake()
    window.addEventListener('pointerdown', wake, { passive: true })
    window.addEventListener('keydown', wake)
    unsubscribe.push(() => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    })
    unsubscribe.push(
      bus.on('sound', (event) => {
        if (event.kind === 'step') sfx.step(event.surface)
        else if (event.kind === 'door') sfx.door()
        else if (event.kind === 'whistle') {
          sfx.whistle(event.blasts)
          // three blasts is the end of something — one white frame, like a cut to black
          if (event.blasts >= 3) setFlash((f) => ({ tone: 'white', nonce: f.nonce + 1 }))
        } else if (event.kind === 'roar') {
          sfx.roar(event.big ?? 1)
          // the big roars — a goal, the buzzer — get one frame of red, like a cut to the crowd
          if ((event.big ?? 1) >= 2) setFlash((f) => ({ tone: 'red', nonce: f.nonce + 1 }))
        } else if (event.kind === 'radio') sfx.radioOn(event.on)
        else if (event.kind === 'crowd') sfx.crowd(event.state)
        else if (event.kind === 'derby') sfx.setDerby(event.on)
        else if (event.kind === 'listen') sfx.listen(event.weight)
        else if (event.kind === 'sample') sfx.play(event.key, { ...(event.level !== undefined ? { level: event.level } : {}), ...(event.delayMs !== undefined ? { delayMs: event.delayMs } : {}) })
      }),
    )

    unsubscribe.push(bus.on('hud', setHud))
    unsubscribe.push(
      bus.on('dialogue', (value) => {
        setDialogue(value)
        sfx.duck(Boolean(value))
        if (value) sfx.page()
      }),
    )
    unsubscribe.push(
      bus.on('prompt', (value) => {
        setPrompt(value)
        if (value) sfx.tick()
      }),
    )
    unsubscribe.push(bus.on('teach', setTeach))
    unsubscribe.push(bus.on('ritual', setRitual))
    unsubscribe.push(
      bus.on('toast', (value) => {
        // a reward or a price ("הכרת", "תוצאה") waits its turn behind the line on screen;
        // a plain line replaces whatever is there — a sentence, not a notification centre
        if (value && value.kickerHe && toastNow.current) {
          if (toastQueue.current.length < 3) toastQueue.current.push(value)
          return
        }
        if (!value) toastQueue.current = []
        toastNow.current = value
        setToast(value)
        if (value?.art) sfx.thud()
        if (value?.kickerHe === CONSEQUENCE_KICKER_HE) sfx.play('gauge-down', { bus: 'ui', level: 0.5 })
        else if (value?.kickerHe) sfx.play('gauge-up', { bus: 'ui', level: 0.45 })
      }),
    )
    unsubscribe.push(
      bus.on('ending', (value) => {
        setEnding(value)
        if (value) sfx.play('ending', { level: 0.7 })
      }),
    )
    unsubscribe.push(bus.on('retry', setRetry))
    unsubscribe.push(bus.on('match', setMatch))
    unsubscribe.push(
      bus.on('doc', (value) => {
        setDoc(value)
        if (value) sfx.play('box-item', { bus: 'ui', level: 0.6 })
        sfx.duck(Boolean(value))
      }),
    )
    unsubscribe.push(
      bus.on('box', (value) => {
        setBox(value)
        // the lid — the same handled-object sound a kept thing gets, and the world waits
        if (value) sfx.play('box-item', { bus: 'ui', level: 0.7 })
        sfx.duck(value)
        runtime.current?.pause(value)
      }),
    )
    unsubscribe.push(
      bus.on('book', (value) => {
        setBook(value)
        // paper, not a UI panel: the same soft handling sound a kept object gets
        if (value) sfx.play('box-item', { bus: 'ui', level: 0.5 })
        // and the street steps back while somebody is reading, the way it does for a line
        sfx.duck(Boolean(value))
      }),
    )
    unsubscribe.push(bus.on('cutscene', setCutscene))
    unsubscribe.push(
      bus.on('finale', (value) => {
        setFinale(value)
        if (value) sfx.play('finale-hit', { level: 0.8, jitter: 0.02 })
      }),
    )
    unsubscribe.push(
      bus.on('coda', (value) => {
        setCoda(value)
        if (value) sfx.play('stage-sting', { bus: 'ui', level: 0.6, jitter: 0.02 })
      }),
    )
    unsubscribe.push(
      bus.on('reveal', (value) => {
        if (value) {
          runtime.current?.pause(true)
          setMapState(runtime.current?.snapshot().state ?? null)
          if (!sfx.play('reveal', { bus: 'ui', level: 0.6, jitter: 0.02 })) sfx.thud()
        }
        setReveal(value)
      }),
    )
    unsubscribe.push(
      bus.on('gauge', (changes) => {
        setGaugeBeat(changes)
        // one blip per beat, not per number: up if the meter that matters went up
        const lead = changes.find((c) => c.id === 'love') ?? changes[0]
        if (lead) sfx.play(lead.delta >= 0 ? 'gauge-up' : 'gauge-down', { bus: 'ui', level: 0.4, delayMs: 120 })
        if (changes.some((c) => c.id === 'love')) sfx.play('heart', { bus: 'ui', level: 0.5, delayMs: 60 })
      }),
    )
    unsubscribe.push(bus.on('love', setLove))
    unsubscribe.push(
      bus.on('shirt', (value) => setShirt(value)),
      bus.on('toto', (value) => {
        setToto(value)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('mechanic', (value) => {
        setMechanic(value)
        runtime.current?.pause(Boolean(value))
        if (value) sfx.play('box-item', { bus: 'ui', level: 0.5 })
      }),
      bus.on('bag', (value) => {
        if (value) setBagAsked((n) => n + 1)
      }),
      bus.on('coin', (value) => {
        setCoin(value)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('board', (value) => {
        setBoard(value)
        runtime.current?.pause(Boolean(value))
        if (value) sfx.play('box-item', { bus: 'ui', level: 0.5 })
      }),
      bus.on('penalty', (value) => {
        setPenalty(value)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('hoops', (value) => {
        setHoops(value)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('pitch', (value) => {
        setPitch(value)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('cast', (value) => setCast(value)),
      bus.on('film', setFilm),
      bus.on('shop', (value) => {
        setShop(value)
        setShopState(value ? engineRef.current?.state ?? null : null)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('season', (value) => {
        setSeason(value)
        setSeasonState(value ? engineRef.current?.state ?? null : null)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('album', (value) => {
        setAlbum(value)
        setAlbumState(value?.open ? engineRef.current?.state ?? null : null)
        runtime.current?.pause(Boolean(value?.open))
        // paper, not a panel: the album is handled like the booklet and the red box
        if (value?.open) sfx.play('box-item', { bus: 'ui', level: 0.5 })
        sfx.duck(Boolean(value?.open))
      }),
      bus.on('packet', (value) => {
        setPacket(value)
        runtime.current?.pause(Boolean(value))
      }),
      bus.on('freeTime', setFreeTime),
      bus.on('kept', (value) => {
        // queued rather than shown: the packet that closed the page is still open, and
        // two overlays at once is how a reveal turns into a pile-up
        setKept(value)
        if (value) runtime.current?.pause(true)
      }),
      bus.on('card', (value) => {
        setTitleCard(value)
        // a chapter card with a year on it is a year turning; a room card is a stamp
        if (value?.art || value?.fromYear) sfx.play('year-turn', { level: 0.7, jitter: 0.02 })
        else if (value) sfx.thud()
      }),
    )
    unsubscribe.push(bus.on('pano', setPano))
    unsubscribe.push(bus.on('route', setRoute))
    unsubscribe.push(
      bus.on('tunnel', (value) => {
        setTunnel(value)
        if (value) sfx.setAmbience('tunnel')
      }),
    )
    unsubscribe.push(
      bus.on('place', (place) => {
        // The first room of a session is named by the HUD alone; every door after it gets
        // the plate. Same room twice in a row (a scene restart) is not a door.
        if (lastPlace.current && lastPlace.current !== place.id) {
          setPlaceCard({ titleHe: place.title, subHe: null })
        }
        lastPlace.current = place.id
        sfx.setAmbience((place.ambience as AmbienceKey | undefined) ?? (place.id === 'prologue' ? 'stadium' : 'interior'))
      }),
    )
    unsubscribe.push(bus.on('controls', (value) => setControls(value.visible)))
    unsubscribe.push(bus.on('hudVisible', (value) => setHudOn(value.visible)))
    unsubscribe.push(bus.on('anchor', (value) => setCard(value.showing ? value.anchor : null)))
    unsubscribe.push(bus.on('frame', (value) => setFrame(value.picture)))

    void (async () => {
      const [engine, module] = await Promise.all([
        loadLife(DEFAULT_IDENTITY, 1986),
        import('@/lib/life/runtime/game'),
      ])
      if (cancelled || !holder.current) return
      // The opening is for a life that has not begun. A save that has been lived in —
      // any room entered, any chapter — opens where it was, with no film in front of it.
      setOpening(!lifeHasBegun(engine.log(), engine.state.flags))
      engineRef.current = engine
      // The engine notifies on every dispatch; `earned` is a new array whenever it changes,
      // so React re-renders exactly when a row is gained or drained and never in between.
      unsubscribe.push(engine.subscribe(() => setEarned(engine.earned)))
      runtime.current = module.createLifeGame({
        parent: holder.current,
        engine,
        bus,
        anchor,
        prologueAnchor,
        anchors,
        catalog,
      })
      const box = holder.current.getBoundingClientRect()
      runtime.current.resize(box.width, box.height)
      setStage(box.height)
      setReady(true)
      // מעטפה ששולמה ולא נפתחה (§21.5): a reload between the charge and the reveal plays the
      // reveal again — the money and the cards are already in the save, only the tear is owed
      const owed = packetReplay(engine.state)
      if (owed) {
        setPacket(owed)
        // the world waits behind the envelope, as it does after a purchase — once the room exists
        window.setTimeout(() => runtime.current?.pause(true), 1200)
      }
    })()

    return () => {
      cancelled = true
      for (const off of unsubscribe) off()
      bus.clear()
      runtime.current?.destroy()
      runtime.current = null
    }
  }, [anchor, prologueAnchor, anchors, catalog, audio, busRef, engineRef, holder, runtime])

  // --- the shell owns the box -------------------------------------------------------
  useEffect(() => {
    const node = holder.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      runtime.current?.resize(entry.contentRect.width, entry.contentRect.height)
      setStage(entry.contentRect.height)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [holder, ready, runtime])

  // --- a toast is a sentence, not a notification centre ------------------------------
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      const next = toastQueue.current.shift() ?? null
      toastNow.current = next
      setToast(next)
    }, toast.art ? 3600 : toast.kickerHe ? 2200 : 2600)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!placeCard) return
    const timer = setTimeout(() => setPlaceCard(null), 1700)
    return () => clearTimeout(timer)
  }, [placeCard])

  // A title card holds for as long as it was told to, and then it is simply gone.
  useEffect(() => {
    if (!titleCard) return
    const timer = setTimeout(() => setTitleCard(null), titleCard.ms)
    return () => clearTimeout(timer)
  }, [titleCard])

  /**
   * The film reporting back. Stable, and it must be: `HistoricalCutscene` calls it from
   * its own unmount, so a callback that changed identity would end the cutscene every
   * time this shell re-rendered — which it does on every line of dialogue.
   */
  /**
   * נקרא, נסגר. The card is dismissed by the player, so the row leaves the ENGINE's queue
   * and the mirror follows — draining React alone would put it back on the next dispatch.
   */
  const dismissEarned = useCallback(
    (id: string) => {
      const engine = engineRef.current
      if (!engine) return
      engine.drainEarned(id)
      setEarned(engine.earned)
    },
    [engineRef],
  )

  const endCutscene = useCallback((outcome: CutsceneOutcome) => {
    setCutscene(null)
    runtime.current?.endCutscene(outcome)
  }, [runtime])

  const closeOpening = useCallback(() => {
    setOpening(false)
    // Written into the life, not the browser: this life has had its opening.
    runtime.current?.markOpening()
  }, [runtime])

  const finishTunnel = useCallback(() => {
    runtime.current?.finishTunnel()
  }, [runtime])
  const tunnelHeard = useRef(false)
  const tunnelProgress = useCallback((p: number) => {
    // the crowd comes through the concrete halfway down; the terrace takes over at the end
    if (p > 0.45 && !tunnelHeard.current) {
      tunnelHeard.current = true
      audio.current?.setAmbience('stadium')
    }
    if (p < 0.1) tunnelHeard.current = false
  }, [audio])

  return {
    ready,
    hud,
    dialogue,
    prompt,
    teach,
    ritual,
    toast,
    sound,
    setSound,
    ending,
    setEnding,
    retry,
    setRetry,
    match,
    doc,
    setDoc,
    board,
    setBoard,
    box,
    setBox,
    book,
    setBook,
    cutscene,
    endCutscene,
    finale,
    setFinale,
    coda,
    setCoda,
    gaugeBeat,
    love,
    flash,
    titleCard,
    shirt,
    setShirt,
    toto,
    setToto,
    mechanic,
    setMechanic,
    bagAsked,
    coin,
    setCoin,
    penalty,
    setPenalty,
    hoops,
    setHoops,
    pitch,
    setPitch,
    shop,
    setShop,
    shopState,
    setShopState,
    season,
    setSeason,
    seasonState,
    setSeasonState,
    album,
    setAlbum,
    albumState,
    setAlbumState,
    packet,
    setPacket,
    kept,
    setKept,
    freeTime,
    setFreeTime,
    cast,
    setCast,
    film,
    setFilm,
    pano,
    route,
    setRoute,
    earned,
    dismissEarned,
    tunnel,
    finishTunnel,
    tunnelProgress,
    placeCard,
    card,
    setCard,
    controls,
    hudOn,
    touch,
    persisted,
    frame,
    stage,
    mapState,
    setMapState,
    reveal,
    setReveal,
    opening,
    closeOpening,
  }
}
