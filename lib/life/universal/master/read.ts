/**
 * LIFE, universal — the master screenplay, READ (not decided).
 *
 * `docs/life/FANLIFE-LIFE-STORY-BIBLE-2026-10-15.md` §16–17 is the owner's master script: 32 chapters
 * (F01–F32, three scenes each), eight life paths (R-*, four scenes each) and one optional alternative
 * history (R-OWNER, four scenes). This module turns that markdown into data, and nothing else.
 *
 * Reading and deciding are two passes (The Worker rule 36, 79): this one writes no game content, derives no
 * engine effect from the prose, and invents nothing. A field the source does not carry is `null`; a line the
 * reader cannot place is REPORTED with its line number. The bible counts itself in its own preamble — the test
 * compares what is parsed with what the document says it contains.
 */

export type MasterOption = {
  /** `F01-S1.2` — scene id, option number */
  id: string
  n: number
  /** what the player does */
  textHe: string
  /** what it opens, in the source's words (a state, a possibility, a content — never a number) */
  resultHe: string | null
}

export type MasterScene = {
  /** `F01-S1`, `R-REG-S3` */
  id: string
  chapterId: string
  /** 1-based position in its chapter */
  n: number
  titleHe: string
  /** the scene's setup paragraphs, verbatim */
  bodyHe: string[]
  options: MasterOption[]
  line: number
}

export type AgeWindow = {
  /** the source's own sentence, verbatim */
  rawHe: string
  minAge: number | null
  maxAge: number | null
  /** `18+` reads as min 18, open-ended */
  openEnded: boolean
}

export type MasterChapter = {
  /** `F01`, `R-REG` */
  id: string
  kind: 'master' | 'route' | 'alt-history'
  titleHe: string
  window: AgeWindow | null
  /** the anchor / dependency sentence (masters only) */
  anchorHe: string | null
  collectionHe: string | null
  /** `מעבר והמשך` (masters only) */
  continuationHe: string | null
  /** other chapter ids the prose names (`F29`, `R-ABROAD`) — resolved by the test, never by the reader */
  mentions: string[]
  scenes: MasterScene[]
  line: number
}

export type MasterRow = {id: string; titleHe: string; windowHe: string}

export type MasterReport = {
  /** a source line the reader could not place, with the reason */
  unread: {line: number; text: string; why: string}[]
}

export type MasterScreenplay = {
  schemaVersion: 1
  source: string
  /** the §16 table — a second statement of every master chapter, to be agreed with the headings */
  table: MasterRow[]
  chapters: MasterChapter[]
  report: MasterReport
}

const NUM = /^(\d)\.\s+(.*)$/
const CHAPTER = /^###\s+((?:F\d{2})|(?:R-[A-Z]+))\s+·\s+(.+?)\s*$/
const SCENE = /^#####\s+((?:F\d{2}|R-[A-Z]+)-S(\d))\s+·\s+(.+?)\s*$/
const FIELD = /^\*\*([^*]+):\*\*\s*(.*)$/
const MENTION = /\b(F\d{2}|R-[A-Z]+)\b/g

/** `5–9`, `18–35`, `22–70; …`, `18+`, `מ־F09 ולאורך הבגרות` (no numbers → null). */
export function readWindow(raw: string): AgeWindow {
  const head = raw.split(';')[0]!.trim()
  const range = /^(\d{1,2})\s*[–-]\s*(\d{1,2})/.exec(head)
  if (range) return {rawHe: raw, minAge: Number(range[1]), maxAge: Number(range[2]), openEnded: false}
  const open = /^(\d{1,2})\+/.exec(head)
  if (open) return {rawHe: raw, minAge: Number(open[1]), maxAge: null, openEnded: true}
  return {rawHe: raw, minAge: null, maxAge: null, openEnded: false}
}

/** Splits `text: result` on the FIRST colon that is followed by a space; a bare option has no result. */
export function splitOption(s: string): {textHe: string; resultHe: string | null} {
  const at = s.indexOf(': ')
  if (at < 0) return {textHe: s.trim(), resultHe: null}
  return {textHe: s.slice(0, at).trim(), resultHe: s.slice(at + 2).trim() || null}
}

const mentionsIn = (text: string, self: string): string[] =>
  [...new Set([...text.matchAll(MENTION)].map(m => m[1]!))].filter(id => id !== self)

