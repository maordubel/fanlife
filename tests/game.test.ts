import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CONFIDENCE_FLOOR, archive, footballPeople } from '@/lib/game/archive'
import {
  LIVES,
  NEW_SESSION,
  RUN_LENGTH,
  advance,
  decodeSession,
  encodeSession,
  isStageBreak,
  multiplierFor,
  pointsFor,
  rankFor,
  secondsFor,
  stageOf,
} from '@/lib/game/session'
import { buildBoard } from '@/lib/game/memory'
import { dealFile, dealPairs, judge, judgePair, cardId } from '@/lib/game/blackfile'
import { dealQueue } from '@/lib/game/hate'
import {
  DUEL_COUNT,
  QUEUE_LENGTH,
  REVENGE_WINDOW,
  choose,
  damageOf,
  duelOf,
  judgeWall,
  over,
  readWallCode,
  recordKind,
  revenge,
  revengeChoices,
  startWall,
  streakOf,
  wallCode,
} from '@/lib/game/hate-run'
import {
  COLLARS,
  COLOUR_VAR,
  DEFAULT_SPEC,
  LAYERS,
  PATTERNS,
  SLEEVES,
  compareSpecs,
} from '@/lib/kit/spec'
import {
  MULTI_OPTION_COUNT,
  OPTION_COUNT,
  ROUND_LENGTH,
  auditRound,
  availableQuestionCount,
  deal,
  grade,
  roundDifficulties,
} from '@/lib/game/trivia'
import { verifiedKitSeasons } from '@/lib/game/kits'
import { dealKitChallenge, gradeKitChallenge, kitChallengeCount } from '@/lib/game/kitChallenge'
import { buildKitRound, gradeKit } from '@/lib/game/kitRun'
import { buildCrestRound, gradeCrest } from '@/lib/game/crestRun'
import {
  QUARTER_SLOTS,
  approvedCount,
  emptyBook,
  fileCorrection,
  punchToday,
  quarterGrid,
} from '@/lib/game/member'
import {
  seasonLabelOf,
  seasonStartYear,
  seasonsInSpell,
  spellCoversSeason,
} from '@/lib/game/seasons'
import {
  TIMELINE_LENGTH,
  boardAfter,
  dealTimelineRun,
  gradeInsert,
  timelinePoolSize,
} from '@/lib/game/timeline'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { dealRun, goalCount, goalRejections, gradeGoal } from '@/lib/game/goal'
import { fold, searchRoster } from '@/lib/game/roster-search'
import { GOALS_PER_RUN, gradeZone, reasonKey } from '@/lib/game/goal-zones'
import type { TruthTouch, UserTouch } from '@/lib/game/replay/envelope'
import {
  FORMATIONS,
  dealChallenge,
  freeBuildBank,
  gradeLineup,
  hasVerifiedLineup,
} from '@/lib/game/lineup'

describe('archive', () => {
  it('exposes only facts at or above the confidence floor', () => {
    const everything = [
      ...archive.clubs,
      ...archive.people,
      ...archive.matches,
      ...archive.matchEvents,
      ...archive.trophies,
      ...archive.kitSupply,
      ...archive.sponsorDeals,
      ...archive.crests,
    ]
    expect(everything.length).toBeGreaterThan(30)
    for (const row of everything) {
      expect(row.confidence).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR)
    }
  })

  it('gives every exposed fact a named source', () => {
    for (const row of [...archive.matches, ...archive.trophies, ...archive.kitSupply]) {
      expect(row.sourceTitle.length).toBeGreaterThan(0)
    }
  })
})

describe('trivia — the client never receives the answer', () => {
  it('deals a question with no correct-answer field on it', () => {
    const question = deal(1, 0)
    expect(question).not.toBeNull()
    expect(Object.keys(question ?? {})).not.toContain('correct')
    expect(JSON.stringify(question)).not.toContain('"correct"')
  })

  it('grades on the server from the seed, not from the payload', () => {
    const question = deal(1, 0)
    const verdict = grade(1, 0, question?.options[0] ?? '')
    expect(verdict).not.toBeNull()
    expect(question?.options).toEqual(expect.arrayContaining(verdict?.correctAnswers ?? []))
  })

  /**
   * **זו הייתה בדיקה על seed אחד, והיא הפסיקה להיות נכונה ברגע שהדיל זז** (21.9.2026).
   *
   * היא שאלה כמה אפשרויות מקבלות `correct === true` ודרשה אחת. אצל שאלת `multi`
   * (בוחרים שלוש) אף אפשרות בודדת אינה `correct` — היא `hits: 1` — ולכן התשובה היא
   * אפס, וזה לא באג: זו שאלה שלא מתאימה לצורה. `(5, 2)` פשוט חילק שאלת `single` עד
   * שנוספה שורת כדורסל אחת לארכיון והדיל זז.
   *
   * אותה מחלקה בדיוק כמו השכנה שלה מ-16.9.2026 (כלל 65): **המספר נקרא מהצורה ולא
   * מוקלד**, והבדיקה רצה על עשרים זרעים במקום על אחד. הגנה רחבה יותר, לא צרה יותר.
   */
  it('marks exactly as many options correct as the question asks for', () => {
    let seen = 0
    for (let seed = 1; seed <= 20; seed += 1) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (!question) continue
        seen += 1
        const hit = question.options.filter((option) => {
          const verdict = grade(seed, index, option)
          return question.kind === 'multi' ? (verdict?.hits ?? 0) > 0 : verdict?.correct === true
        })
        expect(hit, question.prompt).toHaveLength(question.pickCount)
      }
    }
    expect(seen, 'no question was dealt at all').toBeGreaterThan(0)
  })

  it('rejects a fabricated answer', () => {
    expect(grade(1, 0, 'לא-קיים')?.correct).toBe(false)
  })
  /**
   * **20% מהשאלות נשאו את התשובה בתוך ה-id** (21.9.2026). המפתח הטבעי נשלח לדפדפן:
   * `crest:2023`, `moment:מילאן-2002`, `trophy:גביע-הטוטו:2001/02`, ו-`number-era:` מנה את
   * שלושת השמות הנכונים. הבדיקה הקודמת חיפשה רק שדה בשם `"correct"`. זו סורקת 400 זרעים
   * על כל נושא שממלא ריצה, ובודקת את הדבר עצמו: אף תשובה נכונה אינה מופיעה ב-id, וה-id
   * הוא hash ולא מפתח.
   */
  it('never puts a right answer inside a dealt id — 400 seeds, every topic that fills a round', () => {
    const leaks: string[] = []
    let dealt = 0
    for (const topic of ['general', 'europe', 'numbers'] as const) {
      for (let seed = 1; seed <= 400; seed += 1) {
        for (let index = 0; index < ROUND_LENGTH; index += 1) {
          const question = deal(seed, index, topic)
          if (!question) continue
          dealt += 1
          expect(question.id).toMatch(/^q_[0-9a-f]{12}$/)
          const verdict = grade(seed, index, '__probe__', topic)
          // A bare number ("7", "2001") can occur inside ANY hex string by chance, so it is
          // covered by the shape check above: `q_` and twelve hex digits cannot spell a
          // name, a season or a club. Everything else is checked literally.
          for (const answer of verdict?.correctAnswers ?? []) {
            if (/^[0-9a-f]+$/.test(answer)) continue
            if (question.id.includes(answer)) leaks.push(`${topic}/${seed}/${index}: ${answer}`)
          }
          const natural = auditRound(seed, topic)[index]?.id ?? ''
          if (natural.length > 0 && question.id === natural) leaks.push(`${topic}/${seed}/${index}: raw key`)
        }
      }
    }
    expect(dealt).toBeGreaterThan(400 * ROUND_LENGTH)
    expect(leaks, leaks.slice(0, 10).join(' · ')).toEqual([])
  })
})

