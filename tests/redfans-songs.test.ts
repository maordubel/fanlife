/**
 * The song reader.
 *
 * Fixtures are SHAPES. The structure they copy is the one the real export showed — a
 * `{{שיר מהיציע}}` infobox, a `==רקע==` paragraph, a `==מילות השיר==` section, and the
 * wiki's own `{{צנזורה}}` mark. **No verse from any real song appears in this file**,
 * which is the same rule the reader itself enforces.
 */

import { describe, expect, it } from 'vitest'

import { IngestReport } from '@/scripts/ingest/lib/report'
import {
  backgroundOf,
  classifySong,
  isBlocked,
  splitPlayerTitle,
  songsFromPages,
} from '@/scripts/ingest/sources/redfans-songs'
import type { RawPage } from '@/scripts/ingest/lib/types'

function page(title: string, body: string): RawPage {
  return {
    pageId: 1,
    title,
    namespace: 0,
    revisionId: 2,
    sourceText: body,
    format: 'wikitext',
    contentHash: 'hash',
    fetchedAt: '2026-09-02T00:00:00.000Z',
    url: null,
    contentModel: 'wikitext',
    isRedirect: false,
    redirectTo: null,
    byteSize: body.length,
    revTimestamp: null,
    revUser: null,
    revComment: null,
    categories: [],
    links: [],
    images: [],
  } as unknown as RawPage
}

const BOX = `{{שיר מהיציע|
|שם= שיר בדיוני
|מנגינה= לחן בדיוני
|מחבר= [[כותב בדיוני]]
|שנה= ?
|}}
`
const BACKGROUND = '==רקע==\nהשיר נכנס ליציע בעונה בדיונית ומבוסס על לחן מוכר מאוד.\n'
const LYRICS = '==מילות השיר==\nשורה ראשונה בדיונית\nשורה שנייה בדיונית\n'
const TERRACE = '[[קטגוריה:שירים מהיציע]]'
const PLAYER = '[[קטגוריה:שירי שחקנים]]'

function run(pages: RawPage[]) {
  const report = new IngestReport('test')
  return { ...songsFromPages(pages, {}, report), report }
}

describe('what kind of song it is', () => {
  it('takes the player category over the terrace one', () => {
    expect(classifySong(['קטגוריה:שירים מהיציע', 'קטגוריה:שירי שחקנים'])?.songType).toBe(
      'player_song',
    )
  })

  it('reads a category written with a stray space', () => {
    expect(classifySong(['קטגוריה: שירים מהיציע'])?.songType).toBe('terrace_song')
  })

  it('is nothing when no song category is present', () => {
    expect(classifySong(['קטגוריה:שחקני בית (כדורגל)'])).toBeNull()
  })
})

describe('the lyrics never travel', () => {
  it('stops the background at the lyrics heading', () => {
    const background = backgroundOf(`${BOX}${BACKGROUND}${LYRICS}`)
    expect(background).toContain('נכנס ליציע')
    expect(background).not.toContain('שורה ראשונה')
  })

  it('stops at a chords section too', () => {
    const background = backgroundOf(`${BACKGROUND}==אקורדים של השיר==\nAm G F\n`)
    expect(background).not.toContain('Am')
  })

  it('keeps no template, heading or wiki link markup in what does travel', () => {
    const background = backgroundOf(`${BOX}${BACKGROUND}${LYRICS}`) ?? ''
    expect(background).not.toMatch(/\{\{|\}\}|\[\[|\]\]|==/u)
  })

  it('stores no lyrics field at all — there is nowhere for a verse to go', () => {
    const { songs } = run([page('שיר בדיוני', `${BOX}${BACKGROUND}${LYRICS}${TERRACE}`)])
    expect(JSON.stringify(songs[0])).not.toContain('שורה ראשונה')
  })
})

describe('the wiki marks its own content, and the gate obeys it', () => {
  it('blocks a page carrying the site’s censorship template', () => {
    expect(isBlocked('{{צנזורה}}\nגוף', ['קטגוריה:שירים מהיציע'])).toContain('צנזורה')
  })

  it('blocks a page the wiki files under שירי שואה', () => {
    expect(isBlocked('גוף', ['קטגוריה:שירים מהיציע', 'קטגוריה:שירי שואה'])).toContain('שירי שואה')
  })

  it('blocks nothing else', () => {
    expect(isBlocked('גוף', ['קטגוריה:שירים מהיציע'])).toBeNull()
  })

  it('keeps a marked song usable as a subject — the owner approved the corpus', () => {
    const { songs, lyricsRestricted } = run([
      page('שיר מסומן', `{{צנזורה}}\n${BOX}${BACKGROUND}${TERRACE}`),
    ])
    expect(songs).toHaveLength(1)
    expect(songs[0]?.usableInApp).toBe(true)
    // and it is still on the list whose verses may never be displayed
    expect(lyricsRestricted[0]?.reason).toContain('צנזורה')
  })

  it('leaves an unmarked song off the lyrics-restricted list', () => {
    const { songs, lyricsRestricted } = run([page('שיר בדיוני', `${BOX}${BACKGROUND}${TERRACE}`)])
    expect(songs[0]?.usableInApp).toBe(true)
    expect(lyricsRestricted).toHaveLength(0)
  })

  it('says in the report how many are lyrics-restricted', () => {
    const { report } = run([
      page('שיר מסומן', `{{צנזורה}}\n${BOX}${TERRACE}`),
      page('שיר בדיוני', `${BOX}${TERRACE}`),
    ])
    expect(report.notes.some((note) => note.includes('lyrics-restricted'))).toBe(true)
  })
})

