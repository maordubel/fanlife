import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { classifySport, isFootball } from '@/scripts/ingest/lib/guards'

describe('sport guard', () => {
  it('accepts a football page', () => {
    expect(
      classifySport({
        title: 'הפועל תל אביב (כדורגל)',
        categories: ['שחקני הפועל תל אביב (כדורגל)'],
      }).sport,
    ).toBe('football')
  })

  it('rejects a basketball page', () => {
    const verdict = classifySport({
      title: 'סגל הפועל תל אביב (כדורסל)',
      categories: ['שחקני כדורסל'],
    })
    expect(verdict.sport).toBe('basketball')
    expect(isFootball({ title: 'סגל הפועל תל אביב (כדורסל)' })).toBe(false)
  })

  it('refuses to guess when both sports appear on one page', () => {
    const verdict = classifySport({
      title: 'הפועל תל אביב',
      body: 'המועדון מפעיל מחלקת כדורגל ומחלקת כדורסל',
    })
    expect(verdict.sport).toBe('unknown')
    expect(verdict.reason).toContain('both sports')
  })

  it('refuses a page with no sport marker', () => {
    expect(classifySport({ title: 'רשימת קפטנים' }).sport).toBe('unknown')
  })

  it('is the import gate: only proven football passes', () => {
    expect(isFootball({ title: 'עונת 2001/02 (כדורגל)' })).toBe(true)
    expect(isFootball({ title: 'עונת 2001/02 (כדורסל)' })).toBe(false)
    expect(isFootball({ title: 'משהו אחר' })).toBe(false)
  })
})

/**
 * קבצים שפרשו — retired files, and what stops them coming back.
 *
 * Until 12.10.2026 deltas reached the repo through GitHub's web upload, which adds and
 * overwrites but never deletes, so a retired file was kept as an inert tombstone (rule
 * 26). Delivery is now a git pull request, which deletes. The tombstones were removed on
 * 12.10.2026 and a retired file is now simply deleted.
 *
 * The guard flips rather than vanishes (rule 65): every deleted path is listed in
 * `tests/fixtures/retired-paths.json`, and this test fails if one of them reappears — a
 * file revived at a retired path is exactly what the tombstone test used to catch.
 */
const RETIRED: readonly string[] = (
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/retired-paths.json'), 'utf8')) as {
    deleted: string[]
  }
).deleted

describe('retired files stay deleted', () => {
  const ROOT = process.cwd()

  it('remembers what was deleted', () => {
    expect(RETIRED.length).toBeGreaterThan(50)
    expect(new Set(RETIRED).size).toBe(RETIRED.length)
    expect([...RETIRED].sort()).toEqual(RETIRED)
  })

  it('no retired path has come back', () => {
    const back = RETIRED.filter((path) => existsSync(join(ROOT, path)))
    expect(back, `retired paths reappeared:\n  ${back.join('\n  ')}`).toEqual([])
  })
})

/**
 * Two retired ROUTES are kept, because they still do a job: links posted before the run
 * screen existed land on `/trivia/summary`, and `/crest` was a gate. Each one only
 * redirects — no local import, no server action — so it cannot break a build.
 */
describe('retired routes only redirect', () => {
  const ROOT = process.cwd()
  const REDIRECTS = ['app/crest/page.tsx', 'app/trivia/summary/page.tsx']

  it('imports nothing but the redirect, and stays short', () => {
    for (const path of REDIRECTS) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      const imports = [...text.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] as string)
      expect(imports, path).toEqual(['next/navigation'])
      expect(text, path).toContain('redirect(')
      expect(text, `${path} must not declare a server action`).not.toContain("'use server'")
      expect(text.split('\n').length, path).toBeLessThan(30)
    }
  })
})

/**
 * המניפסט — every path this project has ever shipped.
 *
 * `docs/shipped-paths.txt` is append-only. A listed path may disappear only by being
 * declared retired in `tests/fixtures/retired-paths.json` — so a deletion is a decision
 * written down, never a file that quietly went missing.
 */
describe('shipped paths', () => {
  const ROOT = process.cwd()
  const listed = readFileSync(join(ROOT, 'docs/shipped-paths.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
  const retired = new Set(RETIRED)

  it('remembers a real number of paths', () => {
    expect(listed.length).toBeGreaterThan(80)
  })

  it('every path it remembers still exists, or is declared retired', () => {
    const missing = listed.filter((path) => !existsSync(join(ROOT, path)) && !retired.has(path))
    expect(
      missing,
      `deleted without being declared — add each to tests/fixtures/retired-paths.json:\n  ${missing.join('\n  ')}`,
    ).toEqual([])
  })

  it('has no duplicates and stays sorted, so a diff on it is readable', () => {
    expect(new Set(listed).size).toBe(listed.length)
    expect([...listed].sort()).toEqual(listed)
  })
})

/**
 * every `.tsx` under `app/` and `components/` — shared by the two guards below that both
 * need to walk the whole component tree (the dialog z-index rule and the logical-
 * properties rule). One walk, one list, so the two never quietly drift onto different
 * sets of files.
 */
const REPO_ROOT = join(__dirname, '..')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (path.endsWith('.tsx')) out.push(path)
  }
  return out
}

const TSX_FILES = ['app', 'components'].flatMap((root) => sourceFiles(join(REPO_ROOT, root)))

