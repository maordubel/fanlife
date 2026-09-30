/**
 * כובשים — the grammar, the corpus, and the file.
 *
 * **Rule 74 decides the shape of this suite.** A test that names one row would whitewash
 * the rest: `parsePosition` was green for a year while it read a list as a scalar, and
 * what caught it was a QUANTIFIED assertion over the whole corpus rather than a named
 * example. So the unit half below tests each grammar SHAPE — not one line of one match —
 * and the corpus half is quantified over all 2,290 football rows that carry a comment:
 * the agreement rate is a floor that cannot fall, and no holding may carry
 * `confidence: 2` while disagreeing with the score that sits in its own row.
 *
 * Three guards here exist because they each caught a real defect while this was built:
 *
 *  · **A bracket with digits that does not parse must REFUSE, never become a nickname.**
 *    A draft let it fall through and `יהושע פייגנבוים (33',54'-פ')` silently became one
 *    goal by a man nicknamed `33',54'-פ'`. That is rule 11's exact prohibition wearing a
 *    plausible value, and a plausible value is what nobody checks twice.
 *  · **No word in the prose lexicon may be a word in a player's name.** The first
 *    lexicon contained `אושר`, `פרץ` and `בני` — and so refused אושר דוידה and
 *    עומר פרץ, who are players. The check is mechanical, so it cannot drift as either
 *    list grows.
 *  · **No basketball row may produce a holding.** Rule 38: `comments` is a football
 *    convention and reading it in the basketball rows once invented twenty goals.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  PROSE_WORDS,
  assertFootballDepartment,
  parseMinuteSpec,
  parseScorerLine,
  splitTopLevel,
  stripWikiLinks,
} from '@/scripts/ingest/lib/scorers'
import {
  parseFootballScorers,
  readGamesFile,
  resolveScorer,
  buildNameIndex,
  type MatchScorersRecord,
  type NamedPerson,
  type RefusedRow,
  type ScorerConflict,
  type UnresolvedToken,
} from '@/scripts/ingest/sources/vikipoel-scorers'
import { decodeEntities, type VikipoelGameRow } from '@/scripts/ingest/sources/vikipoel-cargo'

const ROOT = join(__dirname, '..')

/** Goals plus a one-line shape summary, so a failure prints something readable. */
function read(line: string): {
  count: number
  names: Array<string | null>
  minutes: Array<number | null>
  refused: string | null
} {
  const result = parseScorerLine(line)
  return {
    count: result.goals.length,
    names: result.goals.map((goal) => goal.scorerNameHe),
    minutes: result.goals.map((goal) => goal.minute),
    refused: result.refusals[0]?.code ?? null,
  }
}

/* ===================================================================== unit */

