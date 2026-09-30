import { fold, score, type Searchable } from '@/lib/game/roster-search'

/**
 * חיפוש בתיבת הניחוש — client-safe. Hebrew through the roster's own ranking (family name
 * first, finals and geresh folded, reviewed aliases one step below), Latin by a folded
 * prefix/substring. It returns ids; the answer is compared by id on the server, never
 * as a string (spec §3 State 3).
 */
export type SearchEntry = {
  id: string
  nameHe: string
  givenHe: string
  familyHe: string
  aliasesHe: string[]
  latin: string[]
  /** "1977–1989" — tells two namesakes apart, says nothing about the answer */
  years: string
}

function latinKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function latinScore(names: readonly string[], q: string): number {
  let best = 0
  for (const name of names) {
    const key = latinKey(name)
    const words = key.split(' ')
    if (key === q) best = Math.max(best, 100)
    else if (words[words.length - 1]?.startsWith(q)) best = Math.max(best, 90)
    else if (words.some((w) => w.startsWith(q))) best = Math.max(best, 70)
    else if (key.includes(q)) best = Math.max(best, 30)
  }
  return best
}

export function searchPlayers(entries: readonly SearchEntry[], term: string, limit = 30): SearchEntry[] {
  const trimmed = term.trim()
  if (!trimmed) return []
  const isLatin = /[a-z]/i.test(trimmed)
  const folded = isLatin ? latinKey(trimmed) : fold(trimmed)
  if (!folded) return []
  return entries
    .map((entry) => {
      const rank = isLatin
        ? latinScore(entry.latin, folded)
        : score(
            {
              slug: entry.id,
              nameHe: entry.nameHe,
              givenHe: entry.givenHe,
              familyHe: entry.familyHe,
              initial: '',
              aliasesHe: entry.aliasesHe,
            } as Searchable,
            folded,
          )
      return { entry, rank }
    })
    .filter((row) => row.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.entry.familyHe.localeCompare(b.entry.familyHe, 'he'))
    .slice(0, limit)
    .map((row) => row.entry)
}
