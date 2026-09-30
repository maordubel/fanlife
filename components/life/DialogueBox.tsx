'use client'

import { useEffect, useRef, useState } from 'react'

import { createArmGate, installPointerWatch, isPointerDown, onPointerChange } from '@/lib/life/inputArm'

import type { DialogueChoice, DialogueLine } from '@/lib/life/runtime/bus'
import { artUrl } from '@/lib/life/runtime/art'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { t } from '@/lib/i18n'

/**
 * תיבת הדיבור — DOM, not canvas, and that is the whole reason it is a component.
 *
 * Hebrew inside a WebGL canvas has no bidi handling, no selection, no screen reader and
 * no reflow. Here it is real text in the brand's own body face, it wraps properly on a
 * 390px phone, and a person using a screen reader hears the conversation.
 *
 * **The 4.9.2026 pass gave it a character.** Three decisions:
 *
 * · **Speech is printed as it is said.** The line types itself onto the sheet at the pace
 *   of a person talking (the caret is a red square, the brand's full stop). A tap while
 *   it is typing prints the rest; a tap after it has finished turns the page. Nobody is
 *   made to wait — a reader who is faster than the caret just taps twice — and the box
 *   stops feeling like a subtitle file and starts feeling like somebody speaking. The
 *   complete line is always in the DOM for a screen reader and for the probes.
 * · **The speaker is pasted onto the sheet, not framed by it.** The portrait is a bigger
 *   plate now, tilted the way a photo is when a hand puts it down, and it stands over the
 *   box's top edge with the name on a sign plate beside it. Every new line from the same
 *   mouth gives the plate a small bump — the head moving when it talks.
 * · **Narration is the room talking**, so it is set differently: no plate, no name, the
 *   sentence on ink instead of on the sheet, in the same face. You can tell without
 *   reading whether a line is being SAID or is simply true.
 *
 * And there is always an X. A conversation you cannot leave is a softlock, and this build
 * had one: speak to somebody a second time, land on a branch you no longer qualify for,
 * and there was nothing left to press. It is in the same corner on every line and applies
 * nothing — walking off mid-sentence earns a child exactly nothing.
 *
 * **5.9.2026 — comic grammar.** Speech is a balloon now: it has a tail, it is 92% of the
 * glass and sits on its speaker's side, it pops from the tail with a hair of a lean, and
 * two people talking face each other across the screen (`useSides`). Narration is still
 * the room talking — full width, on ink, no tail.
 *
 * **16.9.2026 — the head is the size of a head.** Maor sent five reference shots of other
 * games' dialogue and what they share is not a layout: it is that the speaker is BIG and
 * the words are attached to them. Ours had an 84px plate floating two pixels clear of the
 * balloon with a name chip hovering beside it — three separate objects, the face the
 * smallest of them. The plate is 116px now and it OVERLAPS the sheet rather than resting
 * on it, and the name is a tab welded to the balloon's top edge on the same side. One
 * object, and the person is the loudest part of it.
 *
 * `object-top` matters more than it looks: a portrait is a head near the top of a square,
 * so a taller crop scaled with `object-cover` and no origin centres on the chest. Michel's
 * plate would have shown a gold chain and a chin.
 *
 * **And the tail points at the person.** Three of the five references do, and ours did not:
 * it was pinned 36px from the balloon's edge, which points at the speaker's SIDE and is
 * right by accident whenever two people happen to stand far apart. `WorldScene.anchorFor`
 * resolves name → actor → camera and publishes a fraction of the picture on the bus;
 * `tailOffset` below turns that into a position on the sheet. A speaker the scene cannot
 * locate — narration, a radio, a name nobody in the room answers to — still gets the old
 * fixed corner, because that is the honest thing to draw when you do not know.
 *
 * No rounded corners, no shadows, tokens only.
 */

/** characters per second — the pace of somebody talking, not of a modem */
// 5.9.2026: faster — a ninety-character line in a second and a half; a tap completes it at once
const TYPE_CPS = 60

/**
 * צדדים — comic grammar (5.9.2026).
 *
 * Every speaker owns a side of the glass for the length of a conversation. The player
 * is always on the START side (the right, in Hebrew), the first other person to speak
 * takes the END side, the next takes start, and so on; a face that has already been
 * given a side keeps it. Two people in a row on the same side is what makes a dialogue
 * read like subtitles — and this box is a page of a comic, so the balloons face each
 * other, lean a hair toward the person, and pop from their tail.
 */
type Side = 'start' | 'end'
const PLAYER = DEFAULT_IDENTITY.name

