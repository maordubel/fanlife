import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// @ts-expect-error — a plain .mjs script, imported for its decision function
import { decide } from '../scripts/vercel/should-build.mjs'

/**
 * Vercel's Ignored Build Step (22.9.2026): a commit is skipped ONLY when every file in it is
 * something the running site never reads. The storage it saves is real; a skipped build that
 * should have shipped is worse, so every doubt builds.
 */
const ROOT = join(__dirname, '..')

describe('should-build — the Ignored Build Step', () => {
  it('is wired in vercel.json', () => {
    const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as { ignoreCommand?: string }
    expect(config.ignoreCommand).toBe('node scripts/vercel/should-build.mjs')
  })

  it('skips a commit of docs, tests, build-time scripts and art sources only', () => {
    expect(decide(['docs/14-portal-identity.md', 'tests/kit.test.ts', 'scripts/brand/art.py']).build).toBe(false)
    expect(decide(['brand/source/crests-2026-09-22/keter-black.png', 'CLAUDE.md']).build).toBe(false)
  })

  it('F14: builds when a file the server reads at runtime with fs changes', () => {
    for (const runtime of ['scripts/master/local-bootstrap.sql', 'supabase/migrations/20260928090000_worker_events_taxonomy.sql', 'research-staging/aek-athens/manifest.json', 'research-profiles/celtic.json', 'research-data/aek-athens/archive-docs.json']) {
      expect(decide(['docs/a.md', runtime]).build, runtime).toBe(true)
      expect(decide([runtime]).build, runtime).toBe(true)
    }
    // docs and tests alone still skip
    expect(decide(['docs/a.md', 'tests/x.test.ts']).build).toBe(false)
  })

  it('F14: every path the server reads with fs is outside the skip list', () => {
    const src = readFileSync(join(ROOT, 'lib/master/evaluation-db.ts'), 'utf8')
    for (const p of ['scripts/master/local-bootstrap.sql', 'supabase/migrations']) {
      expect(src.includes(p), p).toBe(true)
      expect(decide([`${p.replace(/\/$/, '')}${p.endsWith('.sql') ? '' : '/x.sql'}`]).build, p).toBe(true)
    }
  })

  it('builds the moment one file is something the site runs or serves', () => {
    for (const live of ['app/page.tsx', 'lib/kit/crestMarks.ts', 'components/ui/Badge.tsx', 'public/brand/crests/keter-color.png', 'content/manual/matches.json', 'messages/he.json', 'package.json', 'vercel.json', 'next.config.mjs']) {
      expect(decide(['docs/a.md', live]).build, live).toBe(true)
    }
  })

  it('builds when it cannot tell', () => {
    expect(decide([]).build).toBe(true)
  })

  it('never lets the running site import from a path it skips', () => {
    // If app/, components/ or lib/ ever import from scripts/, data/ or content/raw/, a commit
    // that changes only that file would be skipped and the site would ship stale.
    for (const dir of ['app', 'components', 'lib']) {
      const out = require('node:child_process').execSync(
        `grep -rlE "from ['\\"](@/(scripts|data|content/raw)|\\.\\./+(scripts|data)/)" ${dir} || true`,
        { cwd: ROOT, encoding: 'utf8' },
      ) as string
      expect(out.trim(), dir).toBe('')
    }
  })
})
