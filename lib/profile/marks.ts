/**
 * פנקס הנקמות — what this device got right and wrong, question by question.
 *
 * Gate 2's Revenge mode is only real if the app remembers WHICH questions beat you
 * (brief §13: "track wrong question IDs in shared persistence … do not fall back to fake
 * revenge content without indicating it"). This is that memory: one small record per
 * question id, keyed on the master's opaque `q_` id — never on a natural key, because a
 * natural key moves the day somebody corrects the archive, and a stable id is what gets
 * persisted (rule 35). A retired id still resolves: the master's `aliases` map follows it.
 *
 * The storage pattern is `lib/profile/store.ts`'s, deliberately: one key, every read and
 * write wrapped, and a ledger that cannot be read is an EMPTY ledger, never a crash —
 * private mode, blocked storage and corrupted JSON all play exactly as a first visit.
 * It lives in its own key rather than inside the profile so the two can never half-write
 * each other; `lib/portal/marks-sync.ts` carries it to the account when there is one.
 *
 * Pure functions first (tested in `tests/marks.test.ts`), the storage seam last.
 */

const KEY = 'worker.marks.v1'

/** the ledger never grows past this — the oldest settled questions go first */
export const MARKS_CAP = 2000

export type Mark = {
  /** times asked */
  t: number
  /** times wrong */
  w: number
  /** times right */
  r: number
  /** the LAST outcome — revenge is "last time it beat you", not "it ever beat you" */
  last: 'w' | 'r'
  /** ISO timestamp of the last answer — what decides which side of a merge is newer */
  at: string
}

export type Marks = Record<string, Mark>

/* ------------------------------------------------------------------- pure */

function valid(mark: unknown): mark is Mark {
  if (!mark || typeof mark !== 'object') return false
  const m = mark as Record<string, unknown>
  return (
    typeof m.t === 'number' &&
    typeof m.w === 'number' &&
    typeof m.r === 'number' &&
    (m.last === 'w' || m.last === 'r') &&
    typeof m.at === 'string'
  )
}

/** keep only well-formed entries — a hand-edited or half-written record is dropped, not trusted */
export function cleanMarks(input: unknown): Marks {
  if (!input || typeof input !== 'object') return {}
  const out: Marks = {}
  for (const [id, mark] of Object.entries(input as Record<string, unknown>)) {
    if (typeof id === 'string' && id.length > 0 && valid(mark)) out[id] = { ...mark }
  }
  return out
}

/**
 * Past the cap, what goes: settled questions (last answer right) before pending ones,
 * oldest first within each — so a device that has played two thousand questions still
 * remembers every one that is waiting for revenge.
 */
export function capMarks(marks: Marks, cap: number = MARKS_CAP): Marks {
  const entries = Object.entries(marks)
  if (entries.length <= cap) return marks
  const ranked = entries.sort(([, a], [, b]) => {
    if (a.last !== b.last) return a.last === 'w' ? -1 : 1
    return b.at.localeCompare(a.at)
  })
  return Object.fromEntries(ranked.slice(0, cap))
}

/** one answer, into the ledger */
export function applyAnswer(marks: Marks, id: string, correct: boolean, at: string = new Date().toISOString()): Marks {
  const prior = marks[id]
  const next: Mark = {
    t: (prior?.t ?? 0) + 1,
    w: (prior?.w ?? 0) + (correct ? 0 : 1),
    r: (prior?.r ?? 0) + (correct ? 1 : 0),
    last: correct ? 'r' : 'w',
    at,
  }
  return capMarks({ ...marks, [id]: next })
}

/** the questions waiting for revenge — last answer wrong — newest first */
export function pendingRevenge(marks: Marks): string[] {
  return Object.entries(marks)
    .filter(([, mark]) => mark.last === 'w')
    .sort(([, a], [, b]) => b.at.localeCompare(a.at))
    .map(([id]) => id)
}

/** every question this device has been asked, newest first */
export function seen(marks: Marks): string[] {
  return Object.entries(marks)
    .sort(([, a], [, b]) => b.at.localeCompare(a.at))
    .map(([id]) => id)
}

/**
 * Two ledgers into one — the device's and the account's.
 *
 * Per question, the NEWER entry decides the last outcome, and the counters take the max
 * of the two sides. Not a union of "wrong" sets: a question avenged on this phone after
 * the laptop last synced must not come back as pending just because the laptop still
 * remembers the miss — and not a sum either, because the same answers reach both sides
 * and would be counted twice.
 */
export function mergeMarks(a: Marks, b: Marks): Marks {
  const out: Marks = { ...a }
  for (const [id, theirs] of Object.entries(b)) {
    const ours = out[id]
    if (!ours) {
      out[id] = { ...theirs }
      continue
    }
    const newer = theirs.at > ours.at ? theirs : ours
    const w = Math.max(ours.w, theirs.w)
    const r = Math.max(ours.r, theirs.r)
    out[id] = { t: Math.max(ours.t, theirs.t, w + r), w, r, last: newer.last, at: newer.at }
  }
  return capMarks(out)
}

/**
 * Per topic: how often right — for gate 10's card ("הנושא הכי חד שלך"). The topic of an
 * id is the master's to know, so the lookup is handed in rather than imported here.
 */
export function strengths(
  marks: Marks,
  topicOf: (id: string) => string | null,
): Array<{ topic: string; right: number; asked: number; rate: number }> {
  const totals = new Map<string, { right: number; asked: number }>()
  for (const [id, mark] of Object.entries(marks)) {
    const topic = topicOf(id)
    if (!topic) continue
    const prior = totals.get(topic) ?? { right: 0, asked: 0 }
    totals.set(topic, { right: prior.right + mark.r, asked: prior.asked + mark.w + mark.r })
  }
  return [...totals.entries()]
    .map(([topic, { right, asked }]) => ({ topic, right, asked, rate: asked > 0 ? right / asked : 0 }))
    .sort((a, b) => b.rate - a.rate || b.asked - a.asked)
}

/* ----------------------------------------------------------------- storage */

export function readMarks(): Marks {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return {}
    return cleanMarks(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function writeMarks(marks: Marks): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(capMarks(marks)))
  } catch {
    // private mode, blocked storage — revenge simply starts empty next time
  }
}

/** Record one graded answer on this device. Returns the ledger as written. */
export function recordAnswer(id: string, correct: boolean): Marks {
  const next = applyAnswer(readMarks(), id, correct)
  writeMarks(next)
  return next
}
