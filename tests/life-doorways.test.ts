import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bodySize } from '@/lib/life/world/heights'
import { ALL_SCENES, inEra } from '@/lib/life/world/scenes'

/**
 * אף אחד לא עומד בתוך דלת.
 *
 * `aim()` in `WorldScene` gives an actor `priority: 4` and a door `priority ?? 2`, so a
 * person standing inside an exit zone WINS the prompt over the exit — and the way out of
 * the room disappears behind a conversation. The scene file already carries the lesson,
 * written above `usher-night`: *"The usher stands BESIDE the door and not in it: a person
 * in a doorway wins the prompt over the door, and the way into the room disappears behind
 * a conversation."*
 *
 * That comment was written for one actor and nothing enforced it for the rest. A sweep on
 * 15.9.2026 found **eight** talkable actors sitting inside an exit, including Limor in the
 * only door into the Ussishkin hall on the night of the derby — placed behind
 * `none: [uss:arrived]`, which is to say present exactly while the player still needs that
 * door.
 *
 * Some were survivable because a schedule row moves the actor before anyone arrives. That
 * is not a defence: a placement that is only correct because something else overrides it
 * is not a placement, and the row that saves it is one re-frame away from moving.
 */

const ERAS = [
  '1986', '1990', '1991', '1993-cup', '1993-galil', '1995-sinai', '1996-army',
  '1997-basket', '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double',
  'a2-alley', 'a3-hall', 'a4-shirt', 'a5-first', 'a6-radio', 'a7-week',
]