/**
 * The real end of a JSX opening tag — not the first `>`, the one that is not inside a
 * quoted string or a `{…}` expression.
 *
 * `/<[a-zA-Z][^>]*role="dialog"[^>]*>/` looks reasonable and is blind: `[^>]*` stops at
 * the FIRST literal `>` it meets, and an opening tag routinely contains one before its
 * own close — `onClick={(event) => event.stopPropagation()}` is the arrow in "=>", and
 * every one of the four dialogs below carries exactly that handler ahead of
 * `role="dialog"`. The old regex truncated there, never reached `role="dialog"` at all,
 * and `text.matchAll(...)` found nothing to check — a test that returns zero violations
 * because it stopped reading the tag, not because the tag was fine. It shipped green
 * against all four of them.
 *
 * So this walks the source by hand instead of trusting a character class: from `<Name`
 * it tracks quote state (`"`, `'`, `` ` ``, so a `>` inside `className="…"` or inside a
 * string an expression builds is never mistaken for the tag's own close) and brace depth
 * (so the `>` in `=>`, or any comparison inside a `{…}` expression, is invisible while
 * depth is above zero) and calls the tag done at the first `>` that is neither quoted nor
 * nested. That is the actual grammar of a JSX opening tag; a character class was never
 * going to have it.
 */
function openingTags(text: string): string[] {
  const tags: string[] = []
  const tagStart = /<[A-Za-z][\w.]*/g
  let start: RegExpExecArray | null
  while ((start = tagStart.exec(text))) {
    let i = tagStart.lastIndex
    let depth = 0
    let quote: string | null = null
    while (i < text.length) {
      const ch = text[i]
      if (quote) {
        if (ch === '\\' && quote !== '`') i += 1 // an escaped char inside the string can't end it
        else if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
      } else if (ch === '{') {
        depth += 1
      } else if (ch === '}') {
        depth = Math.max(0, depth - 1)
      } else if (ch === '>' && depth === 0) {
        tags.push(text.slice(start.index, i + 1))
        break
      }
      i += 1
    }
    tagStart.lastIndex = i + 1
  }
  return tags
}

describe('שכבות — a modal is above the navigation, always', () => {
  it('keeps the tab bar at z-50 so there is one number to clear', () => {
    const bar = readFileSync(join(REPO_ROOT, 'components/ui/TabBar.tsx'), 'utf8')
    expect(bar).toContain('z-50')
  })

  it('puts every dialog above it', () => {
    // A modal under the fixed navigation is not a z-index nitpick. The kit game's
    // "next shirt" button landed inside the bar's strip, so the tap that should have
    // advanced the round navigated to the trivia wing instead — on every shirt, on
    // every phone. Found by playing a round through; this is what stops it coming back.
    // `openingTags` finds the real tag — see its own comment for why the naive version
    // never did.
    const bad: string[] = []
    for (const file of TSX_FILES) {
      const text = readFileSync(file, 'utf8')
      for (const tag of openingTags(text)) {
        if (!tag.includes('role="dialog"')) continue
        const z = tag.match(/z-\[?(\d+)\]?/)
        const value = Number(z?.[1] ?? 0)
        if (value <= 50) bad.push(`${file.slice(REPO_ROOT.length + 1)}: z-${z?.[1] ?? 'none'}`)
      }
    }
    expect(bad, bad.join('\n')).toEqual([])
  })
})

/**
 * כיוון פיזי — rule 9 promises "no `left-*`/`right-*`, not even inside a comment", and
 * until now nothing checked it. The repo is clean today, which is exactly the condition
 * under which a guard is cheapest to add and easiest to forget: there is no failing case
 * pushing anyone to write it. This is that guard, not a claim that it was ever needed yet.
 */
describe('כיוון — logical properties only, never left-*/right-*/ml-/mr-/pl-/pr-', () => {
  // Six prefixes, one shape: the class name, a literal `-`, and then something that is
  // actually a Tailwind value — a digit, an arbitrary `[…]`, or one of the few bare
  // keywords the position/spacing scales use. That last part is what keeps this from
  // firing on English prose: this project writes long explanatory comments, and a phrase
  // like "right to left" or "outright" is exactly the kind of text a bare `right-` (or a
  // lookbehind that only excludes letters) would light up on. Requiring a value after the
  // dash — not just any word character — is the difference between a class and a
  // sentence. `overflow-`, `scroll-smooth`, `border-s-rule` never reach the dash check at
  // all: none of the six prefixes appear in them as a bounded token to begin with, and a
  // preceding letter (as in a hypothetical "…overflow-left-4") is excluded by the
  // lookbehind below. `scroll-ml-4` (scroll-margin-left — physical, not `scroll-ms-4`)
  // DOES still match, on purpose: a `scroll-` prefix does not make a physical utility
  // logical, and this guard has no reason to look away from it.
  const VALUE = String.raw`(?:\d|\[|auto\b|full\b|px\b|screen\b)`
  const PHYSICAL = new RegExp(String.raw`(?<![\w])(?:left|right|ml|mr|pl|pr)-${VALUE}`, 'g')

  it('is clean today, and stays that way', () => {
    const bad: string[] = []
    for (const file of TSX_FILES) {
      const text = readFileSync(file, 'utf8')
      const hits = text.match(PHYSICAL)
      if (hits) bad.push(`${file.slice(REPO_ROOT.length + 1)}: ${[...new Set(hits)].join(', ')}`)
    }
    expect(bad, bad.join('\n')).toEqual([])
  })
})
