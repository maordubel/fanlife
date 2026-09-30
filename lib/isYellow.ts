/**
 * Is this colour yellow?
 *
 * Rule 8 forbids yellow absolutely, so this question needs one answer that the unit
 * test and the screenshot scanner both use — otherwise the two drift and "no yellow"
 * quietly becomes "no yellow according to whichever check ran last".
 *
 * Earlier attempts stacked channel inequalities (`r > 150 && g > 130 && b < …`) and
 * each one caught something it should not have: the printed grass, the badge's skin
 * tone, and every antialiased edge where vermilion ink meets cream paper. They were
 * all approximations of a thing that has an exact definition.
 *
 * Yellow is a HUE. It sits between roughly 38° and 70° on the wheel, and it has to be
 * saturated enough and bright enough to read as a colour at all — cream paper lands on
 * a yellow hue but at 15% saturation, which is paper, not yellow.
 *
 *   gold        #D8B25C → 42°, S 0.72  → yellow
 *   mark yellow #F5C518 → 47°, S 0.90  → yellow
 *   vermilion   #B02D10 → 11°, S 0.91  → red
 *   cream       #E9DFC7 → 42°, S 0.15  → paper
 *   grass       #8FBE63 → 91°, S 0.48  → green
 *   badge skin  ~#C09B71 → 32°, S 0.41 → skin
 */
export function isYellow(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return false

  const saturation = delta / max
  const value = max / 255
  if (saturation < 0.35 || value < 0.35) return false

  let hue: number
  if (max === r) hue = 60 * (((g - b) / delta + 6) % 6)
  else if (max === g) hue = 60 * ((b - r) / delta + 2)
  else hue = 60 * ((r - g) / delta + 4)

  return hue >= 38 && hue <= 70
}

/** `#RRGGBB` or `#RGB`. */
export function isYellowHex(hex: string): boolean {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean
  return isYellow(
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  )
}
