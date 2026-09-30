import { CHAPTERS } from '../content/chapters'
import { DIALOGUE } from '../content/dialogue'
import { eraFor } from '../content/era'
import { DEFAULT_IDENTITY } from '../content/chapter1986'
import { CHORUS, RUNTIME_ROLES } from '../characters'
import { PARTNER_TAG } from '../partner'
import type { LocationId } from '../types'

import { castFigure } from './castFigures'
import { yearOfChapter } from './homes'
import { ALL_SCENES, inEra, sceneIn, type SceneDef } from './scenes'

/**
 * ------------------------------------------ סנכרון: מי שמדבר — עומד (כלל 85) ----
 *
 * מאור, 21.9.2026: *"שיהיה באמת ריקוד וסנכרון מלא בין הסיפור לבין הנראה על המסך."*
 *
 * המכשיר הזה שואל על כל שיחה שביט של החיים הבוגרים (2000 והלאה) פותח, ועל כל מי שמדבר
 * בה (בכל ענף): **איפה הוא?** יש ארבע תשובות טובות ואחת רעה —
 *
 *   · `staged` — הוא עומד בחדר שבו הביט יורה, בשנה הזאת, על הציור של השנה הזאת;
 *   · `remote` — השיחה אומרת שהוא בטלפון או על מסך (`Conversation.remote`);
 *   · `elsewhere` — השיחה קורית במקום שאין לו ציור (`Conversation.where`), והתיבה אומרת איפה;
 *   · `companion` — ביט של שעון, שנפתח בכל חדר: מי שמדבר נכנס לצד פוגי לאורך השיחה
 *     (`WorldScene.summonSpeakers`), כי יש לו גוף בשנים האלה (`castFigures.ts`);
 *   · **`missing`** — אף אחד מהארבעה: שם בתיבה, פרצוף, וחדר שאין בו אף אחד. זה הכשל.
 *
 * ביט של כניסה לחדר שמסתמך על `companion` אינו נכשל, אבל נספר בנפרד (`walkIn`): בחדר
 * שהסצנה כתובה לו, האנשים צריכים לחכות כשנכנסים, ולא להיכנס אחריו.
 */

export type SyncVerdict = 'staged' | 'remote' | 'elsewhere' | 'companion' | 'missing'

export type SyncRow = {
  chapter: string
  beat: string
  conversation: string
  room: LocationId | null
  trigger: 'enter' | 'clock'
  who: string
  verdict: SyncVerdict
}

const PLAYER = DEFAULT_IDENTITY.name
const PARTNERS = ['מלאני', 'דור', 'תמר']

type BeatRow = { id?: string; at?: LocationId | readonly LocationId[]; trigger?: 'enter' | 'clock'; do?: unknown }

/** every speaker of every branch, as written (`PARTNER` included) */
function speakersOf(conversation: string): string[] {
  const def = DIALOGUE[conversation]
  if (!def) return []
  const out = new Set<string>()
  for (const branch of def.branches) for (const line of branch.lines) if (line.who && line.who !== PLAYER) out.add(line.who)
  return [...out]
}

function standing(room: SceneDef, chapter: string, who: string): boolean {
  const names = who === PARTNER_TAG ? PARTNERS : [who]
  return room.actors.some((actor) => inEra(actor, chapter) && names.includes(actor.nameHe))
}

function hasBody(who: string): boolean {
  if (who === PARTNER_TAG) return PARTNERS.every((name) => castFigure(name))
  return Boolean(castFigure(who))
}

export function syncRows(): SyncRow[] {
  const rows: SyncRow[] = []
  const byId = new Map(ALL_SCENES.map((scene) => [scene.id, scene]))
  for (const def of CHAPTERS) {
    if (yearOfChapter(def.id) < 2000 || !def.playable) continue
    const beats = (eraFor(def.id).beats ?? []) as readonly BeatRow[]
    for (const beat of beats) {
      const actions = Array.isArray(beat.do) ? (beat.do as Array<{ a?: string; conversation?: string }>) : []
      for (const action of actions) {
        if (action.a !== 'talk' || !action.conversation) continue
        const conversation = DIALOGUE[action.conversation]
        if (!conversation) continue
        const rooms: readonly (LocationId | null)[] = beat.at ? (Array.isArray(beat.at) ? (beat.at as LocationId[]) : [beat.at as LocationId]) : [null]
        for (const room of rooms) {
          const scene = room ? byId.get(room) : undefined
          const here = scene ? sceneIn(scene, def.id) : null
          for (const who of speakersOf(action.conversation)) {
            if (CHORUS.includes(who) || (RUNTIME_ROLES[who] && who !== PARTNER_TAG && who !== 'הילד')) continue
            let verdict: SyncVerdict
            if (conversation.remote?.[who]) verdict = 'remote'
            else if (conversation.where) verdict = 'elsewhere'
            else if (here && standing(here, def.id, who)) verdict = 'staged'
            else if (hasBody(who)) verdict = 'companion'
            else verdict = 'missing'
            rows.push({ chapter: def.id, beat: beat.id ?? '?', conversation: action.conversation, room, trigger: beat.trigger ?? 'enter', who, verdict })
          }
        }
      }
    }
  }
  return rows
}