describe('הדקדוק — כל צורה שהקורפוס כותב, כשלעצמה', () => {
  it('לוכסן: שם/דקה, מופרדים בפסיק', () => {
    const out = read("משה זימון/5, אברהם נודלמן/35, אברהם פלמן (בוצ'קה)/44")
    expect(out.refused).toBeNull()
    expect(out.count).toBe(3)
    expect(out.names).toEqual(['משה זימון', 'אברהם נודלמן', 'אברהם פלמן'])
    expect(out.minutes).toEqual([5, 35, 44])
  })

  it('דקה חשופה אחרי פסיק היא שער נוסף של אותו כובש, לא כובש חדש', () => {
    const out = read('הרברט מייטנר/13, 26')
    expect(out.count).toBe(2)
    expect(new Set(out.names)).toEqual(new Set(['הרברט מייטנר']))
    expect(out.minutes).toEqual([13, 26])
  })

  it('`;` ו-`,` שניהם מפרידים בין כובשים', () => {
    const out = read("אלי פוקס/40, 51; שלמה פוליאקוב/46, אברהם פלמן (בוצ'קה)/90פ")
    expect(out.refused).toBeNull()
    expect(out.count).toBe(4)
    expect(out.names).toEqual([
      'אלי פוקס',
      'אלי פוקס',
      'שלמה פוליאקוב',
      'אברהם פלמן',
    ])
    expect(out.minutes).toEqual([40, 51, 46, 90])
  })

  it('סוגריים היא הצורה השלטת: שם (דקה)', () => {
    const out = read('רמלר (39), גילי לנדאו (42)')
    expect(out.count).toBe(2)
    expect(out.minutes).toEqual([39, 42])
  })

  it('דקה חשופה אחרי שם, בלי סוגר ובלי לוכסן', () => {
    const out = read("רחמנוביץ' 51, טורק 81, פרנקו 84, 90")
    expect(out.count).toBe(4)
    expect(out.names).toEqual(["רחמנוביץ'", 'טורק', 'פרנקו', 'פרנקו'])
    expect(out.minutes).toEqual([51, 81, 84, 90])
  })

  it('שם בלבד הוא שער אחד שהמקור לא כתב את דקתו', () => {
    const out = read('שבי בן ברוך')
    expect(out.count).toBe(1)
    expect(out.minutes).toEqual([null])
  })

  it('`?` בדקה: הכובש ידוע, הדקה לא — ולעולם לא דקה שהומצאה', () => {
    const out = read('אברהם נודלמן/?')
    expect(out.count).toBe(1)
    expect(out.names).toEqual(['אברהם נודלמן'])
    expect(out.minutes).toEqual([null])
  })

  it('`פ` בסוף הדקה הוא פנדל, גם כשאין דקה', () => {
    const result = parseScorerLine('אברהם נודלמן/?פ')
    expect(result.refusals).toHaveLength(0)
    expect(result.goals).toHaveLength(1)
    expect(result.goals[0]?.penalty).toBe(true)
    expect(result.goals[0]?.minute).toBeNull()
  })

  it('סוגר אחרי שם הוא כינוי, ולא סימון ולא דקה', () => {
    const result = parseScorerLine("אברהם פלמן (בוצ'קה)/44")
    expect(result.goals[0]?.scorerNameHe).toBe('אברהם פלמן')
    expect(result.goals[0]?.nicknameHe).toBe("בוצ'קה")
    expect(result.goals[0]?.minute).toBe(44)
    for (const nickname of ['דוקטור', 'גוגו', 'מישקה']) {
      const one = parseScorerLine(`צבי ארליך (${nickname})/12`)
      expect(one.goals[0]?.nicknameHe).toBe(nickname)
      expect(one.goals[0]?.scorerNameHe).toBe('צבי ארליך')
    }
  })

  it('מילת־מניין בסוגר: צמד 2, שלושער 3 — ודקותיהם null', () => {
    expect(read('משה פוליאקוב (שלושער)').count).toBe(3)
    expect(read('אמנון חרל"פ (צמד)').count).toBe(2)
    expect(read('משה פוליאקוב (שלושער)').minutes).toEqual([null, null, null])
  })

  it('מילת־מניין יכולה לשבת לפני השם וגם אחריו', () => {
    expect(read('שלושער אמנון חרל"פ').count).toBe(3)
    expect(read('חיים גלזר שלושער').count).toBe(3)
    expect(read('סלים צמד').count).toBe(2)
    expect(read('רביעייה שמעון').count).toBe(4)
    expect(read('גלזר (2 שערים)').count).toBe(2)
    expect(read('גלזר (שני שערים)').count).toBe(2)
  })

  it('`(עצמי)` שער עצמי · `(פנדל)` / `(בעיטת עונשין)` פנדל', () => {
    const own = parseScorerLine('זאב חיימוביץ (44 עצמי)')
    expect(own.goals[0]?.ownGoal).toBe(true)
    expect(own.goals[0]?.minute).toBe(44)
    for (const marker of ['פנדל', 'בעיטת עונשין']) {
      const pen = parseScorerLine(`וילי ברגר (${marker})`)
      expect(pen.refusals).toHaveLength(0)
      expect(pen.goals).toHaveLength(1)
      expect(pen.goals[0]?.penalty).toBe(true)
      expect(pen.goals[0]?.minute).toBeNull()
    }
  })

  it('`?/75` — שער בדקה 75 של כובש שהמקור לא נקב בשמו', () => {
    const result = parseScorerLine('?/75')
    expect(result.refusals).toHaveLength(0)
    expect(result.goals).toHaveLength(1)
    expect(result.goals[0]?.scorerNameHe).toBeNull()
    expect(result.goals[0]?.minute).toBe(75)
  })

  it('"X או Y" — המקור עצמו אינו בטוח: השער נשמר, הכובש נרשם ואינו מוכרע', () => {
    const result = parseScorerLine("מאיר או בוצ'קה/80")
    expect(result.refusals).toHaveLength(0)
    expect(result.goals).toHaveLength(1)
    expect(result.goals[0]?.scorerDisputed).toBe(true)
    expect(result.goals[0]?.minute).toBe(80)
    // and the same on a MINUTE — `80 או 82` keeps the goal and nulls the field
    const minute = parseScorerLine("צבי ארליך (דוקטור)/80 או 82")
    expect(minute.goals).toHaveLength(1)
    expect(minute.goals[0]?.minuteDisputed).toBe(true)
    expect(minute.goals[0]?.minute).toBeNull()
  })

  it('פרוזה היא הערת משחק, לא רשימת כובשים — ומסורבת עם הטקסט והסיבה', () => {
    for (const line of [
      'המשחק הופסק בדקה ה-80 עקב רדת החשכה. תוצאת המשחק אושרה על ידי ההתאחדות',
      'טכני',
      'ניצחון טכני',
      'נצחון טכני, נתניה הופיעה ללא 3 שחקנים',
      '5,000-6,000 צופים',
    ]) {
      const result = parseScorerLine(line)
      expect(result.goals, line).toHaveLength(0)
      expect(result.refusals, line).toHaveLength(1)
      expect(result.refusals[0]?.reason.length, line).toBeGreaterThan(0)
      expect(result.refusals[0]?.raw, line).toContain(line.slice(0, 8))
    }
  })

  it('מספר קהל לעולם אינו נקרא כדקה', () => {
    const result = parseScorerLine('10,000 צופים')
    expect(result.goals).toHaveLength(0)
    expect(result.refusals).toHaveLength(1)
  })

  /* ------------------------------ shapes the corpus has and the brief did not */

  it('קידומת מניין `N-<שם>` — והיא חייבת להסכים עם הסוגר', () => {
    const two = parseScorerLine('2-חיים גלזר (87, 88)')
    expect(two.refusals).toHaveLength(0)
    expect(two.goals).toHaveLength(2)
    expect(two.goals[0]?.scorerNameHe).toBe('חיים גלזר')
    expect(read('4-רחביה רוזנבוים (5, 35, 54, 76)').count).toBe(4)
    // a prefix that contradicts its own bracket is refused, not preferred either way
    const clash = parseScorerLine('3-חיים גלזר (87, 88)')
    expect(clash.goals).toHaveLength(0)
    expect(clash.refusals[0]?.code).toBe('spec-unreadable')
  })

  it('סימון לפני הדקה הוא אותו שער אחד — `(פנדל, 70)` כמו `(70, פנדל)`', () => {
    for (const line of ['שלום אביטן (פנדל, 70)', "שלום אביטן (70, פנדל)"]) {
      const result = parseScorerLine(line)
      expect(result.goals, line).toHaveLength(1)
      expect(result.goals[0]?.penalty, line).toBe(true)
      expect(result.goals[0]?.minute, line).toBe(70)
    }
    const own = parseScorerLine('צבי שיינפלד (עצמי, 55)')
    expect(own.goals).toHaveLength(1)
    expect(own.goals[0]?.ownGoal).toBe(true)
    expect(own.goals[0]?.minute).toBe(55)
  })

  it('סימון דבוק לדקה בלי רווח, ובמקף', () => {
    expect(parseScorerLine('דבורקין/40ע').goals[0]?.ownGoal).toBe(true)
    expect(parseScorerLine('וילי ברגר/25פ').goals[0]?.penalty).toBe(true)
    const hyphen = parseScorerLine("יהושע פייגנבוים (33',54'-פ')")
    expect(hyphen.refusals).toHaveLength(0)
    expect(hyphen.goals).toHaveLength(2)
    expect(hyphen.goals[1]?.penalty).toBe(true)
  })

  it('תוספת זמן, והגרש משני צדי המספר', () => {
    for (const [line, minute, stoppage] of [
      ["טוטו תמוז (90')", 90, null],
      ['טוטו תמוז (90+3)', 90, 3],
      ["טוטו תמוז ('90+10)", 90, 10],
      ["טוטו תמוז (45'+2')", 45, 2],
    ] as const) {
      const result = parseScorerLine(line)
      expect(result.refusals, line).toHaveLength(0)
      expect(result.goals[0]?.minute, line).toBe(minute)
      expect(result.goals[0]?.stoppage, line).toBe(stoppage)
    }
  })

  it('`שער עצמי` בלי שם — הכובש null, השער נספר', () => {
    const result = parseScorerLine("שער עצמי (63')")
    expect(result.refusals).toHaveLength(0)
    expect(result.goals).toHaveLength(1)
    expect(result.goals[0]?.scorerNameHe).toBeNull()
    expect(result.goals[0]?.ownGoal).toBe(true)
    expect(result.goals[0]?.minute).toBe(63)
  })

  it('סימון שנכתב כמילה בסוף השם — `אלון בן דור - עצמי`', () => {
    const result = parseScorerLine('אלון בן דור - עצמי (54)')
    expect(result.goals).toHaveLength(1)
    expect(result.goals[0]?.scorerNameHe).toBe('אלון בן דור')
    expect(result.goals[0]?.ownGoal).toBe(true)
    expect(result.goals[0]?.minute).toBe(54)
  })

  /* ---------------------------------------------- the three refusal guards */

  it('סוגר שיש בו ספרה ואינו נקרא — מסורב, ולעולם לא הופך לכינוי', () => {
    for (const line of [
      "יהושע פייגנבוים (33',54'-בלתי־קריא')",
      'אברהם פלמן (7, שער נוסף בפנדל)',
      'לאחר הארכה (0:0)',
    ]) {
      const result = parseScorerLine(line)
      expect(result.goals, line).toHaveLength(0)
      expect(result.refusals, line).toHaveLength(1)
      // and in particular: no goal was invented with the bracket as a nickname
      expect(result.goals.some((goal) => goal.nicknameHe !== null), line).toBe(false)
    }
  })

  it('שני סוגרי־דקות במקטע אחד מסורבים — פסיק חסר במקור אינו מתוקן כאן', () => {
    const result = parseScorerLine('ישראל וייס (52, 66, 80) רחביה רוזנבוים (57)')
    expect(result.goals).toHaveLength(0)
    expect(result.refusals[0]?.code).toBe('two-goal-specs')
  })

  it('דקה בלי כובש לפניה מסורבת ואינה נתלית על מי שיבוא אחריה', () => {
    const result = parseScorerLine('40, משה זימון/89')
    expect(result.goals).toHaveLength(0)
    expect(result.refusals[0]?.code).toBe('orphan-minute')
  })

  it('טקסט שעדיין נושא ישויות HTML מסורב — הפענוח קורה פעם אחת, בקורא', () => {
    const result = parseScorerLine('הפועל ת&quot;א (12)')
    expect(result.goals).toHaveLength(0)
    expect(result.refusals[0]?.code).toBe('still-encoded')
  })

  it('שורה שהובנה למחצה מניבה אפס שערים — לא את החלק שכן נקרא', () => {
    const result = parseScorerLine('גילי לנדאו (34), דב רמלר (48). נערך בק"ש')
    expect(result.goals).toHaveLength(0)
    expect(result.refusals).toHaveLength(1)
    expect(result.refusals[0]?.raw).toContain('גילי לנדאו')
  })

  /* --------------------------------------------------------------- helpers */

  it('קישורי ויקי נפתחים לטקסט התצוגה, פעם אחת', () => {
    expect(stripWikiLinks('[[ערן זהבי]] (34)')).toBe('ערן זהבי (34)')
    expect(stripWikiLinks('[[ערן זהבי|זהבי]] (34)')).toBe('זהבי (34)')
    expect(read('[[מילאן מקאריץ\']] (15\', 57\'), [[בן שהר]] (79\')').count).toBe(3)
  })

  it('פיצול ברמה העליונה אינו נכנס לסוגריים', () => {
    expect(splitTopLevel('ישראל וייס (52, 66, 80)', ';,')).toEqual(['ישראל וייס (52, 66, 80)'])
    expect(splitTopLevel('א (1), ב (2)', ';,')).toEqual(['א (1)', 'ב (2)'])
  })

  it('סוגר ריק או חסר־שער אינו שער', () => {
    expect('error' in parseMinuteSpec('')).toBe(true)
  })

  it('כלל 38: שורה שאינה כדורגל זורקת, כי הכשל שקט והמחיר שערים מומצאים', () => {
    expect(() => assertFootballDepartment('כדורגל')).not.toThrow()
    expect(() => assertFootballDepartment('כדורסל')).toThrow()
    expect(() => assertFootballDepartment('הפועל אוסישקין')).toThrow()
    expect(() => assertFootballDepartment(null)).toThrow()
  })
})