function useSides(who: string | null, serial: number): Side {
  const sides = useRef<Map<string, Side>>(new Map())
  // a new conversation (serial reset to 1) forgets the seating
  const last = useRef(0)
  if (serial < last.current) sides.current.clear()
  last.current = serial
  if (!who) return 'start'
  if (who === PLAYER) return 'start'
  const known = sides.current.get(who)
  if (known) return known
  const others = [...sides.current.keys()].filter((k) => k !== PLAYER).length
  const side: Side = others % 2 === 0 ? 'end' : 'start'
  sides.current.set(who, side)
  return side
}

/**
 * הזנב מצביע על מי שמדבר (16.9.2026).
 *
 * `anchor` arrives in CAMERA SPACE: a fraction of the picture that grows the way the
 * camera's own x grows, because that is what a camera is and it has never heard of an
 * inline axis. The balloon lives in an RTL flow and is placed with logical properties
 * (rule 9), so the conversion happens here, once, out loud — and `useRtl` is the only
 * thing in this component that knows a physical direction exists at all.
 *
 * The result is clamped to the middle of the sheet: a tail in the corner collides with
 * the ✕ on one edge and the red tab on the other, and a balloon whose tail has slid off
 * its own sheet is worse than one that is a few degrees out.
 */
const TAIL_MIN = 0.1
const TAIL_MAX = 0.9
/** the balloon is 92% of the glass, pushed against its speaker's side */
const BALLOON = 0.92

export function tailOffset(anchor: number, atEnd: boolean, rtl: boolean): string {
  // where the anchor falls inside the balloon, still in camera space
  const left = atEnd ? anchor / BALLOON : (anchor - (1 - BALLOON)) / BALLOON
  const clamped = Math.max(TAIL_MIN, Math.min(TAIL_MAX, left))
  // inset-inline-start counts from the right when the flow is RTL
  return `${((rtl ? 1 - clamped : clamped) * 100).toFixed(1)}%`
}

function useRtl(): boolean {
  const [rtl, setRtl] = useState(true)
  useEffect(() => {
    try {
      setRtl(document.documentElement.dir !== 'ltr')
    } catch {
      /* a document is not guaranteed; the game is RTL either way */
    }
  }, [])
  return rtl
}

/** the probes read whole lines; a browser under `the-worker:life:probe` prints at once */
function instant(): boolean {
  try {
    return window.localStorage.getItem('the-worker:life:probe') === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function useTypewriter(text: string, key: string) {
  const [shown, setShown] = useState(0)
  const done = shown >= text.length
  useEffect(() => {
    if (instant()) {
      setShown(text.length)
      return
    }
    setShown(0)
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const n = Math.min(text.length, Math.floor(((now - t0) / 1000) * TYPE_CPS))
      setShown(n)
      if (n < text.length) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // `key` changes when the line changes, even when two lines share the same text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { shown, done, finish: () => setShown(text.length) }
}


/**
 * הקלפי נדרכת — P0 (27.9.2026). A ballot is disarmed when it appears and arms on the first
 * frame after the gesture that revealed it has been released (`lib/life/inputArm.ts`).
 * A tap in between is ignored, not queued: the tap that closed a line never picks a row.
 */
function useArmedBallot(visible: boolean, key: string): boolean {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!visible) return
    installPointerWatch()
    const gate = createArmGate()
    if (isPointerDown()) gate.pointerDown()
    gate.reveal()
    setArmed(false)
    let raf = 0
    const tick = () => {
      gate.frame()
      if (gate.armed) setArmed(true)
      else raf = requestAnimationFrame(tick)
    }
    const off = onPointerChange((down) => (down ? gate.pointerDown() : gate.pointerUp()))
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      off()
    }
  }, [visible, key])
  return armed
}

