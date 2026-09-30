import { placeOfScene } from '@/lib/life/map'
import { lifeStore } from '@/lib/life/save'

/**
 * Where a device's THE WORKER LIFE save stands — the year and, when the log holds a move,
 * the place. Read without Phaser (the save and map modules import types only), and only
 * from what the save actually says: no save, no year, no line (rule 11).
 */
export type LifeResume = { year: number; placeHe: string | null }

export async function readLifeResume(): Promise<LifeResume | null> {
  try {
    const file = await lifeStore.read()
    if (!file || !Number.isFinite(file.year)) return null
    let placeHe: string | null = null
    for (let i = file.events.length - 1; i >= 0; i -= 1) {
      const event = file.events[i] as { t?: string; to?: unknown }
      if (event?.t === 'moved' && typeof event.to === 'string') {
        placeHe = placeOfScene(event.to as Parameters<typeof placeOfScene>[0])?.labelHe ?? null
        break
      }
    }
    return { year: file.year, placeHe }
  } catch {
    return null
  }
}
