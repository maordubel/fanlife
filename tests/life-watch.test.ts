/**
 * LIFE · the WATCH LAYER (rule life-story-watch): every link is one a repository file records, and nothing else.
 */
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {TRANSITIONS} from '@/lib/life/transitions'
import type {ArchiveRef} from '@/lib/life/universal/types'
import {ALL_WATCH, embedUrl, HIGHLIGHTS, inSeason, isYoutubeId, OUR_FILMS, slateDate, slateOf, TRANSITION_CLIPS, WATCH_WORDS, watchFor, watchLibrary, watchUrl, watchWord, transitionFor} from '@/lib/life/watch'

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8')

describe('the record', () => {
  it('holds only ids that its named source file holds, letter for letter', () => {
    expect(new Set(ALL_WATCH.map(m => m.id)).size).toBe(ALL_WATCH.length)
    const tube = [...HIGHLIGHTS, ...OUR_FILMS]
    // one film may serve both sides of a derby (Raja–Wydad, 9.7.2023), never twice for one club
    expect(new Set(tube.map(m => `${m.clubId} ${m.youtubeId}`)).size).toBe(tube.length)
    for (const m of tube) {
      expect(isYoutubeId(m.youtubeId), m.id).toBe(true)
      expect(read(m.source.file).includes(m.youtubeId), `${m.id}: ${m.youtubeId} is not in ${m.source.file}`).toBe(true)
      expect(m.source.note.length, m.id).toBeGreaterThan(8)
    }
    for (const t of TRANSITION_CLIPS) {
      const own = TRANSITIONS[t.id as keyof typeof TRANSITIONS]
      expect(own, t.id).toBeTruthy()
      expect({mp4: t.mp4, webm: t.webm, ms: t.ms}).toEqual({mp4: own.mp4, webm: own.src, ms: own.ms})
    }
  })

  it('files every film under a club that exists, with real days', () => {
    for (const m of ALL_WATCH) expect(CORE_CLUB_IDS, m.id).toContain(m.clubId)
    for (const h of HIGHLIGHTS) if (h.matchDate) expect(h.matchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const f of OUR_FILMS) { for (const d of f.matchDates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/); if (f.season) expect(f.season).toMatch(/^\d{4}\/\d{2}$/) }
  })

  it('counts per club', () => {
    const rows = CORE_CLUB_IDS.map(id => { const l = watchLibrary(id); return `${id.padEnd(20)} highlights ${l.highlights.length} · films ${l.films.length} · shorts ${l.shorts.length} · interstitials ${l.transitions.length}` })
    console.log(`WATCH links on record\n${rows.join('\n')}`)
    // 11 from the Worker's record + 3 new checked films from the hunt of 24.11.2026
    expect(watchLibrary('hapoel-tel-aviv').highlights.length).toBe(14)
    expect(OUR_FILMS.filter(f => f.form === 'film').length).toBe(6)
  })
})

describe('watchFor', () => {
  it('finds the Worker\'s 1986 film by its night and by its chapter', () => {
    const byDay = watchFor('hapoel-tel-aviv', {matchDate: '1986-05-24'})!, byChapter = watchFor('hapoel-tel-aviv', {chapter: '1986'})!
    expect(byDay.highlights).toMatchObject({youtubeId: 'dFykPEa8NAE', status: 'verified', source: {file: 'lib/life/cutscenes.ts'}})
    expect(byChapter.highlights).toBe(byDay.highlights)
    expect(byDay.ourFilm).toBeNull(); expect(byDay.moreHighlights).toEqual([])
    expect(watchUrl(byDay.highlights!)).toBe('https://www.youtube.com/watch?v=dFykPEa8NAE')
  })

  it('puts the watched choice first on a night with several films, and adds our film of that night', () => {
    const a = watchFor('hapoel-tel-aviv', {matchDate: '2000-05-17'})!
    expect(a.highlights!.youtubeId).toBe('EGlBnUQN5AQ')
    expect(a.moreHighlights.map(h => h.id)).toEqual(['2000-double', 'film-00-fans', 'film-00-first', 'film-00-pens', 'film-00-theirs'])
    expect(a.ourFilm).toMatchObject({youtubeId: 'ckPwO6Xr8sI', form: 'film'}); expect(a.ourFilmFit).toBe('night')
    expect(a.transition?.id).toBe('enter-stand')
    expect(watchFor('hapoel-tel-aviv', {matchId: '1999-05-19'})!.highlights!.id).toBe('film-99-full')
  })

  it('answers with our film alone when no highlights are on record, by night or by season', () => {
    const z = watchFor('zrinjski-mostar', {matchDate: '2023-09-21'})!
    expect(z.highlights).toBeNull(); expect(z.ourFilm!.youtubeId).toBe('Vlbj4twpbxE'); expect(z.ourFilmFit).toBe('night'); expect(z.transition).toBeNull()
    const c = watchFor('celtic', {matchDate: '2003-03-20'})!
    expect(c.ourFilm!.youtubeId).toBe('b5eOGZzA-ec'); expect(c.ourFilmFit).toBe('season')
    expect(watchFor('olympiacos', {matchDate: '2024-05-29'})!.ourFilm!.youtubeId).toBe('-ozy76t1ByM')
    expect(watchFor('olympiacos', {matchDate: '2024-03-07'})!.ourFilm!.youtubeId).toBe('tfnc4EziPxc')
    expect(inSeason('2002/03', '2002-07-01')).toBe(true); expect(inSeason('2002/03', '2003-07-01')).toBe(false); expect(inSeason(null, '2003-01-01')).toBe(false)
  })

  it('returns null rather than a guess', () => {
    expect(watchFor('hapoel-tel-aviv', {matchDate: '1986-05-25'})).toBeNull()
    expect(watchFor('hapoel-tel-aviv', {})).toBeNull()
    expect(watchFor('hapoel-tel-aviv', {matchDate: 'last may'})).toBeNull()
    expect(watchFor('celtic', {matchDate: '1986-05-24'})).toBeNull() // another club's night
    expect(watchFor('celtic', {chapter: '1986'})).toBeNull()
    expect(watchFor('no-such-club', {matchDate: '2000-05-17'})).toBeNull()
    for (const id of CORE_CLUB_IDS) if (!ALL_WATCH.some(m => m.clubId === id)) expect(watchFor(id, {matchDate: '2000-05-17', chapter: '1986'}), id).toBeNull()
    // a Short is in the library and never stands in for the film of a night
    expect(watchFor('aek-athens', {matchDate: '2002-11-01'})).toBeNull()
    expect(transitionFor('celtic', 'matchday-opener')).toBeNull()
    expect(transitionFor('hapoel-tel-aviv', 'matchday-opener')!.mp4).toBe('/life/transitions/enter-stadium-a.mp4')
  })
})

