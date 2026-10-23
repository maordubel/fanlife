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
 *   · `motion` — a short real movement, step by step: grip, pull, turn, fold, pass, place (open & fold a
 *     drawer, an envelope, a packet, a letter; tie & wear a scarf, laces, an armband). Drag the thing in
 *     the direction the step asks, or press and hold, or the arrow key; a wrong pull is a slip.
 *   · `compare` — two things side by side: turn the second one over, then decide (a double or a new
 *     one, the right ticket or the wrong one). Deciding before you have looked is a slip.
 *
 * `scope: 'short'` asks for clearly less of the same work (fewer crates, doors, panels, letters, steps);
 * the feel stays the same. `people` puts the people actually in the scene into the photograph.
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

export type HandsKind = 'zones' | 'place' | 'frame' | 'tune' | 'motion' | 'compare'
export type HandsAction =
  | 'stack' | 'sort' | 'wash' | 'tray' | 'deliver' | 'direct' | 'invoice' | 'assemble' | 'unpack'
  | 'hang' | 'stencil' | 'stitch' | 'frame' | 'tune'
  | 'open' | 'tie' | 'compare'

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
  'job-swap': 'compare',
}

/** a screenplay play reaches a craft by naming it in its id (`r-ter-stencil`, `f20-photo`, `scarf-stitch`) */
const BY_WORD: readonly [RegExp, HandsAction][] = [
  [/stencil|paint|print/, 'stencil'],
  // a scarf that is MENDED is sewn (below); a scarf that is TIED or worn is tied
  [/scarf-mend/, 'stitch'],
  [/scarf-tie|scarf-wear|lace|armband|\btie\b|-tie\b|knot/, 'tie'],
  [/stitch|sew|patch|scarf-mend/, 'stitch'],
  [/photo|frame|camera|snap/, 'frame'],
  [/wash|sponge/, 'wash'],
  [/crate|stack/, 'stack'],
  [/drawer|envelope|packet|letter|wardrobe|unfold|fold|-open\b|open-/, 'open'],
  [/swap|double|compare|ticket-check|-check\b/, 'compare'],
]

/**
 * Scene plays of the universal screenplay are named `<scene>:<option>`, so their id does not say what
 * the hands do; the scene's own task line does. These are the scenes whose task is to open, tie or
 * compare (read from the task text in `screenplay/*.ts`, 23.10.2026).
 */
export const SCENE_HANDS: Readonly<Record<string, HandsAction>> = {
  S02: 'open',     // "Open the box and take out the scarf"
  S07: 'compare',  // "Pack the scarf and check the tickets"
  S10: 'compare',  // "Sort the doubles for a swap"
  S38: 'compare',  // "Check the record before closing it"
}

const HANDS = new Set<string>(['stack', 'sort', 'wash', 'tray', 'deliver', 'direct', 'invoice', 'assemble', 'unpack', 'hang', 'stencil', 'stitch', 'frame', 'tune', 'open', 'tie', 'compare'])

/** the hands action a play id opens, or null when the play keeps its own game */
export function handsFor(id: string): HandsAction | null {
  const j = JOB_HANDS[id]
  if (j) return HANDS.has(j) ? (j as HandsAction) : null
  const scene = /^(S\d+):/.exec(id)?.[1]
  if (scene && SCENE_HANDS[scene]) return SCENE_HANDS[scene]!
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

export type Item = {id: string; label: string; to: string; mark?: string; pair?: readonly [string, string]; back?: string}
/** a direction on the screen (a picture: always ltr, so `right` is right on every page) */
export type Dir = 'up' | 'down' | 'left' | 'right'
/** one movement of the hands: grip, pull, turn, fold, pass, place, wrap, tighten */
export type Step = {id: string; verb: string; label: string; dir: Dir}
/** how much of the job: the short version asks for clearly less of the same work */
export type Scope = 'short' | 'full'
export type PlanOptions = {scope?: Scope; people?: readonly string[]}
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
  /** motion: the movements in order (and what is being opened or tied, for the picture) */
  steps: Step[]
  subject: string
  scope: Scope
  /** the interruption: when it happens (share of the work done) and what it says */
  interrupt: {at: number; say: string; zone?: string; item?: Item; step?: Step}
  /** what the finished work looks like, in words, for the result line */
  after: string
}