/* ================================================== the corpus, quantified */

describe('הקורפוס כולו — כלל 74: הבדיקה נופלת על המחלקה', () => {
  const games = readGamesFile(join(ROOT, 'content/raw/vikipoel-games.json'))
  const clubs = (
    JSON.parse(readFileSync(join(ROOT, 'content/manual/clubs.json'), 'utf8')) as {
      records: Array<Record<string, unknown>>
    }
  ).records
  const playerFacts: NamedPerson[] = (
    JSON.parse(readFileSync(join(ROOT, 'content/manual/player-facts.json'), 'utf8')) as {
      records: Array<{ personNameHe: string }>
    }
  ).records.map((row) => ({ name: row.personNameHe }))
  const roster: NamedPerson[] = (
    JSON.parse(readFileSync(join(ROOT, 'content/manual/players-roster.json'), 'utf8')) as {
      records: Array<{ slug: string; fullNameHe: string; aliases?: string[] }>
    }
  ).records.map((row) => ({ slug: row.slug, name: row.fullNameHe, aliases: row.aliases ?? [] }))

  const run = parseFootballScorers({ games, clubs: clubs as never, playerFacts, roster })

  /**
   * The floors.
   *
   * They are set just under what this ingest measured, so a parser change that makes
   * things worse fails the suite and a change that makes them better does not. They are
   * NOT the measured numbers to the last digit: a floor that equals today's value turns
   * every improvement into a red build, which is how a floor stops being read.
   */
  const FLOOR = {
    rowsWithComments: 2290,
    rowsParsed: 2100,
    agreementRate: 0.99,
    nameResolutionRate: 0.78,
  }

  it('כל שורת כדורגל עם comments נגמרת או כרשומה או כסירוב — אין שורה שנעלמת', () => {
    expect(run.report.footballRowsWithComments).toBe(FLOOR.rowsWithComments)
    expect(run.report.rowsParsed + run.report.rowsRefused).toBe(
      run.report.footballRowsWithComments,
    )
    expect(run.records).toHaveLength(run.report.rowsParsed)
    expect(run.refused).toHaveLength(run.report.rowsRefused)
  })

  it('שיעור ההסכמה עם התוצאה אינו יורד מתחת למה שנמדד', () => {
    expect(run.report.rowsParsed).toBeGreaterThanOrEqual(FLOOR.rowsParsed)
    expect(run.report.agreement.rate).toBeGreaterThanOrEqual(FLOOR.agreementRate)
    expect(run.report.agreement.agreed + run.report.agreement.disagreed).toBe(
      run.report.rowsParsed - run.report.agreement.unscored,
    )
  })

  it('אף החזקה אינה נושאת confidence 2 בזמן שהיא חלוקה על התוצאה (כלל 2)', () => {
    const offenders = run.records.filter(
      (row) => row.confidence >= 2 && row.agreesWithScore !== true,
    )
    expect(offenders.map((row) => row.matchKey ?? row.seasonRaw)).toEqual([])
    for (const row of run.records) {
      expect(row.confidence, String(row.matchKey)).toBe(row.agreesWithScore === true ? 2 : 1)
    }
  })

  it('מספר השערים ברשומה שווה למניין שלה, ולתוצאה בדיוק כשהיא מסכימה', () => {
    for (const row of run.records) {
      expect(row.goals.length).toBe(row.goalsParsed)
      if (row.agreesWithScore === true) {
        expect(row.goalsParsed).toBe(row.hapoelGoalsFromScore)
      }
    }
  })

  it('כל שורה חלוקה נרשמת כסתירה שנוקבת בשני המספרים ואינה מוכרעת (כלל 60 §3)', () => {
    const disagreeing = run.records.filter((row) => row.agreesWithScore === false)
    expect(run.conflicts).toHaveLength(disagreeing.length)
    for (const conflict of run.conflicts) {
      expect(conflict.resolution).toBeNull()
      expect(conflict.claimA).toMatch(/\d/u)
      expect(conflict.claimB).toMatch(/\d/u)
    }
    for (const row of disagreeing) {
      expect(row.conflictNoteHe).toBeTruthy()
      expect(row.conflictNoteHe).toContain(String(row.goalsParsed))
    }
  })

  it('כל סירוב נושא את הטקסט הגולמי ואת הסיבה (כלל 11)', () => {
    for (const row of run.refused) {
      expect(row.raw.length, row.key).toBeGreaterThan(0)
      expect(row.reason.length, row.key).toBeGreaterThan(0)
      expect(row.code.length, row.key).toBeGreaterThan(0)
    }
  })

  it('כלל 38: שורות שאינן כדורגל אינן מניבות ולו החזקה אחת', () => {
    const others = games.filter((row) => decodeEntities(String(row.department ?? '')) !== 'כדורגל')
    expect(others.length).toBeGreaterThan(2000)
    const basketball = parseFootballScorers({
      games: others,
      clubs: clubs as never,
      playerFacts,
      roster,
    })
    expect(basketball.records).toHaveLength(0)
    expect(basketball.report.footballRows).toBe(0)
    expect(basketball.report.goalsHeld).toBe(0)
  })

  it('כלל 36: homegame="x" אינו מקרה מיוחד — הצד שלנו נקבע מהשם, ותמיד יחיד', () => {
    const neutral = run.records.filter((row) => row.neutralGround === true)
    expect(neutral.length).toBeGreaterThan(0)
    for (const row of run.records) {
      expect(['home', 'away']).toContain(row.hapoelSide)
      const ours = row.hapoelSide === 'home' ? row.homeScore : row.awayScore
      expect(row.hapoelGoalsFromScore).toBe(ours)
    }
    // and no `x` row was refused FOR being `x`
    expect(run.report.refusalsByCode['no-hapoel-side'] ?? 0).toBe(0)
  })

  it('שיעור פתרון השמות אינו יורד, ואין התאמה מטושטשת שדלפה פנימה', () => {
    expect(run.report.names.rate).toBeGreaterThanOrEqual(FLOOR.nameResolutionRate)
    const unresolvedNames = new Set(run.unresolved.map((row) => row.nameHe))
    for (const row of run.records) {
      for (const goal of row.goals) {
        if (goal.scorerNameHe !== null && unresolvedNames.has(goal.scorerNameHe)) {
          expect(goal.playerSlug, goal.scorerNameHe).toBeNull()
          expect(goal.resolvedFrom, goal.scorerNameHe).toBeNull()
        }
        // rule 60 §3: a disputed scorer is never resolved to a person
        if (goal.scorerDisputed) expect(goal.playerSlug).toBeNull()
        // rule 11: an unnamed scorer stays unnamed
        if (goal.scorerNameHe === null) expect(goal.playerSlug).toBeNull()
      }
    }
  })

  it('כלל 64 §5: שם משפחה לבדו אינו גשר — טוקן חד־מילתי אינו נתלה על שם מלא', () => {
    const index = buildNameIndex(playerFacts, roster)
    // `מאיר` is a surname the archive holds inside two different full names
    expect(resolveScorer(index, 'מאיר').slug).toBeNull()
    expect(resolveScorer(index, 'חזום').slug).toBeNull()
    // an EXACT match is still a match, whatever its word count
    const exact = playerFacts[0]?.name ?? ''
    expect(resolveScorer(index, exact).from).toBe('player-facts')
  })

  it('כל דקה שנרשמה היא דקה אפשרית, ולא מספר כלשהו שנקלט', () => {
    for (const row of run.records) {
      for (const goal of row.goals) {
        if (goal.minute === null) continue
        expect(goal.minute, `${row.seasonRaw} ${goal.scorerNameHe}`).toBeGreaterThanOrEqual(1)
        expect(goal.minute, `${row.seasonRaw} ${goal.scorerNameHe}`).toBeLessThanOrEqual(130)
      }
    }
  })

  it('ההרצה דטרמיניסטית — אותו קלט, אותם בייטים', () => {
    const again = parseFootballScorers({ games, clubs: clubs as never, playerFacts, roster })
    expect(JSON.stringify(again.records)).toBe(JSON.stringify(run.records))
    expect(JSON.stringify(again.refused)).toBe(JSON.stringify(run.refused))
  })
})

