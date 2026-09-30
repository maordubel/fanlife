/**
 * מה קיים רק ב-1986 — the trap in `inEra`, counted.
 *
 *   npx tsx scripts/life/era-audit.mjs
 *
 * `inEra(def, chapter)` falls back to the era `'1986'` when a def has none. That is right
 * for a chapter's own cast and wrong the moment somebody adds a person or a piece of
 * dressing meaning "always" — it exists in ONE chapter out of nineteen, silently, and
 * looks like a rendering bug when it is a missing word.
 *
 * Found on 6.9.2026 when the two people on the new Allenby corner were invisible in every
 * year but one. They are tagged now. This lists what is still in that state so the number
 * can only go down: actors are mostly correct (the schedule systems place the later
 * chapters' people), the dressing mostly is not.
 */
import { ALL_SCENES } from '../../lib/life/world/scenes'

let total = 0
for (const scene of ALL_SCENES) {
  const actors = scene.actors.filter((a) => a.era === undefined).map((a) => a.id)
  const spots = scene.hotspots.filter((h) => h.era === undefined).map((h) => h.id)
  const layers = (scene.layers ?? []).filter((l) => l.era === undefined).map((l) => l.art)
  const n = actors.length + spots.length + layers.length
  if (!n) continue
  total += n
  console.log(`\n── ${scene.id} (${n})`)
  if (actors.length) console.log(`   actors: ${actors.join(', ')}`)
  if (spots.length) console.log(`   spots:  ${spots.join(', ')}`)
  if (layers.length) console.log(`   layers: ${layers.join(', ')}`)
}
console.log(`\n${total} things exist only in the chapter "1986".`)
