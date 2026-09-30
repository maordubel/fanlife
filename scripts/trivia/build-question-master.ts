/**
 * npm run trivia:master — build `content/generated/question-master.json`.
 *
 * Every trivia template, once, over the archive and the Player Master (see
 * `lib/game/questions/build.ts`). Prints the counts and every question id added or
 * removed since the file on disk, so a rebuild after an archive correction says what it
 * changed rather than just changing it.
 *
 * `server-only` is a bundler guard with no Node entry; the stub the tests use stands in
 * for it here, before anything that imports it is loaded.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import Module from 'node:module'
import { dirname, join } from 'node:path'

type Resolver = (request: string, ...rest: unknown[]) => string
const loader = Module as unknown as { _resolveFilename: Resolver }
const resolve = loader._resolveFilename
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'server-only') return join(process.cwd(), 'tests/stubs/server-only.ts')
  return resolve.call(this, request, ...rest)
}

const OUT = 'content/generated/question-master.json'

async function main() {
  const { buildQuestionMaster, serialiseMaster } = await import('../../lib/game/questions/build')
  const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null
  const pin = process.argv.includes('--keep-season') && previous ? previous.openThrough : undefined
  const master = buildQuestionMaster({ openThrough: pin, previous })
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, serialiseMaster(master))

  const before = new Set<string>((previous?.questions ?? []).map((question: { id: string }) => question.id))
  const after = new Set(master.questions.map((question) => question.id))
  const added = [...after].filter((id) => !before.has(id))
  const removed = [...before].filter((id) => !after.has(id))
  console.log(JSON.stringify(master.counts))
  console.log(`added ${added.length} · removed ${removed.length}`)
  for (const id of added.slice(0, 40)) console.log(`+ ${id}`)
  for (const id of removed.slice(0, 40)) console.log(`- ${id}`)
}

void main()
