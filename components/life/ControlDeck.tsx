'use client'

import { useCallback, useRef, useState } from 'react'

import { t, type MessageKey } from '@/lib/i18n'
import { ICON_OF_VERB, artUrl } from '@/lib/life/runtime/art'

/**
 * לוח ההפעלה — a controller, not a circle.
 *
 * The directive is specific about this and it is right: the mobile control is a MAJOR
 * GRAPHICAL OBJECT, in the language of the hardware these people actually held — an
 * arcade cabinet, an 80s ball-top stick, moulded buttons, a brushed deck plate with some
 * wear on it. A translucent grey disc floating over the art is what every browser game
 * does, and it reads as a debug overlay rather than as part of the world. So this is
 * built as a physical object: an octagonal restrictor gate, a dust washer, a SHAFT that
 * swings out from under the ball, a ball-top with a real highlight, and buttons with a
 * rim, a bezel and a press that travels.
 *
 * The mental model is one arcade controller everywhere, so the scheme never changes:
 *  · **stick** — walk. Push it to the outer ring and he runs.
 *  · **A** — do the thing the label names: talk, take, buy, enter, go. `E` on a keyboard.
 *  · **B** — only where a mechanic pays for it. See `DeckSecondary`.
 * Complexity belongs in the world and in the decisions, not in the number of things a
 * thumb has to learn.
 *
 * Everything sizes off the room it is given — the band left under a framed picture, or
 * the width of the glass when the painting is full-bleed — so a 360×640 Android gets a
 * smaller but complete console rather than a clipped one, and it pads for the home
 * indicator. Desktop gets a different object entirely — a keycap legend, lit exactly when
 * the game is listening — because a keyboard player's problem was never where to put a
 * thumb, it was which key does anything.
 */

/**
 * הכפתור השני — where it is earned, and nowhere else (16.9.2026).
 *
 * Maor: *"לא בטוח שיש סיבה ל2 כפתורים בכלל מלבד במיני משחקים מסויימים."* He is right, and
 * the sweep says how right. B had two jobs and neither justified a permanent second
 * button on the world deck.
 *
 * · **"Leave a conversation" it never actually performed.** The shell hides the whole
 *   console while somebody is talking (`covered` in `LifeStage` includes `dialogue`), so
 *   that caption was written for a state the button is never on screen in. The X on every
 *   line and Escape are what leave a conversation, and they always were.
 * · **"Run" it did perform**, and run is a real mechanic — it burns energy in
 *   `WorldScene.update`. So run is not deleted. It moves onto the STICK, where pushing
 *   the ball into the outer ring has meant exactly this on every analogue controller ever
 *   made, and where it costs no screen and no second thumb.
 *
 * What is left needing two buttons is the football match and only the football match:
 * `lib/life/football/sim.ts` reads held-B as a sprint and tapped-B as switch-man, and
 * `lib/life/football/types.ts` calls A/B that game's permanent contract.
 */
export type DeckSecondary =
  /** the world, the city, anywhere a thumb only walks and acts — one button */
  | 'none'
  /** the football match: hold to sprint, tap to switch man. The stick keeps out of it. */
  | 'run'
  /** a console drawn OVER a conversation: B is the X. Nothing renders this yet — see the
   *  note on `secondary` — but the caption exists so the day one does, it says "לצאת". */
  | 'leave'

/** below this the stick is a thumb at rest, not a step */
const DEAD = 0.14
/** push into the outer ring and he runs; let it fall back past this and he walks again */
const RUN_IN = 0.85
const RUN_OUT = 0.68
/** how far the ball's centre travels, as a fraction of the plate */
const TRAVEL = 0.3

