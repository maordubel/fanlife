'use client'

import type { ReactNode } from 'react'

import { Num } from '@/components/ui/Num'

/** Small pieces every hub panel draws with — the same plate/rule vocabulary as the market board. */
export function Kicker({ children }: { children: ReactNode }) {
  return <p className="font-body text-[10.5px] font-extrabold uppercase tracking-[.14em] text-sign">{children}</p>
}

export function Rail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center gap-2" role="group" aria-label={label}>
      <span className="w-[52px] shrink-0 font-body text-[10px] font-extrabold uppercase tracking-wide text-muted">{label}</span>
      <div className="-mx-0.5 flex flex-1 gap-1 overflow-x-auto px-0.5 pb-1">{children}</div>
    </div>
  )
}

export function Chip({ on, onClick, label, count, disabled }: { on: boolean; onClick: () => void; label: string; count?: number; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={disabled}
      className={`flex min-h-tap shrink-0 items-center gap-1.5 border-hair px-3 font-body text-[12px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none ${
        on ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
      }`}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span className={`text-[10.5px] ${on ? 'text-concrete' : 'text-muted'}`}>
          <Num>{count}</Num>
        </span>
      ) : null}
    </button>
  )
}

export function Notice({ title, body, tone = 'ink', children }: { title: string; body: string; tone?: 'ink' | 'red'; children?: ReactNode }) {
  return (
    <div className={`mt-stack border-rule p-4 ${tone === 'red' ? 'border-red' : 'border-ink'} bg-sheet`} role={tone === 'red' ? 'alert' : undefined}>
      <p className={`font-sign text-step-1 leading-tight ${tone === 'red' ? 'text-red' : 'text-ink'}`}>{title}</p>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-ink">{body}</p>
      {children ? <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

export const buttonPrimary = 'inline-flex min-h-tap items-center justify-center border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-50'
export const buttonPlain = 'inline-flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step--1 font-extrabold text-ink disabled:opacity-50'
export const linkQuiet = 'inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4'
