import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { communityShelf, creditsIndex } from '@/lib/credits'
import { CREDIT_GROUPS } from '@/lib/credits/groups'
import { MESSAGES } from '@/lib/i18n'
import { SHIRTS } from '@/lib/life/shirts'
import { MERCH_LINKS, merchForShirt, seasonYears } from '@/lib/merch'

/**
 * איפה קונים — the shop registry, and the one promise it exists to keep: an independent
 * replica shop is never presented as the club's, and no screen spells a shop address itself.
 */

const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('lib/merch — the registry', () => {
  it('links only over https', () => {
    for (const link of MERCH_LINKS) expect(link.url, link.id).toMatch(/^https:\/\//)
  })

  it('never calls an independent shop official', () => {
    const independent = MERCH_LINKS.filter((link) => link.kind === 'independent-replica')
    expect(independent.length).toBeGreaterThan(0)
    for (const link of independent) {
      expect(link.kind, link.id).not.toBe('official-club')
      expect(link.nameHe, link.id).not.toContain('רשמי')
      expect(link.disclosureHe, link.id).toContain('רפליקה')
      expect(link.disclosureHe, link.id).not.toMatch(/^מוצר רשמי/)
    }
  })

  it('gives every entry a disclosure', () => {
    for (const link of MERCH_LINKS) expect(link.disclosureHe.trim().length, link.id).toBeGreaterThan(0)
  })

  it('ties a shop only to shirt ids that exist', () => {
    const ids = new Set(SHIRTS.map((shirt) => shirt.id))
    for (const link of MERCH_LINKS) for (const id of link.shirtIds ?? []) expect(ids.has(id), `${link.id} → ${id}`).toBe(true)
  })

  it('shows the independent shop only on its seasons, and the club store always, first', () => {
    expect(seasonYears('1985/86')).toEqual(['1985', '1986'])
    expect(seasonYears('1999/00')).toEqual(['1999', '2000'])
    expect(merchForShirt('kit198485H', '1984/85').map((link) => link.id)).toEqual(['htafc-official'])
    expect(merchForShirt('kit199900H', '1999/00').map((link) => link.id)).toEqual(['htafc-official', 'mishak-hashabbat'])
    expect(merchForShirt('visa86', '1986').map((link) => link.id)).toEqual(['htafc-official', 'mishak-hashabbat'])
    expect(merchForShirt('crt').map((link) => link.id)).toEqual(['htafc-official'])
  })
})

describe('no screen spells a shop address', () => {
  it('keeps shop domains out of every source file in components/ and app/', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(join(ROOT, dir))) {
        const path = `${dir}/${name}`
        if (statSync(join(ROOT, path)).isDirectory()) walk(path)
        else if (/\.(tsx?|jsx?|mjs)$/.test(path)) files.push(path)
      }
    }
    walk('components')
    walk('app')
    // `app/qa/` holds fixture rows for the QA harness of the market and auction screens
    // (seeded product rows, not links a player sees); everything else must go through
    // `lib/merch.ts`.
    const offenders = files.filter((path) => !path.startsWith('app/qa/') && /htafc\.co\.il|mishakhashabbat/.test(read(path)))
    expect(offenders).toEqual([])
  })
})

describe('/credits — the community shelf', () => {
  it('is a declared group with its own title and description', () => {
    expect(CREDIT_GROUPS).toContain('community')
    expect(MESSAGES['credits.group.community.title']).toBeTruthy()
    expect(MESSAGES['credits.group.community.desc']).toBeTruthy()
  })

  it('thanks משחק השבת for what it does, and cites it for nothing', () => {
    const shelf = communityShelf()
    const entry = shelf.entries.find((row) => row.title === 'משחק השבת')
    expect(entry).toBeTruthy()
    expect(MESSAGES[entry?.descKey as 'credits.community.mishak-hashabbat.desc']).toBe('שימור, תיעוד ואספנות היסטורית של הפועל תל אביב')
    const index = creditsIndex()
    for (const group of index.groups) {
      expect(group.key, 'no citation is grouped onto community').not.toBe('community')
      for (const row of group.entries) {
        expect(row.title, group.key).not.toContain('משחק השבת')
        expect(row.url ?? '', group.key).not.toContain('mishakhashabbat')
      }
    }
  })

  it('renders the shops from the registry, with disclosure and safe links', () => {
    const page = read('app/credits/page.tsx')
    expect(page).toContain('shelf.shops.map')
    expect(page).toContain('shop.disclosureHe')
    expect(page).toContain('rel="noopener noreferrer"')
    expect(communityShelf().shops).toBe(MERCH_LINKS)
    const component = read('components/life/MerchLinks.tsx')
    expect(component).toContain('merchForShirt')
    expect(component).toContain('link.disclosureHe')
    expect(component).toContain('target="_blank"')
    expect(component).toContain('rel="noopener noreferrer"')
  })
})

describe('delta 93 — the club store is a general store, the replica says it is one', () => {
  it('scopes every official link to the general store and every replica to its seasons', () => {
    for (const link of MERCH_LINKS) {
      if (link.kind === 'official-club') expect(link.scope, link.id).toBe('general-store')
      else {
        expect(link.scope, link.id).toBe('season')
        expect(link.seasons?.length ?? link.shirtIds?.length ?? 0, link.id).toBeGreaterThan(0)
      }
    }
  })

  it('never offers to "buy this shirt" — the CTAs are the store and a nostalgic replica', () => {
    expect(MESSAGES['merch.cta.official']).toBe('לחנות הרשמית של הפועל תל אביב')
    expect(MESSAGES['merch.cta.replica']).toBe('מצא רפליקה נוסטלגית')
    const component = read('components/life/MerchLinks.tsx')
    expect(component).toContain("t('merch.cta.official')")
    expect(component).toContain("t('merch.cta.replica')")
    for (const text of Object.values(MESSAGES).filter((v): v is string => typeof v === 'string')) {
      expect(text).not.toContain('לקניית החולצה')
    }
    // the replica's disclosure is printed on every showing
    expect(component).toContain('link.disclosureHe')
  })
})
