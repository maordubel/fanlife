/**
 * מה המנוע באמת מצייר — every named person in every room, at the size the RUNTIME gives
 * them, beside the boy standing on the same line.
 *
 * This script used to read `ActorDef.size`. That field has been `@deprecated` since delta
 * 30 — `scenes.ts` says in as many words that "`WorldScene` never reads this field" — and
 * the runtime has sized bodies through `bodySize()` (`world/heights.ts`) ever since:
 * `metre × heightOf(figure) × taper`. So the tool that rule 55 points at ("a placement is
 * not done until its board has been looked at") was measuring a dead number, and every
 * placement checked with it was checked against nothing. Found 15.9.2026.
 *
 * It also prints the BOY in metres, which is the number that matters most and that nobody
 * could see before. The boy is still sized the old way — `scene.size` band × the era's
 * `player.scale` — while everybody around him is sized from `heights.ts`. The two systems
 * do not agree, and the disagreement is per room: the same twelve-year-old is a different
 * height in the classroom than he is in the street.
 *
 *   npx tsx scripts/life/actor-sizes.ts            → 1986
 *   ERA=1990 npx tsx scripts/life/actor-sizes.ts   → 1990
 *   ERA=1990 BOY=1 npx tsx scripts/life/actor-sizes.ts   → only the boy-height table
 */
import { eraFor } from '../../lib/life/content/era'
import { bodySize, heightOf } from '../../lib/life/world/heights'
import { ALL_SCENES, inEra } from '../../lib/life/world/scenes'

const era = process.env.ERA ?? '1986'
const k = eraFor(era).player.scale ?? 1
const boyFigure = 'pogi'
const boyOnly = process.env.BOY === '1'

/**
 * What the runtime gives the boy at this point on the band, as a fraction of the frame.
 * Mirrors `WorldScene.playerSize()` exactly: the room's metre, the child height from
 * `heights.ts`, the era's `scale` for his age, and the room's own band as the taper.
 */
function boyAt(scene: (typeof ALL_SCENES)[number], t: number): number {
  const taper = scene.size.far / Math.max(1e-6, scene.size.near)
  const near = scene.metre * heightOf(boyFigure) * k
  return near * taper + (near - near * taper) * t
}

console.log(`ERA ${era} · boy figure ${boyFigure} · heightOf=${heightOf(boyFigure)}m · player.scale=${k}\n`)

const drift: string[] = []

for (const scene of ALL_SCENES) {
  const taper = scene.size.far / Math.max(1e-6, scene.size.near)
  // The boy's implied height is constant along the band, so one number describes the room.
  const impliedBoy = boyAt(scene, 1) / scene.metre
  const gap = impliedBoy - heightOf(boyFigure) * k
  if (Math.abs(gap) > 0.05) {
    drift.push(
      `${scene.id.padEnd(22)} boy is ${impliedBoy.toFixed(2)}m here, ${(heightOf(boyFigure) * k).toFixed(2)}m expected  (${gap > 0 ? '+' : ''}${(gap * 100).toFixed(0)}cm)`,
    )
  }
  if (boyOnly) continue

  const rows: string[] = []
  for (const actor of scene.actors) {
    if (!inEra(actor, era)) continue
    const t = Math.max(0, Math.min(1, (actor.y - scene.band.far) / (scene.band.near - scene.band.far)))
    const drawn = bodySize(actor.figure, scene.metre, t, taper)
    const boy = boyAt(scene, t)
    const ratio = drawn / boy
    const metres = drawn / scene.metre
    const flag = ratio < 0.8 || ratio > 2.1 ? '  ← ' : '    '
    rows.push(
      `${flag}${actor.id.padEnd(18)} ${actor.figure.padEnd(16)} y=${actor.y} ${metres.toFixed(2)}m  boy=${(boy / scene.metre).toFixed(2)}m  ratio=${ratio.toFixed(2)}`,
    )
  }
  if (rows.length) {
    console.log(`── ${scene.id}  (metre=${scene.metre}, band ${scene.band.far}→${scene.band.near})`)
    console.log(rows.join('\n'))
  }
}

if (drift.length) {
  console.log(`\n═══ הילד משנה גובה בין חדר לחדר — ${drift.length} חדרים ═══`)
  console.log(drift.join('\n'))
}
