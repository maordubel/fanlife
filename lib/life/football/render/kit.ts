/**
 * החולצות — kits as canvas textures, generated, never bitmaps.
 *
 * Rule 20 already says it for the site: a shirt is eight layers, never an image. The same
 * holds harder in 3D, where a photographed kit would be a rights problem, a download and a
 * thing that cannot change colour for the away side. So a kit is a spec — base, pattern,
 * sleeves, collar, shorts, socks — drawn onto a canvas at load and reused by every player
 * wearing it. Twenty-two players cost two textures.
 *
 * **הצהוב.** Rule 8 forbids yellow absolutely and this file is the only place in the game
 * that can produce it, under the grant Maor made on 7.9.2026 — yellow marks OPPONENTS, and
 * opponents only. That limit is not a comment: `awayMarkColour` throws when it is asked
 * for the player's own side, and the colour itself lives in `lib/brand/yellowExemptions.ts`
 * beside the reason it is allowed, so that neither the runtime palette nor any file under
 * `lib/life/` ever holds a yellow value. A yellow Hapoel shirt is unreachable, not merely
 * forbidden.
 */
import { LIFE_PALETTE } from '../../runtime/palette'
import { runtimeYellow } from '../../../brand/yellowExemptions'
import type { Side } from '../types'

export const AWAY_KIT_SURFACE = 'football/away-kit'

export type KitPattern = 'solid' | 'pinstripe' | 'diagonal' | 'hoops' | 'sash'

export type KitSpec = {
  base: number
  ink: number
  pattern: KitPattern
  collar: number
  sleeve: number
  shorts: number
  socks: number
  /** the number on the back, in this ink */
  numberInk: number
}

/**
 * The one approved yellow, and the one side that may wear it.
 *
 * Throws for `home`. The grant said opponents only, and the cheapest way to keep a grant
 * is to make the wrong call impossible rather than reviewable.
 */
export function awayMarkColour(side: Side): number {
  if (side !== 'away') {
    throw new Error('awayMarkColour: yellow marks the opponent only — never the player’s own side')
  }
  return hexToInt(runtimeYellow(AWAY_KIT_SURFACE))
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

/** Hapoel red at home, in the era's cut. Never yellow, in any era, for any reason. */
export function homeKit(): KitSpec {
  return {
    base: LIFE_PALETTE.red,
    ink: LIFE_PALETTE.chalk,
    pattern: 'solid',
    collar: LIFE_PALETTE.chalk,
    sleeve: LIFE_PALETTE.red,
    shorts: LIFE_PALETTE.chalk,
    socks: LIFE_PALETTE.red,
    numberInk: LIFE_PALETTE.chalk,
  }
}

/**
 * The opponent.
 *
 * `mark` puts the approved yellow on the away shirt — the one use Maor approved, and the
 * one that makes twenty-two figures instantly readable as two teams on a small screen.
 * Without it the away side is chalk and ink, which is also correct and is what a match
 * against a white-shirted opponent uses.
 */
export function awayKit(mark: boolean): KitSpec {
  const base = mark ? awayMarkColour('away') : LIFE_PALETTE.chalk
  return {
    base,
    ink: LIFE_PALETTE.ink,
    pattern: mark ? 'solid' : 'pinstripe',
    collar: LIFE_PALETTE.ink,
    sleeve: base,
    shorts: LIFE_PALETTE.ink,
    socks: base,
    numberInk: LIFE_PALETTE.ink,
  }
}

export function keeperKit(side: Side): KitSpec {
  const base = side === 'home' ? LIFE_PALETTE.trackBlack : LIFE_PALETTE.navy
  return {
    base,
    ink: LIFE_PALETTE.chalk,
    pattern: 'solid',
    collar: LIFE_PALETTE.chalk,
    sleeve: base,
    shorts: base,
    socks: base,
    numberInk: LIFE_PALETTE.chalk,
  }
}

const css = (value: number) => `#${value.toString(16).padStart(6, '0')}`

/**
 * The shirt, drawn.
 *
 * 128 × 128 is enough: at broadcast distance a shirt is forty pixels tall, and the thing
 * the eye actually reads is the base colour and the number. The number is drawn large and
 * high so it survives the figure's torso curvature, and it is omitted entirely when the
 * archive does not hold one — a blank shirt is honest and an invented number is a claim
 * about a real footballer.
 */
export function shirtTexture(
  spec: KitSpec,
  shirt: number | null,
  make: () => HTMLCanvasElement,
): HTMLCanvasElement {
  const size = 128
  const canvas = make()
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.fillStyle = css(spec.base)
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = css(spec.ink)
  ctx.globalAlpha = 0.28
  ctx.lineWidth = 3
  if (spec.pattern === 'pinstripe') {
    for (let x = 6; x < size; x += 12) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, size)
      ctx.stroke()
    }
  } else if (spec.pattern === 'diagonal') {
    for (let x = -size; x < size * 2; x += 18) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + size, size)
      ctx.stroke()
    }
  } else if (spec.pattern === 'hoops') {
    for (let y = 8; y < size; y += 22) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }
  } else if (spec.pattern === 'sash') {
    ctx.lineWidth = 16
    ctx.beginPath()
    ctx.moveTo(0, size)
    ctx.lineTo(size, 0)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // collar
  ctx.fillStyle = css(spec.collar)
  ctx.fillRect(0, 0, size, 9)

  if (shirt !== null) {
    ctx.fillStyle = css(spec.numberInk)
    ctx.font = `700 ${Math.round(size * 0.46)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(shirt), size / 2, size * 0.52)
  }

  return canvas
}
