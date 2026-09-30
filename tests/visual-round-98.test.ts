import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { playerCensus } from '@/lib/club/census'
import { rosterIndex } from '@/lib/game/allTimeXI'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('visual round — census, museum, gates 4 / 9 / 10 (29.9.2026)', () => {
  it('counts the players from the roster, never a typed number', () => {
    const census = playerCensus()
    expect(census.total).toBe(rosterIndex().total)
    expect(census.total).toBeGreaterThan(500)
    expect(census.decades.length).toBeGreaterThan(5)
    // a man in two decades is counted in both, so the bars may exceed the total but no bar may
    expect(Math.max(...census.decades.map((row) => row.n))).toBeLessThanOrEqual(census.total)
    expect(census.latest ?? 0).toBeLessThanOrEqual(new Date().getFullYear())
    expect(read('components/club/PlayerCensus.tsx')).not.toMatch(/\b6[0-9]{2}\b/)
  })

  it('shows the census on /hapoel and inside the archive, and links the museum to the archive', () => {
    const page = read('app/hapoel/page.tsx')
    expect(page).toContain('PlayerCensus')
    expect(page).toContain('archiveHref')
    expect(page).toContain('isOpen')
    expect(read('components/archive/ArchiveApp.tsx')).toContain('census-open')
    expect(read('app/archive/page.tsx')).toContain('playerCensus()')
    expect(read('app/hapoel/PlayerFinder.tsx')).toContain('/archive?at=')
  })

  it('gate 4 no longer truncates a part label, and names the sample', () => {
    const run = read('app/kits/build/KitGameRun.tsx')
    expect(run).not.toMatch(/truncate[^"]*text-\[10px\][^"]*\{option\.labelHe\}/)
    expect(run).toContain('kitgame.sample.caption')
    expect(run).toContain('line-clamp-2')
  })

  it('gate 9 leads with the budget plate and the crown; gate 10 stands on the ink stage', () => {
    const rr = read('app/royal-rumble/RoyalRumbleRun.tsx')
    expect(rr).toContain('data-rumble="budget"')
    expect(rr).toContain('<Crown')
    const bc = read('components/blind-cow/BlindCowGame.tsx')
    expect(bc).toContain('bc-stage')
    expect(bc).toContain('data-blindcow="hud"')
    for (const file of ['app/royal-rumble/RoyalRumbleRun.tsx', 'components/blind-cow/BlindCowGame.tsx', 'components/blind-cow/ClueStack.tsx', 'components/club/PlayerCensus.tsx']) {
      expect(read(file), file).not.toMatch(/rounded-/)
    }
  })
})
