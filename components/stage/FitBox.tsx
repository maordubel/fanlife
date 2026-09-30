import type { CSSProperties, ReactNode } from 'react'

/**
 * FitBox — the biggest box of a given aspect that fits the space the stage leaves.
 *
 * On a phone the field (a pitch, a shirt, a board) is sized by the SCREEN, not by its
 * width: `flex-1` takes whatever the header and the dock left, and container-query units
 * pick the largest `ratio` box inside it. From md up it is a plain aspect-ratio block,
 * because the desktop layout is its own design (`.fitbox` in globals.css).
 *
 * `always` keeps the fitting on desktop too — for a field inside a fixed-height panel.
 */
export function FitBox({
  ratio,
  children,
  className = '',
  innerClassName = '',
  always = false,
  style,
}: {
  /** width / height — a 3:4 pitch is 0.75 */
  ratio: number
  children: ReactNode
  className?: string
  innerClassName?: string
  always?: boolean
  style?: CSSProperties
}) {
  return (
    <div
      className={`fitbox ${always ? 'fitbox-always' : ''} ${className}`}
      style={{ ['--fit-r' as string]: String(ratio), ...style }}
    >
      <div className={`fitbox-in ${innerClassName}`}>{children}</div>
    </div>
  )
}
