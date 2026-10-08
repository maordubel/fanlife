/** Small hands for writing the second screenplay: a line, a pair of words, a choice, a scene. */
import type {Effect} from '../types'
import type {ChapterScript, Option, SceneScript, Speech, Words} from './types'

export const s = (who: string | null, en: string, he: string): Speech => [who, en, he]
export const t = (en: string, he: string): Words => [en, he]
/** A choice: its words, what is said back, and what it records. Nothing is committed until the errand is done. */
export const o = (id: string, text: Words, reply: Speech | Speech[], effects: Effect[] = [], more: Partial<Option> = {}): Option =>
  ({id, text, reply: Array.isArray(reply) && Array.isArray(reply[0]) ? reply as Speech[] : [reply as Speech], effects, ...more})
export const sc = (x: SceneScript): SceneScript => x
export const chapter = (x: {id: string; age: number; act: 1 | 2 | 3; title: Words; intro: Words; keep: {id: string; name: Words; note: Words}; scenes: SceneScript[]}): ChapterScript =>
  ({id: x.id, age: x.age, act: x.act, title: x.title, intro: x.intro, keepsake: x.keep, scenes: x.scenes})
