/**
 * דגלים שנכתבים ואף אחד לא קורא — the list, so it is a known list and not a surprise.
 *
 *   node scripts/life/flag-audit.mjs
 *
 * A flag that is raised and never read is a promise the game makes to itself and forgets.
 * Some of them are deliberate — a record of a thing that happened, waiting for a screen
 * that will one day show it — and some are a branch that quietly does nothing. This tells
 * them apart by printing them; it does not fail a build, because "unused" is a judgement
 * and this script does not get to make it.
 */
import { readFileSync, readdirSync } from 'node:fs'

const DIRS = ['lib/life', 'lib/life/content', 'lib/life/runtime', 'lib/life/runtime/scenes', 'lib/life/world', 'app/life', 'components/life']
const files = []
for (const dir of DIRS) {
  try {
    for (const file of readdirSync(dir)) if (/\.(ts|tsx)$/.test(file)) files.push(`${dir}/${file}`)
  } catch {
    // a directory that is not there yet is not an error
  }
}
const source = files.map((file) => readFileSync(file, 'utf8')).join('\n')

const written = new Set()
const read = new Set()
for (const match of source.matchAll(/.{0,18}(?:flag|notFlag): '([^']+)'/g)) {
  const head = match[0].slice(0, match[0].length - match[1].length - 8)
  if (/(?:e: 'flag',|a: 'flag',|flag\.raised',|flagValue',)\s*$/.test(head)) written.add(match[1])
  else read.add(match[1])
}
for (const match of source.matchAll(/flags\['([^']+)'\]/g)) read.add(match[1])

const dead = [...written].filter((flag) => !read.has(flag) && !flag.startsWith('beat:') && !flag.startsWith('own:')).sort()
console.log(`${written.size} flags raised · ${read.size} read · ${dead.length} raised and never read\n`)
for (const flag of dead) console.log('  ', flag)
