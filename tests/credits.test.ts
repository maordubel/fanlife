import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { collectCitations, creditsIndex, groupOf } from '@/lib/credits'
import { CREDIT_GROUPS, OWNER_KNOWLEDGE_LABEL, creditsHref } from '@/lib/credits/groups'
import { MESSAGES } from '@/lib/i18n'

/**
 * המקורות — one page, built from the data (spec §0.3, 22.9.2026).
 *
 * Three promises, and each is checked against the thing it promises about:
 *
 *   1. **The page is the data.** Every `sourceTitle` a row in `content/manual` carries is on
 *      it, every non-generated asset-provenance row is on it, and it is counted — so the
 *      list cannot drift from the facts the way a typed list would (rules 45, 73).
 *   2. **The shelves the owner named are there**: the club's own site, the press, the wikis,
 *      the photographs and their photographer (ישי צבי, rule 69), the kit archives, the
 *      research (ד״ר אייל גרטמן וכפיר פרנקל), and the owner-knowledge label (spec §0.2).
 *   3. **Nothing else prints a credit.** The screens that used to carry a per-item source
 *      line carry `מקור מתועד` and a link here, and no JSX prints a `sourceTitle`,
 *      `sourceHe` or `creditHe` any more.
 */

const ROOT = join(__dirname, '..')
const index = creditsIndex()
const titles = new Set(index.groups.flatMap((group) => group.entries.map((entry) => entry.title)))
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const shelf = (key: string) => index.groups.find((group) => group.key === key)