describe('the player and the slate', () => {
  it('embeds from the no-cookie host only, and refuses a malformed id', () => {
    const u = new URL(embedUrl({youtubeId: 'dFykPEa8NAE', startSeconds: 12.4, endSeconds: 90})!)
    expect(u.hostname).toBe('www.youtube-nocookie.com'); expect(u.pathname).toBe('/embed/dFykPEa8NAE')
    expect(Object.fromEntries(u.searchParams)).toEqual({autoplay: '1', rel: '0', playsinline: '1', start: '12', end: '90'})
    for (const bad of ['', 'short', 'dFykPEa8NAE&x=1', '../../etc/pw', 'javascript:1']) { expect(embedUrl({youtubeId: bad})).toBeNull(); expect(watchUrl({youtubeId: bad})).toBeNull() }
  })

  it('prints on the slate only what the archive row holds', () => {
    const row: ArchiveRef = {factId: 'f', title: 'Home 2–1 Away, league title secured', on: '1986-05-24', year: 1986, precision: 'day', hint: '', locale: 'en', sources: [{title: 'Record', publisher: 'The club archive', url: null}],
      match: {home: 'Home', away: 'Away', homeGoals: 2, awayGoals: 1, us: 'home', result: 'won', note: null}}
    expect(slateOf(row)).toEqual({date: '1986-05-24', competition: null, result: 'Home 2–1 Away', title: row.title, titleLocale: 'en', publisher: 'The club archive'})
    const bare = slateOf({...row, on: null, precision: 'year', match: undefined, sources: []})!
    expect(bare).toMatchObject({date: '1986', result: null, publisher: null})
    expect(slateOf(null)).toBeNull()
    expect(slateDate('1986-05-24')).toBe('24 May 1986'); expect(slateDate('1986')).toBe('1986'); expect(slateDate('spring')).toBe('spring')
    expect(watchWord('watch.source', {publisher: 'X'})).toBe('Archive: X')
    for (const v of Object.values(WATCH_WORDS)) expect(v).not.toMatch(/\b(19|20)\d{2}\b/)
  })
})

describe('the highlights hunt of 24.11.2026', () => {
  it('is generated from the file the owner sent back, and is current', async () => {
    const {parseHunt} = await import('../scripts/life/watch/import-hunt')
    const md = readFileSync(join(process.cwd(), 'docs/life/highlights/hunt-2026-11-24-audited.md'), 'utf8')
    const {verified, pending, none} = parseHunt(md)
    expect([verified.length, pending.length, none]).toEqual([124, 60, 126])
    const {HUNT_VERIFIED, HUNT_PENDING} = await import('@/lib/life/watch/hunt')
    expect(HUNT_VERIFIED.map(h => h.id)).toEqual(verified.map(r => r.factId))
    expect(HUNT_PENDING.map(h => h.id)).toEqual(pending.map(r => r.factId))
  })
  it('serves the checked films and never one with an open check', async () => {
    const {HUNT_PENDING} = await import('@/lib/life/watch/hunt')
    for (const p of HUNT_PENDING) expect(HIGHLIGHTS.some(h => h.clubId === p.clubId && h.youtubeId === p.youtubeId && h.id === p.id), p.id).toBe(false)
    const zr = watchFor('zrinjski-mostar', {matchId: 'zrinjski-mostar:r26-palace-home-2026'})
    expect(zr?.highlights?.youtubeId).toBe('1qX2JobEiWw')
    const pao = watchFor('panathinaikos', {matchDate: '1986-05-28'})
    expect(pao?.highlights?.youtubeId).toBe('umk1pXcQcuM')
  })
})
