/**
 * LIFE, universal — one engine, every club.
 *
 * What is held here is the promise of the whole design: a life can be composed for any club the
 * portal knows from what its pack actually holds, it can always be finished, and it never says
 * anything about history that the club's approved archive does not.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife, lifeAnchors} from '@/lib/clubs/life/pack'
import {allSkins} from '@/lib/clubs/life/skins'
import {REGISTRY} from '@/lib/master/registry'
import {apply, emptyState, fold, Life, meets, openChapter, readable, saveKey, type LifeStore} from '@/lib/life/universal/engine'
import {readResult} from '@/lib/life/universal/content/night'
import {UNIVERSAL_CHAPTERS} from '@/lib/life/universal/content'
import {ANCHOR_TARGET, composeLife, MAX_NIGHTS} from '@/lib/life/universal/compose'
import {simulate} from '@/lib/life/universal/sim'
import {catalogue, fill} from '@/lib/life/universal/text'
import type {LifeEvent, LifePack} from '@/lib/life/universal/types'
import {validatePack} from '@/lib/life/universal/validate'
import {beatFlag, Runner, sceneOf} from '@/lib/life/universal/world'

const packs = new Map<string, LifePack>()
async function packOf(id: string): Promise<LifePack> {
  if (!packs.has(id)) packs.set(id, clubLife((await loadClub(id))!.data))
  return packs.get(id)!
}
const memory = (): LifeStore & {data: Map<string, string>} => { const data = new Map<string, string>(); return {data, read: k => data.get(k) ?? null, write: (k, v) => { data.set(k, v) }, clear: k => { data.delete(k) }} }

describe('the engine', () => {
  it('folds an append-only log, and an event from a newer build folds to nothing', () => {
    const log: LifeEvent[] = [{t: 'started', pack: 'x'}, {t: 'chapter', id: 'c1'}, {t: 'flag', k: 'c1:a', v: true}, {t: 'flag', k: 'life:kept', v: true}, {t: 'heart', by: 250}, {t: 'keep', item: 'scarf'}, {t: 'keep', item: 'scarf'}, {t: 'wear', what: 'scarf'}]
    const s = fold(log)
    expect(s.heart).toBe(100)
    expect(s.keeps).toEqual(['scarf'])
    expect(apply(s, {t: 'from-the-future'} as unknown as LifeEvent)).toBe(s)
    // a new chapter is a new day: the day's flags go, the person stays
    const next = apply(s, {t: 'chapter', id: 'c2'})
    expect(next.flags).toEqual({'life:kept': true})
    expect(next.keeps).toEqual(['scarf'])
    expect(meets(next, {all: [{has: 'scarf'}, {wears: 'scarf'}, {not: 'c1:a'}, {flag: 'life:kept'}]})).toBe(true)
    expect(meets(next, {wears: 'shirt'})).toBe(false)
    expect(meets(emptyState(), {bond: ['dad', 50]})).toBe(true)
  })

  it('saves under the club\'s own key, restores, and refuses a save from other chapters', async () => {
    const pack = await packOf('olympiacos'), store = memory()
    const life = new Life(pack, [], store)
    life.begin()
    life.dispatch({t: 'flag', k: 'c1:asked', v: true})
    expect([...store.data.keys()]).toEqual([saveKey('olympiacos')])
    expect(saveKey('olympiacos')).not.toBe(saveKey('zrinjski-mostar'))
    const again = Life.load(pack, store)
    expect(again.state).toEqual(life.state)
    expect(readable(pack, [{t: 'chapter', id: 'a-chapter-that-was-cut'}])).toBe(false)
    store.write(saveKey('olympiacos'), JSON.stringify({v: 1, club: 'olympiacos', pack: 'old', events: [{t: 'chapter', id: 'gone'}], savedAt: ''}))
    expect(Life.load(pack, store).state.started).toBe(false)
    store.write(saveKey('olympiacos'), '{not json')
    expect(Life.load(pack, store).state.started).toBe(false)
  })

  it('restarting a chapter cuts the log back to its morning and keeps the life before it', async () => {
    const pack = await packOf('olympiacos'), life = new Life(pack)
    life.begin()
    life.dispatch({t: 'keep', item: 'scarf'}, {t: 'ended', chapter: 'c1-colours', ending: 'loud'}, ...openChapter(pack.chapters[1]!), {t: 'flag', k: 'c2:x', v: true}, {t: 'coins', by: 14})
    life.restartChapter()
    expect(life.state.chapter).toBe(pack.chapters[1]!.id)
    expect(life.state.flags).toEqual({})
    expect(life.state.coins).toBe(0)
    expect(life.state.keeps).toEqual(['scarf'])
    expect(life.state.done).toEqual({'c1-colours': 'loud'})
  })

  it('leaving a conversation applies nothing; finishing it applies the branch', async () => {
    const pack = await packOf('olympiacos'), chapter = pack.chapters[0]!
    let state = openChapter(chapter).reduce(apply, emptyState())
    const runner = new Runner(chapter, state, events => (state = events.reduce(apply, state)))
    let view = runner.start('dad')!
    expect(view.lines.length).toBeGreaterThan(2)
    expect(state.flags).toEqual({})           // opened, read a line, walked away
    while (!view.done) view = runner.advance()
    expect(state.flags['c1:asked']).toBe(true)
  })

  it('somebody who walks with the supporter is in the room the supporter is in', async () => {
    const pack = await packOf('olympiacos'), chapter = pack.chapters.find(c => c.id === 'c3-saturday')!
    let s = openChapter(chapter).reduce(apply, emptyState())
    for (const k of ['c3:ready', 'c3:route', 'c3:gate', 'c3:tunnel', 'c3:terrace']) s = apply(s, {t: 'flag', k, v: true})
    for (const room of ['street', 'route', 'gate', 'tunnel', 'terrace']) {
      const dad = sceneOf(pack, chapter, s, room).actors.find(a => a.id === 'dad')
      expect(dad?.follow, room).toBe(true)
    }
  })
})

describe('reading a recorded scoreline', () => {
  it('reads what is certain and nothing else', () => {
    expect(readResult('Zrinjski 4–3 AZ Alkmaar', ['Zrinjski Mostar'])).toBe('won')
    expect(readResult('LASK 2–1 Zrinjski', ['Zrinjski Mostar'])).toBe('lost')
    expect(readResult('Zrinjski 1–1 LASK', ['Zrinjski Mostar'])).toBe('drew')
    expect(readResult('Borac 0–1 Zrinjski · Bosnia and Herzegovina Cup retained', ['Zrinjski Mostar'])).toBe('won')
    expect(readResult('Olympiacos 1–0 Fiorentina (after extra time)', ['Olympiacos'])).toBe('won')
    expect(readResult('הפועל תל אביב 2 — צ\'לסי 0', ['Hapoel Tel Aviv', 'הפועל תל אביב'])).toBe('won')
    expect(readResult('מכבי חיפה 3 — הפועל תל אביב 0', ['Hapoel Tel Aviv', 'הפועל תל אביב'])).toBe('lost')
    // two clubs that share a first name are never confused, and a title that is not a score is not guessed
    expect(readResult('Hapoel Tel Aviv 3–0 Hapoel Petah Tikva', ['Hapoel Petah Tikva'])).toBe('lost')
    expect(readResult('Hapoel Petah Tikva 1–0 Maccabi Petah Tikva', ['Hapoel Petah Tikva'])).toBe('won')
    expect(readResult('דקה 86', ['הפועל תל אביב'])).toBe('unread')
    expect(readResult('Club founded', ['Olympiacos'])).toBe('unread')
    expect(readResult('A 2–1 B', ['Olympiacos'])).toBe('unread')
  })
})

describe('every core club gets a life', () => {
  it('there is a universal chapter for every stage of a life, and the finale is last', () => {
    expect(UNIVERSAL_CHAPTERS.map(c => c.id)).toEqual(['c1-colours', 'c2-shirt', 'c3-saturday', 'c3a-album', 'c4-yard', 'c5-away', 'c6-work', 'c6a-empty', 'c7-far', 'c7a-meeting', 'c8-seat', 'finale'])
    const ages = UNIVERSAL_CHAPTERS.map(c => c.age)
    expect([...ages].sort((a, b) => a - b)).toEqual(ages)
    expect(Object.keys(catalogue(UNIVERSAL_CHAPTERS)).length).toBeGreaterThan(900)
  })

  for (const id of CORE_CLUB_IDS) {
    it(`${id}: composes, validates, and is honest about what it is`, async () => {
      const data = (await loadClub(id))!.data, pack = await packOf(id)
      expect(validatePack(pack)).toEqual([])
      expect(pack.readiness.playable).toBe(true)
      // nothing is READY until the club's own culture is written and approved
      expect(pack.readiness.state).toBe('PARTIAL')
      expect(pack.readiness.reasons.join(' ')).toMatch(/culture/i)
      expect(pack.provenance).toMatchObject({kind: 'generated-from-anchors', cultureDna: 'pending', universalChapters: UNIVERSAL_CHAPTERS.length})
      expect(pack.readiness.target).toBe(ANCHOR_TARGET)
      expect(pack.chapters.at(-1)!.id).toBe('finale')
      expect(new Set(pack.chapters.map(c => c.id)).size).toBe(pack.chapters.length)
      const ages = pack.chapters.map(c => c.age)
      expect([...ages].sort((a, b) => a - b), 'a life is lived in order').toEqual(ages)
      // every person is fiction and says so
      expect(Object.values(pack.cast).every(m => m.fictional === true)).toBe(true)
      // no token survived, in any line
      for (const [key, text] of Object.entries(catalogue(pack.chapters))) expect(text, key).not.toMatch(/\{[a-zA-Z]+\}/)

      // history: only rows of the eligible archive, quoted as recorded
      const eligible = new Map(lifeAnchors(data).map(a => [a.factId, a]))
      const nights = pack.chapters.filter(c => c.anchor)
      expect(nights.length).toBeLessThanOrEqual(MAX_NIGHTS)
      expect(nights.length).toBe(pack.provenance.anchoredChapters)
      for (const night of nights) {
        const row = eligible.get(night.anchor!.factId)
        expect(row, night.id).toBeDefined()
        // the row is quoted as the archive recorded it; the only thing added is what its title states, read with certainty
        const {match, ...quoted} = night.anchor!
        expect(quoted).toEqual(row)
        if (match) expect(`${match.homeGoals}${match.awayGoals}`).toMatch(/^\d+$/)
        expect(night.anchor!.precision).toBe('day')
        expect(night.anchor!.sources.length).toBeGreaterThan(0)
        // the record is printed exactly as it was recorded; the kick-off card only names the two sides it states
        expect(night.cards!.find(c => c.id === 'archive')!.title).toBe(row!.title)
        const kick = night.cards!.find(c => c.id === 'kickoff')
        if (kick) expect(kick.title).toBe(`${match!.home} v ${match!.away}`)
        if (kick) expect(JSON.stringify([kick.kicker, kick.title, kick.body])).not.toMatch(/\d+\s*[–—-]\s*\d+/)
        expect(night.age).toBe(row!.year - pack.hero.birthYear!)
      }
      for (const c of pack.chapters) for (const card of c.prelude ?? []) {
        expect(eligible.get(card.archive!.factId)?.precision).toBe('year')
        expect(card.title).toBe(card.archive!.title)
      }
      // a year is printed only where the archive printed it: on its own cards
      const archiveText = new Set(pack.anchors.flatMap(a => [a.title, a.hint]))
      const YEAR = /\b(1[89]\d\d|20\d\d)\b/
      for (const [key, text] of Object.entries(catalogue(pack.chapters))) if (YEAR.test(text)) expect(archiveText.has(text), `${key}: ${text}`).toBe(true)
    }, 60000)

    it(`${id}: every chapter can be finished however it is played, and no state is a dead end`, async () => {
      const pack = await packOf(id)
      const carried: LifeEvent[] = []
      for (const chapter of pack.chapters) {
        const r = simulate(pack, chapter, carried)
        expect(r.truncated, `${chapter.id} closes`).toBe(false)
        expect(r.stuck, chapter.id).toEqual([])
        expect(r.endings, chapter.id).toEqual(Object.keys(chapter.endings).sort())
        // the next chapter is played by somebody who kept what this one gives
        for (const k of chapter.keepsakes ?? []) carried.push({t: 'keep', item: k.id})
      }
    }, 60000)
  }

  it('Hapoel is born in the year the hand-authored LIFE set, and stands on the nights its pack chose', async () => {
    const pack = await packOf('hapoel-tel-aviv')
    expect(pack.hero.birthYear).toBe(1978)
    expect(pack.chapters.filter(c => c.anchor).map(c => c.anchor!.on)).toEqual(['1986-05-24', '1990-05-12', '2001-10-18', '2002-03-14'])
    expect(pack.skin.crest).toBe('real')
    expect(pack.cast.dad!.name).toBe('Dad')
    expect(pack.cast.friend!.name).toBe('Ofir')
  })

  it('a club with no pack at all still gets a whole life — fiction only, and it says so', () => {
    const club = REGISTRY.find(c => !CORE_CLUB_IDS.includes(c.id))!
    const pack = composeLife({club: {id: club.id, name: club.name, city: club.city, country: club.country}, skin: allSkins()[club.id]!, skinIssues: [], skinPending: [], cast: null, timeline: null, selection: null, anchors: [], dataVersion: 'none'})
    expect(validatePack(pack)).toEqual([])
    expect(pack.readiness.playable).toBe(true)
    expect(pack.hero.birthYear).toBeNull()
    expect(pack.chapters.map(c => c.id)).toEqual(UNIVERSAL_CHAPTERS.map(c => c.id))
    expect(pack.readiness.reasons.join(' ')).toMatch(/no nights from history/i)
    expect(pack.skin.crest).toBe('monogram')
  })

  it('a token the pack cannot fill is an error, never a hole in a sentence', () => {
    expect(() => fill('Welcome to {nowhere}', {club: 'x'})).toThrow(/LIFE_TEXT_TOKEN_UNKNOWN/)
  })

  it('a beat is marked by its own flag', () => { expect(beatFlag('listen')).toBe('beat:listen') })
})
