'use client'

import { useEffect, useRef } from 'react'

/**
 * useDialog — one focus contract for every `role="dialog"` overlay in the app (rule 33).
 *
 * Before this pass each sheet reinvented its own slice of this, or reinvented nothing.
 * `HistoricalCutscene` and `OpeningSequence` each carried their own `window` Escape
 * listener and stopped there; every other sheet in `components/life` — the map, the
 * gauges, the help sheet, the menu, the profile card, the share sheet, the debug panel,
 * the roster picker, the kit reveal, the poll pickers — had NOTHING. A dialog opened on
 * top of the game and a keyboard or screen-reader user was left exactly where focus
 * already was, tabbing through the painting underneath it. That is a WCAG 2.4.3 failure
 * wearing the costume of "the pointer still works".
 *
 * Four things, and deliberately only these four:
 *
 *  · **Focus moves INTO the dialog on open**, onto the dialog's own root. The ref this
 *    hook returns goes on the element that carries `role="dialog"`, and that element
 *    needs `tabIndex={-1}` from its caller so it can hold a focus it was never going to
 *    receive by tabbing. Landing on the ROOT rather than reaching for its first control
 *    is deliberate: on a sheet like the roster search, focusing the first control would
 *    pop a phone's keyboard the instant the sheet slides in, before anybody asked to
 *    type — a UI change nobody asked for riding in on an accessibility fix.
 *  · **Escape closes it.** Every caller already carries an `onClose`; this is the one
 *    place that wires it to the keyboard, so `HistoricalCutscene` and `OpeningSequence`
 *    give up their own copies and fold onto this one instead of keeping two.
 *  · **Tab never leaves it.** The last focusable element wraps back to the first, and
 *    the first wraps to the last on shift+Tab, so a screen-reader user tabbing through a
 *    sheet cannot fall out of it into the scene behind it.
 *  · **Focus returns to whatever opened it, on close.** The element that had focus the
 *    moment the dialog mounted — almost always the button that opened it — gets it back,
 *    so the next Tab press continues from where the player actually is, not from the top
 *    of the document.
 *
 * **Stacked dialogs answer only for the one on top.** `ProfileCard` opens `ShareSheet` on
 * top of itself, and without this an Escape meant for the share sheet would close both
 * at once. `dialogStack` is the whole fix: every open dialog registers a token when it
 * mounts, and only the token at the END of the stack — the most recently opened — answers
 * Escape or traps Tab. The dialog under it is still mounted and still has its own
 * listener; it is just quiet until the one on top unwinds and removes its token.
 *
 * SSR-safe: nothing here touches `document` outside the effect, so the hook is inert on
 * the server and wires itself up only after the dialog has actually mounted in a browser.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** an element with no rendered box (`display:none`, a `[hidden]` ancestor) cannot really hold focus */
function isVisible(el: HTMLElement): boolean {
  return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
}

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible)
}

/** every open dialog, oldest first — see "stacked dialogs" above. Module-level on purpose: it
 *  has to be shared by every instance of this hook, not scoped to one component's renders. */
let dialogStack: symbol[] = []

export function useDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T | null>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  // Held in a ref rather than listed as a dependency below, so the effect runs exactly
  // once per mount. Almost every caller passes an inline `onClose`, a new function on
  // every render of the parent — depending on it directly would tear the listener down
  // and stand a new one up on every unrelated re-render, which for the "restore focus on
  // close" half of this hook would mean firing that restore constantly instead of once.
  const latestClose = useRef(onClose)
  latestClose.current = onClose

  useEffect(() => {
    if (typeof document === 'undefined') return
    const node = ref.current

    const token = Symbol('dialog')
    dialogStack = [...dialogStack, token]
    const isTop = () => dialogStack[dialogStack.length - 1] === token

    restoreTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    node?.focus({ preventScroll: true })

    function onKeyDown(event: KeyboardEvent) {
      if (!isTop()) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        latestClose.current()
        return
      }
      if (event.key !== 'Tab' || !node) return
      const items = focusableIn(node)
      if (items.length === 0) {
        // nothing to land on but the root itself — keep Tab from leaving the dialog anyway
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && node.contains(active)
      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault()
          last?.focus()
        }
      } else if (!inside || active === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      dialogStack = dialogStack.filter((t) => t !== token)
      restoreTo.current?.focus?.({ preventScroll: true })
    }
    // Deliberately empty: this wires up once when the dialog mounts and tears down once
    // when it unmounts. `latestClose` carries whatever `onClose` currently is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}
