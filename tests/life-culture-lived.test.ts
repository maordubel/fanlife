/**
 * LIFE — the matchday as each city lives it (owner, 23.10.2026).
 *
 * Every element of a club's matchday (where the crew meets, what goes round, the way to the ground, what mates call each
 * other, what the other lot shout) traces to the club's own sourced world.json line or to the owner's quoted words; no
 * club wears another's; the eras switch where the sources say (the French Kiss until 2015, the promenade until the Red
 * Line in 2023); the story and the town both carry it; and every archive night reaches the family the morning after.
 */
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it, vi} from 'vitest'

vi.setConfig({testTimeout: 120_000})
import {loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {allSkins} from '@/lib/clubs/life/skins'
import {clubWorld} from '@/lib/clubs/world'
import {REGISTRY} from '@/lib/master/registry'
import {OWNER_SAID, OWNER_SOURCE, RAW_RITUALS, RITUAL_CLUBS, ritualFor, ritualIn, ritualSources, sourceHolds, type MatchdayRitual} from '@/lib/life/universal/ritual'
import type {Chapter, Cond, LifePack} from '@/lib/life/universal/types'
import {validatePack} from '@/lib/life/universal/validate'

const ROOT = join(__dirname, '..')
const raw = (id: string): MatchdayRitual => ({clubId: id, ...RAW_RITUALS[id]!})
/** Which clubs each piece of the owner's words is about — Hapoel's meet-up is Hapoel's, Greek food is every Greek club's. */
const GREEK = REGISTRY.filter(c => c.country === 'Greece').map(c => c.id)
const OWNER_FOR: [RegExp, string[]][] = [
  [/נשיקה|הום סנטר|טיילת|יצור|יובוב|שמאלני/, ['hapoel-tel-aviv']],
  [/קיפסלי|תיאוס פאניס|פוקון|קטנועים/, ['aek-athens']],
  [/גירוס|סופלקי|אלפא/, GREEK],
  [/בר שמוקם|טאקו|דונר|מאפיות|בירות|בלקן/, ['zrinjski-mostar']],
]

describe('every element of a matchday has a source', () => {
  it('the owner source carries the neutral label, never his name', () => {
    expect(OWNER_SOURCE).toBe('ידע אישי — צוות The Worker, 23.10.2026')
    expect(OWNER_SAID).not.toMatch(/מאור|Maor|Harel/)
  })
  for (const id of RITUAL_CLUBS) it(`${id}: each element is a world.json line of this club or a quoted piece of the owner's words`, () => {
    expect(REGISTRY.some(c => c.id === id)).toBe(true)
    const w = clubWorld(id)
    for (const {what, src} of ritualSources(raw(id))) {
      expect(sourceHolds(src, w), `${id}: ${what}`).toBe(true)
      if ('world' in src) expect(src.world.startsWith(`${id}-`), `${id}: ${what} reads another club's line`).toBe(true)
      else {
        const owners = OWNER_FOR.filter(([re]) => re.test(src.owner)).flatMap(([, ids]) => ids)
        expect(owners.length, `${id}: ${what} quotes words the test cannot place`).toBeGreaterThan(0)
        expect(owners, `${id}: ${what} is another club's`).toContain(id)
      }
    }
    // nothing was dropped by the source check: what is written is what plays
    expect(ritualSources(ritualFor(id)!).length).toBe(ritualSources(raw(id)).length)
  })
  it('no club wears another club\'s meeting point or its own food twice over', () => {
    const meets = RITUAL_CLUBS.flatMap(id => raw(id).meet.map(m => [id, m.name] as const))
    for (const [id, name] of meets) expect(meets.filter(([o, n]) => n === name && o !== id), name).toEqual([])
    // the food and drink: the same thing at two clubs only when one source speaks of both (the Greek clubs, or the same world line)
    // a world line is compared by what it is (`<club>-food-gyros` → `food-gyros`), so each Greek club's own copy of the owner's line counts as one source
    const eats = RITUAL_CLUBS.flatMap(id => [...raw(id).food, ...raw(id).drink].map(f => ({id, name: f.name, src: 'world' in f.src ? f.src.world.slice(id.length + 1) : `owner:${f.src.owner}`})))
    for (const e of eats) for (const o of eats) if (o.id !== e.id && o.name === e.name)
      expect(GREEK.includes(e.id) && GREEK.includes(o.id) && (e.src === o.src || [e.src, o.src].every(x => /^(food-gyros|food-alfa)$|^owner:/.test(x))) || e.name === 'sunflower seeds', `${e.id}/${o.id}: ${e.name}`).toBe(true)
  })
  it('a club with no source gets nothing', () => {
    for (const c of REGISTRY) if (!RITUAL_CLUBS.includes(c.id)) expect(ritualFor(c.id), c.id).toBeNull()
  })
})

describe('the eras are the sources\' own', () => {
  const h = ritualFor('hapoel-tel-aviv')!
  it('the French Kiss until 2015, Home Center after it', () => {
    expect(ritualIn(h, 2014).meet.map(m => m.sign)).toEqual(['FRENCH KISS'])
    expect(ritualIn(h, 2015).meet.map(m => m.sign)).toEqual(['HOME CENTER'])
  })
  it('the walk along the promenade until 2023, the Red Line from 2023', () => {
    expect(ritualIn(h, 2022).route.map(r => r.mode)).toEqual(['walk'])
    expect(ritualIn(h, 2023).route.map(r => r.mode)).toEqual(['rail'])
  })
  it('mates call each other yetzur or yuvuv, and the other lot shout "Smolanim!"', () => {
    expect(h.mates!.map(w => w.word)).toEqual(['Yetzur', 'Yuvuv'])
    expect(h.taunt!.word).toBe('Smolanim!')
  })
})

const cache = new Map<string, LifePack>()
const packOf = async (id: string) => { if (!cache.has(id)) cache.set(id, clubLife((await loadClub(id))!.data)); return cache.get(id)! }
const allText = (c: Chapter) => c.talks.flatMap(t => t.branches.flatMap(b => b.lines.map(l => l.t))).join('\n')
const flagsOf = (c: Cond | undefined, out: string[] = []): string[] => {
  if (!c) return out
  if ('flag' in c) out.push(c.flag); else if ('not' in c) out.push(c.not); else if ('is' in c) out.push(c.is[0])
  else if ('all' in c) c.all.forEach(x => flagsOf(x, out)); else if ('any' in c) c.any.forEach(x => flagsOf(x, out)); else if ('none' in c) c.none.forEach(x => flagsOf(x, out))
  return out
}

describe('the story lives it', () => {
  it('Hapoel: the French Kiss before 2015, Home Center after; the promenade before 2023, the Red Line after', async () => {
    const pack = await packOf('hapoel-tel-aviv'), born = pack.hero.birthYear!
    const meetUps = pack.chapters.filter(c => c.talks.some(t => t.id === 'ritual-meet'))
    expect(meetUps.length).toBeGreaterThan(4)
    for (const c of meetUps) {
      const year = born + c.age, text = allText(c)
      expect(text.includes('French Kiss'), `${c.id} ${year}`).toBe(year < 2015)
      expect(text.includes('promenade'), `${c.id} ${year}`).toBe(year < 2023)
      expect(text.includes('Red Line'), `${c.id} ${year}`).toBe(year >= 2023)
      expect(text).toMatch(/Yetzur|Yuvuv/)
    }
    expect(validatePack(pack)).toEqual([])
  })
  for (const [id, has, not] of [
    ['aek-athens', ['Kypseli', 'Fokon', 'Theios Fanis', 'scooter'], ['French Kiss', 'döner', 'Yetzur']],
    ['zrinjski-mostar', ['bar by the stadium', 'Döner', 'Balkan'], ['French Kiss', 'gyros', 'Kypseli']],
  ] as const) it(`${id}: its own city, nobody else's`, async () => {
    const pack = await packOf(id)
    const text = pack.chapters.filter(c => c.talks.some(t => t.id === 'ritual-meet')).map(allText).join('\n')
    for (const h of has) expect(text, h).toContain(h)
    for (const n of not) expect(text, n).not.toContain(n)
    expect(validatePack(pack)).toEqual([])
  })
  it('no beer is offered to a child', async () => {
    for (const id of ['aek-athens', 'zrinjski-mostar']) for (const c of (await packOf(id)).chapters) if (c.age < 18) {
      const meet = c.talks.find(t => t.id === 'ritual-meet')
      for (const b of meet?.branches ?? []) for (const ch of b.choices ?? []) expect(ch.t, `${id} ${c.id}`).not.toMatch(/beer|Alfa/i)
    }
  })
  it('a ritual flag is read by nothing but the ritual itself (the simulator leaves it out of its state)', async () => {
    for (const id of ['hapoel-tel-aviv', 'aek-athens']) for (const c of (await packOf(id)).chapters) {
      const readers: [string, Cond | undefined][] = [...c.cast.map(p => [`cast:${p.who}`, p.when] as [string, Cond | undefined]), ...c.spots.map(s => [`spot:${s.id}`, s.when] as [string, Cond | undefined]),
        ...c.doors.map(d => [`door:${d.id}`, {all: [d.when ?? {all: []}, d.needs ?? {all: []}]}] as [string, Cond]), ...c.beats.map(b => [`beat:${b.id}`, b.when] as [string, Cond | undefined]), ...c.objectives.map(o => [`goal:${o.id}`, o.done] as [string, Cond]),
        ...c.talks.flatMap(t => t.branches.flatMap(b => [[`talk:${t.id}`, b.when] as [string, Cond | undefined], ...(b.choices ?? []).map(ch => [`talk:${t.id}`, ch.when] as [string, Cond | undefined])]))]
      for (const [who, cond] of readers) for (const f of flagsOf(cond)) if (/^(life:)?ritual:/.test(f)) expect(who, `${c.id} ${f}`).toMatch(/^(spot|talk):ritual-/)
    }
  })
  it('a club with no source has no meet-up', async () => {
    const none = REGISTRY.find(c => !RITUAL_CLUBS.includes(c.id) && ['hapoel-tel-aviv', 'zrinjski-mostar'].every(x => x !== c.id))
    if (!none) return
    const loaded = await loadClub(none.id).catch(() => null)
    if (!loaded) return
    expect(clubLife(loaded.data).chapters.some(c => c.talks.some(t => t.id === 'ritual-meet'))).toBe(false)
  })
})

describe('an archive night reaches the family the morning after', () => {
  for (const id of ['hapoel-tel-aviv', 'aek-athens', 'zrinjski-mostar']) it(`${id}: every night's recorded title is on the paper in a later ordinary chapter`, async () => {
    const pack = await packOf(id)
    const nights = pack.chapters.filter(c => c.id.startsWith('night-') && c.anchor)
    expect(nights.length).toBeGreaterThan(0)
    for (const night of nights) {
      const at = pack.chapters.indexOf(night)
      const later = pack.chapters.slice(at + 1).find(c => c.cards?.some(k => k.id === `paper-${night.id.slice(6)}`))
      expect(later, night.id).toBeTruthy()
      const card = later!.cards!.find(k => k.id === `paper-${night.id.slice(6)}`)!
      // printed exactly as the archive recorded it — the same row, nothing added
      expect(card.title).toBe(night.anchor!.title)
      expect(card.archive?.factId).toBe(night.anchor!.factId)
      expect(later!.talks.some(t => t.id === `ritual-paper-${night.id.slice(6)}` && t.branches.some(b => b.then?.some(e => e.e === 'card' && e.card === card.id)))).toBe(true)
    }
  })
})

describe('the town is handed it as data', () => {
  const skins = allSkins()
  it('the skin carries the culture of a club with a source, and none for a club without', () => {
    expect(skins['hapoel-tel-aviv']!.culture!.meet.map(m => m.sign)).toEqual(['FRENCH KISS', 'HOME CENTER'])
    expect(skins['aek-athens']!.culture!.route.some(r => r.mode === 'scooter')).toBe(true)
    expect(skins['aek-athens']!.culture!.home).toEqual({name: 'Kypseli', local: 'ΚΥΨΕΛΗ'})
    expect(skins['zrinjski-mostar']!.culture!.food.map(f => f.sign)).toEqual(['DÖNER', 'PEKARA'])
    for (const c of REGISTRY) if (!RITUAL_CLUBS.includes(c.id)) expect(skins[c.id]!.culture, c.id).toBeUndefined()
    // the town gets names and eras, never a sentence or a source
    expect(JSON.stringify(skins['hapoel-tel-aviv']!.culture)).not.toMatch(/owner|world|ידע אישי|Then the/)
  })
  it('culture.js is loaded after artefacts.js, called once per room, and draws only from the skin', () => {
    const html = readFileSync(join(ROOT, 'public/life/town/play.html'), 'utf8')
    expect(html.indexOf('/life/town/culture.js')).toBeGreaterThan(html.indexOf('/life/town/artefacts.js'))
    expect(html.indexOf('/life/town/culture.js')).toBeLessThan(html.indexOf('/life/town/kit.js'))
    const kit = readFileSync(join(ROOT, 'public/life/town/kit.js'), 'utf8')
    expect(kit.match(/window\.CULTURE\.place\(c,id\)/g)?.length).toBe(1)
    const js = readFileSync(join(ROOT, 'public/life/town/culture.js'), 'utf8')
    expect(js).toMatch(/c\.skin\.club\.culture/)
    // nothing lettered in the file itself: every word on a board comes from the skin
    expect(js).not.toMatch(/French|Kiss|Home Center|Kypseli|ΚΥΨΕΛΗ|DÖNER|PEKARA|Taco|TACO|Alfa|ALFA|Theios/)
  })
})