describe('trivia — question quality', () => {
  it('produces a full round from the archive', () => {
    expect(availableQuestionCount()).toBeGreaterThanOrEqual(ROUND_LENGTH)
    for (let index = 0; index < ROUND_LENGTH; index += 1) {
      expect(deal(3, index), `question ${index}`).not.toBeNull()
    }
  })

  it('is deterministic — the same seed deals the same round', () => {
    expect(deal(9, 4)).toEqual(deal(9, 4))
  })

  it('offers the right number of distinct options every time — both kinds', () => {
    // This used to check `=== OPTION_COUNT` on one seed, which quietly meant the
    // six-option `multi` questions were never checked at all: it passed only while seed
    // 11 happened to deal none. Now every kind is checked, on twenty seeds, and the
    // count is read off the kind rather than assumed.
    for (let seed = 1; seed <= 20; seed += 1) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (!question) continue
        expect(new Set(question.options).size, question.prompt).toBe(question.options.length)
        expect(question.options.length, question.prompt).toBe(
          question.kind === 'multi' ? MULTI_OPTION_COUNT : OPTION_COUNT,
        )
        // `deal` deliberately does not hand the answers to the client, so the most
        // this can check is that the two counts agree with the kind.
        expect(question.pickCount, question.prompt).toBe(question.kind === 'multi' ? 3 : 1)
      }
    }
  })

  it('always offers exactly as many distinct choices as its shape allows', () => {
    // A template that cannot field its distractors is dropped, never padded: an invented
    // option is a fact no source supports. `single` wants four, `multi` wants six — the
    // count is a property of the SHAPE, and an earlier version of this test hard-coded
    // four and only passed because no multi question happened to be dealt in these seeds.
    for (const seed of [1, 2, 3, 13, 29, 101]) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (!question) continue
        const want = question.kind === 'multi' ? 6 : 4
        expect(question.options.length, `${question.id}`).toBe(want)
        expect(new Set(question.options).size, `${question.id} repeats an option`).toBe(want)
        expect(question.pickCount, `${question.id}`).toBe(question.kind === 'multi' ? 3 : 1)
      }
    }
  })

  it('keeps the source off the client payload but on the record', () => {
    // Maor asked for source and confidence lines to come off the screen. The gate they
    // enforce is untouched — it just lives server-side now.
    for (let index = 0; index < ROUND_LENGTH; index += 1) {
      const question = deal(13, index)
      if (!question) continue
      expect(Object.keys(question)).not.toContain('source')
      expect(JSON.stringify(question)).not.toContain('ודאות')
    }

    const audit = auditRound(13)
    expect(audit.length).toBeGreaterThan(0)
    for (const row of audit) {
      expect(row.source.title.length, `${row.id}`).toBeGreaterThan(0)
      expect(row.source.confidence, `${row.id}`).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR)
    }
  })

  it('never asks the same question twice in one round', () => {
    const ids = Array.from({ length: ROUND_LENGTH }, (_, index) => deal(17, index)?.id)
    const present = ids.filter((id): id is string => Boolean(id))
    expect(new Set(present).size).toBe(present.length)
  })

  it('caps the Ussishkin question at one per round', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const templates = Array.from({ length: ROUND_LENGTH }, (_, index) =>
        deal(seed, index)?.template,
      ).filter((template) => template === 'ussishkin')
      expect(templates.length, `seed ${seed}`).toBeLessThanOrEqual(1)
    }
  })

  it('never uses the founder as a distractor — he appears only as the answer', () => {
    const FOUNDER = 'מאור הראל'
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (!question?.options.includes(FOUNDER)) continue
        // Present as an option means he must be the correct answer, never a decoy.
        expect(grade(seed, index, FOUNDER)?.correct, question.prompt).toBe(true)
      }
    }
  })

  it('keeps the whole Ussishkin family to one question per round', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const ussishkin = Array.from({ length: ROUND_LENGTH }, (_, index) =>
        deal(seed, index)?.template,
      ).filter((template) => template?.startsWith('ussishkin'))
      expect(ussishkin.length, `seed ${seed}`).toBeLessThanOrEqual(1)
    }
  })
})

describe('memory', () => {
  it('gives every card a category, so a pair is findable', () => {
    // Both faces of a pair are different values. Without the category on the card the
    // player cannot tell which four cards could possibly belong together, and turning
    // all twelve teaches them nothing — which is why no pair was ever formed.
    const board = buildBoard(7)
    for (const card of board) {
      expect(card.kind.length, card.face).toBeGreaterThan(0)
    }
    const byPair = new Map<string, string[]>()
    for (const card of board) byPair.set(card.pair, [...(byPair.get(card.pair) ?? []), card.kind])
    for (const [pair, kinds] of byPair) {
      expect(kinds.length, pair).toBe(2)
      expect(new Set(kinds).size, `${pair} shows two different categories`).toBe(1)
    }
  })

  it('never puts the same face on two cards', () => {
    for (const seed of [1, 7, 19, 42]) {
      const faces = buildBoard(seed).map((card) => card.face)
      expect(new Set(faces).size, `seed ${seed}`).toBe(faces.length)
    }
  })

  it('deals two cards for every pair', () => {
    const cards = buildBoard(7)
    const counts = new Map<string, number>()
    for (const card of cards) counts.set(card.pair, (counts.get(card.pair) ?? 0) + 1)
    for (const [pair, count] of counts) expect(count, pair).toBe(2)
  })

  it('never shows two cards with the same face', () => {
    const cards = buildBoard(7)
    expect(new Set(cards.map((card) => card.face)).size).toBe(cards.length)
  })

  it('is deterministic per seed and different across seeds', () => {
    expect(buildBoard(7)).toEqual(buildBoard(7))
    expect(buildBoard(7)).not.toEqual(buildBoard(8))
  })
})

describe('kits', () => {
  it('lists only seasons with a verified maker', () => {
    const seasons = verifiedKitSeasons()
    expect(seasons.length).toBeGreaterThan(5)
    for (const season of seasons) {
      expect(season.maker.length).toBeGreaterThan(0)
      expect(season.sourceTitle.length).toBeGreaterThan(0)
    }
  })

  it('leaves the seasons the archive does not cover out of the strip', () => {
    const seasons = verifiedKitSeasons().map((row) => row.season)
    expect(seasons).not.toContain('1981/82')
    expect(seasons).not.toContain('2003/04')
  })

  it('covers the seasons inside a supply spell, not only the season it starts in', () => {
    // Umbro ran 2006/07 to 2010/11. Matching sponsor to maker on the start label alone
    // hid every season in between — including the one Maor verified.
    const seasons = verifiedKitSeasons().map((row) => row.season)
    expect(seasons).toContain('2006/07')
    expect(seasons).toContain('2008/09')
    expect(seasons).toContain('2010/11')
  })

  it('carries both 2010/11 sponsors, each scoped to its competition', () => {
    const season = verifiedKitSeasons().find((row) => row.season === '2010/11')
    expect(season?.maker).toBe('אמברו')

    const scoped = (season?.sponsors ?? []).map((s) => `${s.name}|${s.competition ?? 'all'}`)
    expect(scoped).toContain('כתר|ליגת האלופות')
    expect(scoped).toContain('בוני התיכון|ליגת העל')
  })

  it('puts Subaru on the double-winning season', () => {
    const season = verifiedKitSeasons().find((row) => row.season === '2009/10')
    expect(season?.sponsors.map((s) => s.name)).toContain('סובארו')
  })
})

describe('season ranges', () => {
  it('reads and writes a season label, century wrap included', () => {
    expect(seasonStartYear('2010/11')).toBe(2010)
    expect(seasonStartYear('1999/00')).toBe(1999)
    expect(seasonStartYear(null)).toBeNull()
    expect(seasonStartYear('בערך 2010')).toBeNull()
    expect(seasonLabelOf(1999)).toBe('1999/00')
    expect(seasonLabelOf(2010)).toBe('2010/11')
  })

  it('treats an open spell as still running and a closed one as bounded', () => {
    const open = { fromLabel: '2024/25', toLabel: null }
    const closed = { fromLabel: '2006/07', toLabel: '2010/11' }

    expect(spellCoversSeason(open, '2026/27')).toBe(true)
    expect(spellCoversSeason(open, '2023/24')).toBe(false)
    expect(spellCoversSeason(closed, '2008/09')).toBe(true)
    expect(spellCoversSeason(closed, '2011/12')).toBe(false)

    expect(seasonsInSpell(closed, 2026)).toEqual([
      '2006/07',
      '2007/08',
      '2008/09',
      '2009/10',
      '2010/11',
    ])
    // An open spell is capped at the cap, never run to infinity.
    expect(seasonsInSpell(open, 2026).at(-1)).toBe('2026/27')
  })
})

describe('kit challenge', () => {
  it('deals a season and a bank, and never the answer', () => {
    const challenge = dealKitChallenge(11)
    expect(challenge).not.toBeNull()
    expect(challenge?.makers.length).toBeGreaterThan(2)
    expect(challenge?.sponsors.length).toBeGreaterThan(2)
    expect(JSON.stringify(challenge)).not.toContain('correct')
  })

  it('grades on the server and is stable for a seed', () => {
    const verdict = gradeKitChallenge(11, { maker: null, sponsor: null })
    expect(verdict).not.toBeNull()
    expect(verdict?.makerCorrect).toBe(false)

    const right = gradeKitChallenge(11, {
      maker: verdict?.maker ?? null,
      sponsor: verdict?.sponsor ?? null,
    })
    expect(right?.makerCorrect).toBe(true)
    expect(right?.sponsorCorrect).toBe(true)
    // Same seed, same target.
    expect(dealKitChallenge(11)?.challengeId).toBe(dealKitChallenge(11)?.challengeId)
  })

  it('asks about the competition-scoped 2010/11 pairs', () => {
    const ids = new Set<string>()
    for (let seed = 1; seed < 400; seed += 1) ids.add(dealKitChallenge(seed)?.challengeId ?? '')
    expect(ids).toContain('2010/11:ליגת-האלופות')
    expect(ids).toContain('2010/11:ליגת-העל')
  })

  it('never asks about a season where two sponsors are both true', () => {
    // Arkia ended early and Hachshara came in during 2019/20 — the archive holds both,
    // so the pair has no single answer and must not be a question.
    for (let seed = 1; seed < 400; seed += 1) {
      const challenge = dealKitChallenge(seed)
      expect(challenge?.challengeId).not.toBe('2019/20:all')
    }
    expect(kitChallengeCount()).toBeGreaterThan(5)
  })
})

