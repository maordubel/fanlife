'use client'
/**
 * One line of speech, set down a letter at a time. The complete line is always in the document
 * (the unshown part is only transparent), so a screen reader, a search and a test read all of it;
 * a tap or the next press completes it first, and reduced motion — or an automated browser —
 * gets it at once.
 */
import {useEffect, useRef, useState} from 'react'

const CPS = 58

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
  const chars = useRef<string[]>([])
  chars.current = Array.from(text)
  const [n, setN] = useState(() => (instantText() ? chars.current.length : 0))
  const done = useRef(false)
  useEffect(() => {
    const total = chars.current.length
    if (n >= total) {
      handle.current = null
      if (!done.current) { done.current = true; onDone() }
      return
    }
    handle.current = {finish: () => { setN(total); return true }}
    const t = window.setTimeout(() => setN(v => Math.min(total, v + (/[.,!?…]/.test(chars.current[v] ?? '') ? 1 : 2))), (1000 / CPS) * (/[.!?…]/.test(chars.current[n - 1] ?? '') ? 7 : /,/.test(chars.current[n - 1] ?? '') ? 3 : 1))
    return () => window.clearTimeout(t)
  }, [n, handle, onDone])
  const shown = chars.current.slice(0, n).join('')
  const tail = chars.current.slice(n).join('')
  return <p className={className} {...rest}>{shown}<span style={{opacity: 0}}>{tail}</span></p>
}