describe('/credits — the list is read out of the data', () => {
  it('orders its shelves as the page declares them, and leaves none empty', () => {
    const keys = index.groups.map((group) => group.key)
    expect(keys).toEqual(CREDIT_GROUPS.filter((key) => keys.includes(key)))
    for (const group of index.groups) {
      expect(group.entries.length, group.key).toBeGreaterThan(0)
      expect(group.count, group.key).toBe(group.entries.reduce((sum, entry) => sum + entry.count, 0))
      const seen = new Set(group.entries.map((entry) => entry.title))
      expect(seen.size, `${group.key} lists a title twice`).toBe(group.entries.length)
      for (const entry of group.entries) expect(entry.count, entry.title).toBeGreaterThan(0)
    }
    expect(index.totals.entries).toBe(index.groups.reduce((sum, group) => sum + group.entries.length, 0))
    expect(index.totals.files).toBeGreaterThan(30)
  })

  it('carries every source title a row in content/manual cites', () => {
    const missing: string[] = []
    for (const name of readdirSync(join(ROOT, 'content/manual')).filter((file) => file.endsWith('.json'))) {
      const walk = (node: unknown, inSchema: boolean) => {
        if (Array.isArray(node)) return node.forEach((item) => walk(item, inSchema))
        if (!node || typeof node !== 'object') return
        const row = node as Record<string, unknown>
        const title = typeof row.sourceTitle === 'string' ? row.sourceTitle.trim().replace(/\s+/g, ' ') : ''
        const internal = /^(content|scripts|lib|public|brand|docs)\//.test(title) || /לא אומת|לא נטען/.test(title)
        const generated = name === 'asset-provenance.json' && row.origin === 'procedural'
        if (title && !inSchema && !internal && !generated && !titles.has(title)) missing.push(`${name}: ${title}`)
        for (const [key, value] of Object.entries(row)) walk(value, inSchema || key === 'schema')
      }
      walk(JSON.parse(read(`content/manual/${name}`)), false)
    }
    expect([...new Set(missing)]).toEqual([])
  })

  it('counts a citation once per row that makes it', () => {
    const scorers = shelf('wiki')?.entries.find((entry) => entry.title.includes('עמודת comments'))
    const rows = (JSON.parse(read('content/manual/match-scorers.json')) as { records: { sourceTitle: string }[] }).records
    expect(scorers?.count).toBe(rows.filter((row) => row.sourceTitle === scorers?.title).length)
  })

  it('links out only to a real address, with the host beside it', () => {
    for (const group of index.groups) {
      for (const entry of group.entries) {
        if (entry.url === null) continue
        expect(entry.url, entry.title).toMatch(/^https?:\/\//)
        expect(entry.host, entry.title).toBe(new URL(entry.url).hostname.replace(/^www\./, ''))
      }
    }
  })

  it('never lists the owner’s name as a source (spec §0.2)', () => {
    for (const title of titles) expect(title).not.toContain('מאור הראל')
    for (const row of collectCitations()) expect(row.title).not.toContain('מאור הראל')
  })
})

describe('/credits — the shelves the owner named', () => {
  it('the club’s own site', () => {
    expect(shelf('club')?.entries.some((entry) => entry.host === 'htafc.co.il')).toBe(true)
  })

  it('the press', () => {
    const hosts = new Set(shelf('press')?.entries.map((entry) => entry.host))
    for (const host of ['ynet.co.il', 'sports.walla.co.il', 'one.co.il', 'haaretz.co.il']) expect(hosts.has(host), host).toBe(true)
  })

  it('ויקיפועל and Wikipedia', () => {
    const hosts = new Set(shelf('wiki')?.entries.map((entry) => entry.host))
    expect(hosts.has('wiki.red-fans.com')).toBe(true)
    expect(hosts.has('en.wikipedia.org')).toBe(true)
    expect(hosts.has('he.wikipedia.org')).toBe(true)
  })

  it('the photographer by name, for every photograph, and footballkitarchive beside him (rule 69)', () => {
    const photo = shelf('photo')
    const zvi = photo?.entries.find((entry) => entry.title.includes('ישי צבי'))
    const photos = (JSON.parse(read('content/manual/kit-photos.json')) as { records: { source: string }[] }).records
    expect(zvi?.count).toBe(photos.filter((row) => row.source === 'vikipoel').length)
    expect(photo?.entries.some((entry) => entry.host === 'footballkitarchive.com')).toBe(true)
  })

  it('the research the founding year stands on', () => {
    const research = shelf('research')
    expect(research?.entries.some((entry) => entry.title.includes('ד״ר אייל גרטמן') && entry.title.includes('כפיר פרנקל'))).toBe(true)
  })

  it('the owner’s knowledge, under its neutral label', () => {
    const team = shelf('team')
    expect(team?.entries.some((entry) => entry.title.startsWith(OWNER_KNOWLEDGE_LABEL))).toBe(true)
    expect(groupOf(`${OWNER_KNOWLEDGE_LABEL}, 1.9.2026`, null)).toBe('team')
  })

  it('the asset provenance — every row a person or a scan brought in', () => {
    const assets = shelf('assets')
    const rows = (JSON.parse(read('content/manual/asset-provenance.json')) as { records: { origin: string; sourceTitle: string }[] }).records
    const brought = rows.filter((row) => row.origin !== 'procedural' && !/^(content|scripts|lib|public|brand|docs)\//.test(row.sourceTitle))
    expect(brought.length).toBeGreaterThan(10)
    const listed = new Set(assets?.entries.map((entry) => entry.title))
    for (const row of brought) expect(listed.has(row.sourceTitle.trim().replace(/\s+/g, ' ')), row.sourceTitle).toBe(true)
  })
})

describe('/credits — the page, the footer and the route lists', () => {
  const page = read('app/credits/page.tsx')

  it('renders the read-model and opens every link safely', () => {
    expect(page).toContain("from '@/lib/credits'")
    expect(page).toContain('creditsIndex()')
    expect(page).toContain('target="_blank"')
    expect(page).toContain('rel="noopener noreferrer"')
    expect(page).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(page).not.toMatch(/rounded-(?!none)/)
    for (const group of CREDIT_GROUPS) {
      expect(MESSAGES[`credits.group.${group}.title`], group).toBeTruthy()
      expect(MESSAGES[`credits.group.${group}.desc`], group).toBeTruthy()
    }
  })

  it('is in the footer of every reading screen, beside the build credit rather than instead of it', () => {
    const screen = read('components/ui/Screen.tsx')
    expect(screen).toContain('href={CREDITS_PATH}')
    expect(screen).toContain("t('footer.credits')")
    expect(screen).toContain('<BuiltByDubel />')
    expect(MESSAGES['credit.engineered']).toBe('Engineered by Dubel Team')
  })

  it('is in the sitemap, the metadata table and the sweep', () => {
    expect(read('app/sitemap.ts')).toContain('`${SITE_URL}/credits`')
    expect(read('lib/seo.ts')).toContain("path: '/credits'")
    expect(read('scripts/brand/qa-sweep.mjs')).toContain("'/credits'")
  })
})

describe('מקור מתועד — the one thing a screen says about a source', () => {
  it('says it in the owner’s words and points at the page', () => {
    expect(MESSAGES['credits.note']).toBe('מקור מתועד')
    expect(creditsHref()).toBe('/credits')
    expect(creditsHref('photo')).toBe('/credits#photo')
    const note = read('components/ui/SourceNote.tsx')
    expect(note).toContain("t('credits.note')")
    expect(note).toContain('rel="noopener noreferrer"')
  })

  /** every surface that printed a per-item credit or source line until 22.9.2026 */
  const SURFACES = [
    'app/kits/archive/ArchiveWing.tsx',
    'app/kits/KitWing.tsx',
    'app/kits/build/KitGameRun.tsx',
    'app/ussishkin/page.tsx',
    'app/ussishkin/CardWall.tsx',
    'app/ussishkin/Reconstruction.tsx',
    'app/lineup/page.tsx',
    'app/lineup/TeamSheet.tsx',
    'app/derby/HateWall.tsx',
    'components/replay/ReplayVerdict.tsx',
    'components/ballot/VoteReaction.tsx',
    'components/archive/ArchiveDrawer.tsx',
    'components/archive/ThreadBoard.tsx',
    'components/life/MatchReport.tsx',
    'components/life/AnchorCard.tsx',
    'components/life/StageFinale.tsx',
    'components/life/HistoricalCutscene.tsx',
    'components/life/AlbumSheet.tsx',
    'components/life/SeasonTicket.tsx',
    'components/life/BookSheet.tsx',
    'components/life/ShirtCard.tsx',
    'components/life/ShopCard.tsx',
  ]

  it('is what each of those surfaces carries now', () => {
    for (const path of SURFACES) expect(read(path), path).toContain('<SourceNote')
  })

  it('and no screen prints a source title, a source line or a credit of its own', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(join(ROOT, dir))) {
        const path = `${dir}/${name}`
        if (statSync(join(ROOT, path)).isDirectory()) walk(path)
        else if (path.endsWith('.tsx')) files.push(path)
      }
    }
    walk('app')
    walk('components')
    const offenders: string[] = []
    for (const path of files) {
      if (path === 'app/credits/page.tsx' || path.startsWith('app/qa/')) continue
      const code = read(path)
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      // a child expression prints; an attribute (`sourceTitle={x.sourceTitle}`) only passes it on
      if (/(?<!=)\{\s*[\w.?!]*\.(sourceTitle|sourceHe|creditHe|sourceUrl)\s*\}/.test(code)) offenders.push(relative(ROOT, join(ROOT, path)))
      if (/t\(\s*'[^']*\.(source|credit)'\s*,\s*\{\s*(source|credit|title)\s*:/.test(code)) offenders.push(`${path} (a source sentence)`)
    }
    expect(offenders).toEqual([])
  })
})
