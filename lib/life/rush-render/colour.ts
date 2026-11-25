/**
 * LIFE · RUSH — the colour policy (rule 95): which colours a club's picture never shows.
 * Pure (no three, no DOM), so the simulation side and the tests can ask the same question the stage does.
 */
import type {VoxelSkin} from '@/lib/life/universal/skin'

function hsv(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return {h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx}
}
function family(hex: string): string | null {
  const x = hsv(hex)
  if (x.s < 0.2) return null
  return x.h <= 18 || x.h >= 342 ? 'red' : x.h >= 38 && x.h <= 70 ? 'yellow' : x.h >= 90 && x.h <= 170 ? 'green' : x.h >= 190 && x.h <= 260 ? 'blue' : null
}
/** a colour this club's picture never shows: a rival's family, or a hue the club's own policy forbids */
export function bannedColour(hex: string, skin: Pick<VoxelSkin, 'rivals' | 'policy'>): boolean {
  const f = family(hex)
  if (f && skin.rivals?.includes(f)) return true
  const c = hsv(hex)
  return skin.policy.some(r => c.s >= r.minSaturation && c.v >= r.minValue && (r.hue[0] <= r.hue[1] ? c.h >= r.hue[0] && c.h <= r.hue[1] : c.h >= r.hue[0] || c.h <= r.hue[1]))
}