/** Reads §16 and §17 of the bible. `md` is the whole document. */
export function readMasterScreenplay(md: string, source: string): MasterScreenplay {
  const lines = md.split('\n')
  const from = lines.findIndex(l => /^##\s+16\./.test(l))
  const end = lines.findIndex(l => /^##\s+18\./.test(l))
  if (from < 0 || end < 0 || end <= from) throw new Error('MASTER_SECTIONS: §16/§18 headings not found')

  const report: MasterReport = {unread: []}
  const table: MasterRow[] = []
  const chapters: MasterChapter[] = []
  let chapter: MasterChapter | null = null
  let scene: MasterScene | null = null
  let para: string[] = []

  const flushPara = () => {
    if (scene && para.length && scene.options.length === 0) scene.bodyHe.push(para.join(' ').trim())
    para = []
  }

  for (let i = from + 1; i < end; i++) {
    const raw = lines[i]!
    const line = raw.trim()
    const no = i + 1

    // §16's table: | F01 | name | window |
    const row = /^\|\s*(F\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/.exec(line)
    if (row) { table.push({id: row[1]!, titleHe: row[2]!, windowHe: row[3]!}); continue }
    if (line.startsWith('|')) continue

    const c = CHAPTER.exec(line)
    if (c) {
      flushPara()
      const id = c[1]!
      chapter = {
        id,
        kind: id === 'R-OWNER' ? 'alt-history' : id.startsWith('R-') ? 'route' : 'master',
        titleHe: c[2]!, window: null, anchorHe: null, collectionHe: null, continuationHe: null,
        mentions: [], scenes: [], line: no,
      }
      chapters.push(chapter); scene = null
      continue
    }

    const s = SCENE.exec(line)
    if (s) {
      flushPara()
      if (!chapter || !s[1]!.startsWith(chapter.id + '-')) {
        report.unread.push({line: no, text: line, why: 'scene outside its chapter'})
        scene = null
        continue
      }
      scene = {id: s[1]!, chapterId: chapter.id, n: Number(s[2]), titleHe: s[3]!, bodyHe: [], options: [], line: no}
      chapter.scenes.push(scene)
      continue
    }

    if (!line) { flushPara(); continue }
    if (/^##\s/.test(line)) { flushPara(); chapter = null; scene = null; continue }   // a new top-level section ends the script
    if (!chapter) continue

    const f = FIELD.exec(line)
    if (f) {
      flushPara()
      const label = f[1]!.trim(), value = f[2]!.trim()
      if (label === 'חלון' || label === 'חלון ותנאי') chapter.window = readWindow(value)
      else if (label === 'עוגן/תלות') chapter.anchorHe = value
      else if (label === 'האוסף' || label === 'האוסף והמשכיות') chapter.collectionHe = value
      else if (label === 'מעבר והמשך') chapter.continuationHe = value
      else report.unread.push({line: no, text: line, why: `unknown field "${label}"`})
      scene = null
      continue
    }

    const o = NUM.exec(line)
    if (o && scene) {
      const n = Number(o[1]), {textHe, resultHe} = splitOption(o[2]!)
      scene.options.push({id: `${scene.id}.${n}`, n, textHe, resultHe })
      continue
    }

    if (scene && scene.options.length === 0) { para.push(line); continue }
    report.unread.push({line: no, text: line, why: o ? 'option outside a scene' : 'prose outside a scene body'})
  }
  flushPara()

  for (const ch of chapters) {
    const prose = [ch.anchorHe, ch.collectionHe, ch.continuationHe, ch.window?.rawHe].filter(Boolean).join(' ')
    ch.mentions = mentionsIn(prose, ch.id)
  }
  return {schemaVersion: 1, source, table, chapters, report}
}

/** What §0 of the bible says it contains — read from the preamble, never typed here. */
export function statedCounts(md: string): {chapters: number; scenes: number; routeScenes: number; altScenes: number; total: number; options: number} | null {
  const m = /(\d+)\s+פרקי מאסטר ובהם\s+(\d+)\s+סצנות;\s+(\d+)\s+סצנות מסלול[^;]*;\s+(\d+)\s+סצנות אופציונליות[^.]*\.\s*בסך הכול\s+(\d+)\s+סצנות מאסטר ו־(\d+)\s+אפשרויות/.exec(md)
  if (!m) return null
  return {chapters: +m[1]!, scenes: +m[2]!, routeScenes: +m[3]!, altScenes: +m[4]!, total: +m[5]!, options: +m[6]!}
}
