'use client'

import { useCallback, useEffect, type MutableRefObject } from 'react'

import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import type { LifeRuntime } from '@/lib/life/runtime/game'

/**
 * הידיים — everything the player does with a keyboard or a thumb, in one place.
 *
 * The seam is here because input is the one concern in the shell that does NOT flow through
 * the bus. Every other line in `LifeStage` is the game telling React something; these are the
 * four ways React tells the game something, and they were scattered through six hundred lines
 * of overlay wiring where nobody could see that they are one mechanism with one rule: the
 * document is the source of truth about what is held, and the runtime is simply told.
 *
 * That rule was learned the hard way. Phaser rebuilds its Key objects when a scene restarts,
 * and the browser never re-sends a keydown for a key that never came up — so crossing a
 * doorway with an arrow held left the child frozen in the next room until the player let go
 * and pressed again. The `Set` below survives every scene change because it belongs to the
 * shell, not to a scene.
 *
 * The second reason it is one file: the arcade B button, the X in the dialogue box and the
 * Escape key are the same idea — "not this" — and they must stay the same idea. They were
 * three unrelated closures a hundred lines apart, which is exactly how a game ends up with a
 * B button that leaves a conversation and an Escape key that does not.
 *
 * The `runtime` ref in every dependency array below is the same box every render, so listing
 * it changes nothing about when a listener is attached — it only lets the linter keep working.
 *
 * It returns the three pad callbacks and owns the two window listeners. Nothing else: no
 * state, no snapshot, no pause. Input has no opinion about what is on screen — only the
 * dialogue matters to it, and only because a space bar means "next line" while a line is
 * running and "walk" while it is not.
 */
export function useLifeInput({
  runtime,
  ready,
  dialogue,
}: {
  runtime: MutableRefObject<LifeRuntime | null>
  /** the game exists — before that there is nothing to tell, and the listeners stay off */
  ready: boolean
  /** the only overlay input cares about: it changes what the same key means */
  dialogue: LifeBusEvents['dialogue']
}) {
  /**
   * המקלדת — held in the shell, because a scene restart forgets what is held.
   *
   * Phaser rebuilds its Key objects when a scene restarts, and the browser never re-sends
   * a keydown for a key that never came up — so crossing a doorway with an arrow held
   * left the child frozen in the next room until the player let go and pressed again. The
   * document's own key state survives every scene change, so it is the source of truth
   * and the runtime is simply told what it says.
   */
  useEffect(() => {
    if (!ready) return
    const held = new Set<string>()
    const send = () => {
      const input = runtime.current?.input
      if (!input) return
      let x = 0
      let y = 0
      if (held.has('arrowleft') || held.has('a')) x -= 1
      if (held.has('arrowright') || held.has('d')) x += 1
      if (held.has('arrowup') || held.has('w')) y -= 1
      if (held.has('arrowdown') || held.has('s')) y += 1
      input.setKeys(x, y)
      input.setKeyAction(held.has('e') || held.has(' ') || held.has('enter'))
      // Shift has its OWN run channel. It shared one with the pad until 16.9.2026, and a
      // shared boolean between two sources is the bug rule 39 already records for the axis:
      // whichever hand let go first stopped the child running for both.
      input.setKeyRun(held.has('shift'))
    }
    const onDown = (event: KeyboardEvent) => {
      held.add(event.key.toLowerCase())
      send()
    }
    const onUp = (event: KeyboardEvent) => {
      held.delete(event.key.toLowerCase())
      send()
    }
    const clear = () => {
      held.clear()
      send()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [ready, runtime])

  /**
   * The game owns the arrow keys and the space bar for as long as it is on screen.
   *
   * Without this the browser scrolls the page on every step and every "continue", the
   * canvas drifts out of the viewport, and the player is fighting the document instead of
   * walking. Space also advances a line — but only when there is a line and no choice to
   * make, because a choice is a decision and a space bar is not one.
   */
  useEffect(() => {
    if (!ready) return
    const owned = new Set([' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (owned.has(event.key)) event.preventDefault()
      // E is the game's action key everywhere — including inside the dialogue box, so a
      // player never has to change hands to read a line.
      // Escape always leaves the conversation, on every line — the keyboard twin of the X.
      if (event.key === 'Escape') {
        if (!dialogue) return
        event.preventDefault()
        runtime.current?.leave()
        runtime.current?.input.swallow()
        return
      }
      const advances = event.key === ' ' || event.key === 'Enter' || event.key.toLowerCase() === 'e'
      if (!advances) return
      if (!dialogue) return
      event.preventDefault()
      if (!dialogue.choices || dialogue.choices.length === 0) {
        // Through the box, not past it: a line still typing itself prints first, and the
        // second press turns the page — the same two beats a thumb gets.
        const button = document.querySelector<HTMLButtonElement>('[data-life="dialogue"] [data-life="continue"]')
        if (button) button.click()
        else runtime.current?.advance()
        // the same key is the action key — see `InputState.swallow`
        runtime.current?.input.swallow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogue, ready, runtime])

  const onAxis = useCallback((x: number, y: number) => {
    runtime.current?.input.setAxis(x, y)
  }, [runtime])

  const onAction = useCallback((down: boolean) => {
    runtime.current?.input.setAction(down)
  }, [runtime])

  /**
   * "לא זה" — one idea, and after 16.9.2026 usually not a button at all.
   *
   * Maor: *"לא בטוח שיש סיבה ל2 כפתורים בכלל מלבד במיני משחקים מסויימים."* So on the world
   * deck this channel is no longer wired to a second moulded button; it is wired to the
   * STICK'S OUTER RING, which is what an analogue stick has always meant by the same push.
   * The football match keeps a real B — `lib/life/football/sim.ts` reads held-B as a sprint
   * and tapped-B as switch-man — and that is the one mechanic in the game that pays for it.
   *
   * What the channel MEANS did not change, and that is the point of keeping one callback:
   * while you are walking it is RUN, while somebody is talking it is LEAVE, which is the
   * same thing the X in the corner does and the same thing Escape does on a keyboard.
   */
  const onCancel = useCallback(
    (down: boolean) => {
      if (dialogue) {
        if (down) runtime.current?.leave()
        return
      }
      runtime.current?.input.setRun(down)
    },
    [dialogue, runtime],
  )

  return { onAxis, onAction, onCancel }
}