describe('timeline', () => {
  it('deals a blind QUEUE — no date on any card the player still has to place', () => {
    const { queue } = dealTimelineRun(4)
    expect(queue).toHaveLength(TIMELINE_LENGTH)
    // Not just the `on` field: the ID must not carry it either. The natural keys are
    // built from dates, and shipping one inside an identifier hands the answer over.
    expect(JSON.stringify(queue)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(JSON.stringify(queue)).not.toMatch(/\b(1[89]|20)\d{2}\b/)
  })

  it('leaks no year in a card title or hint', () => {
    for (const seed of [1, 4, 6, 9]) {
      const { anchor, queue } = dealTimelineRun(seed)
      for (const card of [anchor, ...queue]) {
        expect(`${card.title} ${card.hint}`, card.title).not.toMatch(/\b(1[89]|20)\d{2}\b/)
      }
    }
  })

  it('deals a blind hand — the date of a card in hand never reaches the client', () => {
    const { anchor, queue } = dealTimelineRun(3)
    expect(queue).toHaveLength(TIMELINE_LENGTH)
    // the anchor is the ONE card that carries its date: there is nothing to place it
    // against, so it opens the board face up
    expect(anchor.on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(JSON.stringify(queue)).not.toContain('"on"')
  })

  it('draws on a pool far deeper than one run', () => {
    // A timeline mode whose pool is the length of a run deals the same ten cards to
    // everybody, which is a puzzle rather than a game.
    expect(timelinePoolSize()).toBeGreaterThan(60)
  })

  it('opens on a card from the MIDDLE of the run, not an end', () => {
    // Anchoring on the oldest or newest fact makes the first placements one-sided.
    for (const seed of [1, 2, 5, 8]) {
      const { anchor, queue } = dealTimelineRun(seed)
      const dates: string[] = [anchor.on]
      for (let index = 0; index < TIMELINE_LENGTH; index += 1) {
        const verdict = gradeInsert(seed, index, 0)
        if (verdict) dates.push(verdict.card.on)
      }
      const sorted = [...dates].sort()
      const rank = sorted.indexOf(anchor.on)
      expect(rank, `seed ${seed}`).toBeGreaterThan(0)
      expect(rank, `seed ${seed}`).toBeLessThan(dates.length - 1)
      expect(queue).toHaveLength(TIMELINE_LENGTH)
    }
  })

  it('grades the true slot as correct and any other slot as wrong', () => {
    for (let placed = 0; placed < TIMELINE_LENGTH; placed += 1) {
      const truth = gradeInsert(2, placed, -1)
      expect(truth).not.toBeNull()
      const position = truth?.position ?? 0
      expect(gradeInsert(2, placed, position)?.correct).toBe(true)
      const wrong = position === 0 ? 1 : position - 1
      expect(gradeInsert(2, placed, wrong)?.correct).toBe(false)
    }
  })

  it('keeps the board a true chronology however the player played', () => {
    // The card lands in its real place whether or not the guess was right, which is
    // what makes the board honest AND what makes it derivable from the seed alone.
    for (let placed = 1; placed <= TIMELINE_LENGTH; placed += 1) {
      const board = boardAfter(2, placed)
      expect(board).toHaveLength(placed + 1)
      const dates = board.map((card) => card.on)
      expect([...dates].sort()).toEqual(dates)
      expect(new Set(dates).size).toBe(dates.length)
    }
  })

  it('reveals the played card with its date, and reports when the run is over', () => {
    const mid = gradeInsert(2, 0, 0)
    expect(mid?.card.on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(mid?.done).toBe(false)
    expect(gradeInsert(2, TIMELINE_LENGTH - 1, 0)?.done).toBe(true)
    expect(gradeInsert(2, TIMELINE_LENGTH, 0)).toBeNull()
  })

  it('never puts two cards from the same date in one run', () => {
    const board = boardAfter(6, TIMELINE_LENGTH)
    expect(new Set(board.map((card) => card.on)).size).toBe(board.length)
  })
})

describe('lineup', () => {
  it('keeps every slot inside the pitch on the narrowest screen', () => {
    for (const formation of Object.values(FORMATIONS)) {
      for (const slot of formation.slots) {
        // chip is 22% wide, centred — so its centre must stay 11% off each touchline
        expect(slot.x, `${formation.name} ${slot.slotId}`).toBeGreaterThanOrEqual(11)
        expect(slot.x, `${formation.name} ${slot.slotId}`).toBeLessThanOrEqual(89)
      }
    }
  })

  it('gives every formation eleven slots with unique ids', () => {
    for (const formation of Object.values(FORMATIONS)) {
      expect(formation.slots, formation.name).toHaveLength(11)
      expect(new Set(formation.slots.map((slot) => slot.slotId)).size).toBe(11)
    }
  })

  it('never offers a basketball name on a football pitch', () => {
    const names = freeBuildBank().map((locker) => locker.nameHe)
    expect(names).not.toContain('מאור הראל')
    expect(names).not.toContain('אורי שלף')
    // only players a source actually names reach the bank
    expect(names.length).toBeGreaterThanOrEqual(4)
  })

  it('never invents an XI — every record traces to a source', () => {
    const challenge = dealChallenge(2)
    expect(challenge?.sourceUrl).toContain('red-fans')
  })
})

describe('רוחב מאגר השאלות', () => {
  /**
   * ידע זה כוח — so the bank has to be wide enough that a player meets a new question
   * rather than the same forty. This walks a long stretch of seeds and counts DISTINCT
   * question ids, which is the number that matters: one prompt asked of twenty
   * different goals is twenty questions, not one.
   *
   * The floor is a ratchet. A template that stops producing, or data that quietly
   * shrinks, fails here instead of being noticed by a player.
   */
  const ids = new Set<string>()
  const templates = new Set<string>()
  for (let seed = 1; seed < 300; seed += 1) {
    for (let index = 0; index < ROUND_LENGTH; index += 1) {
      const question = deal(seed, index)
      if (!question) continue
      ids.add(question.id)
      templates.add(question.template)
    }
  }

  it('holds hundreds of distinct questions, not dozens', () => {
    expect(ids.size).toBeGreaterThan(450)
  })

  it('draws on the whole archive — kits, goals, enemies, crossings included', () => {
    expect(templates.size).toBeGreaterThan(30)
    for (const template of [
      'goal-scorer',
      'goal-opponent',
      'goal-assist',
      'kit-look',
      'kit-sponsor-season',
      'kit-maker-season',
      'crossing-club',
      'enemy-fact',
    ]) {
      expect(templates.has(template), template).toBe(true)
    }
  })

  it('never lets a basketball name onto the football bank', () => {
    // The enemies table is deliberately cross-sport; the wall is the `sport` FIELD.
    const basketballOnly = archive.enemies
      .filter((row) => row.sport === 'basketball')
      .map((row) => row.nameHe)
    const football = new Set(
      archive.enemies.filter((row) => row.sport === 'football').map((row) => row.nameHe),
    )
    for (let seed = 1; seed < 120; seed += 1) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (question?.template !== 'enemy-fact') continue
        for (const option of question.options) {
          expect(basketballOnly.includes(option) && !football.has(option), option).toBe(false)
        }
      }
    }
  })

  it('asks a goal question from the report, and never from an invented one', () => {
    let seen = 0
    for (let seed = 1; seed < 200 && seen < 8; seed += 1) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        // `goal-year` names the goal in its prompt and asks WHEN — it carries no report
        if (!question?.template.startsWith('goal-') || question.template === 'goal-year') continue
        seen += 1
        // the clue is the reporter's own sentence; the ANSWER never travels with it
        expect(question.quoteHe?.length ?? 0).toBeGreaterThan(20)
        expect(JSON.stringify(question)).not.toContain('"correct"')
        expect(question.options).toHaveLength(4)
        // and the server can still name it from the seed alone
        const verdict = grade(seed, index, [question.options[0] as string])
        expect(verdict?.correctAnswers?.[0]).toBeDefined()
        expect(question.options).toContain(verdict?.correctAnswers?.[0])
        expect(verdict?.explanation.length ?? 0).toBeGreaterThan(4)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})

describe('חיפוש שחקנים — the roster sheet', () => {
  const roster = rosterIndex()

  it('holds the whole roster, split into given and family names', () => {
    expect(roster.total).toBeGreaterThan(600)
    for (const entry of roster.all) {
      expect(entry.familyHe.length, entry.nameHe).toBeGreaterThan(0)
      expect(entry.initial.length, entry.nameHe).toBe(1)
    }
  })

  it('buckets by the FAMILY initial, which is how a supporter looks a player up', () => {
    const boaz = roster.all.find((entry) => entry.nameHe.includes('בוזגלו'))
    if (boaz) {
      expect(boaz.familyHe).toBe('בוזגלו')
      expect(boaz.initial).toBe('ב')
    }
    for (const bucket of roster.letters) {
      expect(bucket.names.every((entry) => entry.initial === bucket.letter)).toBe(true)
    }
    expect(roster.letters.reduce((sum, bucket) => sum + bucket.names.length, 0)).toBe(roster.total)
  })

  it('ranks a family-name match above a given-name match above anything else', () => {
    const entries = [
      { slug: 'a', nameHe: 'דן כהן', givenHe: 'דן', familyHe: 'כהן', initial: 'כ' },
      { slug: 'b', nameHe: 'כהן לוי', givenHe: 'כהן', familyHe: 'לוי', initial: 'ל' },
      { slug: 'c', nameHe: 'אבי מזרחי־כהנא', givenHe: 'אבי', familyHe: 'מזרחי־כהנא', initial: 'מ' },
    ]
    const found = searchRoster(entries, 'כהן')
    expect(found[0]?.slug).toBe('a')
    expect(found[1]?.slug).toBe('b')
  })

  it('folds final letters and quote marks, because Hebrew types back at you', () => {
    // a medial mem where the name carries a final one, and an apostrophe for a geresh
    expect(fold('אמסלם')).toBe(fold('אמסלמ'))
    expect(fold("צ'רני")).toBe(fold('צרני'))
    expect(fold('  שתי   מילים ')).toBe('שתי מילימ')
    const entries = [{ slug: 'a', nameHe: 'שמעון אמסלם', givenHe: 'שמעון', familyHe: 'אמסלם', initial: 'א' }]
    expect(searchRoster(entries, 'אמסלמ')).toHaveLength(1)
    expect(searchRoster(entries, 'אמסל')).toHaveLength(1)
  })

  it('returns everything for an empty term and nothing for a term nobody matches', () => {
    expect(searchRoster(roster.all, '')).toHaveLength(roster.total)
    expect(searchRoster(roster.all, 'זזזזזז')).toHaveLength(0)
  })

  it('actually finds real players by family name alone', () => {
    for (const family of ['אבוקסיס', 'זהבי', 'טועמה']) {
      const found = searchRoster(roster.all, family)
      expect(found.length, family).toBeGreaterThan(0)
      expect(found[0]?.familyHe, family).toContain(family)
    }
  })
})

describe('שחזור השער — gate 8', () => {
  /**
   * Five of the tests in this block used to describe a different game, and they are
   * rewritten rather than deleted (rule 68): the gate no longer hands the player the
   * cast, the verbs and the order and ask only where. Every guarantee they held is still
   * held here or, in more detail, in `tests/replay.test.ts` — the hold-back got STRICTER,
   * not looser, because the touch list itself is now part of the answer.
   */

  const perfect = (verdict: { truth: TruthTouch[] } | null): UserTouch[] =>
    (verdict?.truth ?? []).map((touch) => ({
      actorHe: touch.actorHe,
      action: touch.action,
      origin: { x: touch.origin.x, y: touch.origin.y },
      target: { x: touch.target.x, y: touch.target.y },
    }))

  it('carries a real archive, not one goal', () => {
    // The old board dealt the single record it had. A game whose whole content is one
    // move is a demo; the run needs three and the archive needs to be deeper than a run.
    expect(goalCount()).toBeGreaterThanOrEqual(12)
    // and every record in it can be read into geometry, or it says why not
    expect(goalRejections()).toEqual([])
  })

  it('deals three different goals a run, shortest move first', () => {
    const run = dealRun(1)
    expect(run).toHaveLength(GOALS_PER_RUN)
    expect(new Set(run.map((goal) => goal.goalId)).size).toBe(GOALS_PER_RUN)
    // the ramp is real but it is no longer VISIBLE: the count only exists on the server,
    // so the ordering is read back through the graded truth rather than off the deal.
    const lengths = run.map((_, index) => (gradeGoal(1, index, [])?.truth ?? []).length)
    expect([...lengths].sort((a, b) => a - b)).toEqual(lengths)
  })

  it('deals the fixture and a pool of names, and holds back everything else', () => {
    const payload = JSON.stringify(dealRun(1))
    // the old deal shipped one row per touch, which handed over the move's whole
    // skeleton: how many, by whom, doing what, in what order
    for (const secret of ['"zone"', 'noteHe', 'narrativeHe', 'positionHe', 'actorHe', '"steps"']) {
      expect(payload, secret).not.toContain(secret)
    }
    expect(payload).toContain('pool')
    expect(payload).toContain('approximateCoords')
  })

  it('grades an exact rebuild at a hundred and a scrambled one far below it', () => {
    const truth = perfect(gradeGoal(1, 0, []))
    expect(truth.length).toBeGreaterThan(1)

    const exact = gradeGoal(1, 0, truth)
    expect(exact?.metrics.overall).toBe(100)
    expect(exact?.touches.every((line) => line.kind === 'matched')).toBe(true)

    // the same touches in the wrong order, each ball sent across the pitch
    const scrambled = [...truth].reverse().map((touch) => ({
      ...touch,
      target: { x: 1 - touch.target.x, y: 1 - touch.target.y },
    }))
    const bad = gradeGoal(1, 0, scrambled)
    expect(bad?.metrics.overall).toBeLessThan(50)
  })

  it('calls one zone out a NEAR, not a miss — and says which half was right', () => {
    // The zone grid is still how the reporter's words were READ into geometry, and the
    // envelopes are anchored on it. Its own grading stays exactly as it was.
    expect(gradeZone('C2', 'C2')).toBe('hit')
    expect(gradeZone('B2', 'C2')).toBe('near')
    expect(gradeZone('B1', 'C2')).toBe('near')
    expect(gradeZone('E4', 'A1')).toBe('miss')
    expect(gradeZone(undefined, 'C2')).toBe('miss')
    expect(reasonKey('B2', 'C2')).toBe('goal.reason.depthRight')
    expect(reasonKey('C3', 'C2')).toBe('goal.reason.sideRight')
    expect(reasonKey('E4', 'A1')).toBe('goal.reason.far')
  })

  it('holds the whole move back until the player has committed, then hands all of it over', () => {
    const empty = gradeGoal(1, 0, [])
    expect(empty?.metrics.overall).toBe(0)
    expect(empty?.metrics.missing).toBe(empty?.truth.length)
    expect(empty?.narrativeHe.length).toBeGreaterThan(20)
    // the reveal's whole job is to show what the archive knows AND how wide it is
    for (const touch of empty?.truth ?? []) {
      expect(touch.origin.rx).toBeGreaterThan(0)
      expect(touch.origin.ry).toBeGreaterThan(0)
      expect(touch.positionHe.length).toBeGreaterThan(2)
    }
  })

  it('never fabricates: every goal declares its source and its approximation', () => {
    for (let index = 0; index < GOALS_PER_RUN; index += 1) {
      const verdict = gradeGoal(1, index, [])
      expect(verdict?.sourceTitle.length, String(index)).toBeGreaterThan(4)
      expect(verdict?.narrativeHe.length, String(index)).toBeGreaterThan(20)
    }
    for (const goal of dealRun(1)) {
      expect(goal.approximateCoords).toBe(true)
      expect(goal.pool.length).toBeGreaterThanOrEqual(6)
    }
  })

  it('returns null for a goal index the run does not hold', () => {
    expect(gradeGoal(1, 99, [])).toBeNull()
  })
})

describe('the verified Chelsea XI', () => {
  // Gate 3 V3 (21.9.2026): four bands, graded by line — see tests/lineup.test.ts for the rest.
  let seed = 1
  while (seed < 400 && dealChallenge(seed)?.matchId !== 'm_67a2f41af253') seed += 1

  it('turns the lineup game on', () => {
    expect(hasVerifiedLineup()).toBe(true)
    const challenge = dealChallenge(seed)
    expect(challenge?.matchId).toBe('m_67a2f41af253')
    expect(challenge?.bank.length).toBeGreaterThanOrEqual(11)
  })

  it('grades a correct XI as eleven exact', () => {
    const solution = gradeLineup(seed, [])?.solution ?? []
    expect(solution).toHaveLength(11)
    const board = solution.map((man, order) => ({ playerId: man.playerId, line: man.line, order }))
    expect(gradeLineup(seed, board)?.exact).toBe(11)
  })

  it('marks a squad man as not in the XI', () => {
    const rahmin = (dealChallenge(seed)?.bank ?? []).find((locker) => locker.nameHe === 'ניר רחמין')
    expect(rahmin).toBeTruthy()
    const verdict = gradeLineup(seed, [{ playerId: rahmin!.id, line: 'GK', order: 0 }])
    expect(verdict?.rows[0]?.status).toBe('not_in_xi')
  })

  it('marks a keeper played outfield as the wrong line', () => {
    const keeper = (dealChallenge(seed)?.bank ?? []).find((locker) => locker.nameHe === 'שביט אלימלך')
    expect(keeper, 'no dealt XI contains the keeper').toBeTruthy()
    const verdict = gradeLineup(seed, [{ playerId: keeper!.id, line: 'F', order: 0 }])
    expect(verdict?.rows[0]?.status).toBe('wrong_line')
  })
})

describe('the run — difficulty, streak and rank', () => {
  it('ramps a round from easy to hard', () => {
    for (const seed of [1, 5, 23]) {
      const ladder = roundDifficulties(seed)
      expect(ladder.length).toBe(ROUND_LENGTH)
      // Non-decreasing: a round opens on what a casual fan knows and closes on what
      // only the archive knows.
      for (let index = 1; index < ladder.length; index += 1) {
        expect(ladder[index], `seed ${seed} step ${index}`).toBeGreaterThanOrEqual(
          ladder[index - 1] as number,
        )
      }
      expect(new Set(ladder).size, `seed ${seed} is all one difficulty`).toBeGreaterThan(1)
    }
  })

  it('pays more for a longer combo, and pays for speed', () => {
    // same question, same clock, different combo
    expect(pointsFor(3, 1, 10, 20)).toBeLessThan(pointsFor(3, 3, 10, 20))
    // same question, same combo, answered faster
    expect(pointsFor(3, 2, 4, 20)).toBeLessThan(pointsFor(3, 2, 18, 20))
    // the multiplier caps, so one hot run cannot run away with the board
    expect(multiplierFor(40)).toBe(multiplierFor(4))
  })

  it('costs a lamp for a miss and ends the run at zero', () => {
    let session = NEW_SESSION
    for (let i = 0; i < LIVES; i += 1) {
      expect(session.over).toBe(false)
      session = advance(session, { correct: false, difficulty: 3, secondsLeft: 5, total: 20 })
    }
    expect(session.lives).toBe(0)
    expect(session.over).toBe(true)
    expect(session.score).toBe(0)
  })

  it('breaks the combo on a miss but keeps the best', () => {
    let session = NEW_SESSION
    for (let i = 0; i < 3; i += 1) {
      session = advance(session, { correct: true, difficulty: 2, secondsLeft: 10, total: 20 })
    }
    expect(session.combo).toBe(3)
    session = advance(session, { correct: false, difficulty: 4, secondsLeft: 2, total: 20 })
    expect(session.combo).toBe(0)
    expect(session.bestCombo).toBe(3)
    expect(session.correct).toBe(3)
  })

  it('climbs the stages and tightens the clock as it goes', () => {
    expect(stageOf(0)).toBe(0)
    expect(stageOf(RUN_LENGTH - 1)).toBe(2)
    expect(secondsFor(0)).toBeGreaterThan(secondsFor(RUN_LENGTH - 1))
    // the card shows at the head of stages 2 and 3, and nowhere else
    const breaks = Array.from({ length: RUN_LENGTH }, (_, i) => i).filter(isStageBreak)
    expect(breaks).toHaveLength(2)
    expect(breaks).not.toContain(0)
  })

  it('ends a clean run without ending it early', () => {
    let session = NEW_SESSION
    for (let i = 0; i < RUN_LENGTH; i += 1) {
      expect(session.over, `ended early at ${i}`).toBe(false)
      session = advance(session, { correct: true, difficulty: 3, secondsLeft: 12, total: 20 })
    }
    expect(session.over).toBe(true)
    expect(session.lives).toBe(LIVES)
    expect(session.correct).toBe(RUN_LENGTH)
    expect(rankFor(session.score)).toBe('run.rank.capo')
    expect(rankFor(0)).toBe('run.rank.new')
  })

  it('round-trips a run through the URL', () => {
    const session = { ...NEW_SESSION, score: 4100, correct: 11, bestCombo: 6, lives: 2 }
    const back = decodeSession(encodeSession(session, 12))
    expect(back?.seed).toBe(12)
    expect(back?.score).toBe(4100)
    expect(back?.bestCombo).toBe(6)
    // Junk decodes to nothing rather than to a fabricated score.
    expect(decodeSession('')).toBeNull()
    expect(decodeSession('1.2.3')).toBeNull()
    expect(decodeSession('a.b.c.d.e')).toBeNull()
  })

  it('keeps the round length and the run length the same number', () => {
    // A round that does not divide into stages cannot escalate.
    expect(ROUND_LENGTH).toBe(RUN_LENGTH)
  })
})

describe('the all-time roster', () => {
  it('holds every player the list names, football only', () => {
    // 637 names went in. They exist so a player question draws its distractors from
    // people who actually wore the shirt.
    expect(footballPeople.length).toBeGreaterThan(600)
  })

  it('keeps two players of the same name apart', () => {
    const names = archive.people.map((person) => person.fullNameHe)
    expect(names).toContain('עומר פרץ (חלוץ)')
    expect(names).toContain('עומר פרץ (קשר)')
    expect(new Set(names).size).toBe(names.length)
  })

  it('never lets an Ussishkin name into a football distractor pool', () => {
    const football = new Set(footballPeople.map((person) => person.fullNameHe))
    for (const candidate of archive.electionCandidates) {
      expect(football.has(candidate.personNameHe), candidate.personNameHe).toBe(false)
    }
  })
})

describe('the research-master corpus', () => {
  it('holds the shirt-number archive with the season always attached', () => {
    expect(archive.shirtNumbers.length).toBeGreaterThan(70)
    for (const row of archive.shirtNumbers) {
      expect(row.seasonLabel).toMatch(/^\d{4}\/\d{2}$/)
      expect(row.shirtNumber).toBeGreaterThan(0)
    }
  })

  it('never asks about a shirt two players wore in one season', () => {
    // 1984/85 had both שבתאי לוי and דב רמלר in 11 — a real mid-season fact and a
    // broken question.
    // The dealt id is opaque (rule 4), so the natural key is read from the server-side
    // audit, which is what the question was built from.
    const asked = new Set<string>()
    for (let seed = 1; seed < 200; seed += 1) {
      const audit = auditRound(seed)
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (question?.template === 'shirt-number') asked.add(audit[index]?.id ?? '')
      }
    }
    expect(asked.has('shirt:11:1984/85')).toBe(false)
    expect(asked.size).toBeGreaterThan(5)
  })

  it('keeps a bare-year sponsor label out of any season-phrased question', () => {
    // "1998" is not a season. Every row that carries a bare year says so, and the
    // question it feeds is phrased "בשנת", never "בעונת".
    const bare = archive.sponsorYears.filter((row) => row.seasonAmbiguous)
    expect(bare.length).toBeGreaterThan(15)
    for (const row of bare) expect(row.yearLabelRaw).not.toContain('/')

    for (let seed = 1; seed < 120; seed += 1) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (question?.template !== 'sponsor-year') continue
        expect(question.prompt).toContain('בשנת')
        expect(question.prompt).not.toContain('בעונת')
      }
    }
  })

  it('never asks about a gate the source disputes', () => {
    // Parma at home: the page says 16,300 and the article text says 17,500.
    const disputed = archive.matches.filter((row) => row.attendanceDisputed)
    expect(disputed.length).toBeGreaterThan(0)
    for (let seed = 1; seed < 150; seed += 1) {
      const audit = auditRound(seed)
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (question?.template !== 'attendance') continue
        expect(audit[index]?.id).not.toContain('שמינית גמר משחק 1')
      }
    }
  })

  it('plays four historic XIs and withholds the one the source cannot verify', () => {
    expect(hasVerifiedLineup()).toBe(true)
    const ids = new Set<string>()
    for (let seed = 1; seed < 200; seed += 1) ids.add(dealChallenge(seed)?.matchId ?? '')
    // The deal speaks canonical match ids since 21.9.2026 (Gate 3 V3).
    expect(ids).toContain('m_b88bc98d09db') // Milan, 14.3.2002
    expect(ids).toContain('m_7b61fac81ad6') // Salzburg, leg 2
    // The source stamps VERIFY on one slot of the Stamford Bridge eleven.
    expect(ids).not.toContain('m_73bc1426d0e3')
  })

  it('separates songs by type and keeps unverified terrace titles below the floor', () => {
    const types = new Set(archive.songs.map((row) => row.songType))
    expect(types).toContain('player_song')
    expect(types).toContain('terrace_song')
    // A title with no melody and no season is archive material, not a question.
    for (const row of archive.songs) {
      if (row.songType === 'player_song') expect(row.personNameHe).toBeTruthy()
    }
  })
})

