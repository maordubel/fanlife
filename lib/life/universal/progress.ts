import {SAVE_VERSION, saveKey} from './engine'

/**
 * A light reader of a club's LIFE save (Connected Football): how far this device has lived, without loading the engine
 * or the pack. It only says what the save itself says — the number of chapters entered — and nothing for a save of
 * another club, another version, or none at all.
 */
export function lifeProgress(clubId: string, store: Pick<Storage, 'getItem'>): {chapters: number; savedAt: string | null} | null {
  try {
    const raw = store.getItem(saveKey(clubId))
    if (!raw) return null
    const f = JSON.parse(raw) as {v?: number; club?: string; events?: {t?: string; id?: string}[]; savedAt?: string}
    if (f.v !== SAVE_VERSION || f.club !== clubId || !Array.isArray(f.events)) return null
    const chapters = new Set(f.events.filter(e => e?.t === 'chapter' && typeof e.id === 'string').map(e => e.id)).size
    return chapters ? {chapters, savedAt: typeof f.savedAt === 'string' ? f.savedAt : null} : null
  } catch { return null }
}