/**
 * מה שהאגודל אמר — the whole stick, as arithmetic.
 *
 * It is a pure function for the same reason `lib/life/runtime/walk.ts` is one: a control
 * that lives only inside a pointer handler can be checked by a screenshot and by nothing
 * else, and this one now carries three decisions that are easy to get quietly wrong. So
 * `tests/life-deck.test.ts` holds it to numbers.
 *
 *  · **The magnitude is clamped.** `InputState.normalise` caps the pair it is given, but
 *    `PitchCard` and the city proof write it straight into their own pad — so a thumb
 *    dragged past the plate used to be a footballer over top speed.
 *  · **The dead zone is rescaled, not subtracted.** A resting thumb is not a step; but a
 *    thumb that has just started to push must get the SLOWEST walk, not a jump to a fifth
 *    of full speed.
 *  · **Run has hysteresis.** A thumb sitting on the line would otherwise flicker run on and
 *    off every frame — and on the pitch that same channel is the B button, where a flicker
 *    is a substitution.
 */
export function stickReading(
  dx: number,
  dy: number,
  radius: number,
  wasRunning: boolean,
): { nub: { x: number; y: number }; axis: { x: number; y: number }; running: boolean } {
  const r = Math.max(1, radius)
  const len = Math.hypot(dx, dy)
  const ux = len > 0 ? dx / len : 0
  const uy = len > 0 ? dy / len : 0
  const pull = Math.min(1, len / r)
  const drive = pull <= DEAD ? 0 : (pull - DEAD) / (1 - DEAD)
  return {
    nub: { x: ux * pull * r, y: uy * pull * r },
    axis: { x: ux * drive, y: uy * drive },
    running: wasRunning ? pull > RUN_OUT : pull >= RUN_IN,
  }
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value))
}

function Cap({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <span
      dir="ltr"
      className={`flex h-6 min-w-6 items-center justify-center border-hair px-1 font-mono text-[11px] leading-none tabular-nums transition-colors duration-plate motion-reduce:transition-none ${
        live ? 'border-red bg-red text-sheet' : 'border-ink/50 bg-sheet text-ink'
      }`}
    >
      {children}
    </span>
  )
}

/**
 * הלוחית — the apron the hardware is bolted to.
 *
 * Before this the touch console was a gradient and a grey square floating on the
 * painting, which is the "debug overlay" the directive exists to forbid. A console is a
 * PLATE: brushed steel, a milled top edge catching the light, and the picture standing
 * above it. It is drawn as its own layer so it cannot push the controls around, and it is
 * pure value — no hue anywhere in it, so rule 62's saturation guard has nothing to catch.
 */
function DeckPlate({ floating }: { floating: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="absolute inset-0"
        style={{
          background: floating
            ? 'linear-gradient(to top, rgb(14 13 13 / 0.94) 0%, rgb(14 13 13 / 0.86) 46%, rgb(14 13 13 / 0) 100%)'
            : 'linear-gradient(to bottom, rgb(38 36 35) 0%, rgb(22 21 20) 100%)',
        }}
      />
      {/*
        Brushed metal: one repeating highlight, no hue, 3% — it reads as a surface and not
        as a texture, which is the difference between a plate and a pattern.

        It is MASKED by the same fall-off as the apron, because without that the milling
        carried on over the painting: faint horizontal lines across the boy's legs on a
        full-bleed phone, which is the plate claiming ground it does not own.
      */}
      <span
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'repeating-linear-gradient(to bottom, rgb(255 255 255 / 0.03) 0px, rgb(255 255 255 / 0.03) 1px, rgb(0 0 0 / 0.03) 1px, rgb(0 0 0 / 0.03) 3px)',
          ...(floating
            ? {
                maskImage: 'linear-gradient(to top, rgb(0 0 0) 30%, rgb(0 0 0 / 0) 92%)',
                WebkitMaskImage: 'linear-gradient(to top, rgb(0 0 0) 30%, rgb(0 0 0 / 0) 92%)',
              }
            : {}),
        }}
      />
      {/*
        The milled top edge belongs to a PLATE, so it is drawn only when there is one. On a
        full-bleed phone the painting runs to the floor of the glass and rule 52 tells the
        shell `frame: 0` — no frame — so a bright hairline across it would draw a frame the
        picture does not have, which is the same defect as letterboxing a full-bleed room.
      */}
      {!floating && (
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'rgb(255 255 255 / 0.18)' }}
        />
      )}
    </span>
  )
}