/* ===================================================== the lexicon's own guard */

describe('לקסיקון הפרוזה אינו יכול לבלוע שם של שחקן', () => {
  it('אף מילה בלקסיקון אינה מילה בשם של שחקן בארכיון', () => {
    const nameWords = new Set<string>()
    for (const file of ['player-facts.json', 'players-roster.json']) {
      const parsed = JSON.parse(readFileSync(join(ROOT, 'content/manual', file), 'utf8')) as {
        records: Array<{ personNameHe?: string; fullNameHe?: string; aliases?: string[] }>
      }
      for (const row of parsed.records) {
        for (const name of [row.personNameHe, row.fullNameHe, ...(row.aliases ?? [])]) {
          if (!name) continue
          for (const word of name.split(/\s+/u)) nameWords.add(word)
        }
      }
    }
    // The first lexicon held אושר, פרץ and בני, and so refused אושר דוידה and עומר פרץ.
    const clashes = PROSE_WORDS.filter((word) => nameWords.has(word))
    expect(clashes).toEqual([])
  })

  it('ושמות אמיתיים שנראים כמו פרוזה עדיין נקראים', () => {
    for (const line of ["אושר דוידה (22')", 'עומר פרץ (63)', 'בן ביטון (25)']) {
      const result = parseScorerLine(line)
      expect(result.refusals, line).toHaveLength(0)
      expect(result.goals, line).toHaveLength(1)
    }
  })
})

