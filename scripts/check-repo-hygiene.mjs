/**
 * מקור אחד לכל דבר — the guard that stops the repository from lying about itself.
 *
 *   npm run repo:hygiene
 *
 * Maor, 7.9.2026, in his own audit: *"A developer or coding agent can edit the wrong copy,
 * report the issue as fixed, pass local reasoning, and make no change to the actual running
 * game."* That is not hypothetical here. `origin/main` currently carries 51 source files in
 * the repository ROOT — `LifeStage.tsx`, `WorldScene.ts`, `dialogue.ts`, and a
 * `dialogue (1).ts` — every one of them a flattened copy of a file that also lives in
 * `app/`, `components/` or `lib/`. They arrived through the GitHub web uploader, which
 * drops loose files at the root when the folders are not dragged as folders.
 *
 * None of them is imported: `tsconfig.json` only includes `app/`, `components/`, `lib/` and
 * `types/`, so they do not break the build. That is exactly what makes them dangerous —
 * a fix can be applied to one of them and everything will still be green.
 *
 * This script is the rule, enforced. It fails on:
 *
 *   1. any `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs` at the root that is not a known config file;
 *   2. any file whose name is a copy artefact — `foo (1).ts`, `foo copy.ts`, `foo.old.ts`;
 *   3. any runtime asset at the root (`.png`, `.ogg`, `.mp4` …) — those belong in `public/`;
 *   4. any root file whose basename already exists under a production directory, which is
 *      the "two plausible implementations" case the whole rule exists to prevent.
 *
 * It prints what to delete rather than deleting anything: the copies are in a repository
 * this script cannot write to, and a cleanup nobody read is how the mess started.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

const ROOT = process.cwd()

/** the only source-shaped files allowed to sit at the root, by exact name */
const ALLOW = new Set([
  'next.config.mjs',
  'middleware.ts', // Next.js requires request middleware at the root.
  'next-env.d.ts',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'vitest.config.ts',
  'eslint.config.mjs',
  '.eslintrc.js',
])

/** the only prose files allowed to sit at the root, by exact name */
const ALLOW_PROSE = new Set(['README.md', 'CLAUDE.md'])
/** prose lives under docs/ — everything else in the root is upload residue */
const PROSE = new Set(['.md', '.txt'])

const SOURCE = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const ASSET = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ogg', '.m4a', '.mp3', '.mp4', '.webm', '.woff', '.woff2'])
/** where a runtime concept is allowed to live */
const PRODUCTION = ['app', 'components', 'lib', 'scripts', 'tests', 'content', 'types']
const COPY_MARK = /( \(\d+\)|[ ._-](copy|old|backup|bak|orig|final|v\d+))\.[a-z]+$/i

function walk(dir, out = new Map()) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, out)
    else if (!out.has(name)) out.set(name, path)
  }
  return out
}

const elsewhere = new Map()
for (const dir of PRODUCTION) walk(join(ROOT, dir), elsewhere)

const problems = []
for (const name of readdirSync(ROOT)) {
  const path = join(ROOT, name)
  if (statSync(path).isDirectory()) continue
  const ext = extname(name).toLowerCase()
  // a copy mark only matters on a file that could be mistaken for source or an asset:
  // "APPLY-STAGE-A-FINAL.md" is a document with a word in its name, not a duplicate
  if (COPY_MARK.test(name) && (SOURCE.has(ext) || ASSET.has(ext))) {
    problems.push([name, 'עותק — השם עצמו אומר שזה כפילות'])
    continue
  }
  if (SOURCE.has(ext) && !ALLOW.has(name)) {
    const twin = elsewhere.get(basename(name))
    problems.push([name, twin ? `כפילות של ${twin.slice(ROOT.length + 1)}` : 'קוד בשורש — מקומו תחת app/ components/ lib/ scripts/ tests/'])
    continue
  }
  /**
   * מטמון של המהדר בתוך הריפו — 7.9.2026.
   *
   * `tsconfig.json` sets `incremental: true`, so `tsc` writes a `.tsbuildinfo` next to the
   * config and reads it on the next run to decide which files it may skip. A COMMITTED one
   * is a cache produced on somebody else's machine, at some other moment, possibly by
   * another compiler version — and the failure it produces is the worst kind: a typecheck
   * that reports clean while the errors are still there. It is generated output; it belongs
   * nowhere near a repository.
   */
  if (name.endsWith('.tsbuildinfo')) {
    problems.push([name, 'מטמון של המהדר — נוצר מחדש לבד, ובריפו הוא עלול לגרום ל-tsc לדווח נקי כשהוא לא'])
    continue
  }
  /**
   * מסמכים בשורש — הסיבוב האחרון של אותה מחלה (7.9.2026, דלתא 47).
   *
   * The 128-file cleanup removed the code and the assets, and left four prose files behind:
   * `READ-ME-FIRST.md`, `READ-ME-FIRST.txt`, `README-SOURCE.md`, `README-UPLOAD.md`. They
   * survived because this check only ever looked at source and asset extensions, so nothing
   * ever said they were there — and a rule nobody enforces is a rule that comes back with
   * the next upload.
   *
   * Every one of them already has a byte-identical copy under
   * `docs/implementation-history/legacy/`, which is the tombstone rule 26 asks for, and not
   * one of them is referenced by any file in the repository. `README.md` and `CLAUDE.md` are
   * the two documents that genuinely belong at the root; everything else belongs in `docs/`.
   */
  if (PROSE.has(ext) && !ALLOW_PROSE.has(name)) {
    problems.push([name, 'מסמך בשורש — מקומו תחת docs/. עותק שמור כבר קיים ב-docs/implementation-history/legacy/'])
    continue
  }
  if (ASSET.has(ext)) {
    const twin = elsewhere.get(basename(name))
    problems.push([name, twin ? `נכס כפול — הקנוני הוא ${twin.slice(ROOT.length + 1)}` : 'נכס בשורש — מקומו תחת public/'])
  }
}

if (problems.length === 0) {
  console.log('repo:hygiene — נקי. אין קוד ואין נכסים בשורש.')
  process.exit(0)
}

console.error(`repo:hygiene — ${problems.length} קבצים בשורש שאסור להם להיות שם:\n`)
for (const [name, why] of problems.sort()) console.error(`  ${name.padEnd(34)} ${why}`)
console.error(`\nמחיקה: פותחים את הריפו ב-github.dev (לוחצים "." בעמוד הריפו), מסמנים אותם בסייר`)
console.error(`הקבצים, מקש ימני → Delete, ואז Commit. שום קובץ ברשימה הזו לא מיובא בקוד הרץ.`)
process.exit(1)
