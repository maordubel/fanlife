/**
 * LIFE, universal — the sky over a chapter.
 *
 * A day is not always the same day: some chapters are wet, some end in a low evening light. It is
 * decided from the chapter's own id (so a life always remembers the weather it grew up in, and two
 * clubs' same-numbered chapters do not match), and only under open sky — never in a room with a roof.
 */
import type {TimeOfDay} from './types'

export type Sky = {weather: 'rain' | null; mood: 'normal' | 'dusk' | 'rain'}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** `outdoors` is the room's, not the chapter's: indoors the weather is only a sound on the window, which this does not draw. */
export function skyOf(chapterId: string, time: TimeOfDay, outdoors: boolean): Sky {
  if (!outdoors) return {weather: null, mood: 'normal'}
  const k = hash(chapterId) % 5
  if (k === 0) return {weather: 'rain', mood: 'rain'}
  if (k === 1 && time === 'day') return {weather: null, mood: 'dusk'}
  return {weather: null, mood: 'normal'}
}
