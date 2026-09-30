/**
 * `npm run life:cast-art` — every named person of the adult life, era by era: the body he
 * stands on, the face in the box, whether it is a stand-in, and who else stands on that body
 * (`lib/life/world/identity.ts`, GRAPHICS-MASTER-AUDIT §24.1). A report; it never fails.
 */
import { castArt } from '../../lib/life/world/identity'

let last = ''
for (const span of castArt()) {
  if (span.who !== last) console.log(`\n${span.who}`)
  last = span.who
  const when = span.from === span.to ? span.from : `${span.from} → ${span.to}`
  const tags = [span.standIn ? 'תחליף' : '', span.sharedWith.length ? `חולק עם ${span.sharedWith.join(', ')}` : ''].filter(Boolean).join(' · ')
  console.log(`  ${when.padEnd(34)} ${span.body.padEnd(16)} ${String(span.face ?? '—').padEnd(16)} ${tags}`)
}