describe('דלתות — אף אדם לא עומד בתוכן', () => {
  it('שום שחקן שאפשר לדבר איתו לא נמצא בתוך אזור יציאה', () => {
    const blockers: string[] = []
    const seen = new Set<string>()

    for (const era of ERAS) {
      for (const scene of ALL_SCENES) {
        for (const actor of scene.actors) {
          // Only a talkable actor steals the prompt. Scenery standing in a doorway is a
          // drawing problem, not a trap.
          if (!inEra(actor, era) || !actor.talk) continue
          for (const exit of scene.exits ?? []) {
            if (exit.era && !inEra(exit, era)) continue
            if (actor.x < exit.x || actor.x > exit.x + exit.w) continue
            const key = `${scene.id}|${actor.id}|${exit.id}`
            if (seen.has(key)) continue
            seen.add(key)
            blockers.push(
              `${scene.id} · ${actor.id} (x=${actor.x}) stands in exit '${exit.id}' [${exit.x.toFixed(2)}–${(exit.x + exit.w).toFixed(2)}] → ${exit.to}`,
            )
          }
        }
      }
    }

    expect(blockers, `a person in a doorway wins the prompt over the door:\n${blockers.join('\n')}`).toEqual([])
  })

  it('לכל חדר יש לפחות יציאה אחת שאיש לא חוסם', () => {
    // The stronger statement: even if a future actor lands in one door, a room must never
    // become a room you cannot leave.
    for (const scene of ALL_SCENES) {
      const exits = scene.exits ?? []
      if (exits.length === 0) continue
      const clear = exits.filter(
        (exit) => !scene.actors.some((actor) => actor.talk && actor.x >= exit.x && actor.x <= exit.x + exit.w),
      )
      expect(clear.length, `${scene.id}: every exit has somebody standing in it`).toBeGreaterThan(0)
    }
  })

  /**
   * ושני גופים לא עומדים אחד בתוך השני.
   *
   * The same failure as a person in a doorway, one layer down: `aim()` picks by distance,
   * so two talkable people at the same depth with overlapping bodies trade the prompt
   * between them as the boy shuffles, and the one behind can be impossible to address at
   * all. It is also simply wrong to look at.
   *
   * This could not be checked until the boards stopped drawing the deprecated `size`
   * field: a width computed from a number the runtime never reads is a width of nothing.
   * The height here is `bodySize()` — the engine's own function — and the width is read
   * off the FILE rather than off `manifest.json`, because a manifest records what a build
   * claimed and this test exists to disagree with claims (rule 61).
   *
   * Only pairs at the SAME depth count. A man painted a metre behind another is not
   * overlapping him, he is behind him, and the renderer sorts them correctly.
   */
  const ART = join(process.cwd(), 'public/life/art')

  /** width and height straight out of the WebP header — all three chunk layouts */
  const dimensions = (key: string): { w: number; h: number } | null => {
    let buffer: Buffer
    try {
      buffer = readFileSync(join(ART, `${key}.webp`))
    } catch {
      return null
    }
    const chunk = buffer.toString('ascii', 12, 16)
    if (chunk === 'VP8X') {
      return { w: buffer.readUIntLE(24, 3) + 1, h: buffer.readUIntLE(27, 3) + 1 }
    }
    if (chunk === 'VP8 ') {
      return { w: buffer.readUInt16LE(26) & 0x3fff, h: buffer.readUInt16LE(28) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21)
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }
    }
    return null
  }

  /**
   * שני אנשים שלא נמצאים על המסך יחד הם לא התנגשות.
   *
   * שחור עומד ב-0.8 בשתי רשומות — `shachor-hall97` מאחורי `none: life:hall:d2`
   * ו-`shachor-hall98` מאחורי אותו דגל בחיוב. זה אותו אדם בשתי פוזות, ולעולם לא
   * שניהם. השוואת דגלים כללית היא בעיית ספיקות; מה שכן אפשר להכריע בוודאות הוא
   * הצורה הזאת בדיוק — דגל אחד, פעם ב-`flag` ופעם ב-`none` — והיא גם הצורה שהתוכן
   * משתמש בה כדי להחליף אדם בעצמו.
   */
  const flagsOf = (when: unknown): { needs: Set<string>; forbids: Set<string> } => {
    const needs = new Set<string>()
    const forbids = new Set<string>()
    const walk = (node: unknown, negated: boolean): void => {
      if (!node || typeof node !== 'object') return
      const c = node as Record<string, unknown>
      if (typeof c.flag === 'string') (negated ? forbids : needs).add(c.flag)
      if (typeof c.notFlag === 'string') (negated ? needs : forbids).add(c.notFlag)
      for (const part of (c.all as unknown[]) ?? []) walk(part, negated)
      for (const part of (c.any as unknown[]) ?? []) walk(part, negated)
      for (const part of (c.none as unknown[]) ?? []) walk(part, !negated)
    }
    walk(when, false)
    return { needs, forbids }
  }

  const exclusive = (a: unknown, b: unknown): boolean => {
    const left = flagsOf(a)
    const right = flagsOf(b)
    for (const flag of left.needs) if (right.forbids.has(flag)) return true
    for (const flag of right.needs) if (left.forbids.has(flag)) return true
    return false
  }

  /**
   * וכתף בכתף היא לא "בתוך".
   *
   * People in a crowd stand close enough to touch, and a cut-out's transparent margin
   * overlaps before the painted shoulder does. What is a defect is one body standing
   * INSIDE another — so the bar is proportional: more than a third of the narrower
   * figure's width hidden behind the other. Kobi and Barry at gate seven brush by a
   * hundredth and read correctly; the two at the kiosk hid a quarter of a man.
   */
  const INSIDE = 0.35

  it('שני גופים שאפשר לדבר איתם לא נחתכים באותו עומק', () => {
    const clashes: string[] = []
    const seen = new Set<string>()

    for (const era of ERAS) {
      for (const scene of ALL_SCENES) {
        const backdrop = dimensions((scene as { artByEra?: Record<string, string>; art: string }).artByEra?.[era] ?? scene.art)
        if (!backdrop) continue
        const taper = scene.size.far / Math.max(1e-6, scene.size.near)
        const depth = (y: number) => Math.max(0, Math.min(1, (y - scene.band.far) / (scene.band.near - scene.band.far)))

        const bodies = scene.actors
          .filter((actor) => inEra(actor, era) && actor.talk)
          .map((actor) => {
            const figure = dimensions(actor.figure)
            const drawn = bodySize(actor.figure, scene.metre, depth(actor.y), taper)
            // a height is a fraction of the backdrop's HEIGHT; an x is a fraction of its WIDTH
            const width = figure ? (drawn * (figure.w / figure.h) * backdrop.h) / backdrop.w : 0
            return { id: actor.id, x: actor.x, y: actor.y, width, when: (actor as { when?: unknown }).when }
          })
          .filter((body) => body.width > 0)

        for (let i = 0; i < bodies.length; i += 1) {
          for (let j = i + 1; j < bodies.length; j += 1) {
            const a = bodies[i]
            const b = bodies[j]
            if (!a || !b) continue
            if (Math.abs(a.y - b.y) >= 0.05) continue // different depth — behind, not inside
            if (exclusive(a.when, b.when)) continue // never on screen together
            const gap = Math.abs(a.x - b.x) - (a.width + b.width) / 2
            if (gap >= -INSIDE * Math.min(a.width, b.width)) continue
            const key = `${scene.id}|${a.id}|${b.id}`
            if (seen.has(key)) continue
            seen.add(key)
            clashes.push(
              `${scene.id} · ${a.id} (x=${a.x}) and ${b.id} (x=${b.x}) overlap by ${Math.abs(gap).toFixed(3)} — ` +
                `${Math.round((Math.abs(gap) / Math.min(a.width, b.width)) * 100)}% of the narrower body`,
            )
          }
        }
      }
    }

    expect(clashes, `two people cannot stand in the same place:\n${clashes.join('\n')}`).toEqual([])
  })

  /**
   * ואין שני אנשים עם אותה תעודת זהות בחדר אחד.
   *
   * `bloomfield-outside` carried TWO actors called `barry-a5`, and a `kobi-a5` beside a
   * `kobi-a5-gate` running the same conversation — the same fix applied twice, in two
   * passes, neither seeing the other. On screen that is two fathers four hundredths
   * apart; underneath it is worse, because `aim()` and every lookup after it resolve by
   * id and which of the two answers is an accident of array order.
   *
   * Scoped per scene AND per era, which is the honest statement: no two actors with one
   * id may be on screen together. The same id in two different rooms is normal, and so is
   * the same id in one room across two eras — `amit-street` is `amit` in 1986 and
   * `amit90` in 1990, one boy who got older, and `inEra` never draws both.
   */
  it('אין שני שחקנים עם אותו id על המסך יחד', () => {
    const doubles: string[] = []
    for (const era of ERAS) {
      for (const scene of ALL_SCENES) {
        const counts = new Map<string, number>()
        for (const actor of scene.actors) {
          if (!inEra(actor, era)) continue
          counts.set(actor.id, (counts.get(actor.id) ?? 0) + 1)
        }
        for (const [id, count] of counts) {
          if (count > 1) doubles.push(`${scene.id} [${era}] · '${id}' appears ${count} times`)
        }
      }
    }
    expect(doubles, doubles.join('\n')).toEqual([])
  })
})
