/** `npm run wiki:songs -- <export.xml> [...] [--out dir]` */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { parseXmlDump } from './adapters/mediawiki'
import { IngestReport } from './lib/report'
import { songsFromPages } from './sources/redfans-songs'

const BASE = process.env.WIKI_BASE_URL ?? 'https://wiki.red-fans.com'

function main(): void {
  const argv = process.argv.slice(2)
  const files: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? ''
    if (arg.startsWith('--')) {
      if (arg === '--out' && !arg.includes('=')) index += 1
      continue
    }
    files.push(arg)
  }
  if (files.length === 0) {
    console.error('usage: npm run wiki:songs -- <export.xml> [...]')
    process.exitCode = 1
    return
  }

  const root = resolve(process.cwd())
  const report = new IngestReport('redfans-songs')
  const byTitle = new Map(
    files
      .flatMap((file) => parseXmlDump(readFileSync(file, 'utf8'), BASE))
      .map((page) => [page.title, page] as const),
  )

  const { songs, lyricsRestricted } = songsFromPages([...byTitle.values()], {}, report)

  const byType = new Map<string, number>()
  for (const song of songs) byType.set(song.songType, (byType.get(song.songType) ?? 0) + 1)

  console.log(`pages: ${byTitle.size} · songs: ${songs.length}`)
  for (const [type, count] of [...byType].sort()) console.log(`  ${type}: ${count}`)
  console.log(`usable in app: ${songs.filter((song) => song.usableInApp).length}`)
  console.log(`lyrics-restricted (wiki's own mark): ${lyricsRestricted.length}`)
  console.log(`with a tune named: ${songs.filter((song) => song.originalTitle).length}`)
  console.log(`with an author named: ${songs.filter((song) => song.lyricsAuthorHe).length}`)
  console.log(`with a background: ${songs.filter((song) => song.backgroundHe).length}`)
  console.log(`skipped: ${report.skipped.length}`)

  const outDir = join(root, 'data/canon')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'songs.json'), JSON.stringify({ songs, lyricsRestricted }, null, 2), 'utf8')
  console.log('\nwritten to data/canon/songs.json')
}

main()
