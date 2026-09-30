import artManifest from '../../../public/life/art/manifest.json'
import { CHAPTERS } from '../content/chapters'
import { eraFor } from '../content/era'
import { LEGACY_POSE, RETIRED_FIGURE } from '../runtime/art'

import { allowedFigure, CAST_2000, castFigure, familyOf, PORTRAIT_ONLY } from './castFigures'
import { yearOfChapter } from './homes'
import { ALL_SCENES, inEra, sceneIn } from './scenes'

/**
 * ------------------------------------------------ זהות חזותית — מי זה על המסך (24.9.2026) ----
 *
 * הביקורת הגרפית של מאור (23.9.2026, `GRAPHICS-MASTER-AUDIT.md` §24) ביקשה שני מכשירים:
 * `life:cast-art` — מי עומד על מה ומדבר עם איזה פנים, לכל אדם ולכל עידן — ו-`life:identity`,
 * שנופל כשהתשובה שגויה. שניהם קוראים מכאן, וכך גם `tests/life-identity.test.ts`.
 *
 * כל שאלה נשאלת על **מה שהמשחק מצייר**: הגוף מ-`castFigure` (החדרים של 2000–2026 בונים
 * ממנו), השחקנים מ-`sceneIn` לכל פרק, והפנים מ-`eraFor(...).portraits` אחרי `ownFace` — לא
 * מהטבלה כפי שהיא כתובה. טבלה שאומרת "קובי בן 72" בזמן שהתיבה מראה את קובי של 1990 היא
 * בדיוק מה שהמכשיר הזה קיים כדי לתפוס.
 */

type PortraitRow = { source?: string }
const PORTRAITS = (artManifest as unknown as { portraits: Record<string, PortraitRow> }).portraits

/** the names a line is spoken under that are the same person (`castFigures.ts` keys them twice) */
export const SAME_PERSON: Readonly<Record<string, string>> = {
  'אבא': 'קובי',
  'אמא': 'רחל',
  'רפי מהקיוסק': 'רפי',
  'אילן השכן': 'אילן',
  'עומר': 'חרמש',
}
export const personOf = (who: string): string => SAME_PERSON[who] ?? who

/**
 * גוף משלו שכבר צויר — the families a stand-in person could stand on instead.
 *
 * A named person on `adultA*`/`adultB*` while his own family is on disk is the P0 of the
 * audit (Keren on `adultB3`). Freddy and Melamed are the declared exception: their own
 * sheets are ILLUSTRATIONS upscaled 2.4× and cut at the knee (rule 88 — no drawing inside a
 * photograph), so their stand-ins stay until the photographed sheets arrive.
 */
export const OWN_FAMILY: Readonly<Record<string, readonly string[]>> = {
  'קרן': ['keren40', 'keren90'],
  'פרדי': ['freddy'],
  'מלמד': ['melamed'],
}
export const OWN_FAMILY_UNUSABLE: Readonly<Record<string, string>> = {
  freddy: 'גיליון מצויר, מוגדל פי 2.4, חתוך בברך — ציור בתוך צילום (כלל 88)',
  melamed: 'אותו גיליון מצויר של פרדי — ציור בתוך צילום (כלל 88)',
}

const CROWD = /^(adultA|adultB|youngA|youngB)\d/

export type EraSpan = {
  who: string
  from: string
  to: string
  body: string
  face: string | null
  standIn: boolean
  sharedWith: string[]
}

/** the adult-life chapters, in the order the life plays them */
export function adultChapters(): string[] {
  return CHAPTERS.map((c) => c.id).filter((id) => yearOfChapter(id) >= 2000)
}

function faceIn(chapter: string, who: string): string | null {
  return eraFor(chapter).portraits[who] ?? null
}

/** `cut from X` → X; anything else is a plate whose body nobody wrote down */
export function faceSource(face: string | null): string | null {
  if (!face) return null
  const src = PORTRAITS[face]?.source ?? ''
  const m = /^cut from (\S+)/.exec(src)
  return m ? m[1]! : null
}

/** every person, every adult chapter: body, face, and who else stands on that body that year */
export function castArt(): EraSpan[] {
  const chapters = adultChapters()
  const spans: EraSpan[] = []
  const people = Object.keys(CAST_2000)
  for (const who of people) {
    let open: EraSpan | null = null
    for (const chapter of chapters) {
      const year = yearOfChapter(chapter)
      const body = castFigure(who, year)!
      const face = faceIn(chapter, who)
      const family = familyOf(body.figure)
      const sharedWith = people
        .filter((other) => personOf(other) !== personOf(who) && familyOf(castFigure(other, year)!.figure) === family)
        .map(personOf)
      const shared = [...new Set(sharedWith)].sort()
      if (open && open.body === body.figure && open.face === face && open.sharedWith.join() === shared.join()) {
        open.to = chapter
        continue
      }
      open = { who, from: chapter, to: chapter, body: body.figure, face, standIn: Boolean(body.standIn), sharedWith: shared }
      spans.push(open)
    }
  }
  return spans
}

export type IdentityProblem = { code: 'CROWD_WITH_OWN_ART' | 'SHARED_BODY' | 'FACE_NOT_BODY' | 'RETIRED_POSE' | 'FOREIGN_POSE' | 'AGE_FROZEN'; where: string; detail: string }
export type IdentityWarning = { code: 'FACE_UNVERIFIED' | 'STANDIN' | 'OWN_ART_UNUSABLE' | 'PORTRAIT_ONLY' | 'STANDIN_SHARED'; where: string; detail: string }

