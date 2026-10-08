'use client'
/**
 * The conversation box — LIFE's port of The Worker's DialogueBox.
 *
 * One object, not three: the speaker's plate (a monogram in the club's colour, put down at a slight
 * tilt) is welded to the name tab, and both are welded to the balloon's top edge on the speaker's
 * side. Narration is the room talking, so it is set differently — ink instead of paper, italic, no
 * plate. The line is typed; a tap anywhere on the box completes it, and the next tap turns the page
 * (the choices are the only thing on the box that does not). A ballot arms only after the gesture that
 * revealed it has been released (`lib/life/inputArm.ts`), so the tap that finished a line never picks
 * a row. There is always a ×, and it applies nothing.
 */
import {useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react'
import {createArmGate, installPointerWatch, isPointerDown, onPointerChange} from '@/lib/life/inputArm'
import {Typed, type TypedHandle} from './Typed'
import styles from './life.module.css'

type Choice = {id: string; t: string}
type Story = {lang?: string; dir?: 'ltr' | 'rtl'}
type Props = {
  /** the box as the engine hands it over: the line, who says it (null = narration), and the ballot if this is the last line */
  text: string
  who: string | null
  speaker: string | null
  me: boolean
  choices: Choice[]
  /** the last line of a box that asks something */
  asking: boolean
  serial: string
  story: Story
  handle: MutableRefObject<TypedHandle | null>
  sheetRef: MutableRefObject<HTMLElement | null>
  primaryRef: MutableRefObject<HTMLButtonElement | null>
  /** written by this component so the keyboard path (1-9) can respect the same arming */
  armedRef: MutableRefObject<boolean>
  copy: Record<string, string>
  onAdvance: () => void
  onChoose: (id: string) => void
  onLeave: () => void
  onTyped: () => void
  typed: boolean
}

/** the ballot arms on the first frame after the gesture that revealed it has been released */
function useArmed(visible: boolean, key: string): boolean {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    setArmed(false)
    if (!visible) return
    installPointerWatch()
    const gate = createArmGate()
    if (isPointerDown()) gate.pointerDown()
    gate.reveal()
    let raf = 0
    const tick = () => {
      gate.frame()
      if (gate.armed) setArmed(true)
      else raf = window.requestAnimationFrame(tick)
    }
    const off = onPointerChange(down => (down ? gate.pointerDown() : gate.pointerUp()))
    raf = window.requestAnimationFrame(tick)
    return () => { window.cancelAnimationFrame(raf); off() }
  }, [visible, key])
  return armed
}

/** the player sits on the start side; the first other voice takes the end, the next the start again */
function useSide(who: string | null, me: boolean, conversation: string): 'start' | 'end' {
  const seats = useRef<{conv: string; map: Map<string, 'start' | 'end'>}>({conv: '', map: new Map()})
  if (seats.current.conv !== conversation) seats.current = {conv: conversation, map: new Map()}
  if (me || !who) return 'start'
  const known = seats.current.map.get(who)
  if (known) return known
  const side = seats.current.map.size % 2 === 0 ? 'end' : 'start'
  seats.current.map.set(who, side)
  return side
}

export function Dialogue({text, who, speaker, me, choices, asking, serial, story, handle, sheetRef, primaryRef, armedRef, copy, onAdvance, onChoose, onLeave, onTyped, typed}: Props) {
  const narration = who === null
  const conversation = serial.split(':')[0] ?? serial
  const side = useSide(who, me, conversation)
  const showChoices = asking && choices.length > 0 && typed
  const armed = useArmed(showChoices, serial)
  armedRef.current = showChoices && armed
  const mono = useMemo(() => (speaker ? (Array.from(speaker.trim())[0] ?? '·') : '·'), [speaker])
  return (
    <section
      ref={sheetRef} className={styles.dlg} aria-label={speaker ?? copy.title} data-life="dialogue" data-narration={narration ? 'true' : 'false'} data-me={me ? 'true' : 'false'} data-side={narration ? 'wide' : side}
      onClick={() => onAdvance()}
    >
      {!narration && (
        <div className={styles.dlgPlate} aria-hidden="true" key={`plate-${serial}`}>
          <span className={styles.dlgFace} data-me={me ? 'true' : 'false'}>{mono}</span>
          <span className={styles.dlgName}><bdi>{speaker}</bdi></span>
        </div>
      )}
      <button type="button" className={`${styles.dlgLeave} min-h-tap`} onClick={e => { e.stopPropagation(); onLeave() }} aria-label={copy.leave} data-life="leave">×</button>
      <div className={styles.dlgBody}>
        <Typed className={styles.dlgLine} aria-live="polite" data-life="line" key={serial} text={text} handle={handle} onDone={onTyped} {...story} />
        {showChoices ? (
          <ol className={styles.dlgChoices} data-life="choices" data-armed={armed ? 'true' : 'false'}>
            {choices.map((c, i) => (
              <li key={c.id} style={{'--i': i} as React.CSSProperties}>
                <button
                  type="button" ref={i === 0 ? primaryRef : undefined} className={`${styles.dlgChoice} min-h-tap`} data-choice={c.id} aria-disabled={armed ? undefined : 'true'}
                  onClick={e => { e.stopPropagation(); if (armed) onChoose(c.id) }}
                ><span aria-hidden="true">{i + 1}</span><span {...story}>{c.t}</span></button>
              </li>
            ))}
          </ol>
        ) : !asking ? (
          <button type="button" ref={primaryRef} className={`${styles.dlgMore} min-h-tap`} onClick={e => { e.stopPropagation(); onAdvance() }} data-life="continue" aria-label={copy.more}>
            <span aria-hidden="true" data-ready={typed ? 'true' : 'false'}>▸</span>
          </button>
        ) : null}
      </div>
    </section>
  )
}
