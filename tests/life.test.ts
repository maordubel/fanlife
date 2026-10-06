import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { archive } from '@/lib/game/archive'

import { isYellow } from '@/lib/isYellow'
import { MESSAGES } from '@/lib/i18n'
import { resolveChapterAnchor, resolvePrologueAnchor } from '@/lib/life/anchor-server'
import { CUTSCENES, cutsceneCard, cutsceneFor, embedUrl, longDateHe } from '@/lib/life/cutscenes'
import { FILM, OPENING, openingLines, openingMs } from '@/lib/life/opening'
import { isPlaceholder, type HistoricalAnchor } from '@/lib/life/anchors'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { bodySize } from '@/lib/life/world/heights'
import { DEFAULT_IDENTITY, ENDINGS, PROLOGUE } from '@/lib/life/content/chapter1986'
import type { Conversation } from '@/lib/life/content/script'
import { LifeEngine } from '@/lib/life/engine'
import { apply, emptyState, fold, type LifeEvent } from '@/lib/life/events'
import { LIFE_PALETTE } from '@/lib/life/runtime/palette'
import { ALL_SCENES, SCENE } from '@/lib/life/world/scenes'
import { SHIRT, ARTEFACT, artUrl, BACKDROP, DOC, EMBLEM, EMBLEM_OF_GAUGE_GROUP, EMBLEM_OF_RESOURCE, EMBLEM_OF_ROUTE, EMBLEM_OF_SKILL, EMBLEM_OF_TRACK, extensionKeys, FIGURE, HERO80_WALK, ICON, ICON_OF_VERB, isArtefact, KID_POSE, KID_WALK, KID_WALK_AWAY, LAYER, PANORAMA, PROP } from '@/lib/life/runtime/art'
import { PANO_SPOTS } from '@/lib/life/content/panoramas'
import { ERA_1986, ERA_1990, ERA_1991, eraFor } from '@/lib/life/content/era'
import { arrivalFor, exitInEra, inEra } from '@/lib/life/world/scenes'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { meets } from '@/lib/life/world/types'
import { LIFE_TRACKS } from '@/lib/life/tracks'
import { LIFE_ROUTES } from '@/lib/life/routes'
import { SKILL_IDS } from '@/lib/life/types'

/**
 * THE WORKER LIFE — the guards.
 *
 * The brief's non-negotiables are mostly not things a screenshot can show: that no
 * historical fact was invented, that no core character wears yellow, that a save is a
 * log rather than a snapshot, that every door in the world leads somewhere that exists.
 * Those are exactly the class of claim this repo turns into a test rather than a
 * sentence in a handoff (rule 29), so here they are.
 */

const ROOT = process.cwd()
const state = () => emptyState(DEFAULT_IDENTITY, 1986)

/**
 * The whole timeline this game is allowed to name (rule 45): born 1978, the prologue in
 * 1983, Stage A in 1986, Stage B's first movement in 1990 and its second — the Ussishkin
 * derby — in March 1991. Adding a year here is a decision, not a fix.
 */
// Stage B extends the life through the decade (brief §2.1), and the frame of 2026 the film opens on.
const TIMELINE = ['1978', '1983', '1986', '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000', '2026']

// ---------------------------------------------------------------------------------
const ART = join(ROOT, 'public/life/art')
const artManifest = JSON.parse(readFileSync(join(ART, 'manifest.json'), 'utf8')) as Record<
  string,
  Record<string, { w: number; h: number; bytes: number; source: string; box: number[]; deyellowed: number; yellowLeft: number }>
>

describe('חוק הצהוב — neither the palette nor the artwork has yellow in it', () => {
  it('has no yellow value in the runtime palette', () => {
    for (const [name, colour] of Object.entries(LIFE_PALETTE)) {
      const r = (colour >> 16) & 0xff
      const g = (colour >> 8) & 0xff
      const b = colour & 0xff
      expect(isYellow(r, g, b), `${name} is yellow`).toBe(false)
    }
  })

  it('ships not one yellow pixel of concept art', () => {
    // Rule 8 has no exemption for artwork and rule 27 says lossy formats put it back at
    // decode. `scripts/life/build-art.py` rotates every pixel in the yellow hue band onto
    // hue 33 at the same saturation and value — the badge's own treatment — and writes a
    // palette PNG, then records the count here. A non-zero number means somebody shipped
    // an asset without running the build.
    let assets = 0
    for (const group of Object.values(artManifest)) {
      for (const [key, row] of Object.entries(group)) {
        assets += 1
        expect(row.yellowLeft, `${key} ships ${row.yellowLeft} yellow pixels`).toBe(0)
      }
    }
    expect(assets).toBeGreaterThan(20)
  })

  /**
   * החפצים הסרוקים — התיקייה השנייה, והבדיקה שמחזיקה אותה נפרדת.
   *
   * `public/life/art` proves zero yellow on every row of its manifest, two tests up. The
   * ten scanned objects of 17.9.2026 cannot live there and cannot be measured that way:
   * they carry the yellow that is printed on them, granted as a folder in
   * `lib/brand/yellowExemptions.ts` and counted per file in
   * `content/manual/life-artefacts.json` (`tests/brand.test.ts` re-derives both numbers).
   *
   * What this guard protects is the seam between the two folders, which is the part that
   * could break silently and in front of a player: an artefact is a `DOC` key like any
   * other, so a dialogue may hold one up (rule 49), and `artUrl` is the ONLY thing that
   * knows it resolves somewhere else. A key that drifts out of `ARTEFACT` keeps working in
   * the type system and starts 404-ing on the glass.
   */
  it('resolves every scanned object out of its own folder, and not out of the art one', () => {
    const ARTEFACTS = join(ROOT, 'public/life/artefacts')
    expect(ARTEFACT.length).toBeGreaterThan(0)
    for (const key of ARTEFACT) {
      // a scanned object is a document: `{ e: 'doc' }` accepts it, and nothing else may
      expect(DOC as readonly string[], `${key} is not a declared DOC key`).toContain(key)
      expect(isArtefact(key), `${key} is not routed as an artefact`).toBe(true)
      expect(artUrl(key), `${key} resolves to the wrong folder`).toBe(`/life/artefacts/${key}.webp`)
      expect(existsSync(join(ARTEFACTS, `${key}.webp`)), `${key}.webp is missing`).toBe(true)
      // and it is NOT in the folder that proves zero — one file, one home
      expect(existsSync(join(ART, `${key}.webp`)), `${key}.webp is in both folders`).toBe(false)
      // nor in either manifest, which is what the zero-yellow scan reads
      for (const group of Object.values(artManifest)) {
        expect(Object.keys(group), `${key} is in the art manifest`).not.toContain(key)
      }
    }
    // and everything else still comes out of the art folder
    expect(artUrl('ticketOffice')).toBe('/life/art/ticketOffice.webp')
    expect(isArtefact('docTicket')).toBe(false)
  })

  it('has a real file behind every asset the manifest claims', () => {
    for (const group of Object.values(artManifest)) {
      for (const key of Object.keys(group)) {
        expect(existsSync(join(ART, `${key}.webp`)), `${key}.webp is missing`).toBe(true)
      }
    }
  })

  it('continues every painting above and below, so a phone held upright has no bars', () => {
    // `scripts/life/finish-backdrops.py` writes the two strips and their manifest rows.
    // A backdrop without them is a backdrop that shipped without the finishing pass —
    // which is also the pass that shrinks it and scans it for yellow.
    for (const key of BACKDROP) {
      const ext = extensionKeys(key)
      for (const name of [ext.sky, ext.ground]) {
        const row = artManifest.extensions?.[name]
        expect(row, `${name} has no manifest row — run finish-backdrops.py`).toBeDefined()
        expect(existsSync(join(ART, `${name}.webp`)), `${name}.webp is missing`).toBe(true)
        expect(row!.w, `${name} is not as wide as ${key}`).toBe(artManifest.backdrops?.[key]?.w)
      }
    }
  })

  it('keeps any single room inside a sane download', () => {
    // The number that matters is not the folder, it is the ROOM: a scene loads its own
    // backdrop, the people standing in it and its props, and nothing else. Guarding the
    // total would fail the day Ussishkin's reference paintings ship without anyone paying
    // for them at load time; guarding the room is what actually protects a phone.
    const sizes = new Map<string, number>()
    for (const group of Object.values(artManifest)) {
      for (const [key, row] of Object.entries(group)) sizes.set(key, row.bytes)
    }
    const sheets = JSON.parse(readFileSync(join(ART, 'sheets.json'), 'utf8')) as Record<
      string,
      { bytes: number }
    >
    for (const [key, row] of Object.entries(sheets)) sizes.set(key, row.bytes)

    // A room is loaded in ONE era at a time: the 1986 people or the 1990 people, never
    // both. So the budget is checked per era, with that era's child.
    for (const era of [ERA_1986, ERA_1990, ERA_1991]) {
      const child = [...Object.values(era.player.pose), ...era.player.walk].reduce(
        (sum, key) => sum + (sizes.get(key) ?? 0),
        0,
      )
      for (const scene of ALL_SCENES) {
        // a texture is downloaded once however many times a room places it — a crowd of
        // four men drawn twelve times costs four files, which is what this counts
        const keys = new Set<string>([...Object.values(era.player.pose), ...era.player.walk, scene.art])
        // the sky and ground strips load with the room they continue
        const ext = extensionKeys(scene.art)
        keys.add(ext.sky)
        keys.add(ext.ground)
        /**
         * ...וכרטיס ההגעה, מ-17.9.2026, כי הוא נטען עם החדר ולא נספר כאן מעולם.
         *
         * `arrivalFor` is a full backdrop that plays over the room for three or four
         * seconds on the way in — `ground`, `streetEast`, `tunnelReveal`, `ussLow`. Every
         * one of them is a file the player downloads to enter that room, and this guard
         * walked straight past all of them: the heaviest room in the game measured 4.32 MB
         * and actually costs 5.17.
         *
         * It surfaced when `ramat-gan` was given `ramatGanGates` and the card came out at
         * 2.9 MB — bigger than the room it announces, because the converter could not get
         * that painting to zero yellow at q90 and fell back to lossless (rule 61's designed
         * behaviour, and the right trade: rule 8 is not a budget). The number is inside
         * the ceiling either way, and now it is inside the MEASUREMENT, which is the part
         * that matters — a budget that cannot see a file cannot fail on it.
         */
        const card = arrivalFor(scene, era.chapter)
        if (card) {
          keys.add(card.art)
          const cardExt = extensionKeys(card.art)
          keys.add(cardExt.sky)
          keys.add(cardExt.ground)
        }
        for (const layer of scene.layers ?? []) if (inEra(layer, era.chapter)) keys.add(layer.art)
        for (const actor of scene.actors) if (inEra(actor, era.chapter)) keys.add(actor.figure)
        for (const spot of scene.hotspots) if (inEra(spot, era.chapter) && spot.prop) keys.add(spot.prop.key)
        let bytes = 0
        for (const key of keys) bytes += sizes.get(key) ?? 0
        expect(child).toBeGreaterThan(0)
        // **למה התקציב עלה מ-3.6 ל-5.5, 11.9.2026.** המספר הישן נקבע כשחדר היה 1600×900
        // והקנבס קיבל 390×842 על הטלפון. מאז הקנבס מצייר ב-1170×2526 — פי 2.9 פיקסלים —
        // והציורים נבנו מחדש בגובה 1536. אותה תמונה, יותר בייטים; זה לא נפח, זאת רזולוציה.
        //
        // ההעלאה קטנה ממה שנראה בהתחלה, כי הבדיקה הזאת חשפה משהו אחר לגמרי: מחזור ההליכה
        // של הילד היה 4.2 מגה לבדו — שמונה פריימים שדילגו על הקוונטייזר ונשאו 76,000 צבעים
        // במקום 200, כבדים יותר מכל ציור של חדר. אחרי שעברו את הטיפול שכל דמות עוברת הם
        // 1.5 מגה, וגם 2,204 פיקסלים צהובים שהיו חיים עליהם נעלמו.
        //
        // החדר היקר הוא הרחוב, 5.12 מגה: הוא הרחב ביותר (3936) ויש בו שלוש שכבות עומק.
        // שכבות העומק עדיין נגזרות מהציור הישן ולכן גם מטושטשות ביחס אליו — לגזור אותן
        // מחדש מהציור החדש הוא הפריט הבא, והוא גם יוריד את המספר הזה.
        expect(bytes / 1024 / 1024, `${scene.id} (${era.chapter}) loads ${(bytes / 1024 / 1024).toFixed(2)} MB`).toBeLessThan(5.5)
      }
    }
  })

  it('draws no raw colour literal in the runtime outside the palette file', () => {
    const runtime = walk(join(ROOT, 'lib/life'))
    for (const path of runtime) {
      if (path.endsWith('palette.ts')) continue
      const text = readFileSync(path, 'utf8')
      const hits = [...text.matchAll(/0x[0-9a-fA-F]{6}/g)].map((match) => match[0])
      const bad = hits.filter((hit) => hit.toLowerCase() !== '0x000000')
      expect(bad, `${path} uses raw colours ${bad.join(', ')}`).toEqual([])
    }
  })
})

