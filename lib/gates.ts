import type { MessageKey } from '@/lib/i18n'

/**
 * שערי הפועל — the thirteen gates.
 *
 * The navigation is not a list of game modes. It is Bloomfield's gate plan, and a
 * player picks a mode by walking through a gate. That is the whole idea in Maor's
 * design: "אתה לא בוחר מצב משחק מרשימה. אתה נכנס בשער."
 *
 * The gate numbers are the ground's real ones. Inventing one to tidy the grid would be
 * exactly the kind of small lie this project does not tell — and so is hanging a plate
 * over a route that does not exist.
 *
 * **What the array below holds today (28.9.2026) — thirteen plates, every one a door:**
 *
 *   1 `/xi` הרכב כל הזמנים · 2 `/trivia` אגף הטריוויות · 3 `/lineup` חידון ההרכב ·
 *   4 `/kits/build` משחק המדים · 5 `/kits` אגף המדים (the curva) · 6 `/memory` ·
 *   7 `/polls` הכרטיס שלי + הוויכוח של היציע · 8 `/goal` שחזור השער ·
 *   9 `/royal-rumble` · 10 `/blind-cow` פרה עיוורת · 11 `/derby` משחק השנאה (the away
 *   end) · 12 `/archive` הארכיון החי · 13 `/timeline` החוט האדום.
 *
 * This comment used to describe an older wall — "nine gates", gate 9 a plate "בשיפוצים"
 * with no href, gate 10 the personal area. All three stopped being true: gate 9 opened as
 * the Royal Rumble, gate 10 became Blind Cow on 24.9.2026 (the member book `/tik` is still
 * there, as "המנוי שלי" in the tab bar, not on the wall), and every plate now has a route.
 * A count in prose is a claim about the code (rules 45, 73) — read the array, not this list.
 *
 * `href: null` is still in the type, and still means what it meant: a plate the ground
 * has and the app does not, drawn closed by `GatePlate` ("בשיפוצים", or "בקרוב" with
 * `soon`) rather than a route that 404s. No gate uses it today.
 *
 * Two gates are special and the rest follow one template:
 *   · **Gate 5** is the ultras' gate. It gets the full bill — rays, the flag, the
 *     marching ranks — because on a real fence that is the poster that got printed
 *     big. Every other gate gets a small plate.
 *   · **Gate 11** is the away end. It carries NO vermilion at all: navy only, no
 *     flag, no rays. Whoever walks in sees somebody else's poster, which is the
 *     point of the game behind it.
 *
 * The product map — route, state, seed, persistence, share, archive and LIFE links and
 * tests for every gate — is `docs/18-product-map.md`.
 */

export type Gate = {
  /** the ground's own number — not an index */
  number: number
  /**
   * Where the plate goes — or `null` for a gate the ground has and the app does not.
   *
   * A null href is NOT a link: `GatePlate` draws it as a closed plate that says what it
   * is, and every list that walks the gates (the sitemap, the personal area, the help
   * sheet) has to answer for it rather than quietly linking to a 404.
   */
  href: string | null
  /** Hebrew name, Suez One, on the ink foot */
  title: MessageKey
  /** the Latin line under it, Archivo, letterspaced */
  latin: string
  /** which press treatment this plate gets */
  plate: 'plain' | 'rays' | 'curva' | 'away'
  /** which ink blotch, so no two plates print identically */
  stain: 'a' | 'b' | 'c'
  /**
   * האם השער מחלק סבב — does the route behind this plate READ `?seed=`?
   *
   * Nine of them do (3, 4, 6, 7, 8, 9, 11, 12, 13). The other four do not: `/xi` is free
   * play over the whole roster, `/kits` is a collection, `/blind-cow` is dealt by the
   * server, the date or a duel token, and `/trivia` is the TOPIC PICKER — the seeded route
   * is `/trivia/<topic>`, one deck each, which is why the picker itself must not carry one.
   * `/polls` reads a seed since 28.9.2026 for its DEBATES only (ONE RED WORLD §16); the
   * identity ballot beside them has none.
   *
   * Until 17.9.2026 the wall and the personal area stapled `?seed=…&r=…` onto all
   * eleven. Four of those parameters were read by nobody, and the fifth — `/trivia` —
   * pointed at a phantom deck that the plate advanced on every click and no round ever
   * consulted. A parameter a page ignores is a small lie in a URL people read
   * (rule 19), and a deck nothing deals from is a counter that only ever lies.
   */
  seeded: boolean
  /**
   * האם משחקים בו — can a supporter finish a round of it?
   *
   * Written for the day gate 10 was the personal area: a place in the ground rather than
   * a game, excluded from "how many gates have you been through" so that count did not
   * print a denominator nobody could reach. Every gate on the wall today is playable; the
   * flag stays so a future non-game plate cannot quietly enter that denominator.
   */
  playable: boolean
  /** gate 5 only — the line on the flag */
  callHe?: MessageKey
  /**
   * בקרוב — a closed plate that is ANNOUNCED rather than under refurbishment. Drawn with
   * the "בקרוב" band instead of "בשיפוצים". Only meaningful with `href: null`.
   */
  soon?: true
}

/**
 * סדר הקיר — the order the plates are hung in, which is not the same thing as the gate
 * numbers. The curva is full-width, so anywhere but the head of the wall it wraps and
 * leaves a hole in the row above it. Hanging it first fills the grid exactly at two and
 * three columns AND puts the ultras' gate at the top of the ground, which is where it
 * belongs. The numbers themselves are untouched — they are Bloomfield's.
 */
export function wallOrder(gates: readonly Gate[]): readonly Gate[] {
  const curva = gates.filter((gate) => gate.plate === 'curva')
  return [...curva, ...gates.filter((gate) => gate.plate !== 'curva')]
}

