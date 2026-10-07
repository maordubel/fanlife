import type {Cond, Effect, MiniGame} from '../types'

/** Authored fiction only. No match fact belongs in these strings. */
export type Words = readonly [en: string, he: string]
export type Speech = readonly [who: string | null, en: string, he: string]
export type Option = {
  id: string; text: Words; reply: Speech[]; effects?: Effect[]; when?: Cond; action?: Speech[]
}
export type Callback = {when: Cond; lines: Speech[]}
export type SceneScript = {
  id: string; room: string; who: string; title: Words; lines: Speech[]
  options: Option[]; task: Words; action: Speech[]; game?: MiniGame
  callbacks?: Callback[]
  presence?: Cond
  locations?: {room:string; when:Cond}[]
  company?: {who:string; slot:string; when:Cond}[]
}
export type ChapterScript = {
  id: string; age: number; act: 1 | 2 | 3; title: Words; intro: Words
  keepsake: {id: string; name: Words; note: Words}
  scenes: SceneScript[]
}
export const flag = (k: string, v: string | number | boolean = true): Effect => ({e:'flag',k,v})
export const is = (k: string, v: string | number | boolean): Cond => ({is:[k,v]})
export const bond = (who: string, by: number): Effect => ({e:'bond',who,by})
export const speech = (who: string | null, en: string, he: string): Speech => [who,en,he]