describe('התיק השחור — gate 11', () => {
  it('grades a crossing as crossed and a myth as not', () => {
    // The two myth rows exist because the belief is widespread and the record is not.
    expect(judge(cardId('vermouth-2015'), 'crossed')?.correct).toBe(true)
    expect(judge(cardId('vermouth-2015'), 'did_not')?.correct).toBe(false)
    expect(judge(cardId('gershon-beitar'), 'did_not')?.correct).toBe(true)
    expect(judge(cardId('zahavi-palermo'), 'did_not')?.correct).toBe(true)
    // Gershon went to Beitar, not Maccabi — the card says so.
    expect(judge(cardId('gershon-beitar'), 'did_not')?.toClubHe).toBe('בית"ר ירושלים')
  })

  it('never puts the answer in the dealt payload', () => {
    const dealt = dealFile(11)
    expect(dealt.length).toBeGreaterThan(3)
    expect(JSON.stringify(dealt)).not.toContain('crossed')
    expect(JSON.stringify(dealt)).not.toContain('did_not')
    // …and neither does the thing the verdict is DERIVED from. `kind` shipped on every
    // card until 17.9.2026 and `judge()` reads it as the answer, so the payload carried
    // the verdict in a field the screen never used.
    expect(JSON.stringify(dealt)).not.toContain('"kind"')
    expect(JSON.stringify(dealt)).not.toContain('myth')
    // Nor does any slug: the file's own slugs carry years, and the second half of the
    // round asks which came first.
    for (const card of dealt) {
      expect(card.id, card.id).toMatch(/^[0-9a-f]{12}$/)
      expect(JSON.stringify(card)).not.toMatch(/\b(19|20)\d{2}\b/)
    }
  })

  it('orders two dated events by their real dates', () => {
    const pairs = dealPairs(11)
    expect(pairs.length).toBeGreaterThan(2)
    for (const pair of pairs) {
      // The pair used to be graded on its slugs. They carried the years
      // (`liquidation-2017`), which is the answer to "which came first", so the cards
      // now travel as opaque ids and the grader takes both of them (17.9.2026).
      const verdict = judgePair(pair.aId, pair.bId, pair.aId)
      expect(verdict).not.toBeNull()
      const first = verdict?.firstId
      expect([pair.aId, pair.bId]).toContain(first)
      // The earlier date really is earlier.
      const [a, b] = [verdict?.aDate as string, verdict?.bDate as string]
      expect(first === pair.aId ? a <= b : b <= a).toBe(true)
    }
  })

  it('keeps the basketball figures out of the football file', () => {
    // Two of the names Maor listed have no documented connection to the football club:
    // rule 14 is what keeps them out, not editorial taste.
    const names = archive.grievances
      .map((row) => `${row.personNameHe ?? ''} ${row.titleHe} ${row.bodyHe}`)
      .join(' ')
    expect(names).not.toContain('עופר ינאי')
    expect(names).not.toContain('שאול אייזנברג')
  })

  it('carries a source on every card in the file', () => {
    for (const row of archive.grievances) {
      expect(row.sourceTitle.length, row.slug).toBeGreaterThan(0)
      expect(row.confidence, row.slug).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR)
    }
  })

  it('the total on screen always equals what a seed actually deals (verified bug fix)', () => {
    // `lib/game/blackfile.ts` used to declare `ROUND_SIZE = 8`. The archive holds three
    // `crossing` rows and two `myth` rows — five transfer cards — plus nine dated
    // `event` rows, which `dealPairs()` turns into four pairs (nine of them paired up,
    // one left over). That is NINE questions, not eight: `derby.of` printed "8" while
    // the ninth question was still being asked, and the Done screen could print "9 / 8"
    // — a number that was not true (rule 11/15). The fix removed the constant;
    // app/derby/file/page.tsx now sums `dealFile(seed).length + dealPairs(seed).length`
    // itself. This proves that sum can never drift from what the archive actually
    // holds, swept across the seed space the way tests/timeline.test.ts sweeps 300.
    const expectedCards = archive.grievances.filter(
      (row) => row.kind === 'crossing' || row.kind === 'myth',
    ).length
    const expectedEvents = archive.grievances.filter(
      (row) => row.kind === 'event' && row.happenedOn !== null,
    ).length
    for (let seed = 1; seed <= 300; seed += 1) {
      const cards = dealFile(seed)
      const pairs = dealPairs(seed)
      // The transfer half is the whole archive, dealt whole, every seed — it only
      // reorders, it never shrinks.
      expect(cards.length, `seed ${seed}`).toBe(expectedCards)
      // The pair half pairs up events two at a time and stops at its own cap; it can
      // never invent a pair the archive's dated events do not support.
      expect(pairs.length, `seed ${seed}`).toBeLessThanOrEqual(Math.floor(expectedEvents / 2))
      expect(pairs.length, `seed ${seed}`).toBeGreaterThan(0)
      // This is exactly what page.tsx now hands <BlackFile total=…> and what the header
      // ("X מתוך total") and the Done screen both read back — never a declared constant.
      const total = cards.length + pairs.length
      expect(total, `seed ${seed}`).toBe(cards.length + pairs.length)
      expect(Number.isInteger(total), `seed ${seed}`).toBe(true)
    }
  })
})

