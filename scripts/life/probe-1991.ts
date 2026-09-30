/**
 * 11.3.1991, בלי שום דבר אופציונלי — ההליכה שמאור לא יכול היה לעשות.
 *
 *   npx tsx scripts/life/probe-1991.ts
 *
 * הסגור המונוטוני מוכיח את זה מבנית; זה מוכיח את זה **בסדר** — איזה ענף של אופיר באמת
 * נבחר, מה הוא מרים, והאם הדלת מצוירת אחריו. ענף נבחר לפי הראשון שתנאיו מתקיימים, וסדר
 * הוא בדיוק מה שסגירת מעגל מתירנית לא בודקת.
 */
import { DIALOGUE } from '../../lib/life/content/dialogue'
import { CHAPTER } from '../../lib/life/content/chapters'
import { goal1991 } from '../../lib/life/content/goals'
import { apply, emptyState } from '../../lib/life/events'
import type { LifeState } from '../../lib/life/types'
import { SCENE, whenFor } from '../../lib/life/world/scenes'
import { canPlayerReach } from '../../lib/life/world/reach'
import { meets } from '../../lib/life/world/types'

const def = CHAPTER['1991']!
const base = emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, 1991)
let state: LifeState = { ...base, chapter: '1991', minute: def.minute, location: def.start.location }

const door = SCENE['allenby']!.exits.find((exit) => exit.id === 'ussishkin')!
const drawn = () => meets(state, whenFor(door, '1991'))
const raise = (flag: string) => { state = { ...state, flags: { ...state.flags, [flag]: true } } }

console.log('קו חיים ריק — לא היה עם אפי ב-1984, אין `life:knows:hall`.')
console.log(`  הדלת מאלנבי לאוסישקין מצוירת? ${drawn() ? 'כן' : 'לא'}   ← זה מה שמאור פגש`)

// ההפסקה. אופיר בחצר. איזה ענף נבחר?
const ofir = DIALOGUE['ofir-yard']!
const picked = ofir.branches.find((branch) => meets(state, branch.when))
console.log(`\n  אופיר בחצר → ענף "${picked?.lines?.[0]?.text?.slice(0, 34) ?? '—'}…"`)
for (const effect of picked?.then ?? []) {
  if (effect.e === 'flag') { raise(effect.flag); console.log(`    מרים: ${effect.flag}`) }
}

console.log(`\n  הדלת מצוירת עכשיו? ${drawn() ? 'כן' : 'לא'}`)

// ואז היום ממשיך: שיעורים, רשות, ובערב — האולם.
for (const flag of ['school:done', 'hw:done', 'permission:yes']) raise(flag)
const want = goal1991(state)!
state = { ...state, location: 'street', minute: 19 * 60 + 30 }
const reach = canPlayerReach(state, '1991', 'street', want)
console.log(`\n  המטרה: ${want}`)
console.log(`  אפשר להגיע? ${reach.reachable ? 'כן' : 'לא'} · ${reach.reason}`)
console.log(`  הדרך: ${reach.path.join(' → ')}`)

// ומי שהגיע — יודע מעכשיו לבד, גם ב-1993.
const after = apply(state, { t: 'moved', to: 'ussishkin-outside' })
console.log(`\n  אחרי שהגיע: life:knows:hall = ${Boolean(after.flags['life:knows:hall'])}`)

const bad = !drawn() || !reach.reachable || !after.flags['life:knows:hall']
console.log(bad ? '\nFAIL' : '\nPASS — הפרק עביר מקו חיים ריק')
process.exit(bad ? 1 : 0)
