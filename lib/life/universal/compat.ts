import type {LifeEvent, LifePack} from './types'

/**
 * Whether a save still folds into a pack (CF-10). The engine (`Life.load`) and the light progress reader on the club page
 * both ask THIS, so a card can never offer "Continue" for a life the game would refuse and open as a new one.
 * The compat list is small and serialisable — chapter and room ids — so a page can hand it to the browser without the pack.
 */
export type LifeCompat = {chapters: readonly string[]; rooms: readonly string[]}
export const compatOf = (pack: Pick<LifePack, 'chapters' | 'rooms'>): LifeCompat => ({chapters: pack.chapters.map(c => c.id), rooms: Object.keys(pack.rooms)})
export function compatible(c: LifeCompat, events: readonly LifeEvent[]): boolean {
  const chapters = new Set(c.chapters), rooms = new Set(c.rooms)
  return events.every(e => (e?.t !== 'chapter' || chapters.has(e.id)) && (e?.t !== 'moved' || rooms.has(e.room)))
}