describe('הקיר השחור — gate 11 v3', () => {
  const rank = new Map(archive.enemies.map((row) => [row.slug, row.terraceRank]))

  it('deals ten names — one on the wall, eight challengers and a spare', () => {
    const { enemies, order } = dealQueue(11)
    expect(DUEL_COUNT).toBe(8)
    expect(order).toHaveLength(QUEUE_LENGTH)
    expect(QUEUE_LENGTH).toBe(DUEL_COUNT + 2)
    expect(enemies).toHaveLength(QUEUE_LENGTH)
    expect(new Set(order).size).toBe(QUEUE_LENGTH)
  })

  it('deals rounds 4 and 7 from the top twelve of Maor\'s ranking, and flags them', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const { order, noMercy } = dealQueue(seed)
      expect(noMercy, `seed ${seed}`).toEqual([order[4], order[7]])
      for (const slug of noMercy) expect(rank.get(slug), `seed ${seed} ${slug}`).toBeLessThanOrEqual(12)
      // and nobody from the top twelve takes an ordinary place
      order.forEach((slug, index) => {
        if (index !== 4 && index !== 7) expect(rank.get(slug), `seed ${seed} #${index}`).toBeGreaterThan(12)
      })
    }
  })

  it('alternates the ordinary places between the upper and the lower half of the rest', () => {
    const rest = [...archive.enemies].sort((a, b) => a.terraceRank - b.terraceRank).slice(12)
    const upper = new Set(rest.slice(0, Math.ceil(rest.length / 2)).map((row) => row.slug))
    for (const seed of [1, 7, 11, 42, 99]) {
      const ordinary = dealQueue(seed).order.filter((_, index) => index !== 4 && index !== 7)
      ordinary.forEach((slug, index) => expect(upper.has(slug), `seed ${seed} #${index} ${slug}`).toBe(index % 2 === 0))
    }
  })

  it('draws a different wall for different seeds — fifty-six names is not one run', () => {
    const runs = [1, 2, 3, 4, 5].map((seed) => [...dealQueue(seed).order].sort().join(','))
    expect(new Set(runs).size).toBeGreaterThan(3)
  })

  it('is a wall: the one you keep stays up, the other is torn down, eight rounds and done', () => {
    const { order, noMercy } = dealQueue(11)
    let wall = startWall(order, noMercy)
    expect(duelOf(wall)).toMatchObject({ round: 1, holder: order[0], challenger: order[1] })
    wall = choose(wall, order[1] as string)
    expect(duelOf(wall)).toMatchObject({ round: 2, holder: order[1], challenger: order[2] })
    expect(wall.out).toEqual([order[0]])
    for (let index = 1; index < DUEL_COUNT; index += 1) wall = choose(wall, duelOf(wall)?.holder as string)
    expect(over(wall)).toBe(true)
    expect(duelOf(wall)).toBeNull()
    expect(wall.picks).toHaveLength(DUEL_COUNT)
    // the challenger kept in round 1 held every round after it: all eight are his
    expect(streakOf(wall)).toBe(DUEL_COUNT)
    expect(damageOf(streakOf(wall))).toBe(5)
    // a pick that is neither name on the wall changes nothing
    expect(choose(startWall(order), 'nobody')).toEqual(startWall(order))
  })

  it('flags the no-mercy round and puts its pick in the DNA', () => {
    const { enemies, order, noMercy } = dealQueue(11)
    let wall = startWall(order, noMercy)
    for (let index = 0; index < DUEL_COUNT; index += 1) {
      const duel = duelOf(wall)!
      expect(duel.noMercy, `round ${duel.round}`).toBe(duel.round === 4 || duel.round === 7)
      wall = choose(wall, duel.challenger)
    }
    const verdict = judgeWall(enemies, wall, 11)!
    expect(verdict.noMercyPick?.winner.slug).toBe(order[4])
  })

  it('allows one revenge, from the last six, and the displaced challenger comes straight back', () => {
    const { order, noMercy } = dealQueue(21)
    let wall = startWall(order, noMercy)
    for (let index = 0; index < 3; index += 1) wall = choose(wall, duelOf(wall)!.holder)
    const torn = wall.out[wall.out.length - 1] as string
    const displaced = duelOf(wall)!.challenger
    expect(revengeChoices(wall)).toContain(torn)
    wall = revenge(wall, torn)
    expect(duelOf(wall)?.challenger).toBe(torn)
    expect(wall.revengeUsed).toBe(true)
    // once only
    expect(revengeChoices(wall)).toEqual([])
    expect(revenge(wall, wall.out[0] as string)).toEqual(wall)
    // the one he displaced is next, not lost
    wall = choose(wall, duelOf(wall)!.holder)
    expect(duelOf(wall)?.challenger).toBe(displaced)
    expect(wall.picks.find((pick) => pick.revenge)?.loser).toBe(torn)
  })

  it('never reaches back further than six', () => {
    const { order, noMercy } = dealQueue(5)
    let wall = startWall(order, noMercy)
    for (let index = 0; index < 7; index += 1) wall = choose(wall, duelOf(wall)!.holder)
    expect(revengeChoices(wall)).toHaveLength(REVENGE_WINDOW)
    expect(revengeChoices(wall)).not.toContain(wall.out[0])
  })

  it('prints the same DNA for the same wall and the same picks — and a different one otherwise', () => {
    const play = (seed: number, keepHolder: boolean) => {
      const { enemies, order, noMercy } = dealQueue(seed)
      let wall = startWall(order, noMercy)
      for (let index = 0; index < DUEL_COUNT; index += 1) {
        const duel = duelOf(wall)!
        wall = choose(wall, keepHolder ? duel.holder : duel.challenger)
      }
      return judgeWall(enemies, wall, seed)!
    }
    expect(play(33, true).code).toBe(play(33, true).code)
    expect(play(33, true).code).not.toBe(play(33, false).code)
    expect(play(33, true).code).toMatch(/^WALL-[0-9A-Z]+-[0-9A-Z]{5}$/)
    // the address half plays the wall back
    expect(readWallCode(play(33, true).code)).toEqual({ seed: 33, cursor: 0 })
    expect(readWallCode(wallCode(4242, 3, [], null))).toEqual({ seed: 4242, cursor: 3 })
    expect(readWallCode('wall-abc')).toEqual({ seed: parseInt('ABC', 36), cursor: 0 })
    expect(readWallCode('not a code')).toBeNull()
  })

  it('names the terrace\'s pick as one line — the highest-ranked name the wall showed', () => {
    const { enemies, order, noMercy } = dealQueue(8)
    let wall = startWall(order, noMercy)
    for (let index = 0; index < DUEL_COUNT; index += 1) wall = choose(wall, duelOf(wall)!.holder)
    const verdict = judgeWall(enemies, wall, 8)!
    const shown = wall.picks.flatMap((pick) => [pick.winner, pick.loser])
    const best = Math.min(...shown.map((slug) => rank.get(slug) ?? 99))
    expect(verdict.terracePick.terraceRank).toBe(best)
    expect(verdict.firstOut?.slug).toBe(wall.picks[0]?.loser)
  })

  it("carries Maor's ranking verbatim, 1..56, across both sports", () => {
    const ranks = archive.enemies.map((row) => row.terraceRank).sort((a, b) => a - b)
    expect(ranks).toEqual(Array.from({ length: archive.enemies.length }, (_, i) => i + 1))
    const byRank = new Map(archive.enemies.map((row) => [row.terraceRank, row.nameHe]))
    expect(byRank.get(1)).toBe('שמעון מזרחי')
    expect(byRank.get(2)).toBe('ערן זהבי')
    expect(byRank.get(7)).toBe('אלי טביב')
    expect(byRank.get(31)).toBe('דייוויד בלאט')
    expect(byRank.get(50)).toBe('לירן ליאני')
    expect(archive.enemies.find((row) => row.slug === 'blatt')?.sport).toBe('basketball')
    expect(archive.enemies.some((row) => row.sport === 'football')).toBe(true)
  })

  it('gives every enemy a charge and a source', () => {
    for (const row of archive.enemies) {
      expect(row.chargeHe.length, row.slug).toBeGreaterThan(20)
      if (row.detailHe !== '') expect(row.detailHe.length, row.slug).toBeGreaterThan(60)
      expect(row.sourceTitle.length, row.slug).toBeGreaterThan(2)
      expect(row.terraceRank, row.slug).toBeGreaterThan(0)
    }
  })

  /**
   * כלל 18, כבדיקות. שלושת הכללים של המקורות בשער 11:
   *  1. שורה בלי ציטוט אמיתי מדפיסה רק את כתב האישום ואת התקופה — `williams` ("לא אומת
   *     במקור זמין") ו-`vujcic` ("Maccabipedia — לא נטען") הדפיסו שורה עובדתית.
   *  2. כל מספר בכתב אישום מופיע גם ב-detailHe של אותה שורה, או שהשורה ממקור של מאור.
   *  3. הידע של מאור מסומן כשלו.
   */
  it('rule 18 §1 — a row with no real citation is dealt with no fact on it', () => {
    const uncited = archive.enemies.filter((row) => recordKind(row.sourceTitle) === 'none').map((row) => row.slug)
    expect(uncited).toEqual(expect.arrayContaining(['williams', 'vujcic']))
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const enemy of dealQueue(seed).enemies) {
        if (enemy.record !== 'none') continue
        expect(enemy.keyFactHe, enemy.slug).toBe('')
        expect(enemy.detailHe, enemy.slug).toBe('')
        expect(enemy.chargeHe.length).toBeGreaterThan(0)
      }
    }
  })

  it('rule 18 §2 — every number in a charge is in the row\'s own record, or the row is Maor\'s', () => {
    for (const row of archive.enemies) {
      if (recordKind(row.sourceTitle) === 'maor') continue
      for (const number of row.chargeHe.match(/\d+/g) ?? []) {
        expect(row.detailHe, `${row.slug}: "${number}" in the charge`).toContain(number)
      }
    }
  })

  it('rule 18 §3 — the owner\'s knowledge is labelled as a source, under the neutral label (spec §0.2)', () => {
    expect(recordKind('ידע אישי — צוות The Worker, 1.9.2026')).toBe('maor')
    expect(archive.enemies.find((row) => row.slug === 'gola')?.sourceTitle).toMatch(/^ידע אישי — צוות The Worker, /)
    // his name is not an archive source any more: nothing may classify on it
    expect(recordKind('מאור הראל — ידע אישי, 1.9.2026')).not.toBe('maor')
    for (const row of archive.enemies) expect(row.sourceTitle, row.slug).not.toContain('מאור הראל')
    // and the plate says only that the record has a source; whose, under the neutral
    // label, is on /credits (spec §0.3, 22.9.2026) — the credit lines are flipped, not gone
    const wall = readFileSync(join(process.cwd(), 'app/derby/HateWall.tsx'), 'utf8')
    expect(wall).not.toContain("t('hate.record.maor'")
    expect(wall).not.toContain("t('hate.wall.credit'")
    expect(wall).toContain("group={enemy.record === 'maor' ? 'team' : null}")
    expect(wall).toContain('<SourceNote newTab tone="dark" group="team" />')
  })

  it('drops the king vocabulary and the painting on the share card (§21)', () => {
    const wall = readFileSync(join(process.cwd(), 'app/derby/HateWall.tsx'), 'utf8')
    expect(wall).not.toMatch(/KING OF THE HILL|hate\.champion|hate\.standing/)
    expect(wall).not.toContain('artFor(')
    expect(wall).toContain("withRound('/derby', seed, cursor)")
  })
})

