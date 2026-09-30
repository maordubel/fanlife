/**
 * סימני היצרנים — which alternative mark stands for which real maker (rule 25).
 *
 * Moved out of `components/kit/MakerMark.tsx` on 21.9.2026 so the Kit Master builder, which
 * runs in plain node without JSX, reads the same table the drawing does.
 */

export type MakerMarkId = 'strike' | 'adio' | 'classic' | 'blackdog' | 'rombus' | 'micron' | 'twin' | 'dia'

/**
 * Real maker → its mark in the alternative set.
 *
 * adidas takes CLASSIC for the trefoil era and ADIO for the modern one, which is the
 * distinction the club's own shirts make: the 1980s adidas shirts carry the trefoil and
 * the 2021 ones carry the bars. `markFor` resolves the era.
 */
const BY_MAKER: Record<string, MakerMarkId> = {
  NIKE: 'strike',
  adidas: 'adio',
  PUMA: 'blackdog',
  umbro: 'rombus',
  MACRON: 'micron',
  KAPPA: 'twin',
  diadora: 'dia',
}

export function markFor(maker: string | null, seasonLabel?: string): MakerMarkId | null {
  if (!maker) return null
  const mark = BY_MAKER[maker]
  if (!mark) return null
  // The trefoil belonged to the eighties. An adidas shirt from before the nineties gets
  // CLASSIC; everything later gets ADIO.
  if (mark === 'adio' && seasonLabel && Number(seasonLabel.slice(0, 4)) < 1992) return 'classic'
  return mark
}
