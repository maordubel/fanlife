import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { stickReading } from '@/components/life/ControlDeck'

const ROOT = join(__dirname, '..')
const DECK = readFileSync(join(ROOT, 'components/life/ControlDeck.tsx'), 'utf8')
const RUNTIME = readFileSync(join(ROOT, 'app/life/stage/useLifeRuntime.ts'), 'utf8')
const STAGE = readFileSync(join(ROOT, 'app/life/LifeStage.tsx'), 'utf8')

/**
 * הגוייסטיק והמקשים על המסך — Maor, 16.9.2026, in exactly those words:
 * *"הגוייסטיק והמקשים מחויביים להיות על המסך, אך אבקש לשפר אותם ולהתאים אותם באמת למשחק
 * בהתאם, גם גרפית וגם 'טכנית'. לא בטוח שיש סיבה ל2 כפתורים בכלל מלבד במיני משחקים
 * מסויימים."*
 *
 * Three instructions, three describes. The geometry is arithmetic, so it is tested as
 * arithmetic (`scripts/life/deck-probe.mjs` is what measures it in a browser, because a
 * touch target's SIZE is a number no unit test can see).
 */
describe('הגוייסטיק על המסך — the console is the phone default, not a preference', () => {
  it('the deck starts shown, and the comment says whose sentence that is', () => {
    const state = RUNTIME.slice(RUNTIME.indexOf('const [deck, setDeck]') - 1200, RUNTIME.indexOf('const [deck, setDeck]') + 60)
    expect(state).toContain('const [deck, setDeck] = useState(true)')
    expect(state).toContain('מחויביים להיות על המסך')
  })

  it('reads the OLD spelling of the preference, because it is on real devices', () => {
    // `0` meant shown and `1` meant hidden — the inversion that made flipping the default
    // dangerous. Both are still honoured; the file writes the words from now on.
    expect(RUNTIME).toContain("if (raw === 'off' || raw === '1') return false")
    expect(RUNTIME).toContain("if (raw === 'on' || raw === '0') return true")
    expect(RUNTIME).toContain("on ? 'on' : 'off'")
  })

  it('and the toggle survives, so the painting can still be cleared', () => {
    expect(RUNTIME).toContain('toggleDeck')
    expect(STAGE).toContain('onDeck={toggleDeck}')
  })
})

describe('כפתור אחד, חוץ מאיפה ששניים מרוויחים את מקומם', () => {
  it('there is exactly one B in the file and it is conditional', () => {
    const presses = [...DECK.matchAll(/letter="([AB])"/g)].map((m) => m[1])
    expect(presses.sort()).toEqual(['A', 'B'])
    expect(DECK).toContain("{second !== 'none' && (")
  })

  it("the default is one button — a caller that says nothing gets no B", () => {
    expect(DECK).toContain("const second: DeckSecondary = secondary ?? bridged ?? 'none'")
  })

  it('run is not deleted with the button — it moves onto the stick', () => {
    expect(DECK).toContain("const stickRuns = second === 'none'")
    expect(DECK).toContain('if (stickRuns) onCancel(read.running)')
    // and the keyboard keeps Shift, where a modifier costs nothing
    const input = readFileSync(join(ROOT, 'app/life/stage/useLifeInput.ts'), 'utf8')
    expect(input).toContain("input.setKeyRun(held.has('shift'))")
  })

  it('B says what it does — "ריצה" on the pitch, "לצאת" over a conversation', () => {
    // it used to say "חזרה" in both, which is wrong on a football pitch and was drawn for
    // a dialogue state the console is never on screen in
    expect(DECK).toContain("second === 'leave' ? t('life.deck.bLeave') : t('life.deck.bRun')")
    expect(DECK).not.toContain("t('life.deck.b')")
  })

  it('the bridge to PitchCard is named as a bridge, with the patch that ends it', () => {
    // PitchCard is not this change's file, so until it passes `secondary="run"` the deck
    // finds the match by looking for its root. A football match may not silently lose its
    // sprint because of a prop nobody passed.
    expect(DECK).toContain('data-life="pitch-card"')
    expect(DECK).toContain('secondary="run"')
  })
})

