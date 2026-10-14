'use client'

import type { ReactNode } from 'react'

import { Num } from '@/components/ui/Num'

/** Small pieces every hub panel draws with — THE WEEKLY's vocabulary (rule 124): options wrap, nothing scrolls sideways. */
export function Kicker({ children }: { children: ReactNode }) {
  return <p className="wk-banner wkc-kicker">{children}</p>
}

export function Rail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wkc-rail" role="group" aria-label={label}>
      <span className="wk-k wk-muted">{label}</span>
      <div className="wkc-rail-opts">{children}</div>
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
      className="wk-opt wkc-chip min-h-tap"
    >
      <span>{label}</span>
      {count !== undefined ? (
        <small>
          <Num>{count}</Num>
        </small>
      ) : null}
    </button>
  )
}

export function Notice({ title, body, tone = 'ink', children }: { title: string; body: string; tone?: 'ink' | 'red'; children?: ReactNode }) {
  return (
    <div className={`wk-coupon wkc-notice${tone === 'red' ? ' red' : ''}`} role={tone === 'red' ? 'alert' : undefined}>
      <p className={`wk-head${tone === 'red' ? ' red' : ''}`}>{title}</p>
      <p className="wkc-notice-body">{body}</p>
      {children ? <div className="wkc-notice-act">{children}</div> : null}
    </div>
  )
}

export const buttonPrimary = 'wk-btn red wkc-sm min-h-tap'
export const buttonPlain = 'wk-btn paper wkc-sm min-h-tap'
export const linkQuiet = 'wk-link wkc-sm-link min-h-tap'

export const buttonQuiet = buttonPlain
