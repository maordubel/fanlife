import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { nextAfterXI } from '@/app/xi/actions'
import { nextAfterLineup } from '@/app/lineup/actions'
import { nextAfterKits } from '@/app/kits/build/actions'
import { nextAfterWardrobe } from '@/app/kits/actions'
import { entity } from '@/lib/archive/graph'
import { allPlayers } from '@/lib/archive/player-master'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { KIT_MODE_SIZE, KIT_ROUND, kitModeFrom, kitNextCursor } from '@/lib/game/kit-build-run'
import { dealKitRound, kitPuzzleCount, kitRoundAt } from '@/lib/game/kitBuild'
import { dealChallenge } from '@/lib/game/lineup'
import { buildRound, memoryEntityId } from '@/lib/game/memory'
import { slotStatusOf } from '@/lib/game/roster-search'
import { MESSAGES } from '@/lib/i18n'
import { archiveHref, lineupHref } from '@/lib/links'
import { lockedCatalog } from '@/lib/kit/catalog'
import { closestDecade, decadeWord, kitKeyOfLifeShirt, lifeKitKeys } from '@/lib/kit/wardrobe'
import { ARCHIVE_SHIRTS } from '@/lib/life/generated/kitShirts'
import { voice, voiceAction } from '@/lib/voice'
import { cupYearsBySlug } from '@/lib/xi/board'
import { challengeStatus, chooseSpell, spellsFor, type ChallengeId } from '@/lib/xi/challenge'
import { PROMPTS, PROMPT_RULE, XI_OPENING, dealPrompt, forbiddenFive, promptAt, promptQuery } from '@/lib/xi/prompt'

/**
 * ONE RED WORLD — gates 1, 3, 4, 5, 6 (plan §10, §12–§15, §49, §54).
 *
 *  · the voice is WIRED: each gate speaks the plan's lines through `lib/voice`, and ends on the
 *    Universal Exit (§6);
 *  · the strings the voice replaced are GONE from the catalogue and from the code (rule 32);
 *  · gate 1's Manager Prompt rotates by seed (rule 31) and every rule it sets is computed from
 *    sourced rows — the Player Master's seasons, the foreign-slot record, the trophy table;
 *  · gate 4's cursor counts SHIRTS, so Quick (3) and Full (5) interleave without a repeat;
 *  · gate 5's objective is counted, its provenance lines come from real saves;
 *  · gate 6's every pair and souvenir opens its archive card where the archive holds one.
 */
const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

const GATE_FILES: Record<number, string[]> = {
  1: ['app/xi/XIBuilder.tsx', 'app/xi/page.tsx'],
  3: ['app/lineup/LineupBoard.tsx', 'app/lineup/TeamSheet.tsx'],
  4: ['app/kits/build/KitGameRun.tsx'],
  5: ['app/kits/KitWing.tsx'],
  6: ['app/memory/MemoryBoard.tsx'],
}