describe('המוט — the stick, as arithmetic', () => {
  const R = 40

  it('a thumb at rest is not a step', () => {
    const read = stickReading(4, 0, R, false)
    expect(read.axis.x).toBe(0)
    expect(read.axis.y).toBe(0)
    expect(read.running).toBe(false)
  })

  it('the first real millimetre of travel is the SLOWEST walk, not a jump', () => {
    // the dead zone is rescaled rather than subtracted: just past it the axis is ~0, and it
    // reaches 1 only at the edge of the plate
    const justPast = stickReading(R * 0.16, 0, R, false)
    expect(justPast.axis.x).toBeGreaterThan(0)
    expect(justPast.axis.x).toBeLessThan(0.05)
    const half = stickReading(R * 0.5, 0, R, false)
    expect(half.axis.x).toBeGreaterThan(0.35)
    expect(half.axis.x).toBeLessThan(0.55)
  })

  it('never reports a magnitude over 1, however far the thumb is dragged', () => {
    // `InputState` normalises, but PitchCard and the city proof write the pair straight
    // into their own pad — a thumb past the plate was a footballer over top speed
    for (const far of [R, R * 3, R * 40]) {
      const read = stickReading(far, far, R, false)
      expect(Math.hypot(read.axis.x, read.axis.y)).toBeLessThanOrEqual(1.0001)
      expect(Math.hypot(read.nub.x, read.nub.y)).toBeLessThanOrEqual(R + 0.0001)
    }
  })

  it('a diagonal is not faster than a straight push', () => {
    const straight = stickReading(R, 0, R, false)
    const diagonal = stickReading(R, R, R, false)
    expect(Math.hypot(diagonal.axis.x, diagonal.axis.y)).toBeCloseTo(
      Math.hypot(straight.axis.x, straight.axis.y),
      5,
    )
  })

  it('the outer ring is run, and it does not flicker on the line', () => {
    expect(stickReading(R * 0.8, 0, R, false).running).toBe(false)
    expect(stickReading(R * 0.9, 0, R, false).running).toBe(true)
    // already running, the thumb may fall back a long way before he walks again
    expect(stickReading(R * 0.8, 0, R, true).running).toBe(true)
    expect(stickReading(R * 0.6, 0, R, true).running).toBe(false)
  })

  it('a zero radius cannot divide by zero', () => {
    const read = stickReading(10, 10, 0, false)
    expect(Number.isFinite(read.axis.x)).toBe(true)
    expect(Number.isFinite(read.nub.y)).toBe(true)
  })
})

describe('גרפית וטכנית — the console is hardware, and it is measurable', () => {
  it('sizes off the GLASS when the painting is full-bleed', () => {
    // since rule 52 the deck is handed `height: 0`, so every clamp off the band answered
    // with its own minimum — the smallest console this file draws, on the biggest screen
    // …and off the SHORT side of it (delta 91): a phone turned sideways is 844 wide and
    // 390 tall, and a stick at 30vw was two thirds of that glass, over the street.
    expect(DECK).toContain('clamp(96px, 30vmin, 134px)')
    expect(DECK).toContain('clamp(70px, 21vmin, 94px)')
    expect(DECK).not.toMatch(/\d+vw/)
  })

  it('keeps the home indicator clear', () => {
    expect(DECK).toContain('env(safe-area-inset-bottom)')
  })

  it('every control carries a handle, so the harness can MEASURE it', () => {
    // rule 42 promises "every touch target is at least 44px, measured in the harness on
    // every viewport". Nothing in the file was named, so the report could only ever say
    // how many there were. `scripts/life/deck-probe.mjs` reads these.
    for (const mark of ['data-deck="stick"', 'mark="a"', 'mark="b"', 'data-deck="chip"']) {
      expect(DECK, `${mark} missing`).toContain(mark)
    }
  })

  it('is drawn as an object: a gate, a washer, a shaft, a ball, a plate', () => {
    expect(DECK).toContain('clipPath')
    expect(DECK).toContain('radial-gradient')
    expect(DECK).toContain('boxShadow')
    expect(DECK).toContain('DeckPlate')
  })

  it('draws no frame where rule 52 says there is none', () => {
    // a bright hairline across a full-bleed painting is a frame the picture does not have
    expect(DECK).toContain('{!floating && (')
  })

  it('a lost pointer capture is a released stick', () => {
    expect(DECK).toContain('onLostPointerCapture')
  })

  it('places nothing in a physical direction (rule 9), not even inside a comment', () => {
    // the same expression `tests/brand.test.ts` sweeps the whole codebase with — repeated
    // here because the console is the one file that got a named exemption from the radius
    // and tap-target guards, and an exemption is not a licence to drift on everything else
    const physical =
      /\b(?:ml|mr|pl|pr)-[a-z0-9[\].-]+|\b(?:left|right)-[a-z0-9[\].-]+|\btext-(?:left|right)\b/
    expect(physical.exec(DECK)).toBeNull()
    expect(/margin(Left|Right)|padding(Left|Right)/.test(DECK)).toBe(false)
    // the ball used to be placed with `left: 50%` and a translate. It is centred by flex
    // now, which has no side at all — the version that cannot be wrong in either direction.
    expect(DECK).toContain('absolute inset-0 flex items-center justify-center')
  })
})