/* ============================================= the file, and what it may not be */

describe('content/manual/match-scorers.json — הקובץ עצמו', () => {
  const file = JSON.parse(
    readFileSync(join(ROOT, 'content/manual/match-scorers.json'), 'utf8'),
  ) as {
    note: string
    sport: string
    confidence: number
    generator: string
    sources: Array<{ key: string; title: string; url: string | null }>
    records: MatchScorersRecord[]
    conflicts: ScorerConflict[]
    unknown: UnresolvedToken[]
    refused: RefusedRow[]
  }

  it('נכתב בסגנון הבית של player-facts.json', () => {
    expect(file.sport).toBe('football')
    expect(file.generator).toContain('scorers-cli.ts')
    expect(file.note.length).toBeGreaterThan(200)
    expect(file.sources.length).toBeGreaterThanOrEqual(3)
    for (const source of file.sources) expect(source.title.length).toBeGreaterThan(10)
    expect(Array.isArray(file.records)).toBe(true)
    expect(Array.isArray(file.conflicts)).toBe(true)
    expect(Array.isArray(file.unknown)).toBe(true)
    expect(Array.isArray(file.refused)).toBe(true)
  })

  it('כל רשומה נושאת מקור וביטחון (כלל 2), וכל confidence 2 מסכימה עם התוצאה', () => {
    expect(file.records.length).toBeGreaterThan(2000)
    for (const row of file.records) {
      expect(row.sourceTitle).toContain('comments')
      expect(row.sourceUrl).toMatch(/^https:\/\//u)
      expect([1, 2]).toContain(row.confidence)
      if (row.confidence >= 2) expect(row.agreesWithScore).toBe(true)
    }
  })

  it('אין שורת כדורסל בקובץ — כלל 6 / 38', () => {
    const basketballClubs = /כדורסל|אוסישקין/u
    for (const row of file.records) {
      expect(basketballClubs.test(row.homeClubHe), row.homeClubHe).toBe(false)
      expect(basketballClubs.test(row.awayClubHe), row.awayClubHe).toBe(false)
    }
  })

  /**
   * **שער 8 לא נגע.**
   *
   * The task that produced this file was first framed as "add depth to gate 8 from these
   * rows", and that framing is wrong: gate 8 reconstructs a goal's MOVE, touch by touch,
   * and `comments` gives a scorer and a minute. Building gate 8 content out of a scorer
   * list means inventing the passes. This assertion is what keeps the next delta from
   * doing it quietly — `goals.json` may not cite the scorers source, at any confidence.
   */
  it('goals.json אינו נושא ולו שורה אחת מהמקור הזה — רשימת כובשים אינה מהלך', () => {
    const goalsText = readFileSync(join(ROOT, 'content/manual/goals.json'), 'utf8')
    expect(goalsText).not.toContain('comments')
    expect(goalsText).not.toContain('match-scorers')
    expect(goalsText).not.toContain('scorers-cli')
    const goals = JSON.parse(goalsText) as { records: Array<{ sourceTitle?: string }> }
    for (const row of goals.records) {
      expect(row.sourceTitle ?? '').not.toContain('עמודת comments')
    }
  })
})
