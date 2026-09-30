/**
 * תסריט ההמשך — מ-markdown לנתונים, ומה שלא נקרא מדווח (20.9.2026).
 *
 *   npx tsx scripts/life/ingest-screenplay-2026-09-20.ts        (npm run life:screenplay)
 *
 * מאור מסר ב-20.9.2026 את תסריט ההמשך 2000–2026: 114 סצנות, 345 בחירות, 1,357 שורות
 * דיאלוג, על פני שנים־עשר פרקי ציר ראשי ותשעה חלונות חיים. הקובץ הוא **המקור**
 * (`docs/life/SCREENPLAY-2000-2026.md`), הוא נשמר בריפו כפי שהתקבל, והסקריפט הזה
 * קורא אותו — כל הרצה מחדש חוזרת על עצמה בדיוק (כלל 36: הקורפוס אינו הקנון, והצעד
 * ביניהם הוא מעבר פרסר על הדיסק).
 *
 * **הכלל היחיד שחשוב כאן הוא כלל 11: הפרסר לא ממציא.** שדה שאינו נקרא — `null` ודיווח;
 * מקטע אפקט ששמו לא מוכר — נדחה בשמו ועם הטקסט הגולמי, ולא מתפרש "בערך". הדוח נכתב
 * לצד הנתונים כדי שמה שלא נכנס יהיה גלוי באותה מידה כמו מה שכן.
 *
 * מה שהוא **אינו** עושה: הוא אינו מתרגם לאפקטים של המנוע ואינו כותב שורת תוכן אחת.
 * זה מעבר שני, נפרד בכוונה — קריאה והכרעה הן שתי פעולות, ומיזוג שלהן הוא איך שפרסר
 * מתחיל להחליט דברים בשקט.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const SOURCE = 'docs/life/SCREENPLAY-2000-2026.md'
const OUT_DIR = 'lib/life/content/screenplay'

// ---------------------------------------------------------------------------- types

export type ScreenLine = { who: string; text: string }

export type ScreenChoice = {
  id: string
  titleHe: string
  /** the source's own condition sentence, verbatim — never parsed into a predicate here */
  conditionHe: string | null
  lines: ScreenLine[]
  /** every `name: value` segment of the outcome line, in source order */
  effects: Array<{ key: string; raw: string; value: unknown }>
  /** the scene this choice continues to */
  next: string | null
}

export type ScreenScene = {
  id: string
  titleHe: string
  chapter: string
  placeHe: string | null
  /** the year the source states, or null where it states a span it does not resolve */
  year: number | null
  yearRaw: string | null
  kindHe: string | null
  goalHe: string | null
  actionsHe: string | null
  opensHe: string | null
  directionHe: string | null
  pastReadHe: string | null
  anchorHe: string | null
  alternativeHe: string | null
  openingLines: ScreenLine[]
  choices: ScreenChoice[]
}

type Rejected = { where: string; what: string; raw: string }

// ------------------------------------------------------------------------ the chapters
/**
 * מפת הפרקים מתוך תוכן העניינים של המקור עצמו, ולא מניחוש לפי אות המזהה. הטבלה נקראת
 * מהקובץ, כך שפרק שיתווסף לתסריט מחר נקרא בלי לגעת בסקריפט.
 */
