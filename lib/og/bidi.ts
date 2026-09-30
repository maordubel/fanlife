/**
 * עברית בתמונה — visual order for the OG renderer (delta 89).
 *
 * `next/og` (satori 0.x) lays glyphs out in LOGICAL order, left to right, with no bidi
 * pass: a Hebrew line comes out mirrored. So every Hebrew string a card prints goes
 * through `visual()` first — the Unicode bidi algorithm cut down to what a card holds
 * (one line, base direction RTL): runs of Hebrew (with the spaces and punctuation between
 * them) are reversed character by character with brackets mirrored, runs of digits and
 * Latin stay as they are, and the order of the runs is reversed. A card never lets the
 * renderer wrap a Hebrew line; `lines()` breaks it first, then each line is made visual.
 */

const RTL = /[֐-׿יִ-ﭏ]/
const STRONG_LTR = /[A-Za-z0-9À-ɏ]/
const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«' }

type Run = { rtl: boolean; text: string }

function runs(text: string): Run[] {
  const out: Run[] = []
  // a neutral takes the direction of what surrounds it; ties (between LTR and RTL) go RTL
  const chars = [...text]
  const dir: (boolean | null)[] = chars.map((c) => (RTL.test(c) ? true : STRONG_LTR.test(c) ? false : null))
  // digits joined by : . , / - stay one LTR number ("2:0", "18.4", "1:0")
  for (let i = 1; i < chars.length - 1; i += 1) {
    if (dir[i] === null && /[:.,/\-–]/.test(chars[i] as string) && dir[i - 1] === false && dir[i + 1] === false) dir[i] = false
  }
  for (let i = 0; i < chars.length; i += 1) {
    if (dir[i] !== null) continue
    let prev: boolean | null = null
    for (let j = i - 1; j >= 0; j -= 1) if (dir[j] !== null) { prev = dir[j] as boolean; break }
    let next: boolean | null = null
    for (let j = i + 1; j < chars.length; j += 1) if (dir[j] !== null) { next = dir[j] as boolean; break }
    dir[i] = prev === false && next === false ? false : true
  }
  chars.forEach((c, i) => {
    const rtl = dir[i] as boolean
    const last = out[out.length - 1]
    if (last && last.rtl === rtl) last.text += c
    else out.push({ rtl, text: c })
  })
  return out
}

/** One line of mixed text, base RTL → the order a left-to-right renderer must draw it in. */
export function visual(text: string): string {
  if (!RTL.test(text)) return text
  return runs(text)
    .reverse()
    .map((run) => (run.rtl ? [...run.text].reverse().map((c) => MIRROR[c] ?? c).join('') : run.text))
    .join('')
}

/** Break a line at spaces so no line is longer than `max` characters (a word is never cut). */
export function lines(text: string, max: number, limit = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > max && line) {
      out.push(line)
      line = word
    } else line = next
  }
  if (line) out.push(line)
  if (out.length > limit) {
    const kept = out.slice(0, limit)
    kept[limit - 1] = `${kept[limit - 1]}…`
    return kept
  }
  return out
}
