/**
 * החוברות — the printed things in this game that nobody on this project made.
 *
 * A booklet is not art and it is not a document card: it is an OBJECT, with a number of
 * pages, that somebody kept. The first one is Maor's father's — the championship booklet
 * of 1980/81, bought the year Maor was born, scanned in 2016 off a Canon in somebody's
 * office and sent here in September 2026 with one instruction: put it in the living room
 * of the eighties, let the boy find it, and let it read like the real thing.
 *
 * The rule that governs it is the archive's, not the story's: the game may hold up a
 * primary source and say where it came from, and it may not print a meaning over the top
 * of it. `sourceHe` is a provenance line. There is no summary, no highlight, no "did you
 * know" — twenty-four pages exactly as they are, and whatever the player takes from them
 * is theirs.
 */

export type BookDef = {
  id: string
  titleHe: string
  /** the line under the pages: where this came from, and nothing about what it means */
  sourceHe: string
  pages: number
  /** where the scans live */
  root: string
  /** the file for a zero-based page */
  file: (page: number) => string
  /** the flag raised the first time it is opened, so the world can notice */
  seenFlag: string
}

export const BOOKS: Record<string, BookDef> = {
  '8081': {
    id: '8081',
    titleHe: 'אליפות הפועל תל אביב 1980/81',
    sourceHe: 'חוברת האליפות של הפועל תל אביב, עונת 1980/81 — סריקה מעותק פרטי, צוות The Worker.',
    pages: 24,
    root: '/life/docs',
    file: (page: number) => `book8081-${String(page + 1).padStart(2, '0')}.jpg`,
    seenFlag: 'book:8081',
  },
}

export const bookFor = (id: string): BookDef | null => BOOKS[id] ?? null

/** where the reader left off, per book — a booklet put down halfway is not started again */
export const bookPageFlag = (id: string) => `book:${id}:page`