describe('the voice is wired (§10, §12–§15)', () => {
  it('every gate speaks through lib/voice and ends on the Universal Exit', () => {
    for (const [gate, files] of Object.entries(GATE_FILES)) {
      const source = files.map(read).join('\n')
      expect(source, `gate ${gate} imports the voice`).toMatch(/from '@\/lib\/voice'/)
      expect(source, `gate ${gate} uses the exit`).toMatch(/UniversalExit|ExitEmotion|ExitNext/)
    }
  })

  it('carries the owner’s lines verbatim', () => {
    expect(voice({ gate: 1, moment: 'intro', seed: XI_OPENING }).title).toBe('תן את ההפועל שלך.')
    expect(voiceAction(1, 'captain')).toBe('על מי הסרט?')
    expect(voiceAction(1, 'twelfth')).toBe('ומי עולה איתך מהיציע?')
    expect(voiceAction(1, 'lastCut')).toBe('אחד נשאר בחוץ. זה הכואב.')
    expect(voiceAction(1, 'picked')).toBe('נכנס להרכב.')
    expect(voice({ gate: 1, moment: 'result', result: 'done', seed: 'x' }).title).toMatch(/^(זאת הפועל שלך\.|זה ההרכב שלך\.)$/)
    expect(voiceAction(3, 'gk')).toBe('מי פתח בשער?')
    expect(voiceAction(3, 'defence')).toBe('מי היה מאחור?')
    expect(voiceAction(3, 'lock')).toBe('זה שלך. נועל.')
    expect(voiceAction(3, 'hint')).toBe('רמז מהספסל.')
    expect(voiceAction(4, 'nearSponsor')).toBe('הספונסר ברח. החולצה לא.')
    expect(voice({ gate: 4, moment: 'result', result: 'perfect' }).title).toBe('לא שכחת פרט.')
    expect(voiceAction(5, 'locked')).toBe('עוד לא חזרה אליך.')
    expect(voiceAction(5, 'oneLeft', { decade: '90' })).toBe('נשארה אחת לסגור את שנות ה־90.')
    expect(voiceAction(6, 'souvenir')).toBe('אחד מהם נשאר אצלך.')
    expect(voice({ gate: 6, moment: 'intro' }).title).toBe('תסתכל טוב. עוד רגע זה נעלם.')
  })

  it('gate 3 says "מצאת 9 מתוך 11." — a count of men, never a percentage', () => {
    for (const tier of ['high', 'mid', 'low'] as const) {
      const line = voice({ gate: 3, moment: 'result', result: tier, vars: { n: '9' } })
      expect(line.title).toBe('מצאת 9 מתוך 11.')
      expect(`${line.title} ${line.body ?? ''}`).not.toMatch(/%/)
    }
  })

  it('gate 3 shows who was missed AND who was put in by mistake', () => {
    const sheet = read('app/lineup/TeamSheet.tsx')
    expect(sheet).toContain('data-lineup="missed"')
    expect(sheet).toContain('data-lineup="wrong-in"')
    expect(sheet).toContain("microFeedback(3, 'correct'")
    expect(sheet).toContain("microFeedback(3, 'wrong'")
  })

  it('gate 5 prints the hero from a count and the locked shirt still shows nothing', () => {
    const wing = read('app/kits/KitWing.tsx')
    expect(wing).toMatch(/moment: 'intro', vars: \{ n: String\(owned\), total: String\(catalog\.length\) \}/)
    // provenance lives on the BUILT cards only: never on a locked one (rule 24)
    const locked = wing.slice(wing.indexOf('function LockedCard'), wing.indexOf('function dayMonthYear'))
    expect(locked).not.toContain('<Provenance')
    const mobileLocked = wing.slice(wing.indexOf('function MobileLockedBody'))
    expect(mobileLocked.slice(0, mobileLocked.indexOf('\n}\n'))).not.toContain('<Provenance')
    expect(wing).not.toMatch(/from '@\/lib\/life\/(runtime|engine)/)
  })
})

describe('no leftover strings (rule 32)', () => {
  const RETIRED = [
    'xi.bench.twelfth.note', 'xi.bench.cut.note', 'xi.tip.selected', 'xi.slot.captain', 'xi.version.title',
    'xi.stage.full', 'xi.poster.title',
    'lineup.room.lede', 'lineup.lock', 'lineup.coach', 'lineup.report.title', 'lineup.report.lede',
    'lineup.reveal.ok', 'lineup.reveal.no', 'lineup.left.title', 'lineup.left.none',
    'kitgame.ask.body', 'kitgame.ask.construction', 'kitgame.ask.crest', 'kitgame.ask.maker', 'kitgame.ask.sponsor',
    'kitgame.ask.review', 'kitgame.reveal.perfect', 'kitgame.round.kicker', 'kitgame.round.studio',
    'kits.collection', 'kits.progress', 'kits.locked',
    'memory.hint.start', 'memory.hint.wrong', 'memory.hint.locked', 'memory.flash.again',
    'memory.verdict.flawless', 'memory.verdict.sharp', 'memory.verdict.solid', 'memory.verdict.lit',
  ]
  it('the replaced keys are gone from the catalogue and from every gate file', () => {
    const code = Object.values(GATE_FILES).flat().map(read).join('\n')
    for (const key of RETIRED) {
      expect(MESSAGES[key], key).toBeUndefined()
      expect(code.includes(`'${key}'`), key).toBe(false)
    }
    expect(code).not.toContain('kitgame.ask.${')
  })
})

/* ------------------------------------------------------------------ gate 1 */

describe('gate 1 — the Manager Prompt rotates by seed (rule 31, §49)', () => {
  it('six prompts, one per place, no repeat before all six were offered — over 500 seeds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const lap = Array.from({ length: PROMPTS.length }, (_, cursor) => promptAt(seed, cursor))
      expect(new Set(lap).size, `seed ${seed}`).toBe(PROMPTS.length)
      expect(promptAt(seed, 3)).toBe(promptAt(seed, 3))
    }
  })

  it('the next lap is a new shuffle, not a rerun', () => {
    const laps = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      laps.add(Array.from({ length: 6 }, (_, c) => promptAt(seed, c)).join())
      laps.add(Array.from({ length: 6 }, (_, c) => promptAt(seed, 6 + c)).join())
    }
    expect(laps.size).toBeGreaterThan(20)
  })

  it('a prompt the device cannot compute is skipped, never faked', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const dealt = dealPrompt(seed, 0, (id) => id !== 'fresh5' && id !== 'cups')
      expect(dealt?.id).not.toBe('fresh5')
      expect(dealt?.id).not.toBe('cups')
    }
    expect(dealPrompt(1, 0, () => false)).toBeNull()
  })

  it('the link carries the prompt (seed + cursor), never the picks', () => {
    expect(promptQuery(42, 0)).toBe('prompt=42')
    expect(promptQuery(42, 3)).toBe('prompt=42&r=3')
    const builder = read('app/xi/XIBuilder.tsx')
    expect(builder).toMatch(/const shareRoute = !worst && sheet\.prompt \? `\/xi\?\$\{promptQuery\(sheet\.prompt\.seed, sheet\.prompt\.cursor\)\}`/)
    expect(read('app/xi/page.tsx')).toMatch(/searchParams\?\.prompt/)
  })

  it('"the five you picked before" are the first five in pitch order', () => {
    const picks = { gk: 'p_1', rb: 'p_2', cb1: 'p_3', cb2: 'p_4', lb: 'p_5', cm: 'p_6' }
    expect(forbiddenFive(picks, ['gk', 'rb', 'cb1', 'cb2', 'lb', 'cm'])).toEqual(['p_1', 'p_2', 'p_3', 'p_4', 'p_5'])
    expect(forbiddenFive({ gk: 'p_1' }, ['gk', 'rb'])).toEqual(['p_1'])
  })
})

