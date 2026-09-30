'use client'

import { useEffect, useState } from 'react'

/**
 * כמה גדולה הזכוכית — the one number in the shell that is about the SCREEN and not the life.
 *
 * The seam is here because this is the only piece of `LifeStage` that never asks the game
 * anything. It does not touch the bus, the engine, the runtime or the save; it measures a
 * browser window and hands back a multiplier. Everything else in the shell is downstream of
 * something the child did — this is downstream of what the player is holding.
 *
 * The shell was drawn for a 390px phone in CSS pixels, and on a laptop it stayed 390px-small
 * over a painting ten times the size: a postage-stamp HUD in the corner of a cinema. So every
 * floating thing scales with the glass — one on a phone, up to 1.5× on a desktop, never so
 * much that the sheets outgrow the height. That ceiling is not a taste: the album, the profile
 * and the help sheet are all as tall as they are allowed to be, and a scale that ignored the
 * window's height would push their last line under the fold on a short laptop screen.
 *
 * It stays a hook rather than a CSS clamp because the value is published as `--ui-scale` on
 * one element and read by a dozen stylesheets. One number, measured once, in one place.
 */
export function useUiScale(): number {
  const [uiScale, setUiScale] = useState(1)
  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setUiScale(Number(Math.max(1, Math.min(1.5, w / 430, h / 620)).toFixed(2)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return uiScale
}