describe('הקאנון החזותי — the boards decide who these people are', () => {
  const cut = {
    ...(artManifest['figures'] ?? {}),
    ...(JSON.parse(readFileSync(join(ART, 'sheets.json'), 'utf8')) as Record<
      string,
      { w: number; h: number; bytes: number; yellowLeft: number }
    >),
  }

  it('cuts every core character out of an approved board', () => {
    // Brief §4: the approved character identities are not a style note, they are the
    // canon. Cutting them rather than drawing them is what guarantees Ofir keeps his buzz
    // cut and Amit never acquires glasses — nobody is redrawing them.
    for (const key of ['kid', 'ofir', 'amit', 'efi', 'keren', 'kobi', 'rachel']) {
      expect(cut[key], `${key} is not cut from any board`).toBeDefined()
    }
    for (const key of ['ofir', 'amit', 'efi', 'keren', 'kobi']) {
      expect(artManifest['figures']?.[key]?.source, `${key} comes from the wrong board`).toBe('stageA2')
    }
  })

  it('gives the player a walk that is animated, and a turnaround', () => {
    // Everybody else has one pose. The player has an animation, because the player is
    // the thing you look at for fifteen minutes, and a character who slides across a
    // floor is the loudest tell that a game is a prototype.
    //
    // The count moved from eight to two when Pogi arrived, and that is a deliberate
    // trade rather than a regression: his sheet holds two side-on strides, and two full
    // strides plus the scene's own bob read as walking. The alternative was to keep the
    // previous child's eight-frame cycle under this child's shirt — a different boy from
    // the knees down, in a game whose whole visual claim is that everybody belongs to
    // the same painting. What the guard protects is that the walk MOVES: distinct
    // frames, and a scene that lifts him between them.
    for (const key of KID_WALK) expect(cut[key], `${key} was never sliced`).toBeDefined()
    expect(new Set(KID_WALK).size, 'the walk has no distinct frames').toBeGreaterThanOrEqual(2)
    const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
    expect(world, 'the walk has no bob, so the child slides').toContain('Math.abs(Math.sin(this.stride))')
    for (const pose of Object.values(KID_POSE)) expect(cut[pose], `${pose} missing`).toBeDefined()
  })

  it('trims every walk frame to the figure, because the engine sizes by the texture', () => {
    /**
     * הפריים נמדד מול העמידה, כי זה מה שהמנוע עושה איתו.
     *
     * `WorldScene.fit()` gives a sprite its size from the TEXTURE height and
     * `setOrigin(0.5, 1)` stands the CANVAS bottom on the floor, so empty canvas above a
     * figure's head is not neutral — it is a shorter boy hovering over the ground, and
     * `applyScale` hands the same canvas width to `shadow.setSize`. `pogi-w1…w8` shipped
     * on 835×1264 canvases where every other figure in the folder is content-tight: the
     * feet sat between 89.40% and 99.68% of the canvas, so the child floated up to 10.6%
     * of his own height and his shadow was 86% wider the instant he walked.
     *
     * **This guard could not see any of it, and the reason is worth keeping.** It reads
     * `sheets.json`, `sheets.json` still said `159×430`, and `write_index()` in
     * `to-webp-2026-09-13.py` had never once updated `w`/`h` — so the manifest quietly
     * described the file that used to be there. Truthful dimensions are what make the
     * check below possible at all.
     *
     * What it checks is the coupling the engine actually has: a walk frame is drawn at
     * the same height as the standing pose it interleaves with, so its SHAPE has to be
     * the same person's shape. The band is the observed spread with margin — the widest
     * real frame is `hero80-w7` at 1.47× and the narrowest is `hero80-w8` at 0.76×, and a
     * letterboxed 835×1264 frame lands at 1.86×. It is a proportion and not a proof:
     * a frame padded evenly on all four sides would keep its aspect and pass, and only a
     * measured alpha-coverage column in the manifest would catch that one.
     */
    const CYCLES: ReadonlyArray<readonly [string, readonly string[]]> = [
      ['pogi', KID_WALK],
      ['pogi-back', KID_WALK_AWAY],
      ['hero80', HERO80_WALK],
    ]
    for (const [standing, frames] of CYCLES) {
      const pose = cut[standing]
      expect(pose, `${standing} is not cut from any board`).toBeDefined()
      const shape = pose!.w / pose!.h
      for (const key of frames) {
        const row = cut[key]
        expect(row, `${key} was never cut`).toBeDefined()
        const ratio = row!.w / row!.h / shape
        const said = `${key} is ${row!.w}×${row!.h}, ${ratio.toFixed(2)}× the shape of ${standing}`
        expect(ratio, `${said} — it carries empty canvas the engine reads as height`).toBeLessThan(1.6)
        expect(ratio, `${said} — it is cropped tighter than the figure`).toBeGreaterThan(0.6)
      }
    }
  })

  it('cuts the children full-length and never crops one at the knee', () => {
    for (const key of ['kid', 'ofir', 'amit', 'efi', 'keren']) {
      const row = cut[key]
      expect(row && row.h / row.w > 2.0, `${key} is not a full-length figure`).toBe(true)
    }
  })

  it('never invents a figure the runtime names', () => {
    for (const key of FIGURE) {
      expect(cut[key], `${key} is named by the runtime but never cut`).toBeDefined()
    }
    for (const key of LAYER) {
      expect(artManifest['layers']?.[key], `${key} layer was never cut`).toBeDefined()
    }
  })
})

