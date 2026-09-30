/**
 * אותיות שבלונה — block letters cut out of card, as cells on a grid (delta 91).
 *
 * A stencil is not a font: it is a set of holes. Each letter here is a small grid of filled
 * cells, and the mask the score reads and the mask the wall draws are the SAME cells — so a
 * letter the renderer shows is exactly a letter the spray can fill. No text rasterisation,
 * no font metrics, nothing that differs between a phone and Node.
 *
 * Only the letters the recipes spell are drawn. A letter that is not here renders as a
 * plain block, which is honest: a missing hole is a missing hole, not a crash.
 */

/** one letter: rows of `#` (hole) and `.` (card); every row the same width */
type Glyph = readonly string[]

export const GLYPH_ROWS = 7

const GLYPHS: Record<string, Glyph> = {
  ה: ['#####', '....#', '#...#', '#...#', '#...#', '#...#', '#...#'],
  פ: ['#####', '#...#', '#.#.#', '#.###', '#....', '#....', '#####'],
  ו: ['#', '#', '#', '#', '#', '#', '#'],
  ע: ['#...#', '#...#', '#...#', '.#..#', '.#..#', '..#.#', '.####'],
  ל: ['..#..', '...#.', '....#', '.####', '....#', '....#', '.###.'],
  א: ['#...#', '##..#', '.#..#', '..#..', '#..#.', '#..##', '#...#'],
  ד: ['#####', '....#', '....#', '....#', '....#', '....#', '....#'],
  מ: ['.###.', '#...#', '##..#', '#.#.#', '#...#', '#...#', '#.###'],
  ם: ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'],
  י: ['.....', '.....', '..##.', '...#.', '...#.', '.....', '.....'],
  ת: ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '##..#'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
}

const UNKNOWN: Glyph = ['#####', '#####', '#####', '#####', '#####', '#####', '#####']

/** a cell of the word's grid: column from the LEFT edge, row from the top */
export type StencilCell = readonly [col: number, row: number]

export type StencilGrid = {
  cols: number
  rows: number
  cells: readonly StencilCell[]
}

/**
 * Lay a word out on one grid, right to left (the first letter is at the right edge), one
 * empty column between letters. Columns are counted from the left so the cells map onto a
 * box the same way an SVG rect does.
 */
export function stencilGrid(text: string): StencilGrid {
  const letters = [...text].map((ch) => GLYPHS[ch] ?? UNKNOWN)
  const widths = letters.map((glyph) => (glyph[0] ?? '').length)
  const cols = widths.reduce((sum, w) => sum + w, 0) + Math.max(0, letters.length - 1)
  const cells: StencilCell[] = []
  // walk from the right edge: the first letter's LAST column is `cols - 1`
  let end = cols
  letters.forEach((glyph, index) => {
    const width = widths[index] ?? 0
    const start = end - width
    glyph.forEach((row, r) => {
      for (let c = 0; c < width; c++) if (row[c] === '#') cells.push([start + c, r])
    })
    end = start - 1
  })
  return { cols: Math.max(1, cols), rows: GLYPH_ROWS, cells }
}

/** a rectangle in normalised surface units */
export type Rect = { x: number; y: number; w: number; h: number }

/**
 * The card a placed stencil occupies on its surface, from the mark's centre and scale. The
 * card is wider than the word by half a cell each side and a row above and below — the
 * blank border a real card has, where spray is stopped without being a hole.
 */
export function stencilCard(grid: StencilGrid, x: number, y: number, scale: number, aspect: number): Rect {
  // one cell is square on the glass: width in x-units (a fraction of the width), height in
  // y-units — divided by the surface's aspect (h / w), the way `score.ts` widens a brush
  const cell = (0.72 * scale) / (grid.cols + 1)
  const w = cell * (grid.cols + 1)
  const h = (cell / aspect) * (grid.rows + 2)
  return { x: x - w / 2, y: y - h / 2, w, h }
}

/** the holes of a placed card, as normalised rectangles — what the spray may reach */
export function stencilHoles(grid: StencilGrid, card: Rect): Rect[] {
  const cw = card.w / (grid.cols + 1)
  const ch = card.h / (grid.rows + 2)
  return grid.cells.map(([c, r]) => ({ x: card.x + cw * (c + 0.5), y: card.y + ch * (r + 1), w: cw, h: ch }))
}
