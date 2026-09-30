'use client'

import type { CSSProperties, ReactNode } from 'react'

import css from './personal.module.css'

/**
 * שני פרימיטיבים של תנועה — the only two the personal layer needs (spec §55).
 *
 *  · `RevealText` — a line that is read into existence from the side Hebrew starts on.
 *    Staggered by `delay`, CSS-only, scoped reduced-motion (the module's `.root`).
 *  · `MotionLine` — one SVG stroke, drawn the same everywhere; `DrawIn` reveals it once,
 *    when it mounts (a path drawn along its own direction, or outward from a centre).
 *
 * Neither keeps a flag anywhere: an animation runs once per mount, and the sheets mount
 * once per opening (§9, §52).
 */
export function RevealText({
  delay = 0,
  as: Tag = 'span',
  className = '',
  children,
}: {
  delay?: number
  as?: 'span' | 'p' | 'div' | 'h3'
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={`${css.reveal} ${Tag === 'span' ? 'inline-block' : 'block'} ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

export function MotionLine({
  d,
  className = '',
  emerging = false,
  width = 2,
  style,
}: {
  d: string
  className?: string
  emerging?: boolean
  width?: number
  style?: CSSProperties
}) {
  // `non-scaling-stroke` keeps a line a line in a box stretched to any phone, and it is
  // also why the drawing is NOT a dash trick: dashes are measured on screen under it, so
  // the reveal is done by the wrapper (`DrawIn`) and a dash is only ever a real dash.
  return (
    <path
      d={d}
      fill="none"
      strokeWidth={width}
      strokeLinecap="square"
      vectorEffect="non-scaling-stroke"
      className={className}
      style={{ ...(emerging ? { strokeDasharray: '5 5' } : null), ...style }}
    />
  )
}

/**
 * הקו נמשך — reveals whatever SVG it wraps the way a line is drawn: from the side a
 * Hebrew reader starts on (`rtl`, for the paths), from the centre outwards (`out`, for the
 * people), or downwards (`down`). Once per mount; scoped reduced motion shows it finished.
 */
export function DrawIn({ mode, delay = 0, className = '', children }: { mode: 'rtl' | 'out' | 'down'; delay?: number; className?: string; children: ReactNode }) {
  const cls = mode === 'rtl' ? css.drawRtl : mode === 'out' ? css.drawOut : css.lineDown
  return (
    <div className={`${cls} ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
