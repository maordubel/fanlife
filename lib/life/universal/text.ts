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
import type {Chapter, Effect, Line, Tx} from './types'

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
  // a stamp carries words inside the effects that raise it
  const fx = (list: Effect[] | undefined, at: string): Effect[] | undefined => list?.map((e, i): Effect =>
    e.e === 'stamp' ? {...e, text: fn(e.text, `${at}/fx/${i}`)}
    // a line the episode's end card remembers is words too (`s1:log:` flags carry `kind|text`)
    : e.e === 'flag' && e.k.startsWith('s1:log:') && typeof e.v === 'string' ? {...e, v: fn(e.v, `${at}/fx/${i}`)}
    : e.e === 'play' ? {...e, then: fx(e.then, `${at}/fx/${i}/then`), good: fx(e.good, `${at}/fx/${i}/good`), slip: fx(e.slip, `${at}/fx/${i}/slip`)} : e)
  const lines = (ls: Line[], at: string): Line[] => ls.map((l, i) => ({...l, t: fn(l.t, `${at}/${i}`)}))
  // the hooks are words too: the phone, the box, the flash card, the tease, the letter
  const hooks = (e: NonNullable<Chapter['episode']>) => ({
    ...(e.texts ? {texts: e.texts.map((m, i) => ({from: fn(m.from, id('episode', 'text', i, 'from')), t: fn(m.t, id('episode', 'text', i))}))} : {}),
    ...(e.box ? {box: {item: fn(e.box.item, id('episode', 'box', 'item')), line: fn(e.box.line, id('episode', 'box', 'line'))}} : {}),
    ...(e.flash ? {flash: {...e.flash, card: fn(e.flash.card, id('episode', 'flash'))}} : {}),
    ...(e.tease ? {tease: fn(e.tease, id('episode', 'tease'))} : {}),
    ...(e.letter ? {letter: {head: fn(e.letter.head, id('episode', 'letter', 'head')), lines: e.letter.lines.map((l, i) => fn(l, id('episode', 'letter', i))), sign: fn(e.letter.sign, id('episode', 'letter', 'sign')), after: fn(e.letter.after, id('episode', 'letter', 'after'))}} : {}),
  })
  const season = {
    ...(chapter.episode ? {episode: {...chapter.episode, logline: fn(chapter.episode.logline, id('episode', 'logline')), ...(chapter.episode.next ? {next: fn(chapter.episode.next, id('episode', 'next'))} : {}), ...(chapter.episode.open ? {open: {...chapter.episode.open, ...(chapter.episode.open.mission ? {mission: fn(chapter.episode.open.mission, id('episode', 'mission'))} : {})}} : {}),
      ...hooks(chapter.episode)}} : {}),
    ...(chapter.clocks ? {clocks: chapter.clocks.map(c => ({...c, label: fn(c.label, id('clock', c.id)) }))} : {}),
    ...(chapter.barks ? {barks: chapter.barks.map(b => ({...b, lines: b.lines.map((l, i) => fn(l, id('bark', b.id, i)))}))} : {}),
    ...(chapter.cines ? {cines: chapter.cines.map(c => ({...c, shots: c.shots.map((sh, i) => sh.say ? {...sh, say: {...sh.say, t: fn(sh.say.t, id('cine', c.id, i))}} : sh)}))} : {}),
    ...(chapter.docs ? {docs: chapter.docs.map(d => ({...d, role: fn(d.role, id('doc', d.id, 'role')), lines: d.lines.map((l, i) => ({...l, t: fn(l.t, id('doc', d.id, i)), ...(l.secret ? {secret: fn(l.secret, id('doc', d.id, i, 'secret'))} : {})}))}))} : {}),
    ...(chapter.lives ? {lives: chapter.lives.map(l => ({...l, before: lines(l.before, id('live', l.id, 'before')), goal: lines(l.goal, id('live', l.id, 'goal')), against: lines(l.against, id('live', l.id, 'against')),
      end: {won: lines(l.end.won, id('live', l.id, 'won')), lost: lines(l.end.lost, id('live', l.id, 'lost')), drew: lines(l.end.drew, id('live', l.id, 'drew')), unread: lines(l.end.unread, id('live', l.id, 'unread'))}}))} : {}),
  }
  return {
    ...chapter,
    ...season,
    title: fn(chapter.title, id('title')), kicker: fn(chapter.kicker, id('kicker')), intro: fn(chapter.intro, id('intro')),
    names: chapter.names && Object.fromEntries(Object.entries(chapter.names).map(([who, n]) => [who, fn(n, id('name', who))])),
    spots: chapter.spots.map(s => ({...s, label: fn(s.label, id('spot', s.id))})),
    doors: chapter.doors.map(d => ({...d, label: fn(d.label, id('door', d.id)), blocked: d.blocked === undefined ? undefined : fn(d.blocked, id('door', d.id, 'blocked'))})),
    objectives: chapter.objectives.map(o => ({...o, t: fn(o.t, id('objective', o.id))})),
    talks: chapter.talks.map(t => ({...t, branches: t.branches.map((b, bi) => ({
      ...b,
      lines: b.lines.map((l, li) => ({...l, t: fn(l.t, id('talk', t.id, bi, li))})),
      choices: b.choices?.map(c => ({...c, t: fn(c.t, id('talk', t.id, bi, 'choice', c.id)), ...(c.then ? {then: fx(c.then, id('talk', t.id, bi, 'choice', c.id))} : {})})),
      ...(b.then ? {then: fx(b.then, id('talk', t.id, bi))} : {}),
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