describe('העוגן ההיסטורי — canonical, sourced, and honest about the gap', () => {
  it('resolves the chapter anchor from the archive at confidence 2', () => {
    const anchor = resolveChapterAnchor()
    expect(anchor.confidence).toBeGreaterThanOrEqual(2)
    expect(anchor.sport).toBe('football')
    expect(anchor.seasonLabel).toBe('1985/86')
    expect(anchor.sourceTitle.length).toBeGreaterThan(3)
    expect(anchor.id).not.toBe('DEV-PLACEHOLDER')
  })

  it('resolves the prologue anchor from the archive at confidence 2', () => {
    const anchor = resolvePrologueAnchor()
    expect(anchor.confidence).toBeGreaterThanOrEqual(2)
    expect(anchor.sport).toBe('football')
    expect(anchor.seasonLabel).toBe('1982/83')
    expect(anchor.competitionSlug).toBe('גביע-המדינה')
    expect(anchor.id.startsWith('DEV-PLACEHOLDER')).toBe(false)
  })

  /**
   * The pair, and the shape of the assertion, are both the point.
   *
   * This test used to assert that the note was THERE, because for three passes the archive
   * held the championship and not the game that decided it — and a placeholder you can see
   * is one somebody replaces. On 3.9.2026 somebody replaced both: a ticket kept for forty
   * years and two dated pages of מעריב ספורט became 24.5.1986, and a ynet piece about a
   * goal Landau put in with his hand became 1.6.1983.
   *
   * So the assertion is the RULE rather than the state — the note is present exactly when
   * the archive cannot answer, and absent exactly when it can — and it runs over BOTH
   * anchors, because the prologue and the chapter now resolve through the same function
   * and there is no reason for one of them to be held to a weaker standard.
   */
  const ANCHORS: ReadonlyArray<readonly [string, () => HistoricalAnchor, string]> = [
    ['הפרק — אליפות 1985/86', resolveChapterAnchor, '1985/86'],
    ['הפרולוג — גביע 1982/83', resolvePrologueAnchor, '1982/83'],
  ]

  for (const [label, resolve, season] of ANCHORS) {
    it(`${label}: carries the placeholder note if and only if the archive cannot answer`, () => {
      const anchor = resolve()
      if (anchor.match) {
        expect(anchor.placeholder, 'the archive answered, so the note must be gone').toBeNull()
        expect(isPlaceholder(anchor)).toBe(false)
      } else {
        expect(anchor.placeholder, 'the archive cannot answer, so the note must be shown').not.toBeNull()
        expect(anchor.placeholder?.needs).toContain(season)
        expect(isPlaceholder(anchor)).toBe(true)
      }
    })

    it(`${label}: states nothing about the deciding match that the archive does not hold`, () => {
      const match = resolve().match
      if (!match) return
      // Every field is copied, never computed from prose — so every one of them has to be
      // findable in the files. The names especially: a scorer this test cannot find in
      // `people.json` is a name somebody typed into a scene.
      const clubs = new Set(archive.clubs.filter((row) => row.sport === 'football').map((row) => row.nameHe))
      expect(clubs.has(match.opponentHe), `${match.opponentHe} is not a club in the archive`).toBe(true)
      expect(match.playedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(match.playedOn.startsWith(season.slice(0, 2))).toBe(true)
      expect(match.sourceTitle.length).toBeGreaterThan(3)

      const named = new Set(archive.people.map((row) => row.fullNameHe))
      if (match.decidedBy) {
        expect(match.decidedBy.minute).toBeGreaterThan(0)
        expect(match.decidedBy.minute).toBeLessThanOrEqual(120)
        expect(named.has(match.decidedBy.scorerHe), `${match.decidedBy.scorerHe} is not in people.json`).toBe(true)
        if (match.decidedBy.assistHe) {
          expect(named.has(match.decidedBy.assistHe), `${match.decidedBy.assistHe} is not in people.json`).toBe(true)
        }
      }
    })
  }

  it('builds the headline from canonical fields only — no opponent, no score', () => {
    for (const anchor of [resolveChapterAnchor(), resolvePrologueAnchor()]) {
      expect(anchor.headlineHe).toContain(anchor.seasonLabel)
      expect(/\d+\s*[:\-–]\s*\d+/.test(anchor.headlineHe), 'a scoreline reached the headline').toBe(
        false,
      )
    }
  })
})

// ---------------------------------------------------------------------------------
describe('הבדיון אינו היסטוריה — the content layer invents no facts', () => {
  const authored = [
    readFileSync(join(ROOT, 'lib/life/content/dialogue.ts'), 'utf8'),
    readFileSync(join(ROOT, 'lib/life/content/chapter1986.ts'), 'utf8'),
  ].join('\n')

  it('never prints a scoreline', () => {
    const lines = authored.split('\n').filter((line) => line.includes('text:'))
    for (const line of lines) {
      expect(/\d+\s*[:\-–]\s*\d+/.test(line), `a scoreline appears: ${line.trim()}`).toBe(false)
    }
  })

  it('names no year but the ones the rebased chapter is set in', () => {
    /**
     * תווית עונה איננה שנה — `1980/81` is the name of a printed object, not a claim that
     * the life reaches 1980.
     *
     * The guard below already says so in its own words two tests down ("`1985/86` is a
     * season label… a guard that failed on those would be turned off within a week"), and
     * on 7.9.2026 this one started failing on the album page for the booklet the father
     * kept — a season label inside a comment. Season labels come out first; a BARE year
     * outside the timeline still fails, which is the thing the test is actually for.
     */
    const prose = authored.replace(/\b(19|20)\d{2}\/\d{2}\b/g, ' ')
    const years = new Set([...prose.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => match[0]))
    for (const year of years) {
      expect(TIMELINE, `unexpected year ${year} in authored content`).toContain(year)
    }
  })

  /**
   * The guard above reads the authored CONTENT, which is exactly why it never noticed the
   * file it lives in: this suite built every one of its states at the pre-rebase year and
   * kept doing it straight through the rebase, so the tests that assert the chapter is
   * 1986 were themselves simulating a year the game no longer has, and nothing anywhere
   * said so. A guard that names its subject protects only that subject (rule 49) — so
   * this one reads the CALLS instead of one file's prose, everywhere a life can be
   * constructed: the screens, the runtime and the suites that drive them. (It reads this
   * file too, which is why the paragraph you are reading spells no call out in full.)
   *
   * It is deliberately narrow about what counts as constructing a year — the second
   * argument to `emptyState` / `fold` / `loadLife` / `new LifeEngine`, and a `year:` field
   * in the life suites. A four-digit number is not by itself a claim about the timeline:
   * `1985/86` is a season label and `25.10.1980` is a fixture date in an ingestion test,
   * and a guard that failed on those would be turned off within a week.
   */
  it('constructs a life at no year but 1978 / 1983 / 1986 — in the suites as well as the screens', () => {
    const built = /(?:emptyState|fold|loadLife|LifeEngine)\s*\(\s*[A-Za-z_$][\w$.]*\s*,\s*(\d{4})/g
    const wrong: string[] = []

    for (const path of code(['app', 'components', 'lib', 'tests'])) {
      for (const match of readFileSync(path, 'utf8').matchAll(built)) {
        const year = match[1] as string
        if (!TIMELINE.includes(year)) wrong.push(`${path.replace(`${ROOT}/`, '')}: ${match[0].trim()}`)
      }
    }

    // The life suites additionally may not stamp a year onto a memory or an event by hand.
    // Scoped to them by NAME PREFIX rather than a hand-written list, so the next
    // `life-*.test.ts` is covered on the day it is created.
    for (const path of code(['tests']).filter((file) => /\/life[.-][^/]*$/.test(file))) {
      for (const match of readFileSync(path, 'utf8').matchAll(/\byear:\s*(\d{4})/g)) {
        const year = match[1] as string
        if (!TIMELINE.includes(year)) wrong.push(`${path.replace(`${ROOT}/`, '')}: ${match[0].trim()}`)
      }
    }

    expect(wrong, wrong.join('\n')).toEqual([])
  })

  it('substitutes the canonical anchor into the prologue rather than writing it out', () => {
    expect(PROLOGUE.some((line) => line.text.includes('{anchor}'))).toBe(true)
  })

  it('gives every ending a memory, so no day ends with nothing', () => {
    for (const ending of Object.values(ENDINGS)) {
      expect(ending.memoryItem.length).toBeGreaterThan(0)
      expect(ending.bodyHe.length).toBeGreaterThan(30)
    }
  })
})

// ---------------------------------------------------------------------------------
describe('מנוע החיים — the log is the save', () => {
  it('folds to the same state every time', () => {
    const events: LifeEvent[] = [
      { t: 'money.changed', agorot: 60, why: 'בקבוקים' },
      { t: 'item.gained', item: 'newspaper' },
      { t: 'bond.shifted', who: 'ofir', delta: 12 },
      { t: 'clock.advanced', minutes: 95 },
    ]
    const a = fold(DEFAULT_IDENTITY, 1986, events)
    const b = fold(DEFAULT_IDENTITY, 1986, events)
    expect(a).toEqual(b)
    expect(a.agorot).toBe(60)
    expect(a.minute).toBe(12 * 60 + 35 + 95)
  })

  it('never lets money go negative', () => {
    const after = apply(state(), { t: 'money.changed', agorot: -400, why: 'test' })
    expect(after.agorot).toBe(0)
  })

  it('clamps a bond to 0..100 however hard a scene pushes', () => {
    let current = state()
    for (let i = 0; i < 40; i += 1) {
      current = apply(current, { t: 'bond.shifted', who: 'kobi', delta: 9 })
    }
    expect(current.bonds.kobi).toBe(100)
  })

  it('wraps the clock over midnight instead of running past 24:00', () => {
    const after = apply(state(), { t: 'clock.advanced', minutes: 15 * 60 })
    expect(after.minute).toBe((12 * 60 + 35 + 15 * 60) % 1440)
    expect(after.weekday).toBe(0)
  })

  it('keeps one memory when the same one is replayed', () => {
    const memory = { id: 'x', item: 'ticket-stub' as const, atMinute: 10, year: 1986, anchorId: null }
    const after = fold(DEFAULT_IDENTITY, 1986, [
      { t: 'memory.kept', memory },
      { t: 'memory.kept', memory },
    ])
    expect(after.memories).toHaveLength(1)
  })

  it('folds an event from a newer build to a no-op rather than corrupting the save', () => {
    const future = { t: 'something.fromTheFuture' } as unknown as LifeEvent
    expect(apply(state(), future)).toEqual(state())
  })

  it('rebuilds the whole life from the log alone', () => {
    const engine = new LifeEngine(DEFAULT_IDENTITY, 1986)
    engine.dispatch(
      { t: 'flag.raised', flag: 'knows:match' },
      { t: 'money.changed', agorot: 150, why: 'test' },
      { t: 'item.gained', item: 'ticket-stub' },
    )
    const reopened = new LifeEngine(DEFAULT_IDENTITY, 1986, engine.log())
    expect(reopened.state).toEqual(engine.state)
    expect(reopened.has('ticket-stub')).toBe(true)
    expect(reopened.flag('knows:match')).toBe(true)
  })
})

// ---------------------------------------------------------------------------------
describe('העולם — every door leads somewhere that exists', () => {
  const scenes = ALL_SCENES

  it('resolves every exit to a real scene and a real spawn point', () => {
    for (const scene of scenes) {
      for (const exit of scene.exits) {
        const target = SCENE[exit.to as keyof typeof SCENE]
        expect(target, `${scene.id}/${exit.id} → ${exit.to}`).toBeDefined()
        expect(
          target && exit.spawn in target.spawns,
          `${scene.id}/${exit.id} → ${exit.to}:${exit.spawn}`,
        ).toBe(true)
      }
    }
  })

  it('spawns everybody inside the walk band', () => {
    // A spawn above the band puts the child on a wall; below it puts them off the
    // painting. Both are invisible in a screenshot and obvious in ten seconds of play.
    for (const scene of scenes) {
      for (const [name, point] of Object.entries(scene.spawns)) {
        expect(point.x > 0 && point.x < 1, `${scene.id}:${name} x`).toBe(true)
        expect(
          point.y >= scene.band.far - 0.02 && point.y <= scene.band.near + 0.02,
          `${scene.id}:${name} y ${point.y} outside band ${scene.band.far}..${scene.band.near}`,
        ).toBe(true)
      }
    }
  })

  it('keeps every actor and hotspot on the painting', () => {
    for (const scene of scenes) {
      for (const actor of scene.actors) {
        expect(actor.x > 0 && actor.x < 1 && actor.y > 0.4 && actor.y < 1.01, `${scene.id}/${actor.id}`).toBe(true)
        /**
         * Since delta 30 nobody types a size: it comes from `heights.ts` and the room's
         * own metre. What is worth asserting is the size the actor is DRAWN at, which is
         * what this used to be a proxy for.
         */
        const drawn = bodySize(actor.figure, scene.metre, 1, scene.size.far / scene.size.near)
        expect(drawn > 0.05 && drawn < 0.8, `${scene.id}/${actor.id} is drawn at ${drawn}`).toBe(true)
      }
      for (const spot of scene.hotspots) {
        expect(spot.x > 0 && spot.x < 1 && spot.y > 0.4 && spot.y < 1.01, `${scene.id}/${spot.id}`).toBe(true)
      }
    }
  })

  it('names only art that the build script actually produced', () => {
    const backdrops = new Set<string>(BACKDROP)
    const figures = new Set<string>(FIGURE)
    const props = new Set<string>(PROP)
    for (const scene of scenes) {
      expect(backdrops.has(scene.art), `${scene.id} → ${scene.art}`).toBe(true)
      // an arrival is a card, and a card may be a painted plate (the boy at the tunnel mouth) as well as a room
      if (scene.arrival) expect(backdrops.has(scene.arrival.art) || Boolean(artManifest['plates']?.[scene.arrival.art]), `${scene.id} arrival`).toBe(true)
      for (const actor of scene.actors) {
        expect(figures.has(actor.figure), `${scene.id}/${actor.id} → ${actor.figure}`).toBe(true)
      }
      for (const spot of scene.hotspots) {
        // A hotspot may hold up a SHIRT as well as a prop: the rail in Rafi's window is
        // the collection's first entry, cut from a photograph rather than from a sheet.
        if (spot.prop) expect(props.has(spot.prop.key) || SHIRT.includes(spot.prop.key as (typeof SHIRT)[number]), `${scene.id}/${spot.id} → ${spot.prop.key}`).toBe(true)
      }
      for (const layer of scene.layers ?? []) {
        // Dressing is normally a prop or a separated piece of the painting. It may also be
        // a FIGURE, and one scene needs that: the terrace at full time is sixteen people
        // who cannot be talked to, and drawing them as actors would put sixteen dialogue
        // boxes between the child and his father. The name still has to resolve to a file
        // that the build produced, which is the only thing this guard was ever about.
        const known =
          props.has(layer.art) ||
          figures.has(layer.art) ||
          LAYER.includes(layer.art as (typeof LAYER)[number])
        expect(known, `${scene.id} layer → ${layer.art}`).toBe(true)
      }
    }
  })

  // --- הריהוט — the dressing added by the living pass ---------------------------------
  //
  // Dressing is the one kind of art that can break a game rather than merely look wrong:
  // a car parked across a doorway is a door the player cannot use, and nothing in the
  // engine would ever complain about it. What makes a piece of dressing dangerous is
  // exactly what makes it feel solid — being depth-sorted INTO the walk band, so the
  // child passes behind it. So that is the set these two guards check: anything whose
  // depth reaches the band is standing on the ground the player walks on, and it has to
  // stand somewhere real and out of every doorway. A banner on a wall and a string of
  // pennants over the road are neither, and are none of this test's business.
  const onTheGround = (scene: (typeof scenes)[number], layer: NonNullable<(typeof scenes)[number]['layers']>[number]) =>
    layer.foot === true && layer.depth >= scene.band.far

  it('stands every piece of street dressing on the ground the player walks on', () => {
    for (const scene of scenes) {
      for (const layer of scene.layers ?? []) {
        if (!onTheGround(scene, layer)) continue
        expect(layer.x, `${scene.id}/${layer.art} x`).toBeGreaterThan(0)
        expect(layer.x, `${scene.id}/${layer.art} x`).toBeLessThan(1)
        expect(layer.y, `${scene.id}/${layer.art} y`).toBeGreaterThanOrEqual(scene.band.far)
        expect(layer.y, `${scene.id}/${layer.art} y`).toBeLessThanOrEqual(1)
        // a prop is drawn at the depth of the ground it stands on, or it sorts wrong
        expect(Math.abs(layer.depth - layer.y), `${scene.id}/${layer.art} depth`).toBeLessThan(0.001)
      }
    }
  })

  it('never parks the dressing in a doorway', () => {
    // A door and a prop only collide in a year they share: Kobi's 1986 car may stand
    // where the 1996 bus-station door is, because nobody is in both years at once.
    for (const scene of scenes) {
      for (const layer of scene.layers ?? []) {
        if (!onTheGround(scene, layer)) continue
        const left = layer.x - layer.w / 2
        const right = layer.x + layer.w / 2
        for (const exit of scene.exits) {
          const shared = CHAPTERS.some((c) => inEra(layer, c.id) && exitInEra(exit, c.id))
          if (!shared) continue
          const clear = right <= exit.x + 0.005 || left >= exit.x + exit.w - 0.005
          expect(clear, `${scene.id}: ${layer.art} covers the door "${exit.id}"`).toBe(true)
        }
      }
    }
  })

  /**
   * לא להסתיר את מה שביקשת למצוא — nothing you have to find may stand behind the scenery.
   *
   * The new hazard, and it arrived with the ending. The last thing Stage A asks of the
   * player is to walk a celebrating terrace and find his father among sixteen strangers,
   * and those sixteen are DRESSING: figures drawn as layers, depth-sorted into the same
   * band the child walks in. That is what makes the search a search — and it is one
   * careless x away from making it impossible, because a layer drawn NEARER than an actor
   * covers him completely and the engine has no opinion about it.
   *
   * So: any on-the-ground layer standing in front of a talkable actor has to be clear of
   * him horizontally. The half-width is a flat, generous 0.035 rather than anything
   * derived from the figure's own art — a guard about hiding people should fail early and
   * be tightened, not squeak past on an aspect ratio.
   */
  /**
   * כל חפץ הוא חפץ אחד — every prop the game draws was drawn as that prop.
   *
   * The bug this exists for is small, invisible in code, and shipped for three passes: the
   * seven original props were rectangles of a concept board, cut a little too wide, and
   * every one carried a fragment of the drawing next door. `propBall` was not a ball at
   * all — a 126×100 crop of a CHILD with his arm raised, standing on the dirt pitch at
   * 7% of the frame where the football should be. Nobody saw it because nobody opens a
   * 40-pixel PNG, and the tests only ever asked whether the file existed.
   *
   * `source` in the manifest is what separates them: `stageAenv` means somebody typed a
   * crop box against a board, `2026-09` means a sheet was drawn of the object and a script
   * cut it on its own gaps. So the rule is that a prop a SCENE names has to come from a
   * sheet. It says nothing about the boards, which produced most of the good art in this
   * project; it says that hand-cropping is not how this game gets its objects any more.
   */
  it('draws every prop from a sheet, never from a crop box somebody typed', () => {
    const props = (artManifest['props'] ?? {}) as Record<string, { source?: string }>
    const used = new Set<string>()
    for (const scene of scenes) {
      for (const spot of scene.hotspots) if (spot.prop) used.add(spot.prop.key)
      for (const layer of scene.layers ?? []) if (layer.art.startsWith('prop')) used.add(layer.art)
    }
    expect(used.size).toBeGreaterThan(0)
    // The one exception, by name and with its reason: Stage B is a chapter about a
    // transistor radio and the September sheet drew no radio. `propRadio` is the board's
    // boombox re-cut on 3.9.2026 at the first empty column past its body — looked at, not
    // typed. The day a drawn radio ships, this line goes.
    // (21.9.2026: the transistor arrived drawn, in Maor's device sheet, and `propRadio` is
    // that drawing now — the exception is empty and stays, for the next one)
    const RECUT_OK = new Set<string>()
    /**
     * …and the batch Maor sent on 5.9.2026, which is not a sheet and was never going to
     * be one: a glass bottle, a full one, a newspaper stand and a wooden cart, cut from
     * photographs he chose, keyed off their own baked-in checkerboards and trimmed to
     * their alpha (`scripts/life/ingest-street-2026-09-05.py`). The rule this line
     * enforces is "nobody typed a crop box", and that script types none.
     */
    // …and his four object sheets of 20.9.2026, keyed off flat green by a measured grid
    // (`scripts/life/ingest-objects-2026-09-21.py`) — no crop box typed there either
    const HIS_OWN = new Set(['maor-2026-09-05-street', 'maor-2026-09-05-coin', 'maor-2026-09-06', 'maor-2026-09-20-objects'])
    for (const key of used) {
      if (RECUT_OK.has(key)) continue
      // …and a shirt comes off a photograph of the real thing, which is the point of it
      if (SHIRT.includes(key as (typeof SHIRT)[number])) continue
      const source = props[key]?.source
      if (source && HIS_OWN.has(source)) continue
      expect(source, `${key} was hand-cropped from a board`).toBe('2026-09')
    }
  })

  it('never hides a person you have to find behind a piece of dressing', () => {
    const ACTOR_HALF = 0.035
    for (const scene of scenes) {
      for (const layer of scene.layers ?? []) {
        if (!onTheGround(scene, layer)) continue
        for (const actor of scene.actors) {
          if (!actor.talk) continue
          // Only what is drawn NEARER than the actor can cover him.
          if (layer.depth <= actor.y) continue
          // ...and only in a year both of them are in: a banner of 2010 cannot hide a boy of 1986
          if (!CHAPTERS.some((c) => inEra(layer, c.id) && inEra(actor, c.id))) continue
          const clear =
            layer.x + layer.w / 2 <= actor.x - ACTOR_HALF || layer.x - layer.w / 2 >= actor.x + ACTOR_HALF
          expect(clear, `${scene.id}: ${layer.art} stands in front of ${actor.id}`).toBe(true)
        }
      }
    }
  })

  it('points every interaction at a conversation that exists', () => {
    for (const scene of scenes) {
      for (const spot of scene.hotspots) {
        // `net:*` is spoken by the 1990 match director, not by the registry
        if (spot.act.startsWith('net:')) continue
        // `pano:*` opens a panorama; its marks are checked below
        if (spot.act.startsWith('pano:')) {
          const look = PANO_SPOTS[spot.act.slice(5)]
          expect(look, `${scene.id}/${spot.id} → ${spot.act} has no panorama`).toBeDefined()
          expect(PANORAMA as readonly string[], `${spot.act} is not a panorama key`).toContain(spot.act.slice(5))
          for (const mark of look?.spots ?? []) {
            if (mark.act.startsWith('net:')) continue
            expect(DIALOGUE[mark.act], `${spot.act} → ${mark.labelHe} → ${mark.act}`).toBeDefined()
          }
          continue
        }
        expect(DIALOGUE[spot.act], `${scene.id}/${spot.id} → ${spot.act}`).toBeDefined()
      }
      for (const actor of scene.actors) {
        if (actor.talk?.startsWith('net:')) continue
        if (!actor.talk) continue
        expect(DIALOGUE[actor.talk], `${scene.id}/${actor.id} → ${actor.talk}`).toBeDefined()
      }
    }
  })

  it('has a painting and living marks behind every panorama', () => {
    for (const key of PANORAMA) {
      expect(existsSync(join(ART, `${key}.webp`)), `${key}.webp`).toBe(true)
      const look = PANO_SPOTS[key]
      expect(look, `${key} has no marks`).toBeDefined()
      for (const mark of look?.spots ?? []) {
        if (mark.act.startsWith('net:')) continue
        expect(DIALOGUE[mark.act], `${key} → ${mark.labelHe} → ${mark.act}`).toBeDefined()
        expect(Math.abs(mark.yaw), `${key} → ${mark.labelHe}: yaw is degrees in (-180, 180]`).toBeLessThanOrEqual(180)
        expect(Math.abs(mark.pitch), `${key} → ${mark.labelHe}: pitch is inside a 4:1 cylinder`).toBeLessThanOrEqual(40)
      }
    }
  })

  it('walks from the bedroom to the terrace', () => {
    const seen = new Set<string>(['bedroom'])
    const queue = ['bedroom']
    /**
     * (27.9.2026) a chapter's own `travel` is a way in too — the road to Teddy, the flight to
     * Lisbon — exactly as `life:worldlines` counts it (`closureFor`: *"travel הוא דלת"*). The
     * away ends of 2010 have a door OUT on foot and a way IN by car or plane, not a doorway
     * in somebody's street.
     */
    for (const chapter of CHAPTERS) {
      for (const beat of eraFor(chapter.id).beats ?? []) {
        for (const action of beat.do) {
          if (action.a === 'travel' && !seen.has(action.to)) {
            seen.add(action.to)
            queue.push(action.to)
          }
        }
      }
    }
    while (queue.length > 0) {
      const id = queue.shift() as keyof typeof SCENE
      for (const exit of SCENE[id]?.exits ?? []) {
        if (seen.has(exit.to)) continue
        seen.add(exit.to)
        queue.push(exit.to)
      }
    }
    for (const scene of scenes) {
      expect(seen.has(scene.id), `${scene.id} is unreachable from the bedroom`).toBe(true)
    }
  })
})

describe('בהירות — a first-time player is never asked to guess', () => {
  const scenes = ALL_SCENES

  it('gives every interactive thing a verb and a name', () => {
    // `לגעת` is not information. A prompt has to say what will happen and to what, or
    // the player is testing the button rather than playing the game.
    for (const scene of scenes) {
      for (const spot of scene.hotspots) {
        expect(spot.verb, `${scene.id}/${spot.id} has no verb`).toBeTruthy()
        expect(spot.labelHe.length, `${scene.id}/${spot.id} has no name`).toBeGreaterThan(1)
      }
      for (const exit of scene.exits) {
        expect(exit.labelHe.length, `${scene.id}/${exit.id} does not say where it goes`).toBeGreaterThan(1)
      }
      for (const actor of scene.actors) {
        expect(actor.nameHe.length, `${scene.id}/${actor.id} has no name`).toBeGreaterThan(1)
      }
    }
  })

  it('lights every door that leads out of a room', () => {
    // The playtest failure was one sentence long: the player stayed in the house because
    // leaving was not obvious. A door you cannot see from across the room is not a door.
    for (const scene of scenes) {
      if (scene.exits.length === 0) continue
      const lit = scene.exits.filter((exit) => exit.light)
      expect(lit.length, `${scene.id} has ${scene.exits.length} exits and ${lit.length} lit`).toBeGreaterThan(0)
    }
  })

  it('makes the front door of the flat look like daylight and nothing else does', () => {
    const home = SCENE['home']
    const street = home?.exits.find((exit) => exit.to === 'street')
    expect(street, 'the living room has no way out to the street').toBeDefined()
    expect(street?.light?.tone, 'the front door is not lit as daylight').toBe('daylight')
    const interior = home?.exits.filter((exit) => exit.to !== 'street') ?? []
    for (const exit of interior) {
      expect(exit.light?.tone, `${exit.id} is lit like the front door`).not.toBe('daylight')
    }
  })

  it('never spawns the player inside a door', () => {
    // Landing in the zone you just came through sends you straight back, forever. This is
    // the bounce test, and it is the reason spawns are placed clear of every exit.
    for (const scene of scenes) {
      for (const [name, point] of Object.entries(scene.spawns)) {
        for (const exit of scene.exits) {
          const inside =
            point.x >= exit.x &&
            point.x <= exit.x + exit.w &&
            point.y >= exit.y &&
            point.y <= exit.y + exit.h
          expect(inside, `${scene.id}:${name} spawns inside exit ${exit.id}`).toBe(false)
        }
      }
    }
  })

  it('puts every door where the child can actually stand', () => {
    for (const scene of scenes) {
      for (const exit of scene.exits) {
        const overlaps = exit.y <= scene.band.near && exit.y + exit.h >= scene.band.far
        expect(overlaps, `${scene.id}/${exit.id} is outside the walk band`).toBe(true)
      }
    }
  })

  it('gives every room something to say to a player who is lost', () => {
    for (const scene of scenes) {
      if (scene.id === 'bloomfield-inside') continue
      expect(scene.stuckHe, `${scene.id} has no stuck line`).toBeTruthy()
    }
  })

  it('does not start the clock until the child is out of the room he woke in', () => {
    // Time is the chapter's antagonist and stays that way. What it may not do is bill the
    // player for learning which key moves — the first playtest lost Kobi to exactly that.
    //
    // 6.9.2026: this test used to demand that the gate be the raw `onboard:street` flag,
    // and that demand WAS the bug. The flag is raised by walking into the street, 11.3.1991
    // starts in a classroom and never goes there, and so the clock in that chapter could
    // never start: Rachel comes home at three, and three never arrived. The invariant is
    // the one the comment always described — the clock waits while the boy is still in the
    // room he woke up in, and not a second longer — so that is what is asserted now.
    const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
    const tick = world.slice(world.indexOf('private tickClock'), world.indexOf('private timeTriggers'))
    expect(tick, 'the clock is no longer gated at all').toContain('this.clockWaiting()')
    expect(world, 'the day never begins').toContain("flag: 'onboard:street'")
    // …and the gate is the FIRST thing the tick does.
    const body = tick.slice(tick.indexOf('{', tick.indexOf('(delta: number)')) + 1)
    const first = body.split('\n').map((line) => line.trim()).filter(Boolean)[0]
    expect(first, 'something now runs before the clock gate').toContain('clockWaiting()')
    // the gate knows which chapter it is in, which is the whole fix
    const guard = world.slice(world.indexOf('private clockWaiting()'), world.indexOf('private tickClock'))
    expect(guard, 'the gate cannot tell a classroom from a bedroom').toContain('chapterFor(this.chapter)')
  })

  it('teaches exactly two things and then stops', () => {
    const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
    expect(world).toContain("flag: 'onboard:moved'")
    expect(world).toContain("flag: 'onboard:acted'")
    const catalogue = MESSAGES
    for (const key of [
      'life.teach.move.desktop',
      'life.teach.move.touch',
      'life.teach.act.desktop',
      'life.teach.act.touch',
    ]) {
      expect(catalogue[key], `${key} missing`).toBeTruthy()
    }
  })

  it('has a Hebrew phrase for every verb the world uses', () => {
    const catalogue = MESSAGES
    const verbs = new Set<string>(['exit'])
    for (const scene of scenes) {
      for (const spot of scene.hotspots) verbs.add(spot.verb)
      if (scene.actors.some((actor) => actor.talk)) verbs.add('talk')
    }
    for (const verb of verbs) {
      expect(catalogue[`life.verb.${verb}`], `life.verb.${verb} missing`).toBeTruthy()
      expect(catalogue[`life.verb.short.${verb}`], `life.verb.short.${verb} missing`).toBeTruthy()
    }
  })
})

describe('לוח ההפעלה — the controls are a place on the screen, on every device', () => {
  const deck = readFileSync(join(ROOT, 'components/life/ControlDeck.tsx'), 'utf8')
  const stage = readFileSync(join(ROOT, 'app/life/LifeStage.tsx'), 'utf8')
  // the shell composes the console; the wiring behind the two buttons lives in the input
  // hook since the 7.9.2026 split — same rule, one file down
  const input = readFileSync(join(ROOT, 'app/life/stage/useLifeInput.ts'), 'utf8')

  it('the deck is what the stage renders — there is only one console', () => {
    expect(stage).toContain('<ControlDeck')
    expect(stage).not.toContain('<TouchPad')
    expect(stage).not.toContain('<Prompt')
  })

  it('the deck knows which device it is on, and draws two different consoles', () => {
    expect(deck).toContain('touch')
    // the keyboard legend and the arcade cabinet are separate returns, not one shrunk layout
    expect(deck).toContain('if (!touch)')
    expect(deck).toContain('Shift')
    expect(deck).toContain('↑')
  })

  it('the stick is a physical object, not a translucent circle', () => {
    // the directive asks for arcade hardware: a deck plate, a worn-metal stick that leans
    // toward the thumb (since the 98 visual round the stick is painted art, not a CSS
    // radial-gradient), a shadow it casts, moulded buttons
    expect(deck).toContain('<DeckPlate')
    expect(deck).toContain('dpad.webp')
    expect(deck).toContain('perspective(')
    expect(deck).toContain('drop-shadow(')
    expect(deck).toContain('boxShadow')
    expect(deck).toContain('ArcadeButton')
  })

  it('there are exactly two buttons, and B is the one that means "not this"', () => {
    const presses = [...deck.matchAll(/letter="([AB])"/g)].map((match) => match[1])
    expect(presses.sort()).toEqual(['A', 'B'])
    expect(deck).toContain('onCancel')
    // B runs while walking and leaves while talking — one idea, never a third button
    expect(stage).toContain('runtime.current?.leave()')
    expect(input).toContain('runtime.current?.leave()')
    expect(input).toContain('input.setRun(down)')
  })

  it('the name of what is in reach carries the harness handle, and only when there is one', () => {
    const chip = deck.slice(deck.indexOf('const centre'), deck.indexOf('// --- desktop'))
    expect(chip).toContain('data-life="prompt"')
    // the empty state is a different element, so an empty deck never reads as a prompt
    const empty = chip.slice(chip.indexOf("t('life.deck.nothing')"))
    expect(empty).not.toContain('data-life="prompt"')
  })

  it('every string the deck says is in the catalogue', () => {
    const catalogue = MESSAGES
    for (const key of ['life.deck.move', 'life.deck.act', 'life.deck.run', 'life.deck.locked', 'life.deck.nothing']) {
      expect(catalogue[key], `${key} missing`).toBeTruthy()
    }
  })

  it('a locked door keeps its name and says so, rather than going quiet', () => {
    expect(deck).toContain("t('life.deck.locked')")
    const scenes = readFileSync(join(ROOT, 'lib/life/world/scenes.ts'), 'utf8')
    expect(scenes).toContain('blockedHe')
  })

  it('the retired console imports nothing, so the old file cannot break a deploy', () => {
    for (const file of ['components/life/TouchPad.tsx', 'components/life/Prompt.tsx']) {
      const text = readFileSync(join(ROOT, file), 'utf8')
      expect(text.includes('import '), `${file} still imports`).toBe(false)
      expect(text).toContain('REPLACED_BY')
    }
  })

  it('the console sizes off the band it is given, so a small phone gets all of it', () => {
    expect(deck).toContain('clamp(')
    expect(deck).toContain('env(safe-area-inset-bottom)')
  })
})

describe('לצאת מהשיחה — no conversation is a room without a door', () => {
  const box = readFileSync(join(ROOT, 'components/life/DialogueBox.tsx'), 'utf8')
  const runner = readFileSync(join(ROOT, 'lib/life/runtime/dialogue.ts'), 'utf8')
  const stage = readFileSync(join(ROOT, 'app/life/LifeStage.tsx'), 'utf8')
  /** the keyboard moved out of the shell on 7.9.2026 — Escape is wired here now */
  const keys = readFileSync(join(ROOT, 'app/life/stage/useLifeInput.ts'), 'utf8')

  it('the box always draws the X, whether or not the line has a speaker', () => {
    expect(box).toContain('data-life="leave"')
    // the header strip is unconditional now — the X hangs on it either way
    expect(box).not.toContain('{line.who && (')
  })

  it('leaving is wired from the box, from Escape, and through the runtime', () => {
    expect(box).toContain('onLeave')
    expect(stage).toContain('onLeave={() => runtime.current?.leave()}')
    expect(keys).toContain("event.key === 'Escape'")
    expect(keys).toContain('runtime.current?.leave()')
    expect(runner).toContain('leave()')
  })

  it('walking away applies nothing — leave() closes, it never finishes', () => {
    const body = runner.slice(runner.indexOf('  leave()'), runner.indexOf('  close()'))
    expect(body).toContain('this.close()')
    expect(body).not.toContain('this.finish')
  })
})

describe('שני עשורים — the cast is on disk at both ages', () => {
  const sheets = JSON.parse(readFileSync(join(ART, 'sheets.json'), 'utf8')) as Record<
    string,
    { yellowLeft: number }
  >

  it('the nineties cast was cut, and cut clean', () => {
    const nineties = Object.keys(sheets).filter((key) => /90(-|$)/.test(key))
    expect(nineties.length).toBeGreaterThanOrEqual(24)
    for (const key of nineties) {
      expect(sheets[key]?.yellowLeft, `${key} has yellow`).toBe(0)
      expect(existsSync(join(ART, `${key}.webp`)), `${key}.webp missing`).toBe(true)
    }
  })

  it('both ages of all three are present — the point is the pair, not the file', () => {
    for (const [then, now] of [
      ['kobi-chair', 'kobi90-paper'],
      ['kobi-cheer', 'kobi90-cheer'],
      // `ofir90-smoke` is the older sheet's different man (`LEGACY_POSE`, 24.9.2026)
      ['ofir', 'ofir90-3q'],
      ['amit', 'amit90'],
    ]) {
      expect(existsSync(join(ART, `${then}.webp`)), `${then} missing`).toBe(true)
      expect(existsSync(join(ART, `${now}.webp`)), `${now} missing`).toBe(true)
    }
  })

  it('every epilogue names art that exists and is a known figure', () => {
    for (const ending of Object.values(ENDINGS)) {
      if (!ending.after) continue
      for (const art of [ending.after.fromArt, ending.after.toArt]) {
        expect(FIGURE as readonly string[], `${art} is not a figure`).toContain(art)
        expect(existsSync(join(ART, `${art}.webp`)), `${art}.webp missing`).toBe(true)
      }
      expect(ending.after.lineHe.length).toBeGreaterThan(20)
    }
  })

  it('the epilogue dates nothing — the caption is a span, never a year', () => {
    const authored = readFileSync(join(ROOT, 'lib/life/content/chapter1986.ts'), 'utf8')
    for (const ending of Object.values(ENDINGS)) {
      if (!ending.after) continue
      expect(/\b(19|20)\d{2}\b/.test(ending.after.lineHe), 'the epilogue names a year').toBe(false)
    }
    expect(authored).toContain('after?')
  })
})

describe('השיחות — a conversation always has a way out', () => {
  const conversations = Object.values(DIALOGUE) as Conversation[]

  it('resolves every goto', () => {
    for (const conversation of conversations) {
      for (const branch of conversation.branches) {
        for (const effect of [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((c) => c.then)]) {
          if (effect.e !== 'goto') continue
          expect(DIALOGUE[effect.node], `${conversation.id} → ${effect.node}`).toBeDefined()
        }
      }
    }
  })

  it('always has a branch that matches a fresh life', () => {
    // A prop whose every branch is conditional is a prop that silently does nothing the
    // first time a player touches it, which reads as a broken game rather than a locked one.
    const fresh = state()
    for (const conversation of conversations) {
      const last = conversation.branches[conversation.branches.length - 1]
      expect(last, `${conversation.id} has no branches`).toBeDefined()
      expect(meets(fresh, last?.when), `${conversation.id} has no unconditional fallback`).toBe(true)
    }
  })

  it('explains every choice it disables', () => {
    for (const conversation of conversations) {
      for (const branch of conversation.branches) {
        for (const choice of branch.choices ?? []) {
          if (!choice.when || choice.hidden) continue
          expect(choice.noteHe, `${conversation.id}/${choice.id} locks without saying why`).toBeTruthy()
        }
      }
    }
  })

  it('offers a way into the ground that needs nothing', () => {
    // Brief §23: the finale may be reached in several believable ways, and §26 says the
    // game does not dead-end. So at least one entry route must be unconditional.
    //
    // It follows a `goto` now, and that is the point of the change it was rewritten for.
    // The old fallback was `talk → entry granted`, which the production directive names
    // as a defect (§3.2): a fail-safe is not a free solution. The old man now asks a
    // question first and both answers lead on — so the guard has to check that the way
    // in is REACHABLE without a condition, not that one branch object happens to carry
    // the flag. Reachability is what "does not dead-end" always meant.
    const veteran = DIALOGUE['gate-veteran']
    const open = veteran?.branches.filter((branch) => !branch.when) ?? []
    expect(open.length).toBeGreaterThan(0)

    const grantsFrom = (effects: readonly { e: string; flag?: string; node?: string }[]): boolean => {
      if (effects.some((effect) => effect.e === 'flag' && effect.flag === 'entry:granted')) return true
      return effects.some((effect) => {
        if (effect.e !== 'goto' || !effect.node) return false
        const next = DIALOGUE[effect.node]
        // Only an UNCONDITIONAL branch of the node counts — a chained node whose every
        // branch is gated is a dead end one step further away.
        return (next?.branches ?? []).some(
          (branch) =>
            !branch.when &&
            (branch.then ?? []).some((e) => e.e === 'flag' && e.flag === 'entry:granted'),
        )
      })
    }

    const grants = open.some(
      (branch) =>
        grantsFrom(branch.then ?? []) ||
        (branch.choices ?? []).some((choice) => !choice.when && grantsFrom(choice.then)),
    )
    expect(grants, 'no unconditional way into the ground').toBe(true)
  })
})

// ---------------------------------------------------------------------------------
describe('הגבול — the life layer reads history only through the archive', () => {
  it('never imports the curated files directly', () => {
    for (const path of walk(join(ROOT, 'lib/life'))) {
      const text = readFileSync(path, 'utf8')
      expect(text.includes('@/content/manual'), `${path} reads the archive files directly`).toBe(false)
      expect(text.includes('red-fans'), `${path} names the wiki`).toBe(false)
    }
  })

  it('keeps the archive import in exactly one file, and that file is server-only', () => {
    const readers = walk(join(ROOT, 'lib/life')).filter((path) =>
      readFileSync(path, 'utf8').includes("@/lib/game/archive"),
    )
    expect(readers.map((path) => path.replace(`${ROOT}/`, ''))).toEqual(['lib/life/anchor-server.ts'])
    expect(readFileSync(join(ROOT, 'lib/life/anchor-server.ts'), 'utf8')).toContain("import 'server-only'")
  })

  it('keeps Phaser out of everything but the runtime', () => {
    // The engine has to be runnable in this test file with no canvas anywhere.
    for (const path of walk(join(ROOT, 'lib/life'))) {
      if (path.includes('/runtime/')) continue
      expect(readFileSync(path, 'utf8').includes("from 'phaser'"), `${path} imports Phaser`).toBe(false)
    }
  })
})

/**
 * הסרט מהארכיון — the historical cutscene system.
 *
 * Two things are being protected here and they pull in opposite directions. One is that
 * the film must be able to fail: YouTube is somebody else's server and every way it can
 * go wrong has to end with the chapter continuing. The other is that the card printed
 * around the film may not say anything the archive does not hold — a black screen before
 * archival footage is exactly the place a plausible-sounding invented date would never be
 * questioned by anybody.
 */
describe('הסרט מהארכיון — real footage, and nothing said over it', () => {
  it('builds the card from the anchor and never from a literal', () => {
    const scene = CUTSCENES['1986-championship']!
    const anchor = resolveChapterAnchor()
    const card = cutsceneCard(scene, anchor)

    if (!anchor.match) {
      // The archive cannot answer: the card says less, and says nothing wrong.
      expect(card.fixtureHe).toBeNull()
      expect(card.dateHe).toBeNull()
      return
    }
    expect(card.fixtureHe).toContain(anchor.match.opponentHe)
    expect(card.fixtureHe).toContain('הפועל תל אביב')
    expect(card.dateHe).toBe(longDateHe(anchor.match.playedOn))
    expect(card.placeHe).toBe(anchor.match.venueHe)
    // …and no scoreline anywhere on it. The player is about to watch the match.
    for (const line of [card.titleHe, card.subtitleHe, card.fixtureHe, card.dateHe, card.placeHe]) {
      if (!line) continue
      expect(/\d+\s*[:\-–]\s*\d+/.test(line), `a scoreline reached the card: ${line}`).toBe(false)
    }
  })

  it('writes a date a person reads, and refuses anything it cannot parse', () => {
    expect(longDateHe('1986-05-24')).toBe('24 במאי 1986')
    expect(longDateHe('1983-06-01')).toBe('1 ביוני 1983')
    expect(longDateHe(null)).toBeNull()
    expect(longDateHe('24.5.1986')).toBeNull()
    expect(longDateHe('1986-13-01')).toBeNull()
  })

  it('gives every cutscene a flag, an objective and something to say when it cannot play', () => {
    const entries = Object.entries(CUTSCENES)
    expect(entries.length).toBeGreaterThan(0)
    for (const [id, scene] of entries) {
      expect(scene.id, `${id} disagrees with its own key`).toBe(id)
      expect(scene.youtubeId.length).toBeGreaterThan(6)
      // A cutscene that ends into nothing is a chapter that stops.
      expect(scene.nextObjectiveHe.length, `${id} ends into nothing`).toBeGreaterThan(2)
      expect(scene.fallbackHe.length, `${id} has nothing to say when the film is gone`).toBeGreaterThan(10)
      expect(scene.completionFlag).not.toBe(scene.watchedFlag)
      // Attribution is not optional on somebody else's film.
      expect(scene.sourceTitle.length).toBeGreaterThan(3)
      expect(scene.sourceUrl.startsWith('https://')).toBe(true)
      expect(scene.sourceUrl).toContain(scene.youtubeId)
    }
  })

  it('embeds without cookies, without related videos, and with the API on', () => {
    const scene = CUTSCENES['1986-championship']!
    const url = embedUrl(scene, 'https://example.test')
    // nocookie: the player is a child in a game and does not need an ad profile for this
    expect(url.startsWith('https://www.youtube-nocookie.com/embed/')).toBe(true)
    expect(url).toContain(scene.youtubeId)
    // enablejsapi is what lets the shell HEAR the video end rather than guess at it
    expect(url).toContain('enablejsapi=1')
    // rel=0 keeps three other videos off the last frame of a historical document
    expect(url).toContain('rel=0')
    expect(url).toContain('origin=https%3A%2F%2Fexample.test')
  })

  it('is a registry, not a special case in the world', () => {
    expect(cutsceneFor('1986-championship')).not.toBeNull()
    // An id nobody registered is a legitimate state — the chapter falls through to the
    // ninety-minute simulation without a word about it — and must never throw.
    expect(cutsceneFor('no-such-film')).toBeNull()

    // The scene names the film by ID and imports the registry, rather than holding a
    // YouTube id of its own. A video URL in a Phaser scene is the thing this file exists
    // to prevent.
    const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
    expect(world).toContain("from '../../cutscenes'")
    // Comments are prose about the rule; the rule applies to the code. The scene is
    // allowed to explain what happens when YouTube is down and not to name it.
    const code = world.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(/youtube|youtu\.be/i.test(code), 'a video URL reached a scene').toBe(false)
  })

  /**
   * The requirement above every other one on this feature, asserted as a property of the
   * source rather than of a run: there is no way out of the overlay that does not report
   * an outcome, INCLUDING unmount, and the runtime raises the completion flag on all
   * three of them. A player cannot be left standing in a stadium because a video was
   * pulled in 2029.
   */
  it('cannot trap the player, whichever way the film fails', () => {
    const overlay = readFileSync(join(ROOT, 'components/life/HistoricalCutscene.tsx'), 'utf8')
    // ended · skipped · YouTube error · API blocked · unmount
    expect(overlay).toContain("finish('watched')")
    expect(overlay).toContain("finish('skipped')")
    expect(overlay).toContain("finish('unavailable')")
    expect(overlay).toContain("setPhase('failed')")
    // the unmount path, which is the one nobody remembers to write
    expect(/return \(\) => \{[\s\S]{0,400}finish\('skipped'\)/.test(overlay)).toBe(true)

    const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
    const body = world.slice(world.indexOf('endCutscene(outcome: CutsceneOutcome)'))
    const end = body.slice(0, body.indexOf('\n  private returnFromArchive'))
    // the completion flag is raised BEFORE the branch, so all three outcomes carry it
    expect(end.indexOf('completionFlag')).toBeLessThan(end.indexOf("outcome === 'unavailable'"))
    expect(end).toContain('watchMatch()')
    expect(end).toContain('returnFromArchive()')
  })
})

/**
 * הפתיח — five pictures before the player is allowed to touch anything.
 *
 * The sequence's job (vision §4) is to explain why this club already has a place in this
 * child's life before he is old enough to choose it, and its danger is the same as every
 * other screen in this game: it is the one place where a plausible-sounding invented date
 * would never be questioned, because it plays over a photograph while nobody is reading
 * critically. So the rule holds here too — a caption is written FOR a beat, and a fact is
 * READ OFF the archive, and the two never swap places.
 */
describe('הפתיח — the opening, and the one line in it that is a fact', () => {
  it('names every file it plays, and every file exists', () => {
    // 25.9.2026: the fallback is the documentary thread and plays no file at all (owner
    // spec "OPENING DOCUMENTARY HYBRID" §1, §43). What plays is the film — both encodings
    // and the poster, rule 30 — and the old stills stay on disk (tests/life-opening.test.ts).
    expect(OPENING.length).toBeGreaterThanOrEqual(4)
    for (const path of [FILM.webm, FILM.mp4, FILM.poster]) {
      expect(existsSync(join(ROOT, 'public', path)), path).toBe(true)
    }
    for (const beat of OPENING) expect(beat, beat.id).not.toHaveProperty('art')
  })

  it('writes no fact into a caption', () => {
    for (const beat of OPENING) {
      // No year, no scoreline, no date. Those come off the anchor or they do not appear.
      expect(/\b(19|20)\d{2}\b/.test(beat.captionHe), `${beat.id}: a year is in the caption`).toBe(false)
      expect(/\d+\s*[:\-–]\s*\d+/.test(beat.captionHe), `${beat.id}: a scoreline is in the caption`).toBe(
        false,
      )
      expect(beat.captionHe.length).toBeGreaterThan(8)
      expect(beat.ms).toBeGreaterThanOrEqual(3000)
    }
  })

  it('reads the 1983 final off the prologue anchor, or says less', () => {
    const anchor = resolvePrologueAnchor()
    const cup = OPENING.find((beat) => beat.archiveLine === 'fixture')
    expect(cup, 'no beat carries the archive line').toBeDefined()
    const lines = openingLines(cup!, anchor)
    expect(lines.captionHe).toBe(cup!.captionHe)

    if (!anchor.match) {
      expect(lines.archiveHe, 'the archive cannot answer, so the beat must say less').toBeNull()
      return
    }
    expect(lines.archiveHe).toContain(anchor.match.opponentHe)
    expect(lines.archiveHe).toContain('הפועל תל אביב')
    // The score, written in the direction the archive holds it — never a string typed in.
    const forGoals = anchor.match.scoredFor
    const against = anchor.match.scoredAgainst
    expect(lines.archiveHe).toContain(
      anchor.match.atHome ? `${forGoals}:${against}` : `${against}:${forGoals}`,
    )
    expect(lines.archiveHe).toContain(longDateHe(anchor.match.playedOn) as string)
  })

  it('a beat with no archive line gets exactly one line', () => {
    const anchor = resolvePrologueAnchor()
    for (const beat of OPENING) {
      if (beat.archiveLine) continue
      expect(openingLines(beat, anchor).archiveHe).toBeNull()
    }
  })

  it('is short enough that a person watches it rather than skips it', () => {
    // Half a minute is the outside edge. The skip is there from the first frame either way.
    expect(openingMs()).toBeLessThanOrEqual(32000)
    expect(openingMs()).toBeGreaterThan(12000)
    const overlay = readFileSync(join(ROOT, 'components/life/OpeningDocumentary.tsx'), 'utf8')
    const film = readFileSync(join(ROOT, 'components/life/OpeningFilm.tsx'), 'utf8')
    expect(overlay).toContain("data-life=\"opening-skip\"")
    expect(film).toContain("data-life=\"opening-skip\"")
    // Escape moved onto the shared dialog hook — the behaviour is followed to its new
    // owner rather than asserted where it used to live (`useDialog`, delta 15.9.2026).
    expect(overlay).toContain('useDialog')
    expect(readFileSync(join(ROOT, 'components/ui/useDialog.ts'), 'utf8')).toContain("'Escape'")
    // Muted, inline and autoplaying is the one combination every mobile browser allows
    // without a gesture. A sequence that needs a tap to start is a sequence nobody sees.
    // (the documentary plays no media; the film is what must start without a gesture)
    expect(film).toContain('muted')
    expect(film).toContain('playsInline')
  })

  it('keeps no yellow in a single frame of it, film included', () => {
    // The clips were 3.6% and 8.9% yellow as delivered. `count_yellow` runs on PNGs in
    // `public/life/art` and an mp4 is neither, so nothing in the pipeline would ever have
    // looked — which is why `scripts/life/ingest-opening.py` treats every frame before it
    // encodes, and why this asserts the script still does.
    const script = readFileSync(join(ROOT, 'scripts/life/ingest-opening.py'), 'utf8')
    expect(script).toContain('def deyellow(')
    expect(script).toContain('count_yellow(arr)')
    expect(script).toContain('clean_palette(')
    // The stills are no longer played; they stay on disk as optional polish (spec §17).
    for (const still of ['born', 'shoulders', 'drawing']) {
      const bytes = readFileSync(join(ROOT, 'public/life/opening', `${still}.png`))
      expect(bytes.length).toBeGreaterThan(1000)
    }
  })
})

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (path.endsWith('.ts') || path.endsWith('.tsx')) out.push(path)
  }
  return out
}

/** Every source file under the given repo-relative roots. */
function code(roots: readonly string[]): string[] {
  return roots.flatMap((root) => walk(join(ROOT, root)))
}

// ---------------------------------------------------------------------------------

/**
 * שנים־עשר סמלי האינטראקציה — ומה שהם אינם רשאים לעשות (20.9.2026).
 *
 * מאור מסר גיליון אחד על ירוק ומשפט אחד: *"כדאי להצמיד לכל סמל תווית עברית קצרה, כדי
 * שהפעולה תהיה ברורה מיד."* שלוש בדיקות מחזיקות בדיוק את המשפט הזה: לכל סמל יש קובץ,
 * לכל סמל יש מילה, ו**הסמל לעולם אינו מחליף את הפועל** — `ICON_OF_VERB` היא התאמה
 * חלקית בכוונה, ופועל בלי סמל ממשיך להראות את שם הכפתור. סמל שגוי גרוע מאין סמל.
 */
describe('סמלי האינטראקציה', () => {
  it('ships a file for every declared icon, and measures zero yellow on it', () => {
    const index = JSON.parse(readFileSync(join(process.cwd(), 'public/life/art/sheets.json'), 'utf8')) as Record<
      string,
      { w: number; h: number; bytes: number; yellowLeft: number; source?: string }
    >
    for (const key of ICON) {
      const row = index[key]
      expect(row, `${key} is declared and not indexed`).toBeTruthy()
      expect(existsSync(join(process.cwd(), `public/life/art/${key}.webp`)), `${key} has no file`).toBe(true)
      expect(row!.yellowLeft, `${key} carries yellow`).toBe(0)
      expect(row!.source, `${key} arrived without a provenance line`).toBeTruthy()
    }
  })

  it('gives every icon a short Hebrew word, because a disc alone is not an action', () => {
    for (const key of ICON) {
      const word = MESSAGES[`life.icon.${key}`]
      expect(word, `${key} has no label`).toBeTruthy()
      expect(word!.trim().length, `${key}'s label is empty`).toBeGreaterThan(1)
      expect(word!.length, `${key}'s label is a sentence, not a label`).toBeLessThan(12)
    }
  })

  /**
   * וההתאמה נשארת חלקית: `buy`, `play` ו-`sit` אין להם דיסקית בחבילה, והשורה שלהם
   * ממשיכה להיות מילה בלבד. הבדיקה שומרת על החלקיות — כדי שמישהו לא ימלא אותה בסמל
   * שכמעט מתאים.
   */
  it('points every mapped verb at an icon that exists, and leaves the rest unmapped', () => {
    for (const [verb, icon] of Object.entries(ICON_OF_VERB)) {
      expect(ICON as readonly string[], `${verb} points at an icon that is not declared`).toContain(icon)
    }
    for (const verb of ['buy', 'play', 'sit']) {
      expect(ICON_OF_VERB[verb], `${verb} was given an icon that was not drawn for it`).toBeUndefined()
    }
  })
})

/**
 * שנים־עשר סמלי המצב — ומה שמפריד אותם מהפעולות (21.9.2026).
 *
 * הגיליון השני של מאור אינו הרחבה של הראשון. הראשון הוא **פעולות** על כפתור; זה
 * **מה שהמשחק סופר** — ארנק, ברק, מסכה, לב עם צלב, מגן עם צעיף, לחיצת יד, שני לבבות,
 * הורה וילד, ספר, מגפון, גלובוס, תיק. הבדיקות כאן מחזיקות שלושה דברים, וכל אחד הוא
 * כלל שכבר נכשל פעם אחת במשחק הזה:
 *
 * 1. **לכל סמל יש קובץ, ואפס צהוב** — כלל 8, כלל 61.
 * 2. **כל מפתח בכל טבלת חיבור מצביע על סמל שהוכרז** — אחרת 404 מול שחקן (כלל 48).
 * 3. **לכל סמל יש בית**, כלומר טבלה אחת לפחות שמצביעה עליו. זה הכיוון שכלל 78 נבנה
 *    עליו: תוכן נגיש אינו תוכן שהגיעו אליו, ונכס שאיש לא ממקם הוא נכס מת — רק שכאן
 *    אפשר לשאול את זה מכנית, ולכן שואלים.
 */
describe('סמלי המצב', () => {
  const TABLES = {
    skill: EMBLEM_OF_SKILL,
    resource: EMBLEM_OF_RESOURCE,
    gaugeGroup: EMBLEM_OF_GAUGE_GROUP,
    track: EMBLEM_OF_TRACK,
    route: EMBLEM_OF_ROUTE,
  } as const

  it('ships a file for every declared emblem, and measures zero yellow on it', () => {
    const index = JSON.parse(readFileSync(join(process.cwd(), 'public/life/art/sheets.json'), 'utf8')) as Record<
      string,
      { w: number; h: number; bytes: number; yellowLeft: number; source?: string }
    >
    for (const key of EMBLEM) {
      const row = index[key]
      expect(row, `${key} is declared and not indexed`).toBeTruthy()
      expect(existsSync(join(process.cwd(), `public/life/art/${key}.webp`)), `${key} has no file`).toBe(true)
      expect(row!.yellowLeft, `${key} carries yellow`).toBe(0)
      expect(row!.source, `${key} arrived without a provenance line`).toBeTruthy()
    }
  })

  it('points every table entry at an emblem that was actually drawn', () => {
    for (const [name, table] of Object.entries(TABLES)) {
      for (const [key, emblem] of Object.entries(table)) {
        expect(EMBLEM as readonly string[], `${name}.${key} points at an undeclared emblem`).toContain(emblem)
      }
    }
  })

  /**
   * ...וכל סמל **מוצב**. זה מה שהפריד בין כלל 43 (ציור נוחת לפני החדר שלו — מותר,
   * ונאמר בקול) לבין כלל 48 (*"אל תשלח אמנות שאף אחד לא ממקם"*): שם היה מדובר בשלושה
   * פרופים שנחתכו יפה ונמחקו. הגיליון הזה נקלט **אחרי** שנמצא לכל אחד מהשנים־עשר מדד
   * אמיתי, והבדיקה היא מה שמונע מהשלושה־עשר להיכנס בשקט.
   */
  it('gives every emblem a home in at least one table', () => {
    const placed = new Set(Object.values(TABLES).flatMap((table) => Object.values(table)))
    expect([...EMBLEM].filter((key) => !placed.has(key))).toEqual([])
  })

  /**
   * ...ושלוש החלקיות נשמרות **בשמן**, כמו `buy`/`play`/`sit` אצל האייקונים. מי שימלא
   * אותן בסמל שכמעט מתאים ילמד את השחקן הבדל שאינו קיים — ארגון אינו עסקים, אישיות
   * אינה יצירתיות.
   */
  it('leaves organization, person and decade unmarked, on purpose', () => {
    expect(EMBLEM_OF_SKILL['organization'], 'organization was given an emblem drawn for something else').toBeUndefined()
    expect(EMBLEM_OF_GAUGE_GROUP['person']).toBeUndefined()
    expect(EMBLEM_OF_GAUGE_GROUP['decade']).toBeUndefined()
  })

  /**
   * ...וכל מפתח בכל טבלה הוא **מזהה אמיתי**. `runtime/art.ts` מקליד את הטבלאות
   * כ-`Record<string, …>` בכוונה — כדי שלא ייווצר מעגל ייבוא בין הציור למנוע — ולכן
   * השומר הוא כאן ולא בקומפיילר: `emBlue: 'emScarf'` היה מתקמפל ולא היה מוצג לעולם.
   */
  it('keys every table on an id the engine actually has', () => {
    for (const key of Object.keys(EMBLEM_OF_SKILL)) expect(SKILL_IDS as readonly string[], `${key} is not a skill`).toContain(key)
    for (const key of Object.keys(EMBLEM_OF_TRACK)) {
      expect(LIFE_TRACKS.map((track) => track.id) as readonly string[], `${key} is not a track`).toContain(key)
    }
    for (const key of Object.keys(EMBLEM_OF_ROUTE)) {
      expect(LIFE_ROUTES.map((route) => route.id) as readonly string[], `${key} is not a route`).toContain(key)
    }
    for (const key of Object.keys(EMBLEM_OF_GAUGE_GROUP)) {
      expect(['heart', 'person', 'wellbeing', 'people', 'decade'], `${key} is not a gauge group`).toContain(key)
    }
    for (const key of Object.keys(EMBLEM_OF_RESOURCE)) expect(['money', 'energy'], `${key} is not a resource`).toContain(key)
  })
})
