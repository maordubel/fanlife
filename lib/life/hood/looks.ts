/**
 * LIFE · the hood — who wears what (owner, 28.11.2026: "clothes for every period; a real, human, nostalgic street").
 *
 * Pure. The asset pipeline dresses LOOKS: a face, hair and the clothes of a decade on the people's one skeleton
 * (`public/life/assets/manifest.json` → `looks.index`). This chooses the look of each key person of a life:
 *   - THE WORKER's own people (`canon`) dress Hapoel Tel Aviv and nobody else (rule life-worker-art);
 *   - everybody else wears the archetype of his role in the clothes of the DECADE the street is in, and the nearest
 *     earlier decade when that one was not built;
 *   - the boy wears the look nearest his age, never an older boy's when a younger one fits.
 * Nothing is invented: no look for a role, no change (he keeps the plain body he had).
 */
export type LookPick = {id: string; asset: string; family: 'canon' | 'universal'; club: string | null; role: string; age: number; decade: string}
export type LookRole = 'father' | 'mother' | 'hero' | 'friend' | 'kiosk' | 'neighbour'

const DECADES = ['70s', '80s', '90s', '00s', '10s', '20s']
/** how far a look's decade is from the street's: 0 for the same, then earlier decades (a man keeps last decade's coat), then later */
const decadeGap = (look: string, want: string | null) => { if (!want) return look === '80s' ? 0 : 1; const a = DECADES.indexOf(look), b = DECADES.indexOf(want); if (a < 0 || b < 0) return 9; return a === b ? 0 : a < b ? b - a : (a - b) + 3 }

export function lookFor<T extends LookPick>(index: readonly T[], o: {role: LookRole; club: string; decade: string | null; /** the hero's age (other roles: ignored) */ age?: number}): T | null {
  const mine = index.filter(r => r.role === o.role && (r.family === 'universal' ? r.club === null : r.club === o.club))
  if (!mine.length) return null
  const ageGap = (r: T) => (o.role === 'hero' && typeof o.age === 'number' ? (r.age <= o.age ? o.age - r.age : (r.age - o.age) + 4) : 0)
  // a club's own people first; then the right age; then the right decade; the list's own order settles the rest
  return [...mine].sort((a, b) => Number(b.family === 'canon') - Number(a.family === 'canon') || ageGap(a) - ageGap(b) || decadeGap(a.decade, o.decade) - decadeGap(b.decade, o.decade))[0]!
}

/** the people of the hood, by the id the level gives them */
export const ROLE_OF: Readonly<Record<string, LookRole>> = {dad: 'father', mate: 'friend', kiosk: 'kiosk', neighbour: 'neighbour', mum: 'mother'}
