/**
 * הדשא — a pitch drawn rather than photographed, and allowed to look its age.
 *
 * Two canvases, both generated: one for the grass and one for the markings. Keeping them
 * apart means the lines are crisp at any grass resolution and that an era can change the
 * turf without redrawing a single line — a 1986 pitch in May is worn, dry at the ends and
 * a long way from a modern hybrid carpet, and that difference is one parameter here.
 *
 * The mowing bands are the whole trick. A flat green plane reads as a snooker table from
 * the first frame; alternating stripes down the length of the pitch, with a little tonal
 * noise inside each one, reads as grass immediately and costs one loop. The worn patches
 * in the goalmouths and along the touchlines are the second-cheapest realism in the
 * renderer after the net.
 *
 * **Watch the hue.** Over-saturated grass drifts toward yellow, and rule 8 does not care
 * that it was an accident. Everything here comes from `LIFE_PALETTE.grass` and
 * `grassDark`, which the palette test already proves are not yellow.
 */
import { LIFE_PALETTE } from '../../runtime/palette'
import {
  BOX_DEPTH,
  BOX_HALF_WIDTH,
  CENTRE_RADIUS,
  CORNER_RADIUS,
  HALF_LENGTH,
  HALF_WIDTH,
  LENGTH,
  PENALTY_SPOT,
  SIX_DEPTH,
  SIX_HALF_WIDTH,
  WIDTH,
} from '../pitch'

export type TurfCondition = {
  /** 0 = a modern carpet, 1 = the end of a long season on a 1980s ground */
  wear: number
  /** how many mowing bands across the length */
  bands: number
}

export const ERA_TURF: Record<string, TurfCondition> = {
  'mid-1980s': { wear: 0.85, bands: 8 },
  'early-1990s': { wear: 0.7, bands: 10 },
  'late-1990s': { wear: 0.5, bands: 12 },
  '2000': { wear: 0.4, bands: 14 },
}

const css = (value: number) => `#${value.toString(16).padStart(6, '0')}`

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}

/**
 * The grass.
 *
 * `noise` is passed in rather than taken from `Math.random`, so the same match always
 * grows the same pitch: the renderer hands it the seeded roller the simulation uses, and
 * a screenshot taken in the yellow probe is the screenshot a player sees.
 */
export function turfTexture(
  size: number,
  condition: TurfCondition,
  noise: (index: number) => number,
  make: () => HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = make()
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const light = LIFE_PALETTE.grass
  const dark = LIFE_PALETTE.grassDark
  const worn = mix(dark, LIFE_PALETTE.dirt, 0.45 * condition.wear)

  // mowing bands, down the length
  const band = size / condition.bands
  for (let i = 0; i < condition.bands; i += 1) {
    ctx.fillStyle = css(i % 2 === 0 ? light : mix(light, dark, 0.55))
    ctx.fillRect(0, i * band, size, band + 1)
  }

  // tonal grain inside the bands — the difference between grass and a green rectangle
  const grains = Math.round(size * size * 0.012)
  for (let i = 0; i < grains; i += 1) {
    const x = noise(i * 3) * size
    const y = noise(i * 3 + 1) * size
    const shade = noise(i * 3 + 2)
    ctx.fillStyle = css(mix(light, dark, 0.25 + shade * 0.5))
    ctx.globalAlpha = 0.16 + shade * 0.14
    ctx.fillRect(x, y, 2, 2)
  }
  ctx.globalAlpha = 1

  // wear: the goalmouths and the two touchlines, scrubbed toward bare earth
  const patch = (cx: number, cy: number, rx: number, ry: number, strength: number) => {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry))
    gradient.addColorStop(0, css(worn))
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save()
    ctx.globalAlpha = strength * condition.wear
    ctx.translate(cx, cy)
    ctx.scale(1, ry / Math.max(rx, ry))
    ctx.translate(-cx, -cy)
    ctx.fillStyle = gradient
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2)
    ctx.restore()
  }
  patch(size * 0.045, size * 0.5, size * 0.06, size * 0.14, 0.55)
  patch(size * 0.955, size * 0.5, size * 0.06, size * 0.14, 0.55)
  patch(size * 0.5, size * 0.5, size * 0.1, size * 0.06, 0.28)
  patch(size * 0.5, size * 0.02, size * 0.5, size * 0.03, 0.35)
  patch(size * 0.5, size * 0.98, size * 0.5, size * 0.03, 0.35)

  return canvas
}

/**
 * The markings, on their own transparent layer, at the real dimensions.
 *
 * Drawn in metres and scaled once, so the penalty area is 40.32 by 16.5 on the texture
 * for the same reason it is in the simulation: a pitch whose box is nearly right reads as
 * wrong instantly and nobody can say why.
 */
export function linesTexture(size: number, make: () => HTMLCanvasElement): HTMLCanvasElement {
  const canvas = make()
  canvas.width = size
  canvas.height = Math.round(size * (WIDTH / LENGTH))
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const scale = canvas.width / LENGTH
  const toX = (x: number) => (x + HALF_LENGTH) * scale
  const toZ = (z: number) => (z + HALF_WIDTH) * scale

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = css(LIFE_PALETTE.chalk)
  ctx.fillStyle = css(LIFE_PALETTE.chalk)
  ctx.lineWidth = Math.max(1.6, scale * 0.12)
  ctx.globalAlpha = 0.82

  ctx.strokeRect(toX(-HALF_LENGTH), toZ(-HALF_WIDTH), LENGTH * scale, WIDTH * scale)

  ctx.beginPath()
  ctx.moveTo(toX(0), toZ(-HALF_WIDTH))
  ctx.lineTo(toX(0), toZ(HALF_WIDTH))
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(toX(0), toZ(0), CENTRE_RADIUS * scale, 0, Math.PI * 2)
  ctx.stroke()

  const spot = (x: number, z: number) => {
    ctx.beginPath()
    ctx.arc(toX(x), toZ(z), Math.max(1.5, scale * 0.16), 0, Math.PI * 2)
    ctx.fill()
  }
  spot(0, 0)

  for (const side of [-1, 1]) {
    const goalLine = HALF_LENGTH * side
    ctx.strokeRect(
      toX(Math.min(goalLine, goalLine - BOX_DEPTH * side)),
      toZ(-BOX_HALF_WIDTH),
      BOX_DEPTH * scale,
      BOX_HALF_WIDTH * 2 * scale,
    )
    ctx.strokeRect(
      toX(Math.min(goalLine, goalLine - SIX_DEPTH * side)),
      toZ(-SIX_HALF_WIDTH),
      SIX_DEPTH * scale,
      SIX_HALF_WIDTH * 2 * scale,
    )
    spot(goalLine - PENALTY_SPOT * side, 0)

    // the D: the arc of the centre circle radius outside the box
    ctx.beginPath()
    const cx = toX(goalLine - PENALTY_SPOT * side)
    const from = side === 1 ? Math.PI * 0.72 : -Math.PI * 0.28
    ctx.arc(cx, toZ(0), CENTRE_RADIUS * scale, from, from + Math.PI * 0.56)
    ctx.stroke()

    for (const z of [-HALF_WIDTH, HALF_WIDTH]) {
      ctx.beginPath()
      ctx.arc(toX(goalLine), toZ(z), CORNER_RADIUS * scale, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  ctx.globalAlpha = 1
  return canvas
}
