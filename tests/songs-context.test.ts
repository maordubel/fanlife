import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import songsFile from '@/content/manual/songs.json'
import { SONGS } from '@/lib/voice/songs'
import { SONG_LINE_MOOD, songLine, type SongLineSurface } from '@/lib/voice/songLine'

/**
 * Songs in context (ONE RED WORLD §3, rule 12). Metadata only, one line per screen,
 * deterministic, every link the wiki, and the confidence floor kept.
 */

const ROOT = process.cwd()
const SURFACES: SongLineSurface[] = ['daily', 'archive', 'life']
const LYRIC = /lyric|verse|excerpt|words|text|body|chorus|בית|פזמון|מילים/i

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

describe('no lyric anywhere', () => {
  it('the source file holds no lyric field', () => {
    for (const row of (songsFile as { records: Record<string, unknown>[] }).records) {
      // who wrote the words is metadata (`lyricsAuthorHe`); the words themselves are not stored
      for (const key of Object.keys(row).filter((k) => !/Author/.test(k))) expect(key, key).not.toMatch(LYRIC)
    }
  })

  it('the registry never fills an excerpt, and a song line carries id, title and source only', () => {
    for (const song of SONGS) expect(song.shortExcerpt).toBeUndefined()
    for (const surface of SURFACES) {
      for (let seed = 0; seed < 60; seed += 1) {
        const line = songLine(surface, seed)
        if (!line) continue
        expect(Object.keys(line).sort()).toEqual(['id', 'sourceUrl', 'title'])
      }
    }
  })

  it('the component has no slot that could print a verse', () => {
    const code = readFileSync(join(ROOT, 'components/voice/SongLine.tsx'), 'utf8')
    const props = code.slice(code.indexOf('export function SongLine('), code.indexOf('const song = songLine('))
    expect(props).not.toMatch(/shortExcerpt|lyric|verse|children|text/)
    // what it prints: the title, the attribution, the source — nothing else read from the song
    const body = code.slice(code.indexOf('const song = songLine('))
    const used = [...body.matchAll(/(?<![.\w])song\.(\w+)/g)].map((m) => m[1])
    expect(new Set(used)).toEqual(new Set(['title', 'sourceUrl']))
  })
})

describe('every link is the wiki', () => {
  it('a song line links to a ויקיפועל index.php?title= page, and only there', () => {
    for (const surface of SURFACES) {
      for (let seed = 0; seed < 60; seed += 1) {
        const line = songLine(surface, `2026-09-${seed}`)
        if (line) expect(line.sourceUrl).toMatch(/^https:\/\/wiki\.red-fans\.com\/index\.php\?title=/)
      }
    }
  })
})

describe('in context, and at the floor the registry sets', () => {
  it('each of the three surfaces has a song, chosen deterministically', () => {
    for (const surface of SURFACES) {
      expect(songLine(surface, '2026-09-28')).not.toBeNull()
      expect(songLine(surface, '2026-09-28')).toEqual(songLine(surface, '2026-09-28'))
    }
  })

  it('below confidence 2 a song is named in the archive only', () => {
    const weak = new Set(SONGS.filter((song) => song.confidence < 2).map((song) => song.id))
    for (const surface of ['daily', 'life'] as const) {
      for (let seed = 0; seed < 200; seed += 1) {
        const line = songLine(surface, seed)
        if (line) expect(weak.has(line.id), `${surface} ${line.id}`).toBe(false)
      }
    }
  })

  it('the mood of each surface is a mood a song carries there', () => {
    for (const surface of SURFACES) {
      const fits = SONGS.some((song) => song.surfaces.includes(surface) && song.moods.includes(SONG_LINE_MOOD[surface]))
      expect(fits, surface).toBe(true)
    }
  })

  it('at most one song line per screen', () => {
    const files = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components'))].filter((f) => !f.endsWith('SongLine.tsx'))
    let screens = 0
    for (const file of files) {
      const hits = (readFileSync(file, 'utf8').match(/<SongLine\b/g) ?? []).length
      expect(hits, file).toBeLessThanOrEqual(1)
      screens += hits
    }
    // the daily recap, the archive landing, the LIFE chapter recap
    expect(screens).toBe(3)
  })
})