export function DialogueBox({
  lines,
  choices,
  portrait,
  anchor,
  where,
  offsetTop,
  onAdvance,
  onChoose,
  onLeave,
}: {
  lines: DialogueLine[]
  choices?: DialogueChoice[]
  portrait?: string | null
  /** the place this is happening, when it is not the room on screen (`Conversation.where`) */
  where?: string | null
  /**
   * Where the speaker is standing, as a fraction of the picture in camera space, or null
   * when the scene does not know (narration, a radio, a name nobody answers to).
   */
  anchor?: number | null
  /** where the painting ends — the box sits directly under it, never on top of it */
  offsetTop?: number
  onAdvance: () => void
  onChoose: (id: string) => void
  /** walk away without finishing — always available, on every line */
  onLeave: () => void
}) {
  const line = lines[0]
  // One counter per line shown, so the typewriter restarts on every new line — including
  // two consecutive lines with identical text, which a text-keyed effect would merge.
  const serial = useRef(0)
  const lastLine = useRef<DialogueLine | null>(null)
  if (line && line !== lastLine.current) {
    lastLine.current = line
    serial.current += 1
  }
  const text = line?.text ?? ''
  const { shown, done, finish } = useTypewriter(text, `${serial.current}`)
  const side = useSides(line?.who ?? null, serial.current)
  const rtl = useRtl()
  const ballotArmed = useArmedBallot(Boolean(choices && choices.length > 0) && done, `${serial.current}`)

  if (!line) return null
  const spoken = Boolean(line.who)
  const hasChoices = Boolean(choices && choices.length > 0)
  const visible = text.slice(0, shown)
  const atEnd = side === 'end'

  const advance = () => {
    if (!done) finish()
    else onAdvance()
  }

  return (
    // `data-life` hooks are for `scripts/life/playthrough.mjs`, which plays the real
    // build in a browser. Asserting on rendered Hebrew would tie the harness to the
    // wording of a line, and the wording is content — it is meant to change.
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex items-end px-2.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-10"
      style={offsetTop ? { top: offsetTop, alignItems: 'flex-start' } : undefined}
      data-life="dialogue"
    >
      <div className={`relative flex w-full flex-col ${spoken ? (atEnd ? 'items-start' : 'items-end') : 'items-stretch'}`} data-side={spoken ? side : 'wide'}>
        {/* ---- תג מקום: השיחה קורית במקום שאין לו ציור — ניקוסיה, טדי — והחדר על המסך
             הוא רק המקום שבו פוגי עומד כשהוא נזכר / שומע. שלט קטן, לא שורת טקסט. ---- */}
        {where && (
          <span
            className="pointer-events-none mb-1.5 self-center border-rule border-ink bg-red px-2.5 py-[5px] font-sign text-[12px] font-bold leading-none text-sheet"
            data-life="where"
          >
            <bdi>{where}</bdi>
          </span>
        )}
        {/* ---- the speaker, standing over the top edge, on their side ------------------- */}
        {spoken && (
          <div
            className={`pointer-events-none relative z-10 flex items-end gap-0 ${atEnd ? 'me-auto ms-2 flex-row' : 'me-2 ms-auto flex-row-reverse'}`}
            data-life="speaker"
          >
            {portrait && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${portrait}-${serial.current}`}
                src={artUrl(portrait)}
                alt=""
                aria-hidden="true"
                className={`-mb-[10px] h-[116px] w-[116px] animate-face-in border-rule border-ink bg-sheet object-cover object-top ${atEnd ? 'origin-bottom-left' : 'origin-bottom-right'}`}
              />
            )}
            {/* the name is a TAB on the balloon's top edge, not a chip floating beside it:
                it sits flush against the plate and against the sheet below, so the three
                read as one object the way a printed panel does */}
            <span
              className={`mb-0 self-end border-rule border-b-0 border-ink bg-ink px-3 py-[7px] font-sign text-[13px] font-bold leading-none text-sheet ${
                atEnd ? 'border-s-0' : 'border-e-0'
              }`}
            >
              {/* בטלפון — מי שמדבר לא עומד בחדר, והתיבה אומרת את זה בלי מילה נוספת בשורה */}
              {line.via && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artUrl('iconPhone')}
                  alt={t(line.via === 'video' ? 'life.dialogue.video' : 'life.dialogue.phone')}
                  title={t(line.via === 'video' ? 'life.dialogue.video' : 'life.dialogue.phone')}
                  draggable={false}
                  className="me-1.5 inline-block h-[19px] w-[19px] select-none align-[-5px]"
                  data-life="via"
                />
              )}
              <bdi>{line.who}</bdi>
            </span>
          </div>
        )}

        {/* ---- the balloon --------------------------------------------------------------- */}
        <div
          key={`sheet-${serial.current}`}
          className={`relative border-rule border-ink ${
            spoken
              ? `w-[92%] bg-sheet ${atEnd ? 'animate-balloon-pop-end origin-bottom-left' : 'animate-balloon-pop origin-bottom-right'}`
              : 'w-full animate-sheet-in bg-ink'
          }`}
        >
          {/* a second, inner hairline: the sheet is printed, not drawn */}
          <span
            className={`pointer-events-none absolute inset-[3px] border-hair ${spoken ? 'border-ink/25' : 'border-sheet/20'}`}
            aria-hidden="true"
          />
          {/* the tail — a balloon points at the mouth it came from */}
          {spoken && (
            <span
              aria-hidden="true"
              // the fixed corner is the FALLBACK, for a speaker the scene cannot locate
              className={`pointer-events-none absolute -top-[9px] z-10 h-4 w-4 rotate-45 border-s-rule border-t-rule border-ink bg-sheet ${
                typeof anchor === 'number' ? '' : atEnd ? 'start-9' : 'end-9'
              }`}
              style={typeof anchor === 'number' ? { insetInlineStart: tailOffset(anchor, atEnd, rtl) } : undefined}
            />
          )}
          {/* the red tab on the speaker's edge: this is a page of the same book, every time */}
          <span className={`pointer-events-none absolute inset-y-0 w-[4px] bg-red ${atEnd ? 'start-0' : spoken ? 'end-0' : 'start-0'}`} aria-hidden="true" />

          {/* היציאה — the same corner, every line, every conversation.
              This used to be a fixed 40px (`h-10 w-10`) — the project's own standard is
              `min-h-tap`/`min-w-tap` (48px, `--tap`), which every other close control in
              the game already meets. `min-*` rather than a fixed size so the button still
              only takes what its content needs on anything wider than the minimum — it
              does not grow the corner, just stops it from shrinking under the standard.
              The line button's padding (`ps-11`/`pe-11`, 44px) is widened to `-12`
              (48px) on the same edge so the two never overlap at the new size. */}
          <button
            type="button"
            onClick={onLeave}
            aria-label={t('life.leave')}
            title={t('life.leave')}
            data-life="leave"
            className={`absolute top-0 z-10 flex min-h-tap min-w-tap items-center justify-center font-display text-[15px] leading-none transition-colors duration-press active:bg-red active:text-sheet motion-reduce:transition-none ${
              spoken ? 'text-ink/45' : 'text-sheet/55'
            } ${spoken && !atEnd ? 'start-0' : 'end-0'}`}
          >
            <span aria-hidden="true">✕</span>
          </button>

          {/* the line — typed for the eye, complete for the reader */}
          <button
            type="button"
            onClick={hasChoices ? finish : advance}
            aria-label={hasChoices ? undefined : t('life.continue')}
            data-life="continue"
            className={`flex min-h-tap w-full items-start gap-3 pb-3 pt-3.5 text-start ${spoken && !atEnd ? 'pe-4 ps-12' : 'pe-12 ps-4'}`}
          >
            <span className="sr-only" data-life="line">
              {text}
            </span>
            <span
              aria-hidden="true"
              className={`flex-1 font-body text-[16px] leading-relaxed ${spoken ? 'text-ink' : 'text-sheet/90'}`}
            >
              <bdi>{visible}</bdi>
              {!done && <span className="ms-0.5 inline-block h-[0.7em] w-[0.42em] translate-y-[0.08em] animate-caret-blink bg-red" />}
            </span>
            {!hasChoices && done && (
              <span className="mt-2 h-2.5 w-2.5 shrink-0 animate-caret-blink bg-red" aria-hidden="true" />
            )}
          </button>

          {/* the choices — a ballot, one row each, the red square filling on press. A phone on
              its side has 390px of height: the ballot scrolls rather than losing its last row. */}
          {hasChoices && done && (
            <ul
              className={`max-h-[46vh] overflow-y-auto border-t-hair ${spoken ? 'border-ink' : 'border-sheet/30'}`}
              data-life="choices"
              data-armed={ballotArmed ? 'true' : 'false'}
            >
              {choices!.map((choice, index) => (
                <li
                  key={choice.id}
                  className={`animate-sheet-in border-b-hair last:border-b-0 ${spoken ? 'border-ink/20' : 'border-sheet/15'}`}
                  style={{ animationDelay: `${90 + index * 70}ms` }}
                  data-life="choice"
                  data-choice={choice.id}
                >
                  <button
                    type="button"
                    disabled={choice.enabled === false}
                    onClick={() => {
                      if (ballotArmed) onChoose(choice.id)
                    }}
                    className={`group flex min-h-tap w-full items-center gap-3 py-2 pe-3 ps-4 text-start transition-colors duration-press disabled:opacity-45 motion-reduce:transition-none ${
                      spoken ? 'active:bg-red/10' : 'active:bg-sheet/10'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 border-hair border-red transition-colors duration-press group-active:bg-red motion-reduce:transition-none ${
                        spoken ? 'bg-sheet' : 'bg-ink'
                      }`}
                      aria-hidden="true"
                    />
                    <span className={`flex-1 font-body text-[15px] leading-snug ${spoken ? 'text-ink' : 'text-sheet'}`}>
                      <bdi>{choice.text}</bdi>
                    </span>
                    {choice.enabled === false && choice.noteHe && (
                      <span className="shrink-0 font-body text-[10px] leading-none text-muted">
                        <bdi>{choice.noteHe}</bdi>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
