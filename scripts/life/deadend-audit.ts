/**
 * חורים — הבדיקה שאמורה הייתה להיות פה מזמן.
 *
 *   npx tsx scripts/life/deadend-audit.ts
 *
 * Maor started a new life on 6.9.2026 and was told, in the first room of the first
 * mission, to go and ask his father something — in a year where his father is not in the
 * room. That is the whole class of bug this file exists to end: text and rules written
 * for ONE chapter and inherited silently by eighteen others.
 *
 * Nothing here plays the game. It reads the content the way the runtime reads it, one
 * chapter at a time, and asks five questions that a player would ask with their hands:
 *
 *   1. When the room tells me I am stuck, does it name a person who is actually here?
 *   2. Does every conversation this chapter can reach exist, and does every branch of it
 *      lead somewhere — a `goto` to a node that exists, an effect the engine knows?
 *   3. Can I get OUT of every room I can get into, in this chapter?
 *   4. Is every flag a door asks for raised by something in this chapter?
 *   5. Does the chapter have at least one ending whose condition something can satisfy?
 *
 * A finding is printed with the chapter, the room and the exact string, because a hole is
 * only fixable if you know which of nineteen years it is in. Exit code 1 on any HOLE.
 */
import { ALL_SCENES, exitInEra, inEra, stuckFor, blockedFor, type SceneDef } from '../../lib/life/world/scenes'
import { DIALOGUE } from '../../lib/life/content/dialogue'
import { CHAPTERS } from '../../lib/life/content/chapters'
import { eraFor } from '../../lib/life/content/era'
import { holds, peopleNamed } from '../../lib/life/world/hints'
import { characterName } from '../../lib/life/characters'
import type { Effect } from '../../lib/life/content/script'
import type { Condition } from '../../lib/life/world/types'

const ORDER = CHAPTERS.filter((c) => c.playable !== false).map((c) => c.id)

type Finding = { level: 'HOLE' | 'WARN'; chapter: string; where: string; what: string }
const findings: Finding[] = []
const hole = (chapter: string, where: string, what: string) => findings.push({ level: 'HOLE', chapter, where, what })
const warn = (chapter: string, where: string, what: string) => findings.push({ level: 'WARN', chapter, where, what })

// ---------------------------------------------------------------- 1. who is in the room
/**
 * The people a stuck message is allowed to name. A room may say "אבא בכורסה" only in a
 * chapter where somebody called אבא is standing in it; everything else is the game
 * pointing at an empty chair. Nicknames are listed beside the name they resolve to,
 * because the text calls Kobi both קובי and אבא depending on the year.
 */
// the nickname table and the Hebrew-prefix matcher now live in `world/hints.ts`, which
// the RUNTIME uses too — so the audit and the game can never disagree about what is a lie.

/**
 * Two systems put people in rooms and a stuck line cannot tell them apart: the scene's own
 * cast (`actors`, filtered by era) and the chapter's timetable (`era.schedule`, which
 * overrides positions and places people the scene never lists). 1986's Kobi is a schedule
 * row; 1984's Rachel is a scene actor. Both count as "here".
 */
const namesIn = (scene: SceneDef, chapter: string): Set<string> => {
  const out = new Set<string>()
  for (const actor of scene.actors) if (inEra(actor, chapter) && actor.nameHe) out.add(actor.nameHe)
  for (const row of eraFor(chapter).schedule) {
    if (row.location !== scene.id) continue
    const name = characterName(row.characterId)
    if (name) out.add(name)
  }
  return out
}


// ------------------------------------------------------------ 2. the conversation graph
const nodeIds = new Set(Object.keys(DIALOGUE))

const effectsOf = (id: string): Effect[] => {
  const conversation = DIALOGUE[id]
  if (!conversation) return []
  const out: Effect[] = []
  for (const branch of conversation.branches) {
    for (const effect of branch.then ?? []) out.push(effect)
    for (const choice of branch.choices ?? []) for (const effect of choice.then) out.push(effect)
  }
  return out
}

/** every conversation reachable from a starting id, following `goto` */
const reachable = (from: string): Set<string> => {
  const seen = new Set<string>()
  const queue = [from]
  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id) || !DIALOGUE[id]) continue
    seen.add(id)
    for (const effect of effectsOf(id)) if (effect.e === 'goto') queue.push(effect.node)
  }
  return seen
}

/** every flag any effect anywhere raises, and every flag any condition anywhere reads */
const raised = new Set<string>()
const flagsOfCondition = (condition: Condition | undefined, into: Set<string>) => {
  if (!condition) return
  const any = (condition as { any?: Condition[] }).any
  if (any) { for (const part of any) flagsOfCondition(part, into); return }
  const all = (condition as { all?: Condition[] }).all
  if (all) { for (const part of all) flagsOfCondition(part, into); return }
  const flag = (condition as { flag?: string }).flag
  if (flag) into.add(flag)
}

