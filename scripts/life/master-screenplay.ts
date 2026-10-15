/**
 * FAN LIFE master screenplay — READ pass (15.10.2026).
 *
 *   npm run life:master            writes content/generated/life-master-screenplay.json
 *   npm run life:master -- --check fails when the file on disk is not what a fresh read produces
 *
 * Source: docs/life/FANLIFE-LIFE-STORY-BIBLE-2026-10-15.md (§16–17), kept as received. This pass derives no
 * engine effect and writes no game content; it makes the script countable, checkable and addressable by id.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs'
import {readMasterScreenplay} from '../../lib/life/universal/master/read'

const SOURCE = 'docs/life/FANLIFE-LIFE-STORY-BIBLE-2026-10-15.md'
const OUT = 'content/generated/life-master-screenplay.json'

const next = JSON.stringify(readMasterScreenplay(readFileSync(SOURCE, 'utf8'), SOURCE), null, 2) + '\n'
if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== next) { console.error(`${OUT} is stale — run npm run life:master`); process.exit(1) }
  console.log(`${OUT} is current`)
} else {
  writeFileSync(OUT, next)
  const d = JSON.parse(next) as ReturnType<typeof readMasterScreenplay>
  const scenes = d.chapters.flatMap(c => c.scenes)
  console.log(`${d.chapters.length} chapters · ${scenes.length} scenes · ${scenes.reduce((n, s) => n + s.options.length, 0)} options · unread ${d.report.unread.length}`)
}
