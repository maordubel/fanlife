/**
 * ארבעת הסמלים — the four marks on the bottom bar.
 *
 * The bar used to carry four primitives: a rectangle, a circle, three bars and another
 * rectangle. Two of the four were the same shape in different proportions, which means
 * that at a glance the bar read as "box · dot · bars · box" — a person could not tell
 * בלומפילד from המנוי without reading the label, and an icon you have to read is not an
 * icon.
 *
 * So each mark is now drawn from the thing it goes to, in the brand's own language:
 * flat, radius 0, hairline and rule weights only, no shadow, and the one permitted
 * circle is a lamp because a lamp is a circle.
 *
 *   · **בלומפילד** — a floodlight pylon. The lattice mast and the lamp head, which is
 *     the detail of that ground Maor cares about more than any other, and the only part
 *     of Bloomfield you can recognise from a kilometre away.
 *   · **אוסישקין** — the hall: the long low shed, the shallow roof, the strip of
 *     windows along the top, and the hoop on the end wall. Every one of those four
 *     features is in the panorama spots the hall was reconstructed from
 *     (`lib/life/content/panoramas.ts`), so the mark is drawn from the record.
 *   · **ה-פועל** — the club's first crest as `content/manual/crest-versions.json`
 *     describes it: *"דמות הפועל בתוך קשת, בלי כדור ובלי מסגרת מעגלית"* — the worker
 *     inside an arch, no ball, no circular frame. Not a redrawing of today's badge:
 *     the badge itself ships as a PNG (`components/ui/Badge.tsx`) and turns to mud at
 *     22 pixels. This is the geometry the archive records, at the size it has to work.
 *   · **המנוי שלך** — the card: the stub, the perforation, and a punched day. The punch
 *     is already this product's mark for "you turned up" (`lib/game/member.ts`).
 *
 * `currentColor` throughout, so the active state is one colour swap on the parent and
 * never a second copy of the drawing.
 */

export type MarkName = 'bloomfield' | 'ussishkin' | 'hapoel' | 'member'

const STROKE = 1.6

export function TabMark({ name, active }: { name: MarkName; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={23}
      height={23}
      aria-hidden="true"
      focusable="false"
      className="mx-auto block"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      {name === 'bloomfield' && <Pylon active={active} />}
      {name === 'ussishkin' && <Hall active={active} />}
      {name === 'hapoel' && <Worker active={active} />}
      {name === 'member' && <Card active={active} />}
    </svg>
  )
}

/** עמוד תאורה — the pylon. Lit when you are standing in the ground. */
function Pylon({ active }: { active: boolean }) {
  return (
    <>
      {/* the lamp head: a bar of four lamps. The lamps are the only circles in the set. */}
      <path d="M4.2 6.4h15.6" />
      {[6.5, 10.2, 13.8, 17.5].map((x) => (
        <circle key={x} cx={x} cy={3.9} r={1.45} fill={active ? 'currentColor' : 'none'} />
      ))}
      {/* the mast: two legs that taper, three braces. A lattice, not a pole. */}
      <path d="M9.1 6.4 7.1 21M14.9 6.4 16.9 21" />
      <path d="M8.6 10h6.8M8.1 14.2h7.8M7.5 18.2h9" />
    </>
  )
}

/** ההיכל — the hall. The roof, the window strip, the hoop on the end wall. */
function Hall({ active }: { active: boolean }) {
  return (
    <>
      {/* the shallow roof — the hall was long and low, never a dome */}
      <path d="M2.4 9.3 12 4.9l9.6 4.4" />
      <path d="M4.3 9.9V20h15.4V9.9" />
      {/* the window strip along the top of the wall */}
      <path d="M6.6 12.4h3.1M12.4 12.4h3.1" />
      {/* the hoop: a backboard with the ring hanging under it. The ring is wider than
          the first version, which read as a T at 23 pixels. */}
      <path d="M9.3 15.4h5.4" />
      <path
        d="M10.3 15.4v1.1a1.7 1.7 0 0 0 3.4 0v-1.1"
        fill={active ? 'currentColor' : 'none'}
      />
      {/* the floor line */}
      <path d="M2.4 20h19.2" />
    </>
  )
}

/**
 * הפועל — the worker in the arch, as the first crest is recorded.
 * No ball and no circular frame, because the record says there were none.
 */
function Worker({ active }: { active: boolean }) {
  return (
    <>
      {/* the arch */}
      <path d="M3.8 21V10.6a8.2 8.2 0 0 1 16.4 0V21" />
      <path d="M3.8 21h16.4" />
      {/* the figure: head, shoulders, and the arm raised across the body */}
      <circle cx={12} cy={9.1} r={1.7} fill={active ? 'currentColor' : 'none'} />
      <path d="M9.2 17.6v-2.5a2.8 2.8 0 0 1 5.6 0v2.5" />
      <path d="M14.6 14.3 17 11.8" />
    </>
  )
}

/** הכרטיס — the card, its stub, and one punched day. */
function Card({ active }: { active: boolean }) {
  return (
    <>
      <path d="M2.6 5.4h18.8v13.2H2.6z" />
      {/* the perforation between card and stub */}
      <path d="M7.9 5.4v13.2" strokeDasharray="1.6 1.7" strokeWidth={1.3} />
      {/* the punched day — filled once the card is yours */}
      <circle cx={5.25} cy={12} r={1.35} fill={active ? 'currentColor' : 'none'} />
      {/* the two printed lines on the face */}
      <path d="M10.6 9.9h8.1M10.6 13.1h5.6" strokeWidth={1.4} />
    </>
  )
}
