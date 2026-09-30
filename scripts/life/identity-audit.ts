/**
 * `npm run life:identity` — the person on screen is the right person, at the right age
 * (`lib/life/world/identity.ts`, GRAPHICS-MASTER-AUDIT §24.2). Fails on:
 *   CROWD_WITH_OWN_ART  a named person on `adultA*`/`adultB*` while his own family is drawn
 *   SHARED_BODY         two named people on one canonical body in the same year
 *   FACE_NOT_BODY       the plate in the box is cut from another body than the one on the floor
 *   RETIRED_POSE        a pose documented as another man (`LEGACY_POSE`) or retired, anywhere
 *   FOREIGN_POSE        a named person handed a pose outside his family that year
 *   AGE_FROZEN          Pogi from 2010 still on `hero90`
 * Warnings are printed and do not fail: stand-ins, their shared bodies, plates whose body
 * nobody recorded, and the declared portrait-only face (Rachel at sixty).
 */
import { identityAudit } from '../../lib/life/world/identity'

const { problems, warnings } = identityAudit()
const group = <T extends { code: string }>(rows: T[]) => {
  const m = new Map<string, T[]>()
  for (const r of rows) m.set(r.code, [...(m.get(r.code) ?? []), r])
  return m
}
for (const [code, rows] of group(warnings)) {
  console.log(`\n⚠ ${code} (${rows.length})`)
  const seen = new Set<string>()
  for (const r of rows) {
    const line = code === 'FACE_UNVERIFIED' || code === 'PORTRAIT_ONLY' ? `${r.where.split('@')[0]} · ${r.detail}` : `${r.where} · ${r.detail}`
    if (seen.has(line)) continue
    seen.add(line)
    console.log(`  ${line}`)
  }
}
if (problems.length) {
  for (const [code, rows] of group(problems)) {
    console.log(`\n✗ ${code} (${rows.length})`)
    for (const r of rows.slice(0, 40)) console.log(`  ${r.where} · ${r.detail}`)
  }
  console.log(`\nFAIL — ${problems.length} identity problems`)
  process.exit(1)
}
console.log('\nPASS — every named person stands on his own body, at his age, and speaks with its face')