describe('the metadata a question can be built from', () => {
  it('takes the tune and the author, without the link markup', () => {
    const { songs } = run([page('שיר בדיוני', `${BOX}${BACKGROUND}${PLAYER}`)])
    expect(songs[0]?.originalTitle).toBe('לחן בדיוני')
    expect(songs[0]?.lyricsAuthorHe).toBe('כותב בדיוני')
  })

  it('treats the wiki’s "?" as not knowing rather than as a value', () => {
    const box = BOX.replace('|מחבר= [[כותב בדיוני]]', '|מחבר= ?')
    const { songs } = run([page('שיר בדיוני', `${box}${BACKGROUND}${TERRACE}`)])
    expect(songs[0]?.lyricsAuthorHe).toBeNull()
  })

  it('falls back to the page title when the name field is a template call', () => {
    const box = BOX.replace('|שם= שיר בדיוני', '|שם={{PAGENAME}}')
    const { songs } = run([page('שיר אחר', `${box}${TERRACE}`)])
    expect(songs[0]?.titleHe).toBe('שיר אחר')
  })

  it('does not guess which linked person a song is about', () => {
    const { songs } = run([
      page('שיר בדיוני', `${BOX}==רקע==\nעל [[שחקן אלף]] ועל [[שחקן בית]].\n${PLAYER}`),
    ])
    expect(songs[0]?.personNameHe).toBeNull()
    expect(songs[0]?.personSlug).toBeNull()
  })

  it('does not repeat a song that arrives in two category exports', () => {
    const body = `${BOX}${BACKGROUND}${TERRACE}`
    const { songs } = run([page('שיר בדיוני', body), page('שיר בדיוני', body)])
    expect(songs).toHaveLength(1)
  })
})

describe('a player song names its tune and its player in the title', () => {
  it('splits the convention the category uses', () => {
    expect(splitPlayerTitle('לחן בדיוני - שחקן אלף')).toEqual({
      originalTitle: 'לחן בדיוני',
      people: ['שחקן אלף'],
    })
  })

  it('splits when there are no spaces around the dash', () => {
    expect(splitPlayerTitle('לחן בדיוני-שחקן אלף')?.people).toEqual(['שחקן אלף'])
  })

  it('keeps a dash that belongs to the tune name', () => {
    const split = splitPlayerTitle('לחן - בדיוני - שחקן אלף')
    expect(split?.originalTitle).toBe('לחן - בדיוני')
  })

  it('reads several players from one title', () => {
    expect(splitPlayerTitle('לחן בדיוני - שחקן אלף, שחקן בית')?.people).toEqual([
      'שחקן אלף',
      'שחקן בית',
    ])
  })

  it('claims nothing when the right side is not a name', () => {
    expect(splitPlayerTitle('לחן בדיוני - 1998')).toBeNull()
    expect(splitPlayerTitle('שיר בלי מקף')).toBeNull()
  })

  it('gives a slug only when exactly one player is named', () => {
    // No `שם` in the box, so the page title is the title — which is where this
    // category writes the pairing.
    const bare = '{{שיר מהיציע|\n|מנגינה= לחן בדיוני\n|}}\n'
    const one = run([page('לחן בדיוני - שחקן אלף', `${bare}${PLAYER}`)])
    expect(one.songs[0]?.personSlug).toBe('שחקן-אלף')

    const many = run([page('לחן בדיוני - שחקן אלף, שחקן בית', `${bare}${PLAYER}`)])
    expect(many.songs[0]?.personSlug).toBeNull()
    expect(many.songs[0]?.personNameHe).toBe('שחקן אלף, שחקן בית')
  })

  it('does not split a terrace song, whose title is not that convention', () => {
    const bare = '{{שיר מהיציע|\n|מנגינה= לחן בדיוני\n|}}\n'
    const { songs } = run([page('שיר בדיוני - כותרת אחרת', `${bare}${TERRACE}`)])
    expect(songs[0]?.personNameHe).toBeNull()
  })
})