function chapterMap(text: string): Map<string, string> {
  const out = new Map<string, string>()
  const table = text.slice(text.indexOf('### מפת פרקים'), text.indexOf('<a id="screenplay">'))
  for (const row of table.split('\n')) {
    const cells = row.split('|').map((cell) => cell.trim())
    if (cells.length < 5) continue
    const code = cells[2]?.replace(/`/g, '')
    if (!code || !/^[A-Z_]+$/.test(code)) continue
    for (const id of (cells[3] ?? '').split(',').map((s) => s.trim())) if (id) out.set(id, code)
  }
  return out
}

// ------------------------------------------------------------------------- the effects
/**
 * מקטע אחד של שורת התוצאה. הערך נשמר גם כטקסט גולמי וגם מפורסר כשהוא JSON — כי JSON
 * שנקרא בהצלחה הוא נתון, וטקסט חופשי הוא ציטוט, ואלה שתי אמירות שונות על אותו שדה.
 */
function parseSegment(raw: string): { key: string; raw: string; value: unknown } | null {
  const at = raw.indexOf(':')
  if (at < 0) return null
  const key = raw.slice(0, at).trim()
  const body = raw.slice(at + 1).trim()
  if (!key) return null
  if (body.startsWith('{') || body.startsWith('[')) {
    try {
      return { key, raw: body, value: JSON.parse(body) }
    } catch {
      return { key, raw: body, value: null }
    }
  }
  const asNumber = Number(body)
  return { key, raw: body, value: Number.isFinite(asNumber) && body !== '' ? asNumber : body }
}

/**
 * `עלויות: {...}; קשרים: {...}` — split on `;` and NOT inside a brace, because a JSON
 * object can carry one. Naive `split(';')` cuts `{"a": 1; "b": 2}` in half; no row does
 * that today, and a parser that relies on today is how a silent loss starts.
 */
function splitSegments(line: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of line) {
    if (ch === '{' || ch === '[') depth += 1
    if (ch === '}' || ch === ']') depth -= 1
    if (ch === ';' && depth === 0) {
      out.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) out.push(current)
  return out.map((s) => s.trim()).filter(Boolean)
}

// --------------------------------------------------------------------------- the reader

const QUOTE = /^>\s*\*\*([^*]+):\*\*\s*(.*?)\s*$/
const FIELD = /^\*\*([^*]+):\*\*\s*(.*)$/

function readLines(block: string[]): ScreenLine[] {
  const out: ScreenLine[] = []
  for (const row of block) {
    const m = QUOTE.exec(row.trim())
    if (!m) continue
    const who = m[1]?.trim() ?? ''
    const text = (m[2] ?? '').trim()
    if (who && text) out.push({ who, text })
  }
  return out
}

function main() {
  const text = readFileSync(SOURCE, 'utf8')
  const chapters = chapterMap(text)
  const rejected: Rejected[] = []
  const scenes: ScreenScene[] = []

  const body = text.slice(text.indexOf('<a id="screenplay">'))
  // a scene is `#### <ID> — <title>`; everything until the next `####` or `###` is its block
  const chunks = body.split(/\n(?=#### )/g)

  for (const chunk of chunks) {
    const head = /^#### ([A-Z]\d{2}) — (.+)$/m.exec(chunk)
    if (!head) continue
    const id = head[1]!
    const rows = chunk.split('\n')

    const field = (name: string): string | null => {
      for (const row of rows) {
        const m = FIELD.exec(row.trim())
        if (m && m[1]?.trim() === name) return (m[2] ?? '').trim() || null
      }
      return null
    }

    // the first line carries three fields on one row, separated by `·`
    const strip = rows.find((r) => r.includes('**מקום:**')) ?? ''
    const parts = strip.split('·').map((s) => s.trim())
    const pick = (name: string) => {
      const found = parts.find((p) => p.startsWith(`**${name}:**`))
      return found ? found.replace(`**${name}:**`, '').trim() || null : null
    }
    const yearRaw = pick('זמן')
    const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null
    if (yearRaw && year === null) {
      rejected.push({ where: id, what: 'זמן שאינו שנה אחת — נשמר כטקסט בלבד', raw: yearRaw })
    }

    // choices are `##### <ID>.<n> — <title>`; the opening dialogue is `##### דיאלוג פתיחה`
    const sections = chunk.split(/\n(?=##### )/g)
    const opening = sections.find((s) => s.startsWith('##### דיאלוג פתיחה'))
    const choices: ScreenChoice[] = []

    for (const section of sections) {
      const ch = /^##### (([A-Z]\d{2})\.\d+) — (.+)$/m.exec(section)
      if (!ch) continue
      const sectionRows = section.split('\n')
      const condition = sectionRows.find((r) => r.trim().startsWith('תנאי:'))
      const outcome = sectionRows.find((r) => r.trim().startsWith('תוצאה לאחר ביצוע:'))
      const cont = /המשך:\s*`([A-Z]\d{2})`/.exec(section)

      const effects: ScreenChoice['effects'] = []
      if (outcome) {
        for (const segment of splitSegments(outcome.replace('תוצאה לאחר ביצוע:', '').trim())) {
          const parsed = parseSegment(segment)
          if (!parsed) {
            rejected.push({ where: ch[1]!, what: 'מקטע תוצאה בלי שם', raw: segment })
            continue
          }
          if (parsed.raw.startsWith('{') && parsed.value === null) {
            rejected.push({ where: ch[1]!, what: `JSON שלא נקרא במקטע "${parsed.key}"`, raw: parsed.raw })
          }
          effects.push(parsed)
        }
      } else {
        rejected.push({ where: ch[1]!, what: 'בחירה בלי שורת תוצאה', raw: (ch[3] ?? '').trim() })
      }

      choices.push({
        id: ch[1]!,
        titleHe: (ch[3] ?? '').trim(),
        conditionHe: condition ? condition.replace('תנאי:', '').trim() : null,
        lines: readLines(sectionRows),
        effects,
        next: cont ? cont[1]! : null,
      })
    }

    if (choices.length === 0) rejected.push({ where: id, what: 'סצנה בלי בחירות', raw: (head[2] ?? '').trim() })

    scenes.push({
      id,
      titleHe: (head[2] ?? '').trim(),
      chapter: chapters.get(id) ?? 'UNMAPPED',
      placeHe: pick('מקום'),
      year,
      yearRaw,
      kindHe: pick('סוג'),
      goalHe: field('מטרה'),
      actionsHe: field('פעולות'),
      opensHe: field('פתיחה'),
      directionHe: field('בימוי'),
      pastReadHe: field('העבר שנקרא'),
      anchorHe: field('עוגן'),
      alternativeHe: field('חלופה'),
      openingLines: opening ? readLines(opening.split('\n')) : [],
      choices,
    })

    if (!chapters.has(id)) rejected.push({ where: id, what: 'מזהה שאינו במפת הפרקים של המקור', raw: (head[2] ?? '').trim() })
  }

  // ------------------------------------------------------------------------- the report
  const effectKeys = new Map<string, number>()
  for (const scene of scenes) {
    for (const choice of scene.choices) {
      for (const effect of choice.effects) effectKeys.set(effect.key, (effectKeys.get(effect.key) ?? 0) + 1)
    }
  }
  const lines = scenes.reduce((n, s) => n + s.openingLines.length + s.choices.reduce((m, c) => m + c.lines.length, 0), 0)
  const choiceCount = scenes.reduce((n, s) => n + s.choices.length, 0)
  const dangling = new Set<string>()
  const known = new Set(scenes.map((s) => s.id))
  for (const scene of scenes) {
    for (const choice of scene.choices) if (choice.next && !known.has(choice.next)) dangling.add(choice.next)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(`${OUT_DIR}/scenes.json`, JSON.stringify(scenes, null, 2) + '\n', 'utf8')
  writeFileSync(
    `${OUT_DIR}/report.json`,
    JSON.stringify(
      {
        source: SOURCE,
        scenes: scenes.length,
        choices: choiceCount,
        dialogueLines: lines,
        chapters: [...new Set(scenes.map((s) => s.chapter))].sort(),
        effectKeys: [...effectKeys.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, n })),
        danglingContinuations: [...dangling].sort(),
        rejected,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )

  console.log('')
  console.log(`=== ${SOURCE} ===`)
  console.log(`  סצנות ${scenes.length} · בחירות ${choiceCount} · שורות דיאלוג ${lines}`)
  console.log(`  פרקים ${[...new Set(scenes.map((s) => s.chapter))].length}`)
  console.log('')
  console.log('=== מקטעי אפקט שנקראו ===')
  for (const [key, n] of [...effectKeys.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${key}`)
  if (dangling.size > 0) {
    console.log('')
    console.log(`=== המשך לסצנה שאינה בקובץ (${dangling.size}) ===`)
    for (const id of [...dangling].sort()) console.log(`  ${id}`)
  }
  console.log('')
  console.log(`=== נדחה ודווח (${rejected.length}) ===`)
  for (const row of rejected.slice(0, 40)) console.log(`  [${row.where}] ${row.what} — ${row.raw.slice(0, 80)}`)
  if (rejected.length > 40) console.log(`  ...ועוד ${rejected.length - 40}`)
  console.log('')
  console.log(`נכתב: ${OUT_DIR}/scenes.json · ${OUT_DIR}/report.json`)
}

main()
