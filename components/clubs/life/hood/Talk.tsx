'use client'
/** LIFE · the game — a conversation: name plate, typed-on text low on the picture, tap to go on, A / B choices, always leavable. */
import {useCallback, useEffect, useRef, useState} from 'react'
import type {TalkNode} from '@/lib/life/hood/talk'
import {Icon} from './Icons'
import css from './hood.module.css'

type W = (k: string, extra?: Record<string, string>) => string
const LETTERS = ['A', 'B', 'C', 'D']

/** the line, typed on (instantly when motion is reduced); returns the shown text and whether it has finished */
function useTyped(text: string, instant: boolean): {shown: string; done: boolean; finish: () => void} {
  const [n, setN] = useState(instant ? text.length : 0)
  useEffect(() => {
    if (instant) { setN(text.length); return }
    setN(0)
    const t = window.setInterval(() => setN(c => { if (c >= text.length) { window.clearInterval(t); return c } return c + 1 }), 22)
    return () => window.clearInterval(t)
  }, [text, instant])
  return {shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length)}
}

export function Talk({portrait, node, name, w, reduced, onGo, onChoose, onLeave, onTyping}: {portrait: string; node: TalkNode; name: string; w: W; reduced: boolean; onGo: () => void; onChoose: (i: number) => void; onLeave: () => void; /** the words are being typed (the speaker's lips move in the picture) */ onTyping?: (typing: boolean) => void}) {
  const line = w(node.line)
  const {shown, done, finish} = useTyped(line, reduced)
  const typing = useRef(onTyping); typing.current = onTyping
  useEffect(() => { typing.current?.(!done); return () => typing.current?.(false) }, [done])
  const choices = node.choices ?? []
  const st = useRef({done, choices: choices.length, onGo, onChoose, finish})
  st.current = {done, choices: choices.length, onGo, onChoose, finish}
  const tap = useCallback(() => { const s = st.current; if (!s.done) s.finish(); else if (!s.choices) s.onGo() }, [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const s = st.current, t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT') ) return
      const idx = e.code === 'KeyA' || e.code === 'Digit1' ? 0 : e.code === 'KeyB' || e.code === 'Digit2' ? 1 : -1
      if (idx >= 0 && s.done && idx < s.choices) { e.preventDefault(); e.stopPropagation(); s.onChoose(idx); return }
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        if (t && t.tagName === 'BUTTON') return
        e.preventDefault(); e.stopPropagation(); if (!s.done) s.finish(); else if (!s.choices) s.onGo()
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [])
  return (
    <div className={css.lgTalk + ' z-[60]'} role="dialog" aria-label={name} data-life="hood-talk">
      <div className={css.lgTalkBox} onClick={tap}>
        <span className={css.lgPortrait2} data-who={portrait} aria-hidden="true"><i /><b>{name.charAt(0)}</b></span>
        <span className={css.lgPlate}>{name}</span>
        <button type="button" className={css.lgIconBtn + ' min-h-tap ' + css.lgLeave} aria-label={w('hood.talk.leave')} onClick={e => { e.stopPropagation(); onLeave() }}><Icon n="close" /></button>
        <p className={css.lgTalkText} aria-live="polite" aria-label={line}><span aria-hidden="true">{shown}</span>{!done && <span className={css.lgCaret} aria-hidden="true">▌</span>}</p>
        {done && !choices.length && <p className={css.lgTapHint}>{w('hood.talk.tap')}</p>}
      </div>
      {done && choices.length > 0 && (
        <div className={css.lgChoices} role="group" aria-label={w('hood.talk.choose')}>
          {choices.map((c, i) => <button key={c.key} type="button" className={css.lgChoice} onClick={() => onChoose(i)}><i aria-hidden="true">{LETTERS[i]}</i><span>{w(c.key)}</span></button>)}
        </div>
      )}
    </div>
  )
}