describe('gate 1 — every prompt rule is computed from sourced data', () => {
  const roster = rosterIndex()
  const cups = cupYearsBySlug(roster)

  /** How many of the roster the rule admits and refuses, as the drawer would ask it. */
  function split(challenge: ChallengeId) {
    let admitted = 0
    let refused = 0
    for (const entry of roster.all) {
      const answer = chooseSpell(challenge, spellsFor(entry), slotStatusOf(entry), {}, new Set(), {
        cupYears: cups[entry.slug],
      })
      if (answer.ok) admitted++
      else refused++
    }
    return { admitted, refused }
  }

  it('each narrowing prompt admits some men and refuses others over the real roster', () => {
    for (const id of PROMPTS) {
      const rule = PROMPT_RULE[id]
      if (rule === 'free' || rule === 'fresh') continue
      const { admitted, refused } = split(rule)
      expect(admitted, `${id} admits`).toBeGreaterThan(0)
      expect(refused, `${id} refuses`).toBeGreaterThan(0)
    }
    // "XI אם יש משחק אחד מחר" narrows nothing, so it enforces nothing — and says so
    expect(PROMPT_RULE.tomorrow).toBe('free')
  })

  it('"גביעים בלבד" is exactly the Player Master’s cup seasons — nothing else', () => {
    const bySlug = new Map(allPlayers().map((player) => [player.slug, player]))
    expect(Object.keys(cups).length).toBeGreaterThan(20)
    for (const [slug, years] of Object.entries(cups)) {
      const player = bySlug.get(slug) ?? allPlayers().find((row) => row.slugAliases.includes(slug))
      expect(player, slug).toBeDefined()
      const sourced = new Set(
        player!.spells.flatMap((spell) =>
          spell.titles.filter((title) => title.competitionSlug.startsWith('גביע-')).map((title) => Number(title.seasonLabel.slice(0, 4))),
        ),
      )
      for (const year of years) expect(sourced.has(year), `${slug} ${year}`).toBe(true)
    }
  })

  it('refuses by the rule and names the reason', () => {
    const spell = { id: '', fromYear: 1995, toYear: 1999 }
    expect(chooseSpell('pre1990', [spell], 'israeli')).toEqual({ ok: false, why: 'era' })
    expect(chooseSpell('the2000s', [spell], 'israeli')).toEqual({ ok: false, why: 'era' })
    expect(chooseSpell('the2000s', [{ id: '', fromYear: 1998, toYear: 2003 }], 'israeli').ok).toBe(true)
    expect(chooseSpell('cups', [spell], 'israeli', {}, new Set(), {})).toEqual({ ok: false, why: 'no-cup' })
    expect(chooseSpell('cups', [spell], 'israeli', {}, new Set(), { cupYears: [1998] }).ok).toBe(true)
    expect(chooseSpell('fresh', [spell], 'israeli', {}, new Set(), { forbidden: true })).toEqual({ ok: false, why: 'forbidden' })
    expect(chooseSpell('israeli', [spell], 'unknown')).toEqual({ ok: false, why: 'no-record' })
    // and the poster marks the slot that breaks it
    const status = challengeStatus('fresh', [{ slotId: 'gk', spell, status: 'israeli', man: { forbidden: true } }], 1)
    expect(status.broken).toEqual(['gk'])
  })

  it('the exit context carries ids only, and the doors land on something that exists', async () => {
    const ids = allPlayers().slice(0, 3).map((player) => player.id)
    const answer = await nextAfterXI({ context: { gateId: 1, playerIds: [...ids, 'not-an-id'], choices: { formation: '4-3-3' } } })
    expect(answer.context.playerIds).toEqual(ids)
    expect(answer.next.length).toBeLessThanOrEqual(2)
    for (const door of answer.next) expect(door.href.startsWith('/xi')).toBe(false)
  })
})