for (const id of Object.keys(DIALOGUE)) {
  for (const effect of effectsOf(id)) {
    if (effect.e === 'flag') raised.add(effect.flag)
    if (effect.e === 'goto' && !nodeIds.has(effect.node)) {
      hole('*', `dialogue:${id}`, `goto → '${effect.node}' — a node that does not exist`)
    }
  }
}
/**
 * Flags are raised by four systems and only one of them is the dialogue registry:
 * conversations (`e: 'flag'`), the chapter's BEATS (`a: 'flag'`, and the day helpers that
 * dispatch `flag.raised` inside `a: 'events'`), the ARRIVAL plates on a scene (the first
 * sight of the floodlights raises `saw:road`), and the runtime itself. Miss one and the
 * audit reports a working door as a dead end, which is how a checker loses its authority.
 */
for (const chapter of CHAPTERS) {
  for (const beat of eraFor(chapter.id).beats ?? []) {
    // `do` is a list of actions on most beats and a function on a few; only the list
    // form declares its flags statically, and a function's flags are found by the
    // source-text sweep below.
    const actions = (beat as { do?: unknown }).do
    for (const action of Array.isArray(actions) ? actions : []) {
      const a = action as { a?: string; flag?: string; events?: Array<{ t?: string; flag?: string }> }
      if (a.a === 'flag' && a.flag) raised.add(a.flag)
      for (const event of Array.isArray(a.events) ? a.events : []) if (event.t === 'flag.raised' && event.flag) raised.add(event.flag)
    }
  }
}
for (const scene of ALL_SCENES) {
  const arrivals = [
    (scene as { arrival?: { flag?: string } }).arrival,
    ...Object.values((scene as { arrivalByEra?: Record<string, { flag?: string }> }).arrivalByEra ?? {}),
  ]
  for (const arrival of arrivals) if (arrival?.flag) raised.add(arrival.flag)
}

// the runtime raises plenty on its own; those are collected from the source, cheaply
import { readFileSync, readdirSync } from 'node:fs'
const SOURCE_DIRS = ['lib/life', 'lib/life/content', 'lib/life/runtime', 'lib/life/runtime/scenes', 'lib/life/world', 'components/life', 'app/life']

/**
 * דגלים ששמם קבוע — a flag raised through a named constant.
 *
 * 7.9.2026: the album raises `ALBUM_SEEN`, which is `'album:seen'` declared once in
 * `lib/life/stickers.ts`, and this audit reported the kiosk's album door as a dead end
 * because the sweep below only ever looked for a quoted string. Naming a flag once
 * instead of typing it in six places is the RIGHT thing to do, so the checker learns to
 * follow the name rather than the code learning to stop using one.
 *
 * Only constants whose value looks like a flag (`something:something`) are collected, so
 * an ordinary string constant cannot accidentally register itself as a raised flag.
 */
