/**
 * How well a supporter is likely to KNOW the man — the PLAYER's difficulty, kept apart from
 * the difficulty of any one clue (`BlindCowClue.difficulty` is about how few men a clue
 * leaves standing; this is about how famous the man is). Delta 100, owner brief 29.9.2026.
 *
 * Two inputs, both real:
 *  · appearances (65–75% of the score) — the wiki's own infobox figure, where the page states
 *    one (`content/manual/player-appearances.json`, ~100 of 657 men). Where it does not, it is
 *    `null` and STAYS null: never the season count standing in for it (rule 11).
 *  · the Royal Rumble price (25–35%) — €1…€5, the same draft economy the supporters already
 *    read as "how big is he".
 * A man with no appearance figure is scored on price alone and says so (`basis: 'price'`).
 *
 * Pure: no server-only import, so the builder, the tests and the audit all use it.
 */

export type RecognitionTier = 'familiar' | 'known' | 'deep'

export type PlayerRecognition = {
  /** 0–100, higher = more people know him */
  score: number
  tier: RecognitionTier
  /** the infobox figure, or null — never estimated */
  appearances: number | null
  price: 1 | 2 | 3 | 4 | 5
  basis: 'appearances+price' | 'price'
}

/** share of the score that appearances carry when they exist (the rest is price) */
export const APPEARANCE_WEIGHT = 0.7
export const FAMILIAR_FROM = 62
export const KNOWN_FROM = 30

export function tierOf(score: number): RecognitionTier {
  return score >= FAMILIAR_FROM ? 'familiar' : score >= KNOWN_FROM ? 'known' : 'deep'
}

export type RecognitionInput = {
  playerId: string
  price: 1 | 2 | 3 | 4 | 5
  /** null when the page states none */
  appearances: number | null
}

/**
 * Appearances are ranked against the OTHER men who have a figure (a percentile, so 143 and
 * 1,430 are not compared as raw numbers), then blended with the price.
 */
export function buildRecognition(rows: readonly RecognitionInput[]): Map<string, PlayerRecognition> {
  const known = rows.filter((row) => row.appearances !== null).map((row) => row.appearances as number).sort((a, b) => a - b)
  const percentile = (value: number): number => {
    if (known.length <= 1) return 0.5
    let below = 0
    for (const v of known) if (v < value) below += 1
    let equal = 0
    for (const v of known) if (v === value) equal += 1
    return (below + (equal - 1) / 2) / (known.length - 1)
  }
  const out = new Map<string, PlayerRecognition>()
  for (const row of rows) {
    const priceScore = (row.price - 1) / 4
    const score =
      row.appearances === null
        ? priceScore * 100
        : (APPEARANCE_WEIGHT * percentile(row.appearances) + (1 - APPEARANCE_WEIGHT) * priceScore) * 100
    const rounded = Math.round(score)
    out.set(row.playerId, {
      score: rounded,
      tier: tierOf(rounded),
      appearances: row.appearances,
      price: row.price,
      basis: row.appearances === null ? 'price' : 'appearances+price',
    })
  }
  return out
}
