/**
 * LIFE, universal — words.
 *
 * Chapters are written once, in English, with tokens for everything that belongs to a club:
 * `{club}`, `{city}`, `{ground}`, `{friend}`… `fillChapter` puts a pack's own words in. A token
 * the pack cannot fill is a build error, never a hole in a sentence.
 *
 * Every line also has a stable id (`chapter/talk/branch/line`), which is what a translation
 * hangs on: a locale file overrides text by id and the English stays the source.
 */
import type {Chapter, Tx} from './types'

export type Vars = Record<string, string>
const TOKEN = /\{([a-zA-Z]+)\}/g

export function fill(t: Tx, vars: Vars): Tx {
  return t.replace(TOKEN, (whole, key: string) => {
    if (!Object.hasOwn(vars, key)) throw new Error(`LIFE_TEXT_TOKEN_UNKNOWN: {${key}} in "${t.slice(0, 60)}"`)
    return vars[key]!
  })
}

/** Every text of a chapter, by id. Used to fill tokens, to translate, and to prove nothing is empty. */
export function mapText(chapter: Chapter, fn: (t: Tx, id: string) => Tx): Chapter {
  const id = (...p: (string | number)[]) => [chapter.id, ...p].join('/')
  return {
    ...chapter,
    title: fn(chapter.title, id('title')), kicker: fn(chapter.kicker, id('kicker')), intro: fn(chapter.intro, id('intro')),
    names: chapter.names && Object.fromEntries(Object.entries(chapter.names).map(([who, n]) => [who, fn(n, id('name', who))])),
    spots: chapter.spots.map(s => ({...s, label: fn(s.label, id('spot', s.id))})),
    doors: chapter.doors.map(d => ({...d, label: fn(d.label, id('door', d.id)), blocked: d.blocked === undefined ? undefined : fn(d.blocked, id('door', d.id, 'blocked'))})),
    objectives: chapter.objectives.map(o => ({...o, t: fn(o.t, id('objective', o.id))})),
    talks: chapter.talks.map(t => ({...t, branches: t.branches.map((b, bi) => ({
      ...b,
      lines: b.lines.map((l, li) => ({...l, t: fn(l.t, id('talk', t.id, bi, li))})),
      choices: b.choices?.map(c => ({...c, t: fn(c.t, id('talk', t.id, bi, 'choice', c.id))})),
    }))})),
    endings: Object.fromEntries(Object.entries(chapter.endings).map(([k, e]) => [k, {...e, title: fn(e.title, id('ending', k, 'title')), body: fn(e.body, id('ending', k, 'body'))}])),
    cards: chapter.cards?.map(c => ({...c, kicker: fn(c.kicker, id('card', c.id, 'kicker')), title: fn(c.title, id('card', c.id, 'title')), body: fn(c.body, id('card', c.id, 'body'))})),
    keepsakes: chapter.keepsakes?.map(k => ({...k, name: fn(k.name, id('keep', k.id, 'name')), note: fn(k.note, id('keep', k.id, 'note'))})),
  }
}

export const fillChapter = (chapter: Chapter, vars: Vars): Chapter => mapText(chapter, t => fill(t, vars))

/** id → English, for whoever translates. */
export function catalogue(chapters: readonly Chapter[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of chapters) mapText(c, (t, id) => { out[id] = t; return t })
  return out
}
