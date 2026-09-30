import { describe, expect, it } from 'vitest'

import { allPlayers } from '@/lib/archive/player-master'
import { archiveShirts } from '@/lib/kit/archive'
import { playerShirt, wardrobe } from '@/lib/kit/playerShirt'
import photosFile from '@/content/manual/kit-photos.json'

/**
 * Delta 88 — every man wears a shirt, and a real photograph of his era beats a drawing
 * (Maor, 24.9.2026: "אסור שיהיה שחקן ללא חולצה").
 */
describe('playerShirt — the one resolver', () => {
  const players = allPlayers()
  const looks = players.map((player) => ({ player, look: playerShirt(player) }))

  it('never returns null, for all 657 men', () => {
    expect(players.length).toBe(657)
    for (const { look } of looks) {
      expect(look).toBeTruthy()
      if (look.kind === 'photo') expect(look.src).toMatch(/^\/kits\/.+\.webp$/)
      else expect(look.spec).toBeTruthy()
    }
    // an unknown ref still gets a shirt
    expect(playerShirt('no-such-man').kind).toBe('engine')
    expect(playerShirt(null).kind).toBe('engine')
  })

  it('dresses most men in a real photograph (coverage reported)', () => {
    const photo = looks.filter(({ look }) => look.kind === 'photo')
    const exact = photo.filter(({ look }) => !look.approx)
    // printed so the report can quote it
    console.info(`player-shirt coverage: ${photo.length}/${players.length} photo (${exact.length} in-era, ${photo.length - exact.length} a few seasons off), ${players.length - photo.length} engine`)
    expect(photo.length).toBeGreaterThan(players.length / 2)
  })

  it('only serves photographs that are in the measured ledger (no new images)', () => {
    const ledger = new Set(archiveShirts().map((shirt) => shirt.src))
    expect(ledger.size).toBe((photosFile as { records: unknown[] }).records.length)
    for (const { look } of looks) if (look.kind === 'photo') expect(ledger.has(look.src)).toBe(true)
  })

  it('a 1990s man gets a ויקיפועל photograph from inside his spell', () => {
    const nineties = players.find(
      (player) =>
        player.spells.length === 1 &&
        player.spells[0]!.seasons.length > 0 &&
        player.spells[0]!.seasons.every((season) => season >= '1993/94' && season <= '1998/99'),
    )
    expect(nineties).toBeTruthy()
    const look = playerShirt(nineties!)
    expect(look.kind).toBe('photo')
    if (look.kind === 'photo') {
      expect(look.src).toMatch(/\/kits\/vp-199\d/)
      expect(nineties!.spells[0]!.seasons).toContain(look.seasonLabel)
      expect(look.approx).toBe(false)
    }
  })

  it('a pinned season wears that season (gate 3 match, an XI version)', () => {
    const look = playerShirt(null, { season: '2016/17' })
    expect(look.kind).toBe('photo')
    if (look.kind === 'photo') {
      expect(look.seasonLabel).toBe('2016/17')
      expect(look.variant).toBe('home')
      expect(look.src).toBe('/kits/fka-2016-17-home.webp')
    }
  })

  it('never hands out a one-off special shirt', () => {
    for (const { look } of looks) if (look.kind === 'photo') expect(look.variant).not.toBe('special')
  })

  it('is deterministic, and the wardrobe dedupes', () => {
    const a = playerShirt(players[42]!)
    const b = playerShirt(players[42]!)
    expect(a).toEqual(b)
    const wd = wardrobe(players.map((player) => ({ key: player.slug, player })))
    expect(Object.keys(wd.by).length).toBe(new Set(players.map((p) => p.slug)).size)
    expect(wd.shirts.length).toBeLessThan(200)
  })
})

describe('playerShirt — THE WORKER LIFE year', () => {
  it('never dresses a man in a season that had not begun before the life year', () => {
    for (const player of allPlayers()) {
      const first = player.spells.flatMap((spell) => spell.seasons).sort()[0]
      if (!first) continue
      const before = Number(first.slice(0, 4)) + 1
      const look = playerShirt(player, { before })
      if (look.seasonLabel !== '') expect(Number(look.seasonLabel.slice(0, 4))).toBeLessThan(before)
    }
  })
})

/**
 * Delta 100 — the goalkeeper's shirt (owner brief 29.9.2026): where the archive holds an exact
 * goalkeeper photograph for a season, a keeper wears it; where it does not, he wears the
 * home shirt; a field player never wears one; and a pinned season is honoured.
 */
describe('playerShirt — the goalkeeper', () => {
  const keepers = allPlayers().filter((player) => {
    const codes = player.positions?.codes ?? []
    return codes.length > 0 && codes.every((code) => code === 'GK')
  })
  const gkPhotoSeasons = new Set(
    archiveShirts()
      .filter((shirt) => shirt.variant === 'gk' && shirt.seasonLabel && !shirt.seasonAmbiguous)
      .map((shirt) => shirt.seasonLabel as string),
  )
  const pinnedKeeper = keepers.find((player) => player.spells.some((spell) => spell.seasons.some((season) => gkPhotoSeasons.has(season))))

  it('a keeper whose season has an exact goalkeeper photograph wears it', () => {
    expect(pinnedKeeper).toBeTruthy()
    const season = pinnedKeeper!.spells.flatMap((spell) => spell.seasons).find((s) => gkPhotoSeasons.has(s))!
    const look = playerShirt(pinnedKeeper!, { season })
    expect(look.kind).toBe('photo')
    if (look.kind === 'photo') {
      expect(look.variant).toBe('gk')
      expect(look.seasonLabel).toBe(season)
      expect(look.approx).toBe(false)
    }
  })

  it('a keeper with no goalkeeper photograph for his season falls back to the home shirt', () => {
    const homeOnly = keepers.find((player) => {
      const seasons = player.spells.flatMap((spell) => spell.seasons)
      return seasons.length > 0 && seasons.every((season) => !gkPhotoSeasons.has(season))
    })
    expect(homeOnly).toBeTruthy()
    const look = playerShirt(homeOnly!)
    if (look.kind === 'photo') expect(look.variant).not.toBe('gk')
    expect(look).toBeTruthy()
  })

  it('a field player is never dressed in a goalkeeper shirt', () => {
    for (const player of allPlayers()) {
      if (keepers.includes(player)) continue
      const look = playerShirt(player)
      if (look.kind === 'photo') expect(look.variant).not.toBe('gk')
      for (const season of player.spells.flatMap((spell) => spell.seasons).slice(0, 3)) {
        const pinned = playerShirt(player, { season })
        if (pinned.kind === 'photo') expect(pinned.variant).not.toBe('gk')
      }
    }
  })

  it('a slot that IS the keeper (gate 3, no man named) resolves to that season’s goalkeeper shirt', () => {
    const season = [...gkPhotoSeasons][0]!
    const look = playerShirt(null, { season, keeper: true })
    expect(look.kind).toBe('photo')
    if (look.kind === 'photo') expect(look.variant).toBe('gk')
    const outfield = playerShirt(null, { season })
    if (outfield.kind === 'photo') expect(outfield.variant).not.toBe('gk')
  })
})
