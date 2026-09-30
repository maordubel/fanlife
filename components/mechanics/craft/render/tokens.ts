import type { CraftColor } from '@/lib/game/craft/types'

/** a craft colour is a shell token; SVG reads it through `rgb(var(--…))` like every other drawing here (rule 8) */
export const TOKEN: Record<CraftColor, string> = {
  red: 'rgb(var(--red))',
  ink: 'rgb(var(--ink))',
  sheet: 'rgb(var(--sheet))',
  concrete: 'rgb(var(--concrete))',
  sign: 'rgb(var(--sign))',
}

/** the line that reads on a given ground — ink on anything light, sheet on ink */
export function contrastOn(color: CraftColor): string {
  return color === 'ink' || color === 'sign' ? TOKEN.sheet : TOKEN.ink
}