/**
 * הכפתור הרטרו — the plate is a picture, the button is a hit zone laid over its red dome.
 *
 * Maor, 1.10.2026: the console becomes a worn metal pad (public/life/deck/*.webp, measured
 * for yellow on the decoded bytes — rule 61). The artwork carries the look; this draws only
 * what the artwork cannot: the 44px+ target, the lit rim when the button can act, and the
 * press. The caption sits under the plate, because the printed B/A is the button's NAME and
 * the caption is what it does.
 */
function ArcadeButton({
  at,
  letter,
  caption,
  live,
  warn,
  mark,
  onDown,
  onUp,
}: {
  /** the dome's centre, as a fraction of the plate's width (x) */
  at: number
  letter: string
  caption: string
  live: boolean
  warn?: boolean
  mark: string
  onDown: () => void
  onUp: () => void
}) {
  const [held, setHeld] = useState(false)
  const press = () => {
    setHeld(true)
    onDown()
  }
  const release = () => {
    setHeld(false)
    onUp()
  }
  return (
    <button
      type="button"
      data-deck={mark}
      data-letter={letter}
      aria-label={caption}
      style={{
        insetInlineStart: `${at * 100}%`,
        top: '44%',
        width: '29%',
        aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
      }}
      onPointerDown={(event) => {
        event.preventDefault()
        press()
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={() => held && release()}
      className="pointer-events-auto absolute touch-none rounded-full"
    >
      <span
        aria-hidden="true"
        className="absolute inset-[8%] rounded-full transition-all duration-press motion-reduce:transition-none"
        style={{
          background: held ? 'rgb(0 0 0 / 0.38)' : 'transparent',
          boxShadow: live
            ? '0 0 0 2px rgb(var(--red)), 0 0 14px 2px rgb(var(--red) / 0.7)'
            : warn
              ? '0 0 0 1px rgb(var(--sheet) / 0.35)'
              : 'none',
        }}
      />
    </button>
  )
}

/** the worn metal plate itself */
function Plate({
  src,
  width,
  children,
}: {
  src: string
  width: string
  children?: React.ReactNode
}) {
  return (
    <span className="pointer-events-none relative block shrink-0" style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="block h-auto w-full select-none"
        style={{ filter: 'drop-shadow(0 6px 8px rgb(0 0 0 / 0.55))' }}
      />
      {children}
    </span>
  )
}

const DECK_ART = '/life/deck'

export function ControlDeck({
  top,
  height,
  touch,
  verb,
  label,
  locked,
  secondary,
  onAxis,
  onAction,
  onCancel,
  pulse = false,
}: {
  /**
   * The first-mission cue (27.9.2026, plan §2.2 Cue 2): the action button pulses ONCE,
   * while the player is in reach of his first thing and has not yet pressed. Not a light
   * show — one ring, then still. Off under reduced motion.
   */
  pulse?: boolean
  /** where the painting ends, in CSS pixels */
  top: number
  /** how much room is left under it */
  height: number
  /** a phone or a tablet — the controller, rather than the legend */
  touch: boolean
  verb?: string | null
  label?: string | null
  locked?: boolean
  /**
   * What the second button is for — and `'none'`, the default, means there is not one.
   *
   * Only the football match earns it. `PitchCard` does not pass this yet (it is not a file
   * this change owns), so until it does the deck finds out where it is standing by looking
   * for the pitch card's own `data-life="pitch-card"` root. That lookup is a BRIDGE and it
   * says so: the day `PitchCard` passes `secondary="run"` the lookup is deleted, and until
   * then a football match cannot silently lose its sprint because of a prop nobody passed.
   */
  secondary?: DeckSecondary
  onAxis: (x: number, y: number) => void
  onAction: (down: boolean) => void
  /** B, and the stick's outer ring: run while walking, leave while talking */
  onCancel: (down: boolean) => void
}) {
  const [nub, setNub] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [running, setRunning] = useState(false)
  const pointer = useRef<number | null>(null)
  /** the stick's own geometry, read off the element the thumb landed on */
  const gate = useRef({ cx: 0, cy: 0, r: 1 })
  const runNow = useRef(false)

  const [bridged, setBridged] = useState<DeckSecondary | null>(null)
  const findDeck = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    setBridged(node.closest('[data-life="pitch-card"]') ? 'run' : 'none')
  }, [])
  const second: DeckSecondary = secondary ?? bridged ?? 'none'
  /** when B is not the run button, the stick's outer ring is */
  const stickRuns = second === 'none'

  const band = Math.max(0, height)
  const floating = touch ? band < 112 : band < 56

  /**
   * המידות באו מהזכוכית, לא מהפס.
   *
   * Since the full-bleed pass the painting fills the glass and the deck is handed
   * `height: 0` — so every `clamp` off the band answered with its own minimum and a phone
   * got the smallest console this file can draw, on the largest screen it ever draws on.
   * A floating console therefore sizes off the WIDTH of the glass instead, in CSS, which
   * also means it is right on the frame the orientation changes and not one resize event
   * later.
   */
  // 34px of slack under a framed picture, not 20: the run caption hangs above the stick,
  // and a caption that pokes over the hairline is the plate claiming the painting again
  // vmin, not vw: a phone turned sideways is 844px wide and 390px tall, and a stick sized
  // off the width was 250px — two thirds of the glass, over the people on the street and
  // every door on the floor (delta 91, screens probe). Off the short side it is the same
  // console the same phone gets upright.
  const padSize = floating ? 'clamp(96px, 30vmin, 134px)' : `${clamp(band - 34, 88, 134)}px`
  const btnSize = floating ? 'clamp(70px, 21vmin, 94px)' : `${clamp((band - 30) / 1.5, 64, 94)}px`
  
  /**
   * The thumb writes an axis, and once in a while it writes a decision.
   *
   * Two things this must not do, both of which it used to. It must not send a magnitude
   * over 1 — `InputState` normalises, but `PitchCard` and the city proof write the pair
   * straight into their own pad, so a thumb dragged past the plate was a footballer over
   * top speed. And it must not report a resting thumb as a step: the dead zone is rescaled
   * rather than subtracted, so the first real millimetre of travel is still the slowest
   * walk instead of a jump to a quarter speed.
   */
  const move = useCallback(
    (clientX: number, clientY: number) => {
      const { cx, cy, r } = gate.current
      const read = stickReading(clientX - cx, clientY - cy, r, runNow.current)
      setNub(read.nub)
      onAxis(read.axis.x, read.axis.y)
      // הטבעת החיצונית היא ריצה
      if (read.running !== runNow.current) {
        runNow.current = read.running
        setRunning(read.running)
        if (stickRuns) onCancel(read.running)
      }
    },
    [onAxis, onCancel, stickRuns],
  )

  const release = useCallback(() => {
    pointer.current = null
    setDragging(false)
    setNub({ x: 0, y: 0 })
    onAxis(0, 0)
    if (runNow.current) {
      runNow.current = false
      setRunning(false)
      if (stickRuns) onCancel(false)
    }
  }, [onAxis, onCancel, stickRuns])

  const shell = floating
    ? 'pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-8'
    : 'pointer-events-none absolute inset-x-0 z-30 flex items-center justify-between gap-2 px-3 pb-[max(4px,env(safe-area-inset-bottom))]'
  const shellStyle = floating ? undefined : { top, bottom: 0 }

  /**
   * On a phone the name of the thing in reach gets its OWN full-width line, above the
   * hardware. Squeezed between a 120px stick and two buttons on a 360px screen it had
   * about a hundred pixels and truncated `לך לקיוסק` to `לך …`, which is worse than
   * saying nothing: the one job of that chip is to name what the red button will do.
   */
  const stripStyle = floating
    ? { bottom: `calc(${btnSize} + max(26px, env(safe-area-inset-bottom)))` }
    : { top: Math.max(0, top + 4) }

  const centre = (
    <div className="pointer-events-none flex min-w-0 flex-1 flex-col items-center gap-1.5" dir="rtl">
      {label ? (
        <span
          data-life="prompt"
          className={`max-w-full truncate border-hair px-2.5 py-1.5 text-center font-body text-[13px] leading-none ${
            locked ? 'border-red bg-ink text-red' : 'border-ink bg-sheet text-ink'
          }`}
        >
          <bdi>{label}</bdi>
          {locked ? <bdi> · {t('life.deck.locked')}</bdi> : null}
        </span>
      ) : (
        <span
          className={`font-body text-[11px] leading-none ${
            floating ? 'text-sheet/70' : 'text-concrete'
          }`}
        >
          <bdi>{t('life.deck.nothing')}</bdi>
        </span>
      )}
    </div>
  )

  // --- desktop: a legend, lit where the game is listening --------------------------
  if (!touch) {
    const muted = floating ? 'text-sheet/80' : 'text-muted'
    return (
      <div className={shell} style={shellStyle} dir="ltr" data-life="deck" ref={findDeck}>
        <DeckPlate floating={floating} />
        <div className="pointer-events-none relative flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${DECK_ART}/dpad.webp`} alt="" aria-hidden="true" draggable={false} className="h-9 w-9 select-none object-contain" style={{ filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.5))' }} />
          <span className="flex items-center gap-1">
            <Cap>↑</Cap>
            <Cap>←</Cap>
            <Cap>↓</Cap>
            <Cap>→</Cap>
          </span>
          <span className={`font-body text-[11px] leading-none ${muted}`} dir="rtl">
            <bdi>{t('life.deck.move')}</bdi>
          </span>
        </div>

        <div className="relative flex min-w-0 flex-1">{centre}</div>

        <div className="pointer-events-none relative flex shrink-0 items-center gap-2">
          {/* Shift is still run on a keyboard. Losing the second BUTTON on a phone does not
              cost a key on a desk, where a modifier is free. */}
          <span className={`font-body text-[11px] leading-none ${muted}`} dir="rtl">
            <bdi>{t('life.deck.run')}</bdi>
          </span>
          <Cap>Shift</Cap>
          <span className={`font-body text-[11px] leading-none ${muted}`} dir="rtl">
            <bdi>{verb ? t(`life.verb.short.${verb}` as MessageKey) : t('life.deck.act')}</bdi>
          </span>
          <span className={pulse ? 'life-teach-pulse relative inline-flex items-center gap-1.5' : 'relative inline-flex items-center gap-1.5'} data-teach={pulse ? '1' : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${DECK_ART}/btn-a.webp`} alt="" aria-hidden="true" draggable={false} className="h-9 w-auto select-none" style={{ filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.5))' }} />
            <Cap live={Boolean(verb) && !locked}>E</Cap>
          </span>
        </div>
      </div>
    )
  }

  // --- touch: the cabinet ----------------------------------------------------------
  return (
    <>
      {/*
          התמונה היא לא ג'ויסטיק.

          Half the lower painting used to be an invisible drag pad: a thumb that landed on
          a person standing there steered instead of pointing, and on a phone that is most
          of the screen. Telling a tap from a drag made it *work*, but it did not make it
          right — none of the games Maor named have a stick over the picture, because in a
          point-and-click the painting means one thing and it means it everywhere. The
          stick is hardware and lives on the deck below, where a player who wants to steer
          can find it and where it can never eat a tap on the world. */}

      {/* the name of what is in reach — its own line, full width, above the hardware */}
      <div
        className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-3"
        style={stripStyle}
      >
        {centre}
      </div>

      <div className={shell} style={shellStyle} dir="ltr" data-life="deck" ref={findDeck}>
        <DeckPlate floating={floating} />

        {/* ---- the stick: gate plate, run ring, dust washer, shaft, ball top ---- */}
        <div className="pointer-events-none relative shrink-0" style={{ width: padSize }}>
          {/* what the ring means, said once, only while it is engaged — a permanent caption
              on a 360px phone is clutter; a word that appears the first time a thumb
              reaches the ring is a lesson */}
          <span
            className={`pointer-events-none absolute inset-x-0 bottom-full mb-2 flex justify-center transition-opacity duration-press motion-reduce:transition-none ${
              running ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          >
            <span className="border-hair border-red bg-ink px-1.5 py-1 font-sign text-[11px] leading-none text-red">
              <bdi>{t('life.deck.run')}</bdi>
            </span>
          </span>

          <div
            role="application"
            data-deck="stick"
            // both jobs in the accessible name, built from keys the catalogue already
            // carries — a console is not worth a new string nobody can add here
            aria-label={`${t('life.deck.stick')} · ${t('life.deck.run')}`}
            className="pointer-events-auto relative touch-none"
            style={{ width: padSize, height: padSize }}
            onPointerDown={(event) => {
              if (pointer.current !== null) return
              pointer.current = event.pointerId
              event.currentTarget.setPointerCapture(event.pointerId)
              const box = event.currentTarget.getBoundingClientRect()
              gate.current = {
                cx: box.x + box.width / 2,
                cy: box.y + box.height / 2,
                r: Math.max(1, box.width * TRAVEL),
              }
              setDragging(true)
              move(event.clientX, event.clientY)
            }}
            onPointerMove={(event) => {
              if (pointer.current !== event.pointerId) return
              move(event.clientX, event.clientY)
            }}
            onPointerUp={release}
            onPointerCancel={release}
            // a capture lost to a scroll, a gesture or a dead finger is a released stick —
            // without this the child kept walking after the thumb was gone
            onLostPointerCapture={release}
          >
            {/* the run ring: where the ball's edge lands when he starts running */}
            <span
              className="absolute rounded-full border-hair transition-colors duration-press motion-reduce:transition-none"
              style={{
                inset: '-5%',
                borderStyle: 'dashed',
                borderColor: running ? 'rgb(var(--red))' : 'rgb(255 255 255 / 0.2)',
              }}
              aria-hidden="true"
            />
            {/* the worn metal cross; it leans toward the thumb like a real rocker pad */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${DECK_ART}/dpad.webp`}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
              style={{
                transform: `perspective(260px) rotateX(${(-nub.y / 5).toFixed(2)}deg) rotateY(${(nub.x / 5).toFixed(2)}deg) translate3d(${nub.x * 0.18}px, ${nub.y * 0.18}px, 0)`,
                filter: running
                  ? 'drop-shadow(0 0 10px rgb(var(--red) / 0.8))'
                  : 'drop-shadow(0 6px 8px rgb(0 0 0 / 0.55))',
                transition: dragging ? 'none' : 'transform 120ms var(--ease-stamp)',
              }}
            />
          </div>
        </div>

        <div className="flex-1" aria-hidden="true" />

        {/* ---- A, and B only where a mechanic pays for it ---- */}
        <div className="pointer-events-none relative flex shrink-0 items-end">
          <span
            className={pulse ? 'life-teach-pulse relative inline-flex' : 'relative inline-flex'}
            data-teach={pulse ? '1' : undefined}
          >
            <Plate
              src={`${DECK_ART}/${second !== 'none' ? 'btn-ba' : 'btn-a'}.webp`}
              width={`calc(${btnSize} * ${second !== 'none' ? 2.5 : 1.9})`}
            >
              {second !== 'none' && (
                <ArcadeButton
                  at={0.31}
                  mark="b"
                  letter="B"
                  caption={second === 'leave' ? t('life.deck.bLeave') : t('life.deck.bRun')}
                  live={false}
                  warn
                  onDown={() => onCancel(true)}
                  onUp={() => onCancel(false)}
                />
              )}
              <ArcadeButton
                at={second !== 'none' ? 0.69 : 0.5}
                mark="a"
                letter="A"
                caption={verb ? t(`life.verb.short.${verb}` as MessageKey) : t('life.deck.act')}
                // In a football match A is ALWAYS the ball — tackle, shot, pass — and there is
                // no prompt system to name it, so it drew itself grey for ninety minutes and
                // said the game was not listening. A console that lies about being live is the
                // defect rule 42 exists about, one mini-game along.
                live={second === 'run' || (Boolean(verb) && !locked)}
                onDown={() => onAction(true)}
                onUp={() => onAction(false)}
              />
            </Plate>
          </span>
        </div>
      </div>
    </>
  )
}

/**
 * הצ׳יפ — the deck folded down to the one thing a tap-first player still needs.
 *
 * The phone default is the CONSOLE again (16.9.2026): Maor asked for the stick and the
 * buttons to be on the screen, in those words, and a preference hidden in ☰ is not on the
 * screen. What this is for is the player who then turns the console off — the picture is
 * still a controller, you touch the world and the boy goes, and the two jobs the picture
 * cannot do on its own remain: NAMING what the red button would do, and giving a big
 * forgiving target for doing it. That is all this is. It only exists while something is
 * in reach, so most of the time the glass is just the painting.
 */
/**
 * הדיסקית של הפעולה — הסמל, וכשאין כזה, האות שעל הכפתור.
 *
 * מאור מסר שנים־עשר סמלים ב-20.9.2026 עם משפט אחד: *"כדאי להצמיד לכל סמל תווית עברית
 * קצרה, כדי שהפעולה תהיה ברורה מיד."* המילה כבר שם — `life.verb.*` הייתה בשורת הבקשה
 * מאז כלל 41 — ולכן הסמל נכנס לצידה ולא במקומה: דיסקית עם זכוכית מגדלת יכולה להיות
 * "תסתכל", "תחפש" או "תגדיל", והמשפט שמסביר איזו מהן הוא הטקסט.
 *
 * `ICON_OF_VERB` היא ההתאמה, והיא **חלקית בכוונה**: פועל בלי סמל ממשיך להראות את `A`,
 * שזה שם הכפתור ולא שם הפעולה — אבל הוא לפחות נכון. סמל שגוי גרוע מאין סמל.
 *
 * `<img>` רגיל ולא `next/image`: הבייטים שנמדדו הם הבייטים שנשלחים (כלל 69 §5), וקידוד
 * חוזר ממציא כרומה — וזה קובץ שהוכח עליו אפס צהוב על הבייטים ששמורים.
 */
function ActionMark({ verb, dim }: { verb: string | null; dim: boolean }) {
  const icon = verb ? ICON_OF_VERB[verb] : undefined
  if (!icon) return <>A</>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={artUrl(icon)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`h-full w-full select-none object-contain ${dim ? 'opacity-40' : ''}`}
    />
  )
}

export function TapChip({
  verb,
  label,
  locked,
  onAction,
  pulse = false,
}: {
  /** the first-mission cue, as on the deck's A */
  pulse?: boolean
  verb: string | null
  label: string | null
  locked: boolean
  onAction: (down: boolean) => void
}) {
  const [held, setHeld] = useState(false)
  if (!verb || !label) return null
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(14px,env(safe-area-inset-bottom))]"
      data-life="deck"
    >
      <button
        type="button"
        data-life="prompt"
        data-deck="chip"
        data-teach={pulse ? '1' : undefined}
        aria-label={label}
        onPointerDown={(event) => {
          event.preventDefault()
          setHeld(true)
          onAction(true)
        }}
        onPointerUp={() => {
          setHeld(false)
          onAction(false)
        }}
        onPointerCancel={() => {
          setHeld(false)
          onAction(false)
        }}
        className={`${pulse ? 'life-teach-pulse ' : ''}pointer-events-auto relative flex min-h-tap max-w-full items-center gap-2.5 border-rule px-4 py-2 font-sign text-[15px] leading-none transition-colors duration-press motion-reduce:transition-none ${
          locked
            ? 'border-red bg-ink text-red'
            : held
              ? 'border-ink bg-red text-sheet'
              : 'border-ink bg-sheet text-ink'
        }`}
        dir="rtl"
      >
        <span aria-hidden="true" className={`pointer-events-none absolute inset-[2px] border-hair ${held || locked ? 'border-sheet/40' : 'border-ink/40'}`} />
        <span
          aria-hidden="true"
          className={`relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full font-mono text-[9px] font-bold tabular-nums ${
            ICON_OF_VERB[verb] ? '' : locked ? 'bg-red/30 text-red' : held ? 'bg-sheet text-red' : 'bg-red text-sheet'
          }`}
          dir="ltr"
        >
          <ActionMark verb={verb} dim={locked} />
        </span>
        <span className="relative truncate">
          <bdi>{label}</bdi>
          {locked ? <bdi> · {t('life.deck.locked')}</bdi> : null}
        </span>
      </button>
    </div>
  )
}
