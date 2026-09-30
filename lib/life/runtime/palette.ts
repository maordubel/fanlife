/**
 * לוח הצבעים של 1986 — the world's ink.
 *
 * Every colour the runtime can draw is declared here, once. Two reasons it is a file
 * and not a scattering of literals:
 *
 *  · **חוק הצהוב.** Rule 8 is absolute and it does not care that a pixel came from a
 *    Graphics call instead of a stylesheet. `tests/life.test.ts` runs every value here
 *    through `lib/isYellow.ts`, so a warm ochre that drifts into the band fails a test
 *    instead of reaching a screen. South Tel Aviv is a sandy place and the temptation is
 *    constant — every plaster here is held under 35% saturation, which is what keeps
 *    sand reading as sand rather than as the other club.
 *  · **Decades.** 1990 is the same geometry in different paint. Colour lives in the
 *    palette and geometry lives in the map, so a decade is a palette swap plus a layer
 *    list, never a rewrite. `paletteFor(year)` is the seam that already exists for it.
 *
 * Hapoel red is used the way brief §12 asks: the world is muted and the red is not. It
 * appears on a shirt, a scarf, a sticker, a sign, a flag — and nowhere else.
 */

export const LIFE_PALETTE = {
  // --- sky and light -------------------------------------------------------------
  /** the one pure white in the game: the door-glow texture, which is always tinted */
  glow: 0xffffff,
  sky: 0x8fb4ce,
  skyDeep: 0x6f9ab8,
  skyDusk: 0x5d6f8c,
  night: 0x100d0a,
  lamp: 0xf4eedd,

  // --- ground --------------------------------------------------------------------
  dirt: 0xc0ac8c,
  dirtDark: 0xa89578,
  concrete: 0xc9bfa4,
  concreteDark: 0xa89f88,
  asphalt: 0x6b6862,
  asphaltLine: 0xd7d2c6,
  tile: 0xd2c6ae,
  tileLine: 0xb3a78f,
  grass: 0x6e9a55,
  grassDark: 0x5c7f47,
  chalk: 0xf7f4ec,

  // --- buildings -----------------------------------------------------------------
  plaster: 0xc9b79a,
  plasterShade: 0xa08d74,
  plasterCool: 0xb6b3a6,
  stone: 0xbdb3a2,
  roof: 0x8c5a3c,
  shutter: 0x4e6b52,
  shutterOpen: 0x2f3f34,
  windowGlass: 0x6f7f86,
  doorWood: 0x6d4a30,
  rail: 0x5c5a52,
  rust: 0x8c5a3c,

  // --- interior ------------------------------------------------------------------
  floorWood: 0xa9825c,
  floorWoodDark: 0x8a6947,
  rug: 0x8f4436,
  furniture: 0x7a5537,
  furnitureDark: 0x5c3f28,
  cloth: 0xb7a68a,
  sheet: 0xe9dfc7,
  paperCream: 0xefe7d5,

  // --- people --------------------------------------------------------------------
  skin: 0xc09b71,
  skinShade: 0xa6845e,
  hair: 0x3a2a1e,
  hairLight: 0x5a4130,
  denim: 0x3e5c82,
  denimDark: 0x2c4460,
  workShirt: 0x5c7c9e,
  shorts: 0x2f3a4a,
  shoe: 0xd8d2c4,
  shoeDark: 0x3b3630,
  trackBlack: 0x23201c,

  // --- the club ------------------------------------------------------------------
  red: 0xb02d10,
  redDeep: 0xb22a2a,
  redInk: 0x8f2118,
  ink: 0x15120e,
  navy: 0x1e2c5a,

  // --- crowd (six muted coats, so a terrace is not one flat block) ----------------
  crowdA: 0x8a7f6c,
  crowdB: 0x6c6459,
  crowdC: 0x9a8b74,
  crowdD: 0x55524c,
  crowdE: 0xa2604a,
  crowdF: 0x707a82,

  // --- vehicles ------------------------------------------------------------------
  carCream: 0xd8cdb4,
  carRed: 0xa83a2a,
  carGreen: 0x4f6350,
  carBlue: 0x53687e,
  glass: 0x8e9aa0,
  tyre: 0x2a2724,
} as const

export type LifeColour = keyof typeof LIFE_PALETTE

/** `0xb02d10` → `#b02d10`, for the DOM overlay and for the yellow test's readback. */
export function hex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`
}

/**
 * The decade seam. Stage A ships 1986 and returns the same table for every year, which
 * is honest: there is no 1990 palette yet and inventing one now would be a guess baked
 * into the architecture. What matters is that every scene already asks for its colours
 * through this function rather than importing the table, so adding a decade is adding a
 * branch here.
 */
export function paletteFor(_year: number): typeof LIFE_PALETTE {
  return LIFE_PALETTE
}