const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!
function shuffle<T>(r: () => number, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j]!, xs[i]!] }
  return xs
}

/** The whole job as data: what is in your hands, where it goes, what interrupts, what it looks like after. */
export function plan(action: HandsAction, id: string, age = 0, opt: PlanOptions = {}): HandsPlan {
  const r = stream(id, age), b = band(age)
  const short = opt.scope === 'short'
  /** the short version of a count: clearly fewer, never fewer than two */
  const few = (n: number) => (short ? Math.max(2, Math.round(n * 0.6)) : n)
  const base = {action, items: [] as Item[], targets: [] as Target[], zones: [] as Zone[], steps: [] as Step[], subject: '', scope: (short ? 'short' : 'full') as Scope}
  const low = id.toLowerCase()
  switch (action) {
    case 'stack': {
      const long = r() < 0.5
      const kinds = [{w: 'heavy', l: 'Heavy crate · water', to: 'bottom'}, {w: 'mid', l: 'Crate · juice', to: 'middle'}, {w: 'light', l: 'Fragile · glass', to: 'top'}]
      const items = shuffle(r, (short ? [0, 1, 2, 2] : [0, 0, 1, 1, 2, 2]).map((k, i) => ({id: `c${i}`, label: kinds[k]!.l, to: kinds[k]!.to, mark: kinds[k]!.w})))
      return {...base, kind: 'place', variant: long ? 'a long crate' : 'a plain delivery', title: 'Stack the delivery', help: 'Heavy at the bottom, glass on top. Tap where each crate goes.', limit: 40, items,
        targets: [{id: 'top', label: 'Top'}, {id: 'middle', label: 'Middle'}, {id: 'bottom', label: 'Bottom'}],
        interrupt: {at: 0.5, say: long ? 'A long crate — it only lies flat at the bottom.' : 'Another crate off the van.', item: long ? {id: 'long', label: 'Long crate · flat only', to: 'bottom', mark: 'long'} : {id: 'extra', label: 'Fragile · eggs', to: 'top', mark: 'light'}},
        after: 'The pavement is clear and the stack stands straight.'}
    }
    case 'sort': {
      const n = few(b === 0 ? 6 : 8)
      const pool = [{l: 'Glass bottle', to: 'crate'}, {l: 'Glass bottle', to: 'crate'}, {l: 'Tin can', to: 'bin'}, {l: 'Carton', to: 'bin'}, {l: 'Glass bottle · old label', to: 'crate'}]
      const items = Array.from({length: n}, (_, i) => { const p = pick(r, pool); return {id: `b${i}`, label: p.l, to: p.to} })
      return {...base, kind: 'place', variant: b === 0 ? 'a small bag' : 'a full sack', title: 'Sort the empties', help: 'Only glass bottles go back for the deposit. Tap the crate or the bin.', limit: 40, items,
        targets: [{id: 'crate', label: 'Deposit crate'}, {id: 'bin', label: 'Recycling'}],
        interrupt: {at: 0.5, say: 'Somebody drops another in the bag.', item: {id: 'drop', label: 'Glass bottle · chipped', to: 'crate'}},
        after: 'The crate is full and the slip is in your hand.'}
    }
    case 'wash': {
      const mud = r() < 0.5
      const need = (mud ? 4 : 3) - (short ? 1 : 0)
      return {...base, kind: 'zones', variant: mud ? 'mud' : 'dust', title: 'Wash the car', help: 'Sponge each panel until it shines — drag across it, or tap it, or use the arrows and Space.', limit: 45,
        zones: [{id: 'bonnet', label: 'Bonnet', need}, {id: 'door', label: 'Door', need}, {id: 'window', label: 'Window', need: Math.max(1, need - 1)}],
        interrupt: {at: 0.6, say: 'A bus goes through a puddle. The door again.', zone: 'door'},
        after: 'The paint shines where the dirt was.'}
    }
    case 'tray': {
      const table = id.includes('table')
      const want = table ? ['Plate', 'Fork', 'Cup'] : ['Coffee', 'Juice', 'Cake']
      const other = (table ? ['Ashtray', 'Newspaper'] : ['Beer', 'Toast']).slice(0, short ? 1 : 2)
      const two = r() < 0.5 && b > 0 && !short
      const order = short ? want.slice(0, 2) : two ? [...want, want[0]!] : want
      const items = shuffle(r, [...order.map((l, i) => ({id: `o${i}`, label: l, to: 'tray'})), ...other.map((l, i) => ({id: `x${i}`, label: l, to: 'back'}))])
      return {...base, kind: 'place', variant: two ? 'two of the first' : 'one of each', title: table ? 'Lay the table' : 'Fill the tray', help: `The order: ${order.join(' · ')}. What is not on it goes back.`, limit: 40, items,
        targets: [{id: 'tray', label: table ? 'On the table' : 'On the tray'}, {id: 'back', label: 'Back'}],
        interrupt: {at: 0.55, say: table ? 'One more is coming for dinner.' : 'The table changes its mind: one more.', item: {id: 'more', label: want[1]!, to: 'tray'}},
        after: table ? 'Every place is laid.' : 'The tray goes out exactly as ordered.'}
    }
    case 'deliver': {
      const doors = few(b === 2 ? 5 : 4)
      const targets = Array.from({length: doors}, (_, i) => ({id: `d${i}`, label: `No. ${2 + i * 2}`}))
      const items = shuffle(r, targets.map((t, i) => ({id: `p${i}`, label: `For ${t.label}`, to: t.id})))
      return {...base, kind: 'place', variant: `${doors} doors`, title: 'Hand out the papers', help: 'Each one has a door number on it. Tap the right door.', limit: 40, items, targets,
        interrupt: {at: 0.5, say: 'Number 4 calls from the window: one for upstairs too.', item: {id: 'up', label: 'For No. 4, upstairs', to: 'd1'}},
        after: 'The bundle is empty and the street has read it.'}
    }
    case 'direct': {
      const gates = ['A', 'B', 'C', 'D']
      const items = shuffle(r, Array.from({length: few(6)}, (_, i) => { const g = gates[Math.floor(r() * 4)]!; return {id: `t${i}`, label: `Ticket · gate ${g}`, to: g} }))
      return {...base, kind: 'place', variant: 'match day', title: 'Point them to their gate', help: 'Read the ticket, point at the gate. Tap the sign.', limit: 40, items,
        targets: gates.map(g => ({id: g, label: `Gate ${g}`})),
        interrupt: {at: 0.5, say: 'A family has three tickets and no idea. Help them.', item: {id: 'family', label: 'Family ticket · gate C', to: 'C'}},
        after: 'The queue moved, and nobody stood at the wrong turnstile.'}
    }
    case 'invoice': {
      const who = ['Bakery', 'Garage', 'Florist']
      const items = shuffle(r, Array.from({length: few(5)}, (_, i) => { const w = who[Math.floor(r() * 3)]!; return {id: `i${i}`, label: `Invoice · ${w} · ${10 + Math.floor(r() * 80)}`, to: w} }))
      return {...base, kind: 'place', variant: 'end of the month', title: 'File the invoices', help: 'Match each invoice to who it goes to. A wrong one can be filed again.', limit: 45, items,
        targets: who.map(w => ({id: w, label: w})),
        interrupt: {at: 0.5, say: 'The match starts on the screen behind you. One more invoice.', item: {id: 'late', label: 'Invoice · Garage · late', to: 'Garage'}},
        after: 'The pile is filed and the evening is yours.'}
    }
    case 'assemble': {
      const parts = [{l: 'Tin', to: 'tins'}, {l: 'Lid', to: 'lids'}, {l: 'Label roll', to: 'labels'}]
      const items = Array.from({length: few(7)}, (_, i) => { const p = pick(r, parts); return {id: `a${i}`, label: p.l, to: p.to} })
      return {...base, kind: 'place', variant: 'the morning run', title: 'Sort the workbench', help: 'Tins, lids, labels — each to its shelf before the boss looks.', limit: 40, items,
        targets: [{id: 'tins', label: 'Tins'}, {id: 'lids', label: 'Lids'}, {id: 'labels', label: 'Labels'}],
        interrupt: {at: 0.5, say: 'The boss drops a dented tin on the bench: that one is a lid job.', item: {id: 'dent', label: 'Spare lid', to: 'lids'}},
        after: 'The bench that was a mess is in rows. The boss checks one, nods.'}
    }
    case 'unpack': {
      const things = [{l: 'Plates', to: 'kitchen'}, {l: 'Books', to: 'shelf'}, {l: 'Mugs', to: 'kitchen'}, {l: 'Records', to: 'shelf'}, {l: 'Towels', to: 'cupboard'}]
      const items = shuffle(r, things.slice(0, few(things.length)).map((t, i) => ({id: `u${i}`, label: t.l, to: t.to})))
      return {...base, kind: 'place', variant: 'the last box', title: 'Unpack the last box', help: 'Everything to its place in the new flat.', limit: 40, items,
        targets: [{id: 'kitchen', label: 'Kitchen'}, {id: 'shelf', label: 'Shelf'}, {id: 'cupboard', label: 'Cupboard'}, {id: 'keep', label: 'Keep it out'}],
        interrupt: {at: 0.5, say: 'At the bottom, folded: an old scarf. Not for a cupboard.', item: {id: 'scarf', label: 'An old scarf', to: 'keep'}},
        after: 'The box is flat and the scarf is on the chair.'}
    }
    case 'hang': {
      const n = few(b === 0 ? 4 : 5) + (short ? 1 : 0)
      return {...base, kind: 'zones', variant: `${n} flags`, title: 'Straighten the flags', help: 'Each flag hangs crooked. Tap it, or drag along the line, until it hangs level.', limit: 35,
        zones: Array.from({length: n}, (_, i) => ({id: `f${i}`, label: `Flag ${i + 1}`, need: short ? 1 : 2})),
        interrupt: {at: 0.6, say: 'A gust. The second one twists again.', zone: 'f1'},
        after: 'The line hangs level across the road.'}
    }
    case 'stencil':
      return {...base, kind: 'zones', variant: 'one coat', title: 'Paint through the stencil', help: 'Hold the stencil and paint every letter — drag, tap, or arrows and Space.', limit: 45,
        zones: Array.from({length: few(5)}, (_, i) => ({id: `l${i}`, label: `Letter ${i + 1}`, need: 2})),
        interrupt: {at: 0.5, say: 'The stencil slips a finger’s width. That line will stay crooked.', zone: 'l2'},
        after: 'The letters are on the cloth — one of them a little crooked, for ever.'}
    case 'stitch':
      return {...base, kind: 'zones', variant: 'the torn edge', title: 'Stitch the tear', help: 'Sew along the line, stitch by stitch, in order.', limit: 45,
        zones: Array.from({length: few(7)}, (_, i) => ({id: `s${i}`, label: `${i + 1}`, need: 1})),
        interrupt: {at: 0.5, say: 'The thread knots. Undo that stitch and go again.', zone: 's3'},
        after: 'The seam holds. You can see it, and that is fine.'}
    case 'frame': {
      // the people actually in the scene, by the names the scene gives them; a generic gang only when the
      // scene has nobody to name (a QA stand, a job with no one in the room)
      const named = [...new Set((opt.people ?? []).map(n => n.trim()).filter(Boolean))].slice(0, 5)
      const names = named.length >= 2 ? named : ['Your mate', 'His sister', 'The neighbour', 'The new lad']
      // with three or more, one of them would rather not be in it; with two, nobody steps out, somebody fixes their hair
      const shy = names.length >= 3 ? Math.floor(r() * names.length) : -1
      return {...base, kind: 'frame', variant: named.length >= 2 ? `${names.length} of you` : 'the gang', title: 'Take the photo',
        help: shy >= 0 ? 'Choose how close, wait until every face is looking, then press. Whoever would rather not be in it can step out.' : 'Choose how close, wait until both faces are looking, then press.', limit: 35,
        items: names.map((l, i) => ({id: `f${i}`, label: l, to: i === shy ? 'out' : 'in'})),
        interrupt: {at: 0.3, say: shy >= 0 ? `${names[shy]} would rather not be in it. Let them step out.` : `${names[1]} wants a second to fix their hair.`},
        after: shy >= 0 ? `The print comes back: ${names.filter((_, i) => i !== shy).join(', ')} — everyone looking, one face missing on purpose.` : `The print comes back: ${names.join(' and ')}, both looking.`}
    }
    case 'open': {
      // what is being opened is read from the play id; a scene play opens a box
      const subject = /drawer/.test(low) ? 'drawer' : /envelope/.test(low) ? 'envelope' : /packet/.test(low) ? 'packet' : /letter/.test(low) ? 'letter' : /wardrobe/.test(low) ? 'wardrobe' : 'box'
      const quick = /tear|quick/.test(low)
      const S = (verb: string, label: string, dir: Dir, i: number): Step => ({id: `m${i}`, verb, label, dir})
      const all: Step[] = subject === 'drawer' ? [S('grip', 'Grip the handle', 'down', 0), S('pull', 'Pull — it sticks', 'down', 1), S('pull', 'Pull it the rest of the way', 'down', 2), S('lift', 'Lift out what slid to the front', 'up', 3), S('place', 'Put it on the table', 'right', 4)]
        : subject === 'envelope' || subject === 'packet' ? (quick
          ? [S('grip', 'Pinch the corner', 'up', 0), S('tear', 'Tear it across', 'right', 1), S('tip', 'Tip it out on the bench', 'down', 2), S('gather', 'Gather them up', 'left', 3), S('place', 'Stack them face down', 'down', 4)]
          : [S('grip', 'Hold it flat', 'down', 0), S('lift', 'Lift the flap, slowly', 'up', 1), S('slide', 'Slide them out', 'right', 2), S('turn', 'Turn the first one over', 'left', 3), S('fold', 'Fold the flap back', 'down', 4)])
        : subject === 'letter' ? [S('grip', 'Take it out', 'up', 0), S('fold', 'Unfold the top', 'up', 1), S('fold', 'Unfold the bottom', 'down', 2), S('smooth', 'Smooth it flat', 'right', 3), S('fold', 'Fold it back the way it was', 'down', 4)]
        : subject === 'wardrobe' ? [S('grip', 'Take the handle', 'down', 0), S('pull', 'Open the door', 'left', 1), S('slide', 'Slide the hangers along', 'right', 2), S('lift', 'Lift one off', 'up', 3), S('fold', 'Fold it over your arm', 'down', 4)]
        : [S('grip', 'Reach up for the box', 'up', 0), S('lift', 'Lift the lid', 'up', 1), S('fold', 'Fold back the paper', 'left', 2), S('lift', 'Take out the scarf', 'up', 3), S('place', 'Lay it on the bed', 'down', 4)]
      const steps = short ? [all[0]!, all[1]!, all[all.length - 2]!] : all
      const what = subject === 'packet' ? 'The packet' : subject === 'envelope' ? 'The envelope' : subject === 'letter' ? 'The letter' : subject === 'wardrobe' ? 'The wardrobe' : subject === 'drawer' ? 'The drawer' : 'The box'
      return {...base, kind: 'motion', variant: quick ? 'in a hurry' : 'slowly', subject, steps, title: `Open ${what.toLowerCase()}`,
        help: 'Do each movement with your hands: drag the way the arrow points, or press and hold, or use the arrow keys.', limit: 30,
        interrupt: {at: 0.4, say: subject === 'drawer' ? 'It jams half way. Wiggle it.' : quick ? 'Half of them slide off the bench.' : 'The flap sticks. Ease it, do not rip it.',
          step: {id: 'mx', verb: 'turn', label: subject === 'drawer' ? 'Wiggle it free' : quick ? 'Catch them' : 'Ease the flap', dir: subject === 'drawer' ? 'left' : quick ? 'down' : 'up'}},
        after: subject === 'drawer' ? 'The drawer is open and the small thing is on the table.' : subject === 'wardrobe' ? 'The wardrobe stands open and something is over your arm.'
          : subject === 'letter' ? 'The letter is read, and folded back along its own lines.' : subject === 'box' ? 'The lid is off and the scarf is on the bed.'
          : quick ? 'Torn open, everything on the bench, nothing lost.' : 'Opened along the seam, everything inside face down in a neat pile.'}
    }
    case 'tie': {
      const subject = /lace/.test(low) ? 'laces' : /armband/.test(low) ? 'armband' : 'scarf'
      const S = (verb: string, label: string, dir: Dir, i: number): Step => ({id: `m${i}`, verb, label, dir})
      const all: Step[] = subject === 'laces' ? [S('cross', 'Cross the laces', 'right', 0), S('pull', 'Pull them tight', 'up', 1), S('loop', 'Make a loop', 'left', 2), S('wrap', 'Wrap the other round it', 'right', 3), S('pull', 'Pull both loops tight', 'down', 4)]
        : subject === 'armband' ? [S('slide', 'Slide it up your arm', 'up', 0), S('turn', 'Turn it so the letters face out', 'right', 1), S('pull', 'Pull the strap through', 'left', 2), S('press', 'Press it shut', 'down', 3), S('check', 'Check it in the window', 'right', 4)]
        : [S('wrap', 'Put it round your neck', 'down', 0), S('wrap', 'Cross one end over', 'left', 1), S('tuck', 'Tuck it under', 'up', 2), S('pull', 'Pull it through the loop', 'down', 3), S('tidy', 'Straighten the ends', 'right', 4)]
      const steps = short ? [all[0]!, all[1]!, all[all.length - 2]!] : all
      return {...base, kind: 'motion', variant: subject === 'scarf' ? 'the borrowed scarf' : subject, subject, steps, title: subject === 'laces' ? 'Tie your laces' : subject === 'armband' ? 'Put the armband on' : 'Tie the scarf',
        help: 'Do each movement with your hands: drag the way the arrow points, or press and hold, or use the arrow keys.', limit: 30,
        interrupt: {at: 0.5, say: subject === 'scarf' ? 'Too tight — loosen it a finger.' : subject === 'laces' ? 'One end slips out. Again.' : 'It is upside down. Turn it.',
          step: {id: 'mx', verb: 'loosen', label: subject === 'scarf' ? 'Loosen it a finger' : subject === 'laces' ? 'Catch the end' : 'Turn it the right way up', dir: subject === 'scarf' ? 'up' : subject === 'laces' ? 'left' : 'right'}},
        after: subject === 'scarf' ? 'The scarf is on, with room to breathe.' : subject === 'laces' ? 'Double knot. They will hold until the final whistle.' : 'The armband is on, letters facing out.'}
    }
    case 'compare': {
      // what is laid side by side, read from the play id (or the scene: S07 tickets, S38 a record, the rest stickers)
      const subject = /^S07:|ticket/.test(id) ? 'tickets' : /^S38:|record/.test(id) ? 'record' : /shirt/.test(low) ? 'shirts' : 'stickers'
      type P = {a: string; b: string; back: string; to: 'match' | 'differ'}
      // the two sides say the same thing or they do not; `back` is what you say once you have looked
      const pool: P[] = subject === 'tickets' ? [
        {a: 'Gate 5 · Row 12', b: 'Gate 5 · Row 12', back: 'Same gate, same row.', to: 'match'},
        {a: 'Gate 5 · Row 12', b: 'Gate 9 · Row 3', back: 'Another gate — not ours.', to: 'differ'},
        {a: 'Saturday · 3 pm', b: 'Saturday · 3 pm', back: 'Same day, same kick-off.', to: 'match'},
        {a: 'Saturday · 3 pm', b: 'Last Saturday · 3 pm', back: 'An old stub.', to: 'differ'},
        {a: 'Seat 14', b: 'Seat 14', back: 'Same seat.', to: 'match'},
      ] : subject === 'record' ? [
        {a: 'Name: R. Cohen', b: 'Name: R. Cohen', back: 'Spelt the same.', to: 'match'},
        {a: 'Date: 12 May', b: 'Date: 13 May', back: 'One day out — mark it.', to: 'differ'},
        {a: 'Paid: 40', b: 'Paid: 40', back: 'The same figure.', to: 'match'},
        {a: 'Signed', b: 'Not signed', back: 'A signature missing.', to: 'differ'},
        {a: 'No. 4, Station Road', b: 'No. 4, Station Road', back: 'The same street.', to: 'match'},
      ] : subject === 'shirts' ? [
        {a: 'Home · sponsor across the chest', b: 'Home · sponsor across the chest', back: 'The same shirt.', to: 'match'},
        {a: 'Home · old sponsor', b: 'Home · new sponsor', back: 'A different season.', to: 'differ'},
        {a: 'Away · round collar', b: 'Away · round collar', back: 'The same collar.', to: 'match'},
        {a: 'Away · maker on the sleeve', b: 'Away · maker on the chest', back: 'Another maker.', to: 'differ'},
      ] : [
        {a: 'Your page: No. 14', b: 'His: No. 14', back: 'You have that one.', to: 'match'},
        {a: 'Your page: No. 7', b: 'His: No. 9', back: 'No. 9 — a gap filled.', to: 'differ'},
        {a: 'Your page: team photo', b: 'His: team photo', back: 'Already on your page.', to: 'match'},
        {a: 'Your page: No. 3 · this season', b: 'His: No. 3 · last season', back: 'Another season — new for you.', to: 'differ'},
        {a: 'Your page: shiny crest', b: 'His: shiny crest', back: 'You have the crest.', to: 'match'},
        {a: 'Your page: No. 11', b: 'His: No. 1', back: 'The keeper — new for you.', to: 'differ'},
      ]
      const n = few(subject === 'shirts' ? 4 : 5)
      const chosen = shuffle(r, pool.slice()).slice(0, n)
      // never all the same answer: the pair you have to look at decides it
      if (chosen.every(c => c.to === chosen[0]!.to)) chosen[chosen.length - 1] = pool.find(c => c.to !== chosen[0]!.to)!
      const yes = subject === 'stickers' ? 'Already got it' : subject === 'tickets' ? 'Matches' : subject === 'record' ? 'Matches' : 'The same shirt'
      const no = subject === 'stickers' ? 'New for you' : subject === 'tickets' ? 'Wrong one' : subject === 'record' ? 'Does not match' : 'Not the same'
      const ex: {pair: readonly [string, string]; back: string} = subject === 'stickers' ? {pair: ['Your page: No. 5', 'His: No. 5 · torn corner'] as const, back: 'Torn — not a swap.'}
            : subject === 'tickets' ? {pair: ['Gate 5 · Row 12', 'Gate 5 · Row 21'] as const, back: 'Row 21 — the wrong one.'}
            : subject === 'record' ? {pair: ['Total: 120', 'Total: 102'] as const, back: 'Two figures swapped.'}
            : {pair: ['Home · long sleeves', 'Home · short sleeves'] as const, back: 'Not the same cut.'}
      return {...base, kind: 'compare', variant: subject, subject, title: subject === 'stickers' ? 'Check the swap' : subject === 'tickets' ? 'Check the tickets' : subject === 'record' ? 'Check the record' : 'Compare the shirts',
        help: 'Turn the second one over and look, then put the pair where it belongs. Drag it, tap the pile, or press T then 1 or 2.', limit: 40,
        items: chosen.map((c, i) => ({id: `p${i}`, label: `${c.a} / ${c.b}`, pair: [c.a, c.b] as const, back: c.back, to: c.to})),
        targets: [{id: 'match', label: yes}, {id: 'differ', label: no}],
        interrupt: {at: 0.5, say: subject === 'stickers' ? 'He slides one more across the bench.' : subject === 'tickets' ? 'Somebody hands you one more from his coat.' : subject === 'record' ? 'One more line under the last one.' : 'One more on the hanger.',
          item: {id: 'px', label: `${ex.pair[0]} / ${ex.pair[1]}`, ...ex, to: 'differ'}},
        after: subject === 'stickers' ? 'Two piles on the bench: the ones you need, the ones you already have. Nobody was cheated.' : subject === 'tickets' ? 'The right tickets are in the right pocket.' : subject === 'record' ? 'What does not match is marked before it is closed.' : 'You know which shirt is which, and why.'}
    }
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