/* ------------------------------------------------------------------ gate 3 */

describe('gate 3 — the exit', () => {
  it('never offers the same match’s lineup back, and carries the match', async () => {
    for (const seed of [3, 17, 500]) {
      const matchId = dealChallenge(seed, 0)?.intro.matchId
      if (!matchId) continue
      const answer = await nextAfterLineup(seed, 0, 9, [])
      expect(answer.context.matchIds).toEqual([matchId])
      const own = lineupHref(matchId)
      for (const door of answer.next) expect(door.href).not.toBe(own)
      expect(answer.next.length).toBeLessThanOrEqual(2)
    }
  })
})

/* ------------------------------------------------------------------ gate 4 */

describe('gate 4 — Quick and Full, and a cursor that counts shirts (§13, §49)', () => {
  it('reads the mode off the link', () => {
    expect(kitModeFrom('3')).toBe('quick')
    expect(kitModeFrom('5')).toBe('full')
    expect(kitModeFrom(undefined)).toBeNull()
    expect(kitModeFrom('7')).toBeNull()
    expect(KIT_MODE_SIZE).toEqual({ full: KIT_ROUND, quick: 3 })
  })

  it('the cursor advances by the shirts actually consumed', () => {
    expect(kitNextCursor(0, 3)).toBe(3)
    expect(kitNextCursor(3, 5)).toBe(8)
    expect(kitNextCursor(-4, 3)).toBe(3)
    const source = read('app/kits/build/KitGameRun.tsx')
    // a legacy link's `r` is ROUND k — it sits where shirt k×5 sits now (tests/kit-legacy-link)
    expect(source).toContain('kitNextCursor(legacy ? cursor * KIT_MODE_SIZE.full : cursor, log.length)')
    expect(source).toMatch(/setRotation\('\/kits\/build', \{ seed, cursor: following \}\)/)
    expect(source).not.toMatch(/PlayLink gate="\/kits\/build"/)
  })

  it('mixing Quick and Full never repeats a shirt before the deck is spent — 500 seeds', () => {
    const pool = Array.from({ length: 33 }, (_, i) => ({ id: `k${i}` }))
    for (let seed = 1; seed <= 500; seed++) {
      const seen = new Set<string>()
      let cursor = 0
      let lap = 0
      while (seen.size < pool.length) {
        const size = (seed + lap++) % 2 === 0 ? 3 : 5
        const round = kitRoundAt(pool, seed, cursor, KIT_ROUND).slice(0, size)
        const room = pool.length - seen.size
        const fresh = round.slice(0, Math.min(size, room))
        for (const item of fresh) {
          expect(seen.has(item.id), `seed ${seed} cursor ${cursor}: ${item.id}`).toBe(false)
          seen.add(item.id)
        }
        cursor = kitNextCursor(cursor, size)
      }
    }
  })

  it('the next round opens on the shirts a Quick round left unplayed', () => {
    for (const seed of [7, 1234, 4242]) {
      const full = dealKitRound(seed, 0).map((puzzle) => `${puzzle.seasonLabel}|${puzzle.variant}`)
      const after = dealKitRound(seed, kitNextCursor(0, KIT_MODE_SIZE.quick)).map((puzzle) => `${puzzle.seasonLabel}|${puzzle.variant}`)
      expect(after.slice(0, 2)).toEqual(full.slice(3, 5))
      // the same address is the same round
      expect(dealKitRound(seed, 3).map((p) => p.id)).toEqual(dealKitRound(seed, 3).map((p) => p.id))
    }
  })

  it('walks the real deck in Quick rounds with no repeat before it is spent', () => {
    const count = kitPuzzleCount()
    const seen = new Set<string>()
    let cursor = 0
    while (seen.size + 3 <= count) {
      for (const puzzle of dealKitRound(99, cursor).slice(0, 3)) {
        const key = `${puzzle.seasonLabel}|${puzzle.variant}`
        expect(seen.has(key), `${key} @${cursor}`).toBe(false)
        seen.add(key)
      }
      cursor = kitNextCursor(cursor, 3)
    }
  })

  it('the exit opens the wardrobe first, and an archive card of a real kit second', async () => {
    const answer = await nextAfterKits({ context: { gateId: 4, archiveEntityIds: ['1999/00|home', 'nonsense'] } })
    expect(answer.next[0]?.href).toBe('/kits')
    expect(answer.next.length).toBeLessThanOrEqual(2)
    expect(answer.context.archiveEntityIds).toEqual(['1999/00|home'])
  })
})

