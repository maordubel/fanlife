'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { t } from '@/lib/i18n'
import { searchPlayers, type SearchEntry } from '@/lib/game/blind-cow/search'
import { microFeedback } from '@/lib/voice'

/**
 * מגירת הניחוש — search, not a free text box (spec §3 State 3). The list is the Player
 * Master (Hebrew, Latin, aliases) and a tap sends an ID; the server compares ids. No
 * photograph in the list: a face would make the question too easy. A wrong pick shakes
 * its row in navy and strikes it, and the drawer stays open for another try.
 */
export function GuessDrawer({
  open,
  onClose,
  entries,
  tried,
  onPick,
}: {
  open: boolean
  onClose: () => void
  entries: readonly SearchEntry[]
  tried: readonly string[]
  /** resolves to whether he was the one */
  onPick: (entry: SearchEntry, row: HTMLElement | null) => Promise<'right' | 'wrong' | 'none'>
}) {
  const [term, setTerm] = useState('')
  const [busy, setBusy] = useState(false)
  const [shaking, setShaking] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [missed, setMissed] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const rows = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    if (!open) return
    setMissed(false)
    const id = window.setTimeout(() => input.current?.focus(), 60)
    return () => window.clearTimeout(id)
  }, [open])

  const results = useMemo(() => searchPlayers(entries, term, 30), [entries, term])

  async function pick(entry: SearchEntry) {
    if (busy || tried.includes(entry.id)) return
    setBusy(true)
    setPending(entry.id)
    const row = rows.current.get(entry.id) ?? null
    const verdict = await onPick(entry, row)
    setBusy(false)
    setPending(null)
    if (verdict === 'wrong') {
      setShaking(entry.id)
      setMissed(true)
      // the Red Voice's miss ("עוד לא." · "לא הוא." …), walked by the number of tries, and the cost
      const said = microFeedback(10, 'wrong', 'blind-cow', tried.length)?.line ?? t('blindcow.drawer.wrong')
      firePickFxAt(row, { tone: 'sign', haptic: 'miss', label: `${said} ${t('blindcow.drawer.penalty')}` })
      window.setTimeout(() => setShaking(null), 360)
    }
  }

  return (
    <SlideSheet open={open} onClose={onClose} title={t('blindcow.drawer.title')} latin={t('blindcow.latin.drawer')} size="full">
      <div className="flex h-full min-h-0 flex-col pb-[max(env(safe-area-inset-bottom),8px)]">
        <label className="block shrink-0">
          <span className="sr-only">{t('blindcow.drawer.label')}</span>
          <input
            ref={input}
            type="search"
            dir="auto"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t('blindcow.drawer.placeholder')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-[16px] text-ink placeholder:text-muted focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sign"
          />
        </label>
        <p className={`mt-1.5 shrink-0 font-body text-[12px] leading-snug ${missed ? 'font-extrabold text-sign' : 'text-muted'}`} aria-live="polite">
          {missed ? t('blindcow.drawer.wrong') : term.trim() && !results.length ? t('blindcow.drawer.none') : t('blindcow.drawer.hint')}
        </p>
        <ul data-blindcow="guess-list" className="mt-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {results.map((entry) => {
            const struck = tried.includes(entry.id)
            return (
              <li key={entry.id} className="border-b-hair border-ink/25">
                <button
                  type="button"
                  ref={(el) => {
                    if (el) rows.current.set(entry.id, el)
                    else rows.current.delete(entry.id)
                  }}
                  disabled={struck || busy}
                  onClick={() => pick(entry)}
                  className={`flex min-h-[52px] w-full items-center justify-between gap-3 px-2 text-start transition-colors duration-press active:bg-red active:text-paper disabled:cursor-not-allowed motion-reduce:transition-none ${
                    shaking === entry.id ? 'animate-shake bg-sign text-paper' : pending === entry.id ? 'bg-ink text-paper' : ''
                  } ${struck && shaking !== entry.id ? 'text-muted line-through' : 'text-ink'}`}
                >
                  <span className="min-w-0 flex-1 truncate font-sign text-[16px] leading-tight">
                    <bdi>{entry.nameHe}</bdi>
                    {entry.latin[0] && (
                      <span className="ms-2 font-latin text-[10px] font-bold tracking-[0.12em] text-muted">
                        <span dir="ltr">{entry.latin[0].toUpperCase()}</span>
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted" dir="ltr">
                    {struck ? t('blindcow.drawer.tried') : pending === entry.id ? '…' : entry.years}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </SlideSheet>
  )
}
