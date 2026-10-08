'use client'
/**
 * One line of speech, set down a letter at a time. The complete line is always in the document
 * (the unshown part is only transparent), so a screen reader, a search and a test read all of it;
 * a tap or the next press completes it first, and reduced motion — or an automated browser —
 * gets it at once. The pace is The Worker's (about 42 letters a second): a ninety-character line
 * takes two seconds, and nobody who reads faster is held up, because a tap prints the rest.
 */
import {useEffect, useMemo, useRef, useState} from 'react'

const CPS = 42

export function instantText(): boolean {
  if (typeof window === 'undefined') return true
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    if (navigator.webdriver) return true
  } catch { /* no matchMedia: just print it */ }
  return false
}

export type TypedHandle = {finish: () => boolean}

export function Typed({text, handle, onDone, className, ...rest}: {text: string; handle: {current: TypedHandle | null}; onDone: () => void; className?: string} & React.HTMLAttributes<HTMLParagraphElement>) {
  const chars = useMemo(() => Array.from(text), [text])
  const [n, setN] = useState(() => (instantText() ? chars.length : 0))
  const finished = n >= chars.length
  const done = useRef(false)
  const doneFn = useRef(onDone)
  doneFn.current = onDone
  useEffect(() => {
    const total = chars.length
    if (finished) {
      handle.current = null
      if (!done.current) { done.current = true; doneFn.current() }
      return
    }
    handle.current = {finish: () => { setN(total); return true }}
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(total, Math.floor(((now - t0) / 1000) * CPS))
      setN(k)
      if (k < total) raf = window.requestAnimationFrame(step)
    }
    raf = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(raf)
  }, [chars, finished, handle])
  const shown = chars.slice(0, n).join('')
  const tail = chars.slice(n).join('')
  return <p className={className} {...rest}>{shown}<span style={{opacity: 0}}>{tail}</span></p>
}