/* ------------------------------------------------------------------ gate 5 */

describe('gate 5 — the wardrobe', () => {
  it('the objective is counted from the catalogue: the decade closest to closing', () => {
    const catalog = [
      { key: 'a', decade: 1990, playable: true },
      { key: 'b', decade: 1990, playable: true },
      { key: 'c', decade: 2000, playable: true },
      { key: 'd', decade: 2000, playable: true },
      { key: 'e', decade: 2000, playable: true },
      { key: 'f', decade: 2010, playable: false },
    ]
    expect(closestDecade(catalog, { a: 1 })).toEqual({ decade: 1990, left: 1 })
    expect(closestDecade(catalog, {})).toEqual({ decade: 1990, left: 2 })
    expect(closestDecade(catalog, { a: 1, b: 1, c: 1, d: 1, e: 1 })).toBeNull()
    expect(decadeWord(1990)).toBe('90')
    expect(decadeWord(1970)).toBe('70')
    expect(decadeWord(2010)).toBe('2010')
    const real = closestDecade(lockedCatalog(), {})
    expect(real).not.toBeNull()
  })

  it('reads a LIFE shirt as the archive season it IS — every generated row', () => {
    for (const shirt of ARCHIVE_SHIRTS) {
      const variant = shirt.variantHe === 'בית' ? 'home' : shirt.variantHe === 'חוץ' ? 'away' : 'third'
      expect(kitKeyOfLifeShirt(shirt.id)).toBe(`${shirt.seasonLabel}|${variant}`)
    }
    expect(kitKeyOfLifeShirt('visa86')).toBeNull()
  })

  it('a LIFE provenance line needs the save to own the shirt — nothing else counts', () => {
    const keys = lifeKitKeys([
      { t: 'flag.raised', flag: 'own:shirt:kit199900H' },
      { t: 'clothing.gained', item: 'kit198485H' },
      { t: 'flag.raised', flag: 'own:outfit:a5-first' },
      { t: 'flag.raised', flag: 'own:shirt:visa86' },
      { t: 'chapter.entered' },
    ])
    expect([...keys].sort()).toEqual(['1984/85|home', '1999/00|home'])
  })

  it('the exit opens gate 4 first, and only a built shirt’s card', async () => {
    const answer = await nextAfterWardrobe({ built: ['1999/00|home'] })
    expect(answer.next[0]?.href).toBe('/kits/build')
    for (const door of answer.next.slice(1)) {
      expect(door.href).toBe(archiveHref('1999/00|home'))
    }
  })
})

/* ------------------------------------------------------------------ gate 6 */

describe('gate 6 — every pair and the souvenir open the archive where it holds them', () => {
  it('maps pair ids onto graph ids and links resolve', () => {
    expect(memoryEntityId('euro:1995-uefa-q-zimbru')).toBe('tie:1995-uefa-q-zimbru')
    expect(memoryEntityId('kit:adidas:1984/85')).toBe('maker:adidas')
    expect(memoryEntityId('election:x:y')).toBeNull()
    let linked = 0
    for (let seed = 1; seed <= 60; seed++) {
      for (const pair of buildRound(seed, 6, 0).pairs) {
        const id = memoryEntityId(pair.id)
        const href = id ? archiveHref(id) : null
        if (!href) continue
        linked++
        expect(entity(new URL(href, 'https://x.test').searchParams.get('at'))).not.toBeNull()
      }
    }
    expect(linked).toBeGreaterThan(100)
  })

  it('the souvenir is the round’s, not random', () => {
    const board = read('app/memory/MemoryBoard.tsx')
    expect(board).toMatch(/hashSeed\(`\$\{seed\}:\$\{cursor\}\|souvenir`\)/)
    expect(board).not.toMatch(/Math\.random/)
  })
})