describe('ציטוטים ובחירה מרובה — the new question shapes', () => {
  it('asks the Berkovic call against four real fixtures', () => {
    const call = archive.calls.find((row) => row.slug === 'berkovic-hine-lala')
    expect(call?.distractorsHe).toHaveLength(3)
    expect(call?.answerHe).toContain('2009/10')
    // the source is the owner's knowledge, and it says so rather than dressing up as a
    // press citation — under the neutral label, not his name (spec §0.2, 22.9.2026)
    expect(call?.sourceTitle).toMatch(/^ידע אישי — צוות The Worker, /)
    expect(call?.sourceTitle).not.toContain('מאור הראל')
  })

  it('gives a multi-select six options, exactly three of them right', () => {
    let seen = 0
    for (let seed = 1; seed < 40 && seen < 3; seed += 1) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (question?.kind !== 'multi') continue
        seen += 1
        expect(question.options).toHaveLength(6)
        expect(new Set(question.options).size).toBe(6)
        expect(question.pickCount).toBe(3)
        const verdict = grade(seed, index, question.options)
        // ticking everything is not an answer
        expect(verdict?.correct).toBe(false)
        const truth = grade(seed, index, verdict?.correctAnswers ?? [])
        expect(truth?.correct).toBe(true)
        expect(truth?.hits).toBe(3)
        for (const answer of verdict?.correctAnswers ?? []) {
          expect(question.options).toContain(answer)
        }
      }
    }
    expect(seen, 'no multi-select question was dealt in 40 seeds').toBeGreaterThan(0)
  })

  it('never marks a shirt-number distractor as someone who wore it', () => {
    const wore = new Map<number, Set<string>>()
    for (const row of archive.shirtNumbers) {
      const set = wore.get(row.shirtNumber) ?? new Set<string>()
      set.add(row.personNameHe)
      wore.set(row.shirtNumber, set)
    }
    for (let seed = 1; seed < 25; seed += 1) {
      for (let index = 0; index < ROUND_LENGTH; index += 1) {
        const question = deal(seed, index)
        if (question?.template !== 'shirt-multi') continue
        const number = Number(question.id.split(':')[1])
        const holders = wore.get(number) ?? new Set<string>()
        const verdict = grade(seed, index, [])
        const wrong = question.options.filter(
          (option) => !(verdict?.correctAnswers ?? []).includes(option),
        )
        for (const name of wrong) {
          expect(holders.has(name), `${name} is recorded on ${number}`).toBe(false)
        }
      }
    }
  })
})

