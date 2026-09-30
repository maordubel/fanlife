import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every local import in the build graph must resolve to a file that exists.
 *
 * This exists because a real deploy died on `Cannot find module './normalize'` — a file
 * that was present locally and missing from the repo. Typecheck catches it only when
 * the file is absent from the machine running it; this walks the imports explicitly, so
 * a broken graph fails here rather than on Vercel.
 */

const ROOT = process.cwd()
const BUILD_DIRS = ['app', 'components', 'lib', 'types']
const CODE = ['.ts', '.tsx']
const CANDIDATES = ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return walk(path)
    return CODE.includes(extname(path)) ? [path] : []
  })
}

function localImports(text: string): string[] {
  const pattern = /(?:from|import)\s+['"]((?:\.|@\/)[^'"]+)['"]/g
  return [...text.matchAll(pattern)].map((match) => match[1] as string)
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(ROOT, specifier.slice(2))
    : resolve(dirname(fromFile), specifier)

  if (existsSync(base) && statSync(base).isFile()) return base
  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`
    if (existsSync(candidate)) return candidate
  }
  return null
}

const FILES = BUILD_DIRS.flatMap((dir) => walk(join(ROOT, dir)))

describe('module graph', () => {
  it('has files to check', () => {
    expect(FILES.length).toBeGreaterThan(10)
  })

  it('resolves every local import in the Next build graph', () => {
    const broken: string[] = []
    for (const file of FILES) {
      const text = readFileSync(file, 'utf8')
      for (const specifier of localImports(text)) {
        if (resolveSpecifier(file, specifier) === null) {
          broken.push(`${file.replace(`${ROOT}/`, '')} → ${specifier}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('keeps the ingest library out of the Next build graph', () => {
    // Importer code lives under scripts/. If app code reaches into it, the build
    // starts typechecking the whole ingestion layer again — which is how a missing
    // importer file became a failed deploy.
    for (const file of FILES) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toContain('@/scripts/')
    }
    expect(existsSync(join(ROOT, 'lib/ingest'))).toBe(false)
  })
})
