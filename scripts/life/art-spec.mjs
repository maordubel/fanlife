/**
 * מפרט הגאומטריה לצייר — every room, with the exact place the CODE puts every door.
 *
 *   node scripts/life/art-spec.mjs   → docs/life/ART-SPEC-GEOMETRY.md
 *
 * Twice now a door has been painted in one place and coded in another, and both times the
 * cost was a delivery. The scene file is the only thing that knows where a door actually
 * is, so the brief the artist works from is GENERATED from it rather than typed beside it:
 * every number below is read out of `lib/life/world/scenes.ts` at the moment the document
 * is written, in the painting's own coordinates (0 = left/top edge, 1 = right/bottom).
 *
 * How to read a row, if you are painting:
 *   · `x 0.33–0.45` is the horizontal strip of the painting the door occupies.
 *   · `floor 0.80–0.95` is where the child's FEET may be. Anything painted below that line
 *     is in front of him; anything above it is behind him.
 *   · A door's `light` is the rectangle the game paints a glow into — that is where the
 *     doorway itself should be visible in the painting, and it is usually higher than the
 *     zone the child stands in to use it.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname
const dump = join(ROOT, 'scripts/life/.art-spec-dump.ts')
writeFileSync(
  dump,
  `import { ALL_SCENES } from '../../lib/life/world/scenes'
import { PANO_SPOTS } from '../../lib/life/content/panoramas'
import { BACKDROP, CLOSE_UP, CLOSE_UP_PAINTED, PANORAMA, TUNNEL_TEXTURE } from '../../lib/life/runtime/art'
process.stdout.write(
  JSON.stringify(
    { scenes: ALL_SCENES, panoramas: PANORAMA, spots: PANO_SPOTS, closeUps: CLOSE_UP, painted: CLOSE_UP_PAINTED, textures: TUNNEL_TEXTURE, backdrops: BACKDROP },
    (_k, v) => (typeof v === 'function' ? undefined : v),
  ),
)
`,
)
const json = execFileSync('npx', ['tsx', dump], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const data = JSON.parse(json)

const f = (n) => (n === undefined ? '—' : Number(n).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''))
const span = (start, size) => `${f(start)}–${f(Number(start) + Number(size))}`
const eraOf = (thing, fallback = '1986') => thing.era ?? fallback

const lines = []
lines.push('# THE WORKER LIFE — מפרט הגאומטריה של החדרים')
lines.push('')
lines.push('*נוצר אוטומטית מ-`lib/life/world/scenes.ts` (`node scripts/life/art-spec.mjs`). אל תערוך ביד —*')
lines.push('*הקוד הוא המקור. כל מספר הוא שבר של הציור: 0 = הקצה השמאלי/העליון, 1 = הימני/התחתון.*')
lines.push('')
lines.push('**איך קוראים את זה כשמציירים:** `x` הוא הרצועה האופקית שהדבר תופס. `רצפה` היא הפס')
lines.push('שבו כפות הרגליים של הילד נמצאות — מה שמצויר מתחתיו נמצא לפניו, ומה שמעליו מאחוריו.')
lines.push('ל**דלת** יש גם מלבן `אור`: זה המקום שבו המשחק מצייר זוהר, כלומר זה המקום שבו הפתח')
lines.push('עצמו צריך להיראות בציור — בדרך כלל גבוה יותר מהאזור שבו עומדים כדי להשתמש בו.')
lines.push('')

for (const scene of data.scenes) {
  const arts = [scene.art, ...Object.values(scene.artByEra ?? {})].filter((v, i, a) => a.indexOf(v) === i)
  lines.push(`## ${scene.titleHe} · \`${scene.id}\``)
  lines.push('')
  lines.push(`- ציור: ${arts.map((a) => `\`${a}.webp\``).join(' · ')}${scene.artByEra ? ` (לפי עידן: ${Object.entries(scene.artByEra).map(([era, art]) => `${era}→${art}`).join(', ')})` : ''}`)
  lines.push(`- רצפה (walk band): **${f(scene.band.far)}–${f(scene.band.near)}** של גובה הציור`)
  lines.push(`- גובה הילד: ${f(scene.size.far)} בקו הרחוק, ${f(scene.size.near)} בקו הקרוב (שבר מגובה הציור)`)
  if (scene.arrival) lines.push(`- כרטיס כניסה: \`${scene.arrival.art}.webp\`, ${scene.arrival.ms}ms`)
  if (scene.arrivalByEra) {
    for (const [era, card] of Object.entries(scene.arrivalByEra)) {
      lines.push(`- כרטיס כניסה ב-${era}: ${card ? `\`${card.art}.webp\`` : 'אין'}`)
    }
  }
  lines.push('')

  lines.push('### דלתות')
  lines.push('')
  lines.push('| דלת | לאן | x | y | אור (x, y) | עידן |')
  lines.push('|---|---|---|---|---|---|')
  for (const exit of scene.exits) {
    const light = exit.light ? `${span(exit.light.x, exit.light.w)} · ${span(exit.light.y, exit.light.h)} (${exit.light.tone})` : '—'
    lines.push(
      `| ${exit.labelHe} | \`${exit.to}\` | **${span(exit.x, exit.w)}** | ${span(exit.y, exit.h)} | ${light} | ${eraOf(exit, '*')} |`,
    )
  }
  lines.push('')

  if (scene.actors.length > 0) {
    lines.push('### אנשים')
    lines.push('')
    lines.push('| מי | ציור | x | y (רגליים) | גובה | עידן |')
    lines.push('|---|---|---|---|---|---|')
    for (const actor of scene.actors) {
      lines.push(`| ${actor.nameHe} | \`${actor.figure}\` | ${f(actor.x)} | ${f(actor.y)} | ${f(actor.size)} | ${eraOf(actor)} |`)
    }
    lines.push('')
  }

  if (scene.hotspots.length > 0) {
    lines.push('### דברים שאפשר לגעת בהם')
    lines.push('')
    lines.push('| מה | פועל | x | y | חפץ מצויר | עידן |')
    lines.push('|---|---|---|---|---|---|')
    for (const spot of scene.hotspots) {
      const prop = spot.prop
        ? `\`${spot.prop.key}\` בגודל ${f(spot.prop.size)}${spot.prop.at ? ` ב-(${f(spot.prop.at.x)}, ${f(spot.prop.at.y)})` : ''}`
        : '—'
      lines.push(`| ${spot.labelHe} | ${spot.verb} | ${f(spot.x)} | ${f(spot.y)} | ${prop} | ${eraOf(spot)} |`)
    }
    lines.push('')
  }

  const layers = scene.layers ?? []
  if (layers.length > 0) {
    lines.push('### שכבות מצוירות (רהיטים, קהל, אוויר)')
    lines.push('')
    lines.push('| ציור | x | y | רוחב | עומק | עידן |')
    lines.push('|---|---|---|---|---|---|')
    for (const layer of layers) {
      lines.push(`| \`${layer.art}\` | ${f(layer.x)} | ${f(layer.y)} | ${f(layer.w)} | ${f(layer.depth)} | ${eraOf(layer)} |`)
    }
    lines.push('')
  }

  lines.push('### נקודות התחלה')
  lines.push('')
  lines.push(
    Object.entries(scene.spawns)
      .map(([name, point]) => `\`${name}\` (${f(point.x)}, ${f(point.y)})`)
      .join(' · '),
  )
  lines.push('')
}

lines.push('## פנורמות, טקסטורות וקלוז-אפים')
lines.push('')
lines.push(`- פנורמות (4096×1024, אופק ב-48%): ${data.panoramas.map((k) => `\`${k}\``).join(' · ')}`)
lines.push(`- טקסטורות מנהרה (1024×1024, tileable): ${data.textures.map((k) => `\`${k}\``).join(' · ')}`)
lines.push(`- קלוז-אפים (1080×1350): ${data.closeUps.map((k) => `\`${k}\``).join(' · ')}`)
lines.push(`- קלוז-אפים שכבר צוירו: ${data.painted.length > 0 ? data.painted.map((k) => `\`${k}\``).join(' · ') : '**אף אחד — כולם עדיין פורטרט מוגדל**'}`)
lines.push('')
lines.push('### הסימנים בתוך כל פנורמה (yaw = מעלות מהמרכז, pitch = מעלות מהאופק)')
lines.push('')
lines.push('| פנורמה | סימן | yaw | pitch | שיחה |')
lines.push('|---|---|---:|---:|---|')
for (const [key, look] of Object.entries(data.spots)) {
  for (const spot of look.spots ?? []) {
    lines.push(`| \`${key}\` | ${spot.labelHe} | ${spot.yaw} | ${spot.pitch} | \`${spot.act}\` |`)
  }
}
lines.push('')

mkdirSync(join(ROOT, 'docs/life'), { recursive: true })
writeFileSync(join(ROOT, 'docs/life/ART-SPEC-GEOMETRY.md'), lines.join('\n'))
console.log(`docs/life/ART-SPEC-GEOMETRY.md — ${data.scenes.length} rooms`)