const BLOCKED = new Set<string>([...LEGACY_POSE, ...RETIRED_FIGURE])

export function identityAudit(): { problems: IdentityProblem[]; warnings: IdentityWarning[] } {
  const problems: IdentityProblem[] = []
  const warnings: IdentityWarning[] = []
  const chapters = adultChapters()
  const people = Object.keys(CAST_2000)

  // ---- 1. a crowd body where the person's own family exists
  for (const who of people) {
    for (const chapter of chapters) {
      const body = castFigure(who, yearOfChapter(chapter))!
      if (!CROWD.test(body.figure)) continue
      const own = OWN_FAMILY[personOf(who)] ?? []
      const usable = own.filter((f) => !OWN_FAMILY_UNUSABLE[f])
      if (usable.length) problems.push({ code: 'CROWD_WITH_OWN_ART', where: `${who}@${chapter}`, detail: `${body.figure} — יש לו/לה ${usable.join(', ')}` })
      else if (own.length) warnings.push({ code: 'OWN_ART_UNUSABLE', where: `${who}@${chapter}`, detail: own.map((f) => `${f}: ${OWN_FAMILY_UNUSABLE[f]}`).join(' · ') })
      break
    }
  }

  // ---- 2. two named people on one canonical body in the same year (a stand-in is not canonical)
  for (const chapter of chapters) {
    const year = yearOfChapter(chapter)
    const byFamily = new Map<string, Set<string>>()
    const standBy = new Map<string, Set<string>>()
    for (const who of people) {
      const body = castFigure(who, year)!
      const table = body.standIn ? standBy : byFamily
      const family = familyOf(body.figure)
      table.set(family, (table.get(family) ?? new Set()).add(personOf(who)))
    }
    for (const [family, names] of byFamily) {
      if (names.size > 1) problems.push({ code: 'SHARED_BODY', where: chapter, detail: `${family}: ${[...names].join(', ')}` })
    }
    if (chapter === chapters[0]) {
      for (const [family, names] of standBy) if (names.size > 1) warnings.push({ code: 'STANDIN_SHARED', where: '2000+', detail: `${family}: ${[...names].join(', ')}` })
    }
  }

  // ---- 3. the face in the box is cut from the body on the floor, that year
  for (const chapter of chapters) {
    const year = yearOfChapter(chapter)
    const pairs: Array<[string, string]> = people.map((who) => [who, castFigure(who, year)!.figure])
    pairs.push(['פוגי', eraFor(chapter).player.pose.down])
    for (const [who, body] of pairs) {
      const face = faceIn(chapter, who)
      if (!face) continue
      const src = faceSource(face)
      if (!src) {
        warnings.push({ code: 'FACE_UNVERIFIED', where: `${who}@${chapter}`, detail: `${face} — "${PORTRAITS[face]?.source ?? '?'}"` })
        continue
      }
      if (familyOf(src) === familyOf(body)) continue
      const declared = PORTRAIT_ONLY.find((p) => p.who === who && p.face === face && familyOf(body) === p.body)
      if (declared) {
        warnings.push({ code: 'PORTRAIT_ONLY', where: `${who}@${chapter}`, detail: `${face} על ${body} — ${declared.why}` })
        continue
      }
      problems.push({ code: 'FACE_NOT_BODY', where: `${who}@${chapter}`, detail: `הגוף ${body}, הפנים ${face} (נחתכו מ-${src})` })
    }
  }

  // ---- 4. a pose documented as another man, anywhere the game draws a person
  for (const [who, row] of Object.entries(CAST_2000)) {
    for (const figure of [row.figure, ...Object.values(row.fromYear ?? {})]) {
      if (BLOCKED.has(figure)) problems.push({ code: 'RETIRED_POSE', where: `CAST_2000/${who}`, detail: figure })
    }
  }
  for (const chapter of CHAPTERS.map((c) => c.id)) {
    for (const scene of ALL_SCENES) {
      const here = sceneIn(scene, chapter)
      for (const actor of here.actors) {
        if (!inEra(actor, chapter)) continue
        if (BLOCKED.has(actor.figure)) problems.push({ code: 'RETIRED_POSE', where: `${scene.id}/${actor.id}@${chapter}`, detail: actor.figure })
        // ---- 5. a named person of the adult life on a pose that is not his family that year
        if (yearOfChapter(chapter) >= 2000 && CAST_2000[actor.nameHe] && !allowedFigure(actor.nameHe, yearOfChapter(chapter), actor.figure)) {
          problems.push({ code: 'FOREIGN_POSE', where: `${scene.id}/${actor.id}@${chapter}`, detail: `${actor.nameHe} על ${actor.figure} (הגוף שלו/ה: ${castFigure(actor.nameHe, yearOfChapter(chapter))!.figure})` })
        }
      }
    }
    for (const row of eraFor(chapter).ambient) if (BLOCKED.has(row.figure)) problems.push({ code: 'RETIRED_POSE', where: `ambient@${chapter}`, detail: row.figure })
  }

  // ---- 6. the audit's largest single error: a man of forty on the body of twenty-two
  for (const chapter of chapters) {
    const player = eraFor(chapter).player.pose.down
    if (yearOfChapter(chapter) >= 2010 && player === 'hero90') problems.push({ code: 'AGE_FROZEN', where: chapter, detail: `פוגי בשנת ${yearOfChapter(chapter)} על hero90` })
  }

  for (const who of people) if (castFigure(who)!.standIn) warnings.push({ code: 'STANDIN', where: who, detail: castFigure(who)!.figure })
  return { problems, warnings }
}