describe('מערכת השכבות — the kit stack', () => {
  it('scores a rebuild layer by layer, not as a similarity percentage', () => {
    const truth = { ...DEFAULT_SPEC, pattern: 'stripe-wide' as const, collar: 'v-neck' as const }
    const attempt = { ...truth, collar: 'crew' as const }
    const result = compareSpecs(attempt, truth)
    expect(result.pattern).toBe(true)
    expect(result.collar).toBe(false)
    expect(Object.values(result).filter(Boolean)).toHaveLength(LAYERS.length - 1)
  })

  it('offers the handoff cuts plus the ones the club actually wore', () => {
    // 12 from the Kit Builder handoff, plus 5 read off Maor's season photographs
    expect(PATTERNS.length).toBeGreaterThanOrEqual(17)
    expect(COLLARS).toHaveLength(5)
    expect(SLEEVES).toHaveLength(5)
    expect(LAYERS).toHaveLength(8)
    // every cut the archive uses must be one the renderer can draw
    const drawable = new Set(PATTERNS.map((pattern) => pattern.id))
    for (const row of archive.kitDesigns) {
      expect(drawable.has(row.pattern as (typeof PATTERNS)[number]['id']), row.seasonLabel).toBe(
        true,
      )
    }
  })

  it('draws every season kit from a source, with no invented cut', () => {
    expect(archive.kitDesigns.length).toBeGreaterThanOrEqual(30)
    for (const row of archive.kitDesigns) {
      expect(row.sourceTitle.length, row.seasonLabel).toBeGreaterThan(5)
      expect(row.noteHe.length, row.seasonLabel).toBeGreaterThan(5)
      expect(row.confidence, row.seasonLabel).toBeGreaterThanOrEqual(2)
      expect(/^\d{4}\/\d{2}$/.test(row.seasonLabel), row.seasonLabel).toBe(true)
    }
  })

  it('never leaks the season into a kit question — that IS the answer', () => {
    buildKitRound(3).forEach((question, index) => {
      expect(question.spec.seasonLabel).toBe('')
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
      const truth = question.id.slice('kit:'.length)
      expect(question.options).toContain(truth)
      expect(gradeKit(3, index, truth)?.correct).toBe(true)
      // and a wrong year grades wrong, from the seed, on the server
      const wrong = question.options.find((option) => option !== truth) as string
      expect(gradeKit(3, index, wrong)?.correct).toBe(false)
    })
  })

  it('draws every colour from a token, never a literal — except the one tonal red', () => {
    for (const [name, value] of Object.entries(COLOUR_VAR)) {
      if (name === 'deep') continue
      expect(value, name).toMatch(/^rgb\(var\(--/)
    }
  })
})

const ROOT = process.cwd()

describe('סמל המועדון — gate 7', () => {
  it('records the nine stages the club itself names', () => {
    expect(archive.crests).toHaveLength(9)
    const first = archive.crests[0]
    const last = archive.crests[archive.crests.length - 1]
    expect(first?.fromYear).toBe(1923)
    expect(last?.toYear).toBeNull()
  })

  it('holds the 1927 → 1923 correction, which is the point of the whole gate', () => {
    const before = archive.crests.find((row) => row.fromYear === 2008)
    const after = archive.crests.find((row) => row.fromYear === 2015)
    expect(before?.yearOnBadge).toBe(1927)
    expect(after?.yearOnBadge).toBe(1923)
    // and the correction is attributed, not asserted
    expect(after?.noteHe).toContain('1923')
    expect(after?.sourceUrl).toBeTruthy()
  })

  it('puts the sponsor inside the crest for exactly the eras whose artwork carries it', () => {
    // Until 22.9.2026 this said ONE era, 2001–2007, from the club's history page. Then the
    // 1997–2000 crest arrived and it carries "כתר KETER" too. The artwork is direct evidence and
    // the page is a summary, so both eras carry the flag and the disagreement is RECORDED,
    // not resolved (rule 60 §3) — a question about the year Keter entered the crest has an
    // open conflict behind it and rule 15 keeps it out of the deal.
    const withKeter = archive.crests.filter((row) => row.hasKeter)
    expect(withKeter.map((row) => `${row.fromYear}–${row.toYear}`)).toEqual(['1997–2000', '2001–2007'])
    const conflicts = JSON.parse(readFileSync(join(ROOT, 'content/manual/fact-conflicts.json'), 'utf8')) as {
      records: { entityTable: string; entityKey: string; field: string }[]
    }
    expect(conflicts.records.some((row) => row.entityTable === 'crest_version' && row.field === 'has_keter')).toBe(true)
  })

  it('never points at a crest image the repo does not ship', () => {
    // there is still no `keter-yellow` file: the coloured Keter crest ships once, as
    // `keter-color` — the 1997–2000 crest, approved by the owner as that exact path on
    // 22.9.2026 (lib/brand/yellowExemptions.ts). Nothing else carries its yellow.
    const shipped = readdirSync(join(ROOT, 'public/brand/crests')).map((name) =>
      name.replace(/\.png$/, ''),
    )
    expect(shipped).not.toContain('keter-yellow')
    for (const row of archive.crests) {
      if (row.imageKey === null) continue
      expect(shipped, `${row.fromYear}: ${row.imageKey}`).toContain(row.imageKey)
    }
  })

  it('deals four real options and grades on the server', () => {
    const round = buildCrestRound(7)
    expect(round.length).toBe(RUN_LENGTH)
    round.forEach((question, index) => {
      expect(new Set(question.options).size).toBe(4)
      const verdict = gradeCrest(7, index, '__timeout__')
      expect(verdict).not.toBeNull()
      expect(question.options).toContain(verdict?.answer)
      expect(gradeCrest(7, index, verdict?.answer ?? '')?.correct).toBe(true)
    })
  })

  it('ramps the round instead of dealing it flat', () => {
    const ladder = buildCrestRound(7).map((question) => question.difficulty)
    for (let index = 1; index < ladder.length; index += 1) {
      expect(ladder[index]).toBeGreaterThanOrEqual(ladder[index - 1] as number)
    }
  })
})

describe('פנקס חבר — gate 10', () => {
  it('punches a day once however much you play, and never erases one', () => {
    let book = emptyBook()
    book = punchToday(book)
    const after = punchToday(punchToday(book))
    expect(after.punches).toHaveLength(1)
    expect(after.punches).toEqual(book.punches)
  })

  it('files a correction as pending — only the archive may approve one', () => {
    const book = fileCorrection(emptyBook(), 'GATE 7 · CREST', 'שנת הייסוד')
    expect(book.corrections[0]?.status).toBe('pending')
    expect(approvedCount(book)).toBe(0)
  })

  it('prints ninety slots, newest last', () => {
    const grid = quarterGrid(punchToday(emptyBook()))
    expect(grid).toHaveLength(QUARTER_SLOTS)
    expect(grid[grid.length - 1]).toBe(true)
    expect(grid[0]).toBe(false)
  })

  it('carries no score field at all — the profile is not a scoreboard', () => {
    const book = emptyBook()
    expect(Object.keys(book).some((key) => /score|points|lamps/i.test(key))).toBe(false)
  })
})
