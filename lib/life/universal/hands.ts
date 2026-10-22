/**
 * LIFE · hands — the work you do with your hands (owner's spec, 22.10.2026, §1 and §5).
 *
 * Before this file, stacking crates, washing a car, laying a table and holding the queue board were all
 * the same `carry` game. Different work must feel different in the hands, so every job in
 * `content/side.ts` (and any screenplay play whose id names a craft) resolves here to an ACTION:
 *
 *   · `zones` — rub, paint, sew or straighten areas until the dirt, the bare cloth or the tilt is gone
 *     (wash, stencil, stitch, hang). Drag across them, or tap each one, or move with the arrow keys.
 *   · `place` — one thing at a time, put where it belongs (stack, sort, tray, deliver, direct, invoice,
 *     assemble, unpack). Tap the place; a wrong place shakes and the thing stays in your hand to fix.
 *   · `frame` — a photograph: wait for every face, let the one who would rather not be in it step out.
 *   · `tune` — the radio dial, with a wave that settles as the voice comes clear.
 *
 * Every action carries one small interruption (mud thrown back on a clean panel, a long crate, a second
 * order, somebody looking away) and a variation picked from the job id and the player's age, so the
 * second car is muddy where the first was dusty. Nothing here is random at play time.
 *
 * The verdict is `score()`: it reads only what the hands did (finished or not, how many mistakes), never
 * the clock and never the assist/still mode — so an assisted player who does the same work earns the same
 * coins (spec §5, "identity, input and readability").
 */
import type {MiniGame, PlayResult} from './types'

export type HandsKind = 'zones' | 'place' | 'frame' | 'tune'
export type HandsAction =
  | 'stack' | 'sort' | 'wash' | 'tray' | 'deliver' | 'direct' | 'invoice' | 'assemble' | 'unpack'
  | 'hang' | 'stencil' | 'stitch' | 'frame' | 'tune'

/** what a job resolves to: one of the hands actions, or one of the games that were already its own */
export type JobPlay = HandsAction | MiniGame

/**
 * Every job of `content/side.ts`, by its play id. The ones that are play rather than work (penalties, a
 * chant, counting the tin, swapping doubles) keep their own game: they already feel like themselves.
 */
export const JOB_HANDS: Readonly<Record<string, JobPlay>> = {
  'job-crates': 'stack',
  'job-bottles': 'sort',
  'job-carwash': 'wash',
  'job-table': 'tray',
  'job-leaflets': 'deliver',
  'job-queue': 'direct',
  'job-invoice': 'invoice',
  'job-tins': 'assemble',
  'job-boxes': 'unpack',
  'job-flags': 'hang',
  'job-radio': 'tune',
  'job-kickwall': 'kick',
  'job-kickjackets': 'kick',
  'job-chant': 'clap',
  'job-echo': 'chant',
  'job-banner': 'chant',
  'job-drawer': 'count',
  'job-swap': 'count',
}

/** a screenplay play reaches a craft by naming it in its id (`r-ter-stencil`, `f20-photo`, `scarf-stitch`) */
const BY_WORD: readonly [RegExp, HandsAction][] = [
  [/stencil|paint|print/, 'stencil'],
  [/stitch|sew|patch|scarf-mend/, 'stitch'],
  [/photo|frame|camera|snap/, 'frame'],
  [/wash|sponge/, 'wash'],
  [/crate|stack/, 'stack'],
]

const HANDS = new Set<string>(['stack', 'sort', 'wash', 'tray', 'deliver', 'direct', 'invoice', 'assemble', 'unpack', 'hang', 'stencil', 'stitch', 'frame', 'tune'])

/** the hands action a play id opens, or null when the play keeps its own game */
export function handsFor(id: string): HandsAction | null {
  const j = JOB_HANDS[id]
  if (j) return HANDS.has(j) ? (j as HandsAction) : null
  const low = id.toLowerCase()
  for (const [re, a] of BY_WORD) if (re.test(low)) return a
  return null
}

/* ───────────── the same job, a different day ───────────── */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
/** a seeded stream for one job on one day: the same id and age always lay the table the same way */
export function stream(id: string, age: number): () => number {
  let a = (hash(`${id}|${age}`) % 2147483646) + 1
  return () => (a = (a * 16807) % 2147483647) / 2147483647
}