/**
 * **A gate's href carries no seed.** Every one of these used to end in `?seed=1`
 * (`?seed=7` for the memory board), which meant the wall itself was the thing pinning
 * the app to one round per gate: the plate handed the route a constant, the route read
 * the constant, and every player in the world got the same deal for ever. The round is
 * now decided by the device's own place in that gate's deck (`components/play/PlayLink.tsx`),
 * or minted fresh on the server when there is no device to ask.
 */
export const GATES: readonly Gate[] = [
  {
    number: 1,
    href: '/xi',
    title: 'gate.1',
    latin: 'ALL-TIME XI · NORTH STAND',
    plate: 'plain',
    stain: 'a',
    seeded: false,
    playable: true,
  },
  {
    number: 2,
    href: '/trivia',
    title: 'gate.2',
    latin: 'TRIVIA WING · NORTH-EAST',
    plate: 'rays',
    stain: 'b',
    seeded: false,
    playable: true,
  },
  {
    number: 3,
    href: '/lineup',
    title: 'gate.3',
    latin: 'THE LINE-UP · NORTH',
    plate: 'plain',
    stain: 'c',
    seeded: true,
    playable: true,
  },
  {
    number: 4,
    href: '/kits/build',
    title: 'gate.4',
    latin: 'GUESS THE KIT · EAST',
    plate: 'plain',
    stain: 'c',
    seeded: true,
    playable: true,
  },
  {
    number: 5,
    href: '/kits',
    title: 'gate.5',
    latin: 'KIT DESIGNER · SOUTH-EAST · ULTRAS',
    plate: 'curva',
    stain: 'a',
    seeded: false,
    playable: true,
    callHe: 'gate.5.call',
  },
  {
    number: 6,
    href: '/memory',
    title: 'gate.6',
    latin: 'MEMORY · SOUTH-EAST',
    plate: 'plain',
    stain: 'b',
    seeded: true,
    playable: true,
  },
  {
    number: 7,
    href: '/polls',
    title: 'gate.7',
    latin: 'THE BALLOT · SOUTH',
    plate: 'plain',
    stain: 'a',
    // the debates rotate (`lib/polls/debates.ts`); the identity ballot reads no seed
    seeded: true,
    playable: true,
  },
  {
    number: 8,
    href: '/goal',
    title: 'gate.8',
    latin: 'REBUILD THE GOAL · SOUTH-WEST',
    plate: 'rays',
    stain: 'a',
    seeded: true,
    playable: true,
  },
  {
    number: 9,
    href: '/royal-rumble',
    title: 'gate.9',
    latin: 'ROYAL RUMBLE · HISTORICAL 5V5',
    plate: 'rays',
    stain: 'b',
    seeded: true,
    playable: true,
  },
  {
    /**
     * שער 10 — פרה עיוורת (owner decision, 23.9.2026; opened 24.9.2026, delta 88): up to
     * ten verified clues about one hidden player, solo, the daily and an async duel. The
     * member book that stood here (`/tik`) is NOT gone — it is the personal area, reached
     * from the tab bar as "המנוי שלי". `seeded: false`: the route reads no `?seed=` — solo
     * is dealt by the server, the daily by the date, a duel by its token.
     */
    number: 10,
    href: '/blind-cow',
    title: 'gate.10',
    latin: 'BLIND COW · WEST',
    plate: 'plain',
    stain: 'b',
    seeded: false,
    playable: true,
  },
  {
    number: 11,
    href: '/derby',
    title: 'gate.11',
    latin: 'THE HATRED GAME · AWAY END',
    plate: 'away',
    stain: 'b',
    seeded: true,
    playable: true,
  },
  {
    /** שער 12 — אגף הארכיון: היום לפני, הידעת, ומה שהארכיון באמת מחזיק. */
    number: 12,
    href: '/archive',
    title: 'gate.12',
    latin: 'THE ARCHIVE WING · NORTH-WEST',
    plate: 'plain',
    stain: 'a',
    // It reads `?seed=` and `?r=`: the deal rotates, so the wing hands out something
    // different on every entry and the same two numbers reproduce it (rule 24).
    seeded: true,
    playable: true,
  },
  {
    /**
     * שער 13 — החוט האדום (owner decision, 21.9.2026): a route between two moments of the
     * club's history, every stop a real edge of the Entity Graph. The chronology game that
     * stood here is the gate's second mode, `/timeline/order`, one tab away.
     */
    number: 13,
    href: '/timeline',
    title: 'gate.13.thread',
    latin: 'THE RED THREAD · NORTH-WEST',
    plate: 'plain',
    stain: 'c',
    seeded: true,
    playable: true,
  },
] as const

/** The gate a route belongs to, so a screen can show which gate you came in by. */
export function gateFor(pathname: string): Gate | undefined {
  return GATES.find((gate) => gate.href !== null && gate.href.split('?')[0] === pathname)
}

/** The gates that actually lead somewhere — everything but a plate under refurbishment. */
export function isOpen(gate: Gate): gate is Gate & { href: string } {
  return gate.href !== null
}

/** The gates a supporter can actually finish a round of — open and `playable` (today: all thirteen). */
export const PLAYABLE_GATES: ReadonlyArray<Gate & { href: string }> = GATES.filter(
  (gate): gate is Gate & { href: string } => gate.playable && isOpen(gate),
)

/** True when this route reads `?seed=`, so nothing staples one onto a route that does not. */
export function gateSeeded(href: string): boolean {
  const path = href.split('?')[0] ?? href
  return GATES.find((gate) => gate.href === path)?.seeded ?? false
}