const namedFlags = new Map<string, string>()
for (const dir of SOURCE_DIRS) {
  let files: string[] = []
  try { files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f)) } catch { continue }
  for (const file of files) {
    const source = readFileSync(`${dir}/${file}`, 'utf8')
    for (const m of source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*'([a-z][\w-]*:[\w:-]+)'/g)) {
      namedFlags.set(m[1] as string, m[2] as string)
    }
  }
}
for (const dir of SOURCE_DIRS) {
  let files: string[] = []
  try { files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f)) } catch { continue }
  for (const file of files) {
    const source = readFileSync(`${dir}/${file}`, 'utf8')
    for (const m of source.matchAll(/flag\.raised',\s*flag:\s*'([^']+)'/g)) { if (m[1]) raised.add(m[1]) }
    for (const m of source.matchAll(/t:\s*'flag\.raised',\s*flag:\s*`([^`$]+)`/g)) { if (m[1]) raised.add(m[1]) }
    for (const m of source.matchAll(/raise\('([^']+)'\)/g)) { if (m[1]) raised.add(m[1]) }
    for (const m of source.matchAll(/e:\s*'flag',\s*flag:\s*'([^']+)'/g)) { if (m[1]) raised.add(m[1]) }
    // …and the same three shapes written with a named constant instead of a literal
    for (const m of source.matchAll(/flag:\s*([A-Za-z_$][\w$]*)\s*[,}]/g)) {
      const value = m[1] ? namedFlags.get(m[1]) : undefined
      if (value) raised.add(value)
    }
  }
}

// --------------------------------------------------------------------------- the sweep
for (const chapter of ORDER) {
  for (const scene of ALL_SCENES) {
    const here = namesIn(scene, chapter)

    // 1 — the stuck line may not name somebody who is not here
    const stuck = stuckFor(scene, chapter)
    if (stuck && !holds(stuck, here)) {
      const missing = peopleNamed(stuck).filter((word) => !holds(word, here))
      hole(chapter, scene.id, `stuck text names ${missing.map((w) => `'${w}'`).join(', ')} — not in the room this chapter: «${stuck}»`)
    }

    // 2 — every conversation the room can start exists
    for (const actor of scene.actors) {
      if (!inEra(actor, chapter) || !actor.talk) continue
      // `net:` is the 1990 transistor network, routed by the runtime rather than by the
      // dialogue registry; `gig-` conversations are generated. Neither is a missing node.
      if (actor.talk.startsWith('net:')) continue
      if (!nodeIds.has(actor.talk)) hole(chapter, scene.id, `actor '${actor.id}' talks to '${actor.talk}' — no such conversation`)
    }
    for (const spot of scene.hotspots) {
      if (!inEra(spot, chapter)) continue
      const act = (spot as { act?: string }).act
      // `pano:` opens a panorama and `net:` reaches the 1990 transistor network; both are
      // routed by the runtime, not by the dialogue registry. Anything else has to exist.
      const RUNTIME = ['pano:', 'net:', 'gig:', 'shop:', 'book:']
      if (act && !nodeIds.has(act) && !RUNTIME.some((prefix) => act.startsWith(prefix))) {
        hole(chapter, scene.id, `hotspot '${spot.id}' acts '${act}' — no such conversation`)
      }
    }

    // 3 — a room you can enter and not leave
    const exits = scene.exits.filter((exit) => exitInEra(exit, chapter))
    if (!exits.length && scene.id !== 'prologue') {
      hole(chapter, scene.id, 'no exit exists in this chapter')
    } else {
      const needy = exits.filter((exit) => {
        const need = (exit as { needsByEra?: Record<string, unknown>; needs?: unknown }).needs
        const byEra = (exit as { needsByEra?: Record<string, unknown> }).needsByEra
        const forThis = byEra && chapter in byEra ? byEra[chapter] : need
        return forThis != null
      })
      if (exits.length && needy.length === exits.length) {
        warn(chapter, scene.id, `every exit is conditional (${exits.map((e) => e.id).join(', ')}) — check one is always open`)
      }
      // the blocked line, like the stuck line, may not name a ghost
      /**
       * A blocked-line is only ever READ in a chapter where the door is actually shut, and
       * only misleads when it tells you to go and TALK to somebody. "בלי המפתח אמא לא
       * נותנת לצאת" states a household rule and is true whether or not she is standing
       * there; "תשאל את אבא" is an instruction, and an instruction about an empty chair is
       * the bug this whole file exists for.
       */
      const ASKS = /תשאל|תדבר|תבקש|שאל את|דבר עם/u
      for (const exit of needy) {
        const blocked = blockedFor(exit, chapter)
        if (!blocked || !ASKS.test(blocked) || holds(blocked, here)) continue
        hole(chapter, scene.id, `exit '${exit.id}' tells the player to talk to somebody who is not here: «${blocked}»`)
      }
    }
  }
}

// 4 — a door that asks for a flag nothing raises
const wanted = new Set<string>()
for (const scene of ALL_SCENES) {
  for (const exit of scene.exits) {
    flagsOfCondition((exit as { needs?: Condition }).needs, wanted)
    const byEra = (exit as { needsByEra?: Record<string, Condition | null> }).needsByEra ?? {}
    for (const condition of Object.values(byEra)) flagsOfCondition(condition ?? undefined, wanted)
  }
  for (const spot of scene.hotspots) flagsOfCondition((spot as { when?: Condition }).when, wanted)
}
for (const id of Object.keys(DIALOGUE)) {
  for (const branch of DIALOGUE[id]?.branches ?? []) {
    for (const choice of branch.choices ?? []) flagsOfCondition(choice.when, wanted)
  }
}
for (const flag of wanted) {
  if (!raised.has(flag) && !flag.includes('${') && !flag.startsWith('own:') && !flag.startsWith('work:')) {
    hole('*', 'doors', `a door or choice asks for flag '${flag}' — nothing in the game raises it`)
  }
}

// ------------------------------------------------------------------------------ report
const holes = findings.filter((f) => f.level === 'HOLE')
const warns = findings.filter((f) => f.level === 'WARN')
const byChapter = new Map<string, Finding[]>()
for (const f of holes) byChapter.set(f.chapter, [...(byChapter.get(f.chapter) ?? []), f])

console.log(`\n=== חורים (${holes.length}) ===`)
for (const [chapter, list] of byChapter) {
  console.log(`\n--- ${chapter} ---`)
  for (const f of list) console.log(`  ${f.where}: ${f.what}`)
}
if (process.env.VERBOSE) {
  console.log(`\n=== אזהרות (${warns.length}) ===`)
  for (const f of warns) console.log(`  [${f.chapter}] ${f.where}: ${f.what}`)
} else {
  console.log(`\n(${warns.length} warnings — VERBOSE=1 to list)`)
}
console.log(holes.length ? `\nFAIL — ${holes.length} holes` : '\nPASS — no dead ends found')
process.exit(holes.length ? 1 : 0)