/** the age band a variation is chosen for: a child, a teenager, a grown-up */
export const band = (age: number): 0 | 1 | 2 => (age > 0 && age < 13 ? 0 : age > 0 && age < 20 ? 1 : 2)

export type Item = {id: string; label: string; to: string; mark?: string}
export type Target = {id: string; label: string}
export type Zone = {id: string; label: string; need: number}

export type HandsPlan = {
  action: HandsAction
  kind: HandsKind
  /** the variation of the day, in words (`mud`, `long crate`, `two orders`) */
  variant: string
  title: string
  help: string
  /** seconds the meter runs; an assisted (still) player gets half as long again, and the same verdict */
  limit: number
  /** place */
  items: Item[]
  targets: Target[]
  /** zones */
  zones: Zone[]
  /** the interruption: when it happens (share of the work done) and what it says */
  interrupt: {at: number; say: string; zone?: string; item?: Item}
  /** what the finished work looks like, in words, for the result line */
  after: string
}

const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!
function shuffle<T>(r: () => number, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j]!, xs[i]!] }
  return xs
}

/** The whole job as data: what is in your hands, where it goes, what interrupts, what it looks like after. */
export function plan(action: HandsAction, id: string, age = 0): HandsPlan {
  const r = stream(id, age), b = band(age)
  const base = {action, items: [] as Item[], targets: [] as Target[], zones: [] as Zone[]}
  switch (action) {
    case 'stack': {
      const long = r() < 0.5
      const kinds = [{w: 'heavy', l: 'Heavy crate · water', to: 'bottom'}, {w: 'mid', l: 'Crate · juice', to: 'middle'}, {w: 'light', l: 'Fragile · glass', to: 'top'}]
      const items = shuffle(r, [0, 0, 1, 1, 2, 2].map((k, i) => ({id: `c${i}`, label: kinds[k]!.l, to: kinds[k]!.to, mark: kinds[k]!.w})))
      return {...base, kind: 'place', variant: long ? 'a long crate' : 'a plain delivery', title: 'Stack the delivery', help: 'Heavy at the bottom, glass on top. Tap where each crate goes.', limit: 40, items,
        targets: [{id: 'top', label: 'Top'}, {id: 'middle', label: 'Middle'}, {id: 'bottom', label: 'Bottom'}],
        interrupt: {at: 0.5, say: long ? 'A long crate — it only lies flat at the bottom.' : 'Another crate off the van.', item: long ? {id: 'long', label: 'Long crate · flat only', to: 'bottom', mark: 'long'} : {id: 'extra', label: 'Fragile · eggs', to: 'top', mark: 'light'}},
        after: 'The pavement is clear and the stack stands straight.'}
    }
    case 'sort': {
      const n = b === 0 ? 6 : 8
      const pool = [{l: 'Glass bottle', to: 'crate'}, {l: 'Glass bottle', to: 'crate'}, {l: 'Tin can', to: 'bin'}, {l: 'Carton', to: 'bin'}, {l: 'Glass bottle · old label', to: 'crate'}]
      const items = Array.from({length: n}, (_, i) => { const p = pick(r, pool); return {id: `b${i}`, label: p.l, to: p.to} })
      return {...base, kind: 'place', variant: b === 0 ? 'a small bag' : 'a full sack', title: 'Sort the empties', help: 'Only glass bottles go back for the deposit. Tap the crate or the bin.', limit: 40, items,
        targets: [{id: 'crate', label: 'Deposit crate'}, {id: 'bin', label: 'Recycling'}],
        interrupt: {at: 0.5, say: 'Somebody drops another in the bag.', item: {id: 'drop', label: 'Glass bottle · chipped', to: 'crate'}},
        after: 'The crate is full and the slip is in your hand.'}
    }
    case 'wash': {
      const mud = r() < 0.5
      const need = mud ? 4 : 3
      return {...base, kind: 'zones', variant: mud ? 'mud' : 'dust', title: 'Wash the car', help: 'Sponge each panel until it shines — drag across it, or tap it, or use the arrows and Space.', limit: 45,
        zones: [{id: 'bonnet', label: 'Bonnet', need}, {id: 'door', label: 'Door', need}, {id: 'window', label: 'Window', need: need - 1}],
        interrupt: {at: 0.6, say: 'A bus goes through a puddle. The door again.', zone: 'door'},
        after: 'The paint shines where the dirt was.'}
    }
    case 'tray': {
      const table = id.includes('table')
      const want = table ? ['Plate', 'Fork', 'Cup'] : ['Coffee', 'Juice', 'Cake']
      const other = table ? ['Ashtray', 'Newspaper'] : ['Beer', 'Toast']
      const two = r() < 0.5 && b > 0
      const order = two ? [...want, want[0]!] : want
      const items = shuffle(r, [...order.map((l, i) => ({id: `o${i}`, label: l, to: 'tray'})), ...other.map((l, i) => ({id: `x${i}`, label: l, to: 'back'}))])
      return {...base, kind: 'place', variant: two ? 'two of the first' : 'one of each', title: table ? 'Lay the table' : 'Fill the tray', help: `The order: ${order.join(' · ')}. What is not on it goes back.`, limit: 40, items,
        targets: [{id: 'tray', label: table ? 'On the table' : 'On the tray'}, {id: 'back', label: 'Back'}],
        interrupt: {at: 0.55, say: table ? 'One more is coming for dinner.' : 'The table changes its mind: one more.', item: {id: 'more', label: want[1]!, to: 'tray'}},
        after: table ? 'Every place is laid.' : 'The tray goes out exactly as ordered.'}
    }
    case 'deliver': {
      const doors = b === 2 ? 5 : 4
      const targets = Array.from({length: doors}, (_, i) => ({id: `d${i}`, label: `No. ${2 + i * 2}`}))
      const items = shuffle(r, targets.map((t, i) => ({id: `p${i}`, label: `For ${t.label}`, to: t.id})))
      return {...base, kind: 'place', variant: `${doors} doors`, title: 'Hand out the papers', help: 'Each one has a door number on it. Tap the right door.', limit: 40, items, targets,
        interrupt: {at: 0.5, say: 'Number 4 calls from the window: one for upstairs too.', item: {id: 'up', label: 'For No. 4, upstairs', to: 'd1'}},
        after: 'The bundle is empty and the street has read it.'}
    }
    case 'direct': {
      const gates = ['A', 'B', 'C', 'D']
      const items = shuffle(r, Array.from({length: 6}, (_, i) => { const g = gates[Math.floor(r() * 4)]!; return {id: `t${i}`, label: `Ticket · gate ${g}`, to: g} }))
      return {...base, kind: 'place', variant: 'match day', title: 'Point them to their gate', help: 'Read the ticket, point at the gate. Tap the sign.', limit: 40, items,
        targets: gates.map(g => ({id: g, label: `Gate ${g}`})),
        interrupt: {at: 0.5, say: 'A family has three tickets and no idea. Help them.', item: {id: 'family', label: 'Family ticket · gate C', to: 'C'}},
        after: 'The queue moved, and nobody stood at the wrong turnstile.'}
    }
    case 'invoice': {
      const who = ['Bakery', 'Garage', 'Florist']
      const items = shuffle(r, Array.from({length: 5}, (_, i) => { const w = who[Math.floor(r() * 3)]!; return {id: `i${i}`, label: `Invoice · ${w} · ${10 + Math.floor(r() * 80)}`, to: w} }))
      return {...base, kind: 'place', variant: 'end of the month', title: 'File the invoices', help: 'Match each invoice to who it goes to. A wrong one can be filed again.', limit: 45, items,
        targets: who.map(w => ({id: w, label: w})),
        interrupt: {at: 0.5, say: 'The match starts on the screen behind you. One more invoice.', item: {id: 'late', label: 'Invoice · Garage · late', to: 'Garage'}},
        after: 'The pile is filed and the evening is yours.'}
    }
    case 'assemble': {
      const parts = [{l: 'Tin', to: 'tins'}, {l: 'Lid', to: 'lids'}, {l: 'Label roll', to: 'labels'}]
      const items = Array.from({length: 7}, (_, i) => { const p = pick(r, parts); return {id: `a${i}`, label: p.l, to: p.to} })
      return {...base, kind: 'place', variant: 'the morning run', title: 'Sort the workbench', help: 'Tins, lids, labels — each to its shelf before the boss looks.', limit: 40, items,
        targets: [{id: 'tins', label: 'Tins'}, {id: 'lids', label: 'Lids'}, {id: 'labels', label: 'Labels'}],
        interrupt: {at: 0.5, say: 'The boss drops a dented tin on the bench: that one is a lid job.', item: {id: 'dent', label: 'Spare lid', to: 'lids'}},
        after: 'The bench that was a mess is in rows. The boss checks one, nods.'}
    }
    case 'unpack': {
      const things = [{l: 'Plates', to: 'kitchen'}, {l: 'Books', to: 'shelf'}, {l: 'Mugs', to: 'kitchen'}, {l: 'Records', to: 'shelf'}, {l: 'Towels', to: 'cupboard'}]
      const items = shuffle(r, things.map((t, i) => ({id: `u${i}`, label: t.l, to: t.to})))
      return {...base, kind: 'place', variant: 'the last box', title: 'Unpack the last box', help: 'Everything to its place in the new flat.', limit: 40, items,
        targets: [{id: 'kitchen', label: 'Kitchen'}, {id: 'shelf', label: 'Shelf'}, {id: 'cupboard', label: 'Cupboard'}, {id: 'keep', label: 'Keep it out'}],
        interrupt: {at: 0.5, say: 'At the bottom, folded: an old scarf. Not for a cupboard.', item: {id: 'scarf', label: 'An old scarf', to: 'keep'}},
        after: 'The box is flat and the scarf is on the chair.'}
    }
    case 'hang': {
      const n = b === 0 ? 4 : 5
      return {...base, kind: 'zones', variant: `${n} flags`, title: 'Straighten the flags', help: 'Each flag hangs crooked. Tap it, or drag along the line, until it hangs level.', limit: 35,
        zones: Array.from({length: n}, (_, i) => ({id: `f${i}`, label: `Flag ${i + 1}`, need: 2})),
        interrupt: {at: 0.6, say: 'A gust. The second one twists again.', zone: 'f1'},
        after: 'The line hangs level across the road.'}
    }
    case 'stencil':
      return {...base, kind: 'zones', variant: 'one coat', title: 'Paint through the stencil', help: 'Hold the stencil and paint every letter — drag, tap, or arrows and Space.', limit: 45,
        zones: Array.from({length: 5}, (_, i) => ({id: `l${i}`, label: `Letter ${i + 1}`, need: 2})),
        interrupt: {at: 0.5, say: 'The stencil slips a finger’s width. That line will stay crooked.', zone: 'l2'},
        after: 'The letters are on the cloth — one of them a little crooked, for ever.'}
    case 'stitch':
      return {...base, kind: 'zones', variant: 'the torn edge', title: 'Stitch the tear', help: 'Sew along the line, stitch by stitch, in order.', limit: 45,
        zones: Array.from({length: 7}, (_, i) => ({id: `s${i}`, label: `${i + 1}`, need: 1})),
        interrupt: {at: 0.5, say: 'The thread knots. Undo that stitch and go again.', zone: 's3'},
        after: 'The seam holds. You can see it, and that is fine.'}
    case 'frame':
      return {...base, kind: 'frame', variant: 'the gang', title: 'Take the photo', help: 'Wait until every face is looking, then press. Ask anyone who would rather not be in it to step out.', limit: 35,
        items: ['Your mate', 'His sister', 'The neighbour', 'The new lad'].map((l, i) => ({id: `f${i}`, label: l, to: i === 2 ? 'out' : 'in'})),
        interrupt: {at: 0.3, say: 'The neighbour would rather not be in it. Let him step out.'},
        after: 'The print comes back: everyone looking, one face missing on purpose.'}
    case 'tune':
      return {...base, kind: 'tune', variant: 'evening static', title: 'Find the station', help: 'Turn the dial until the wave settles and the voice comes clear.', limit: 30,
        interrupt: {at: 0.5, say: 'A tram passes. The signal drifts.'},
        after: 'The voice is clear in the kitchen.'}
  }
}

/** What the hands did, nothing else: the verdict never reads the clock or the assist mode. */
export function score(done: boolean, mistakes: number): PlayResult {
  if (!done) return 'slip'
  return mistakes <= 1 ? 'good' : 'ok'
}

/** the meter's length in milliseconds: an assisted (still) player gets half as long again */
export const limitMs = (p: HandsPlan, assist: boolean) => Math.round(p.limit * 1000 * (assist ? 1.5 : 1))
