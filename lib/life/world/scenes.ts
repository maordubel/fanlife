import { at } from '../clock'
import type { LocationId } from '../types'

import { ACTIVITY, activityChapters, type ActivityId } from '../activities'
import { GIGS, gigChapters, gigId, isPaid, offerFlag } from '../gigs'
import { SHOP_CHAPTERS, shopId } from '../shirts'
import { CHAPTERS } from '../content/chapters'
import type { Condition } from './types'
import { goneForChapter, lifecycleOfScene, lifecycleWhen } from './placeLifecycle'
import { PARENTS_AFTER_2013, chaptersWhere, livesWithParents } from './homes'
import { CITY_EXITS, CITY_ROOMS } from './city2027'
import { BEDROOM_2000, BUS_STATION_2017, HOME_OWN, NEW_ROOMS, PITCH_2000, PITCH_2000S, STAGED, STAND_80S, STAND_90S, STAND_NEW, STAND_OLD, STREET_2010 } from './rooms2000'
import { QUEST_SPOTS } from './quests90e'
import { PASS_C_SPOTS, PASS_C_STAGED } from './passC'
import { PASS_D_SPOTS } from './questsPassD'

/**
 * העולם המצויר — a painted place, a strip of floor you may stand on, and a door you can
 * see from across the room.
 *
 * The second version of this file exists because of one sentence in a playtest: the
 * player stayed in the house, because leaving was not obvious, and the clock took his
 * father to the match while he was still learning to walk. Nothing about that is the
 * player's fault. So every interactive thing in the world now carries a VERB and a NAME,
 * every exit carries a light you can see from anywhere in the room, and the clock does
 * not start until the child is in the street.
 *
 * Everything is a fraction of the backdrop, never a pixel — a better cut of the same
 * painting must move no door and no person.
 */

/**
 * משרד הכרטיסים — ואיך נראית שורה שהתיישנה בלי שאיש הבחין.
 *
 * This constant was introduced as a CAST, with a paragraph here explaining that
 * `LocationId` is a union in `lib/life/types.ts` which that pass was not allowed to edit,
 * that the cast was the one-line seam, and that *"the day the union gains
 * `| 'ticket-office'` the cast comes off and nothing else moves"*.
 *
 * That day was the same day. `types.ts` carries the member, with its own comment. So the
 * cast is gone and the constant stays for the reason it was always worth having: the
 * scene's `id`, the door's `to` and the runtime's room check all go through one name, and
 * a room identifier that is persisted in a save (rule 35) should be written down once.
 *
 * Worth keeping the shape of the mistake: nothing failed, nothing was red, and the
 * paragraph read perfectly — it described a constraint that had been lifted underneath it.
 * A comment is a claim about the code and goes stale exactly like a manifest does.
 */
export const TICKET_OFFICE: LocationId = 'ticket-office'

/**
 * ------------------------------------------------------ בלומפילד, לפי הלוח שלו ----
 *
 * The ground had three lives after 1986 and the game drew one. From the summer of 2016
 * it was a building site — *"Between 2016 and 2019, it was closed due to renovations …
 * the three clubs had to play their home matches in Petah Tikva and Netanya up until
 * August 2019"* (Wikipedia, Bloomfield Stadium, read 21.9.2026), and ONE's report of the
 * opening night speaks of *"שלוש השנים האחרונות"* of hoping to go back. It reopened on
 * Monday 26.8.2019, the first round of the season, 0:0 against Maccabi Netanya (the
 * archive row from ויקיפועל, the venue and the occasion from ONE, article 342496).
 *
 * Until 21.9.2026 every chapter after 2000 walked into the 1986 painting, and the two
 * sets that exist for exactly this — `bloomOld*` and `bloomNew*`, in the folder since the
 * `BLOOMFIELD-2000-2019-PLUS` delivery — were wired to nothing. Maor had said it in one
 * line (*"בלומפילד החדש למשל יש לך במאגר!"*) and the art brief even listed R02 as closed
 * "immediately with what is already in the repository". It was not. Now:
 *
 *   · 2016–2018 — the doors to the ground are locked, and say why;
 *   · `2018-return` from the reopening on, and every chapter from 2019 — the rebuilt
 *     ground (`repaints` on `bloomfield-outside`), on its own measured floor;
 *   · `gate5` in the 2000s — `bloomOldGates`, the same wall in its later coat of paint.
 */
export const BLOOMFIELD_REOPENED = 'r:reopen'
const yearOfChapter = (chapter: string): number => Number(chapter.slice(0, 4))
/** the chapters that stand in front of the rebuilt ground */
export function bloomfieldRebuilt(chapter: string): boolean {
  return chapter === '2018-return' || yearOfChapter(chapter) >= 2019
}
/** the chapters in which the ground is a fence and a crane */
export const BLOOMFIELD_SHUT: readonly string[] = CHAPTERS.map((c) => c.id).filter((id) => yearOfChapter(id) >= 2016 && yearOfChapter(id) <= 2018)
const SHUT_HE = 'בלומפילד בשיפוץ — גדר ומנופים. משחקי הבית בינתיים בעיר אחרת.'
/** a door to the ground in those years: open only once it has reopened (in 2018-return, the jump to August 2019) */
const shutNeeds = (): Record<string, Condition> => Object.fromEntries(BLOOMFIELD_SHUT.map((id) => [id, { flag: BLOOMFIELD_REOPENED }]))
const shutBlocked = (): Record<string, string> => Object.fromEntries(BLOOMFIELD_SHUT.map((id) => [id, SHUT_HE]))

/**
 * **הטרנזיסטור על שולחן המטבח** — מקום אחד לשלוש השנים שהוא עומד שם (החורף של 1986,
 * 1990, 1993). 21.9.2026: הקובץ נוקה מרקע הלוח (`cut-objects-2026-09-21.py`) ונחתך
 * לגוף עצמו, ולכן `at.y` הוא עכשיו המקום שבו הרגליים שלו נוגעות במשטח — אמצע עומק
 * השולחן (הקצה האחורי 0.455, הקצה הקדמי 0.48), ולא הקצה הקדמי שבו הוא נראה תלוי.
 * `size`: בקו הרחוק של המטבח מטר הוא 0.185 מהגובה, ורדיו כזה הוא כ-16 ס״מ.
 */
export const TABLE_RADIO = { size: 0.03, at: { x: 0.86, y: 0.476 } } as const

export const KICKOFF = at(16, 0)
export const KOBI_LEAVES = at(15, 10)
export const FULL_TIME = at(17, 45)

/** What pressing the button will DO. The prompt is built from this plus the name. */
// `hold` and `listen` (Director V3 §12, 25.9.2026): a grip is not a take, and a radio in two
// hands is not a thing you play with — the prompt reads "תחזיק …" / "תקשיב …"
export type Verb = 'talk' | 'look' | 'take' | 'buy' | 'enter' | 'exit' | 'play' | 'watch' | 'gaze' | 'sit' | 'hold' | 'listen'

/**
 * לאיזה עידן — which chapter a thing in a room belongs to.
 *
 * The rooms are shared between chapters; the people in them are not. An actor, hotspot or
 * layer with no `era` belongs to 1986 — the chapter every room was written for — so that
 * adding a second chapter did not mean touching four hundred lines that were already
 * right. `'*'` is for the things that are true in every year: a wall, a pole, a rail.
 */
export type EraTag = string | '*' | readonly string[]

/**
 * העשור של פרק — `1993-cup` is a chapter of the nineties, `2000-double` of the two
 * thousands. A thing tagged with a decade (`'1990s'`) is in every chapter of it; a
 * thing tagged `'B'` is in every chapter of Stage B. Chapters after 1991 borrow the
 * nineties' paintings and people by default, so a room written once for 1990 is a room
 * in 1998 without a second copy of every line.
 */
export function decadeOf(chapter: string): string {
  const year = Number(chapter.slice(0, 4))
  if (!Number.isFinite(year)) return '1980s'
  return year >= 2000 ? '2000s' : year >= 1990 ? '1990s' : '1980s'
}

export function stageOf(chapter: string): 'A' | 'B' {
  return chapter === '1986' || chapter === 'prologue' || /^a\d/.test(chapter) ? 'A' : 'B'
}

/**
 * העשור המדויק — `2012-five` is a chapter of the 2010s, `2024-home` of the 2020s (27.9.2026).
 *
 * `decadeOf` stops at `'2000s'` on purpose: from 2000 it means "the adult life", and every
 * `'2000s'` key in the rooms (the street's nineties painting, the open road east) is written to
 * hold for every year after it. The decade redresses of 27.9.2026 needed the other meaning —
 * `kiosk10` for the 2010s, `kiosk20` for the 2020s — and were keyed `'2010s'`/`'2020s'`, which
 * `decadeOf` never returns, so the kiosk of 2002 stood in every chapter until 2026 and
 * `allenby20` / `schoolyard20` were never drawn. The exact decade is read FIRST (after the
 * chapter itself), so a `'2010s'` key wins over `'2000s'` and everything written for `'2000s'`
 * keeps meaning what it meant. Before 2010 the two are the same string.
 */
export function exactDecadeOf(chapter: string): string {
  const year = Number(chapter.slice(0, 4))
  if (!Number.isFinite(year) || year < 2010) return decadeOf(chapter)
  return `${Math.floor(year / 10) * 10}s`
}

function eraMatches(era: string, chapter: string): boolean {
  return era === '*' || era === chapter || era === exactDecadeOf(chapter) || era === decadeOf(chapter) || era === stageOf(chapter)
}

export function inEra(def: { era?: EraTag }, chapter: string, fallback: EraTag = '1986'): boolean {
  const era = def.era ?? fallback
  if (Array.isArray(era)) return (era as readonly string[]).some((e) => eraMatches(e, chapter))
  return eraMatches(era as string, chapter)
}

/** the keys a per-era table is read by, most specific first */
export function eraKeys(chapter: string): string[] {
  const exact = exactDecadeOf(chapter)
  const decade = decadeOf(chapter)
  return exact === decade ? [chapter, decade, stageOf(chapter)] : [chapter, exact, decade, stageOf(chapter)]
}

/** Doors are geography: a door with no era is a door in every year. */
export function exitInEra(exit: ExitDef, chapter: string): boolean {
  // a place that is gone for the whole chapter is not geography any more (World Lifecycle)
  return inEra(exit, chapter, '*') && (insideLifecyclePlace(exit) || !goneForChapter(chapter, exit.to))
}

export type ActorDef = {
  id: string
  era?: EraTag
  figure: string
  x: number
  y: number
  /**
   * @deprecated נשאר בקבצים, לא נקרא יותר.
   *
   * Until delta 30 this was a fraction of the frame height, typed by hand, per actor, per
   * room — which is how a man ended up drawn at eighty-seven centimetres beside Rafi. A
   * body's size now comes from `heights.ts` and the room's own `metre`, and `WorldScene`
   * never reads this field. It is optional so that a new actor cannot invent a number,
   * and it is not deleted from the hundred and seventy-six rows that still carry it
   * because a diff that touches every actor in the game hides everything else in it.
   */
  size?: number
  nameHe: string
  talk?: string
  when?: Condition
  flip?: boolean
  sway?: number
  /**
   * (delta 93, brief §19–§21) הוא ניגש אליך — a person who takes the last step himself.
   * When the boy comes within `reachM` metres (and `when` holds), the actor walks up to him
   * and opens his own `talk` once per visit to the room. The player still has to go and
   * find him; the meeting is not a tap on a statue. Presentation only (`WorldScene`).
   */
  initiative?: { reachM: number; when?: Condition }
}

export type HotspotDef = {
  id: string
  era?: EraTag
  x: number
  y: number
  w?: number
  act: string
  /** what the prompt says you will do; a hotspot with no verb is scenery */
  verb: Verb
  labelHe: string
  when?: Condition
  /**
   * A thing drawn in the world for this hotspot. `at` is where it is DRAWN when that is
   * not where you stand to use it — a radio on a table is drawn on the tabletop and
   * reached from the floor in front of it.
   */
  prop?: { key: string; size: number; at?: { x: number; y: number } }
  /** higher wins when two things are within reach at once */
  priority?: number
}

/**
 * A door is not a trigger volume. It is a place in the painting with a light on it, a
 * name, and a promise about where it goes — and it works whether you walk into it or
 * press the button next to it, because a player who has just learned to walk should not
 * also have to learn which doors need a keypress.
 */
export type ExitDef = {
  id: string
  era?: EraTag
  x: number
  y: number
  w: number
  h: number
  to: LocationId
  spawn: string
  labelHe: string
  when?: Condition
  /** the glow drawn on the doorway itself, so the way out is visible from anywhere */
  light?: { x: number; y: number; w: number; h: number; tone: 'inside' | 'daylight' }
  /**
   * What the child needs before this door means anything.
   *
   * A locked door is not hidden and it is not silent: the light dims, the prompt keeps
   * the door's name, and pressing the button gets a sentence explaining what is missing.
   * "You cannot go out without the key" is a game; a door that does nothing is a bug.
   */
  needs?: Condition
  blockedHe?: string
  /**
   * The lock by chapter. `null` means the door is simply open that year: the 1986 key
   * on the string is a fact about an eight-year-old, and the twelve-year-old of 1990
   * walked out of the flat for a week with the door telling him to find a key that was
   * not in any drawer — the first bug Maor met in Stage B.
   */
  needsByEra?: Record<string, Condition | null>
  /** the door's VISIBILITY by chapter — `null` means the door is simply there that year */
  whenByEra?: Record<string, Condition | null>
  /**
   * ...and what the door SAYS when it is shut, by chapter.
   *
   * A lock is only information if the sentence beside it is true. "Without the key your
   * mother will not let you out" is the right sentence for an eight-year-old and the
   * wrong one for a thirteen-year-old who was told no an hour ago, and the difference
   * between them is the difference between a game and a bug report.
   */
  blockedByEra?: Record<string, string>
  /** walking in triggers after a short dwell; the button always works immediately */
  dwellMs?: number
  priority?: number
}

export type Ambience = 'interior' | 'kitchen' | 'day' | 'park' | 'dusk' | 'tunnel' | 'stadium' | 'hall' | 'station' | 'base' | 'classroom'

/**
 * A painted object separated from its room, drawn in front of or behind the player.
 *
 * The systems pass used this for one thing: splitting the street's foreground plate so a
 * child could walk behind a pole. The living pass asks it to do a second, larger job —
 * DRESSING. A backdrop is a photograph of a place with nobody in it; the dressing is
 * what says people were here this morning. A car left at the kerb, a bin by the kiosk,
 * pennants over the road, a supporters' coach that is not there at noon and is there at
 * four. So a layer gained three things, all optional and all additive:
 *
 *   · `when` — the same `Condition` vocabulary everything else in this file speaks, so a
 *     street can change without a line of scene code changing with it;
 *   · `foot` — anchor the plate by the point it STANDS on rather than its top-left,
 *     which is the only way to place a car on a pavement that recedes;
 *   · `flip` / `alpha` / `tint` — the cheap variations, so one 56KB car is two cars.
 *
 * `depth` stays explicit and stays in band units (× H, like every actor), because a prop
 * the child walks behind and a prop he walks in front of differ by one number and that
 * number should be readable in the content, not inferred.
 */
export type LayerDef = {
  art: string
  era?: EraTag
  x: number
  y: number
  w: number
  depth: number
  /**
   * How far this piece of dressing lifts, as a fraction of the backdrop height.
   *
   * Almost every layer in this game is a thing — a table, a bin, a bus — and a thing that
   * moves is a bug. One case is not: a terrace at full time. The championship crowd is
   * drawn as dressing rather than as actors, because none of those eight thousand people
   * can be talked to and an actor you cannot talk to is a conversation the player keeps
   * walking into. But a still crowd at the moment the title is won is worse than no crowd,
   * so a layer may bounce. Amplitude in band units, phase derived from its own x so no two
   * of them are in step.
   */
  bob?: number
  /** treat (x, y) as the point the object stands on, not its top-left corner */
  foot?: boolean
  /** dressing that is only there when the world says it is */
  when?: Condition
  flip?: boolean
  alpha?: number
  tint?: number
}

export type SceneDef = {
  id: LocationId
  titleHe: string
  /**
   * השם לפי שנה — אותו חדר, בעלים אחר. מ-2013 הסלון שבו פוגי גדל הוא *"אצל ההורים"*,
   * כי לפוגי יש בית משלו (`homeAdult`), וכרטיס מקום שאומר "הסלון" בשני המקומות משקר
   * באחד מהם.
   */
  titleByEra?: Record<string, string>
  art: string
  /** the same room painted in another year — `bedroom90`, `street90` */
  artByEra?: Record<string, string>
  band: { far: number; near: number }
  /**
   * רצועת ההליכה של הערב הזה — the same room, a different floor to stand on.
   *
   * A hall on a Saturday morning is a room you cross; a hall on a derby night is a place
   * you are allowed to stand at the EDGE of, because eight hundred people are in it and
   * the parquet is not yours. Rather than build a second Ussishkin, the night narrows the
   * band to the near strip: the boy is at courtside, on the step, where he belongs, and
   * he physically cannot wander into the middle of a game.
   */
  bandByEra?: Record<string, { far: number; near: number }>
  size: { far: number; near: number }
  /**
   * המטר — how much of the frame one metre occupies at the NEAR line of this room.
   *
   * Every body except the player is drawn at `metre × its height in metres`
   * (`world/heights.ts`), so a size is never typed again and a grown man can never be
   * eighty-seven centimetres tall standing next to Rafi. The value is derived from the
   * player himself — his own drawn height divided by his real height in the era the room
   * was tuned for — which is why the kiosk comes out at 0.3154 and the counter, measured
   * independently off the painting in September, comes out at 0.315.
   */
  metre: number
  spawns: Record<string, { x: number; y: number; facing?: 'left' | 'right' }>
  actors: ActorDef[]
  hotspots: HotspotDef[]
  exits: ExitDef[]
  layers?: LayerDef[]
  ambience: Ambience
  /**
   * What drifts in the air, when it is not what the ambience implies (21.9.2026). The
   * `stadium` air is forty-six pale flecks at half opacity — paper over the terrace of the
   * 1986 final. Over the painted daylight terraces of 2000 and 2019 it read as snow in
   * Tel Aviv; the rooms keep sounding like a stadium and breathe like a day.
   */
  air?: Ambience
  arrival?: { art: string; ms: number; flag: string }
  /**
   * The arrival card by chapter, where a chapter needs a different one — or none. `null`
   * means the room plays NO card in that year: in 1990 the boy is not seeing the road or
   * the terrace for the first time (brief §12: "he knows this place").
   */
  arrivalByEra?: Record<string, { art: string; ms: number; flag: string } | null>
  /** what somebody in the room says if the player has been lost for a while */
  stuckHe?: string
  /** the same line, for a chapter whose locks are different */
  stuckByEra?: Record<string, string>
  /**
   * אותו מקום, בניין אחר — the same room on a painting with a different floor (`Repaint`).
   * The first that holds for the chapter wins; `sceneIn` applies it.
   */
  repaints?: readonly Repaint[]
}

/**
 * ציור אחר, רצפה אחרת — when a place was REBUILT, not repainted.
 *
 * `artByEra` swaps the picture and keeps everything measured on the old one, which is
 * right when the new painting is the same composition (`street90`, `allenby2000`, the
 * 2000s `gate5` — which is literally the same wall in another coat of paint). It is wrong
 * the moment the building itself changed: Bloomfield was closed from the summer of 2016
 * and reopened on 26.8.2019 as a different stadium, and `bloomNewPlaza` is a paved square
 * in front of a white shell, not a concrete colonnade. Its horizon, its floor and the size
 * of a man standing on it are all different numbers, so a repaint carries its OWN
 * geometry — band, taper, metre, spawns — measured off its own painting (rule 52), and
 * says which doors and spots of the old room exist on it and where.
 *
 * Actors are not repainted: they are already chosen by era, and a figure placed for 1986
 * never appears in a chapter that is painted in 2019.
 */
export type Repaint = {
  /** the chapters this painting is the room in */
  in: (chapter: string) => boolean
  art: string
  band: { far: number; near: number }
  size: { far: number; near: number }
  metre: number
  spawns: SceneDef['spawns']
  /** where each door of the room stands on this painting; `null` — the door is not on it */
  doors?: Record<string, Pick<ExitDef, 'x' | 'y' | 'w' | 'h'> & { light?: ExitDef['light'] } | null>
  /** this painting's own first sight, or none */
  arrival?: { art: string; ms: number; flag: string } | null
  stuckHe?: string
  /**
   * ------------------------------------------------ מה עוד עובר לציור (21.9.2026) ----
   *
   * עד היום צביעה מחדש החליפה רצפה ודלתות והשאירה את כל השאר במקום שנמדד על הציור
   * הקודם — וזה היה נכון רק כל עוד החדר היחיד שנצבע מחדש היה רחבה ריקה. ברגע ש*חדר*
   * מקבל ציור אחר — הבית של פוגי מ-2013, החדר של בן עשרים ושתיים, המגרש הסינתטי — כל
   * דבר שעומד בו צריך מקום על הציור הזה, או הצהרה שאין לו:
   *
   *   · `titleHe` / `ambience` — איך החדר נקרא ונשמע בשנים האלה (הסלון של ההורים הוא
   *     לא הבית של פוגי, גם כשהמנוע קורא לשניהם `home`);
   *   · `spots` — איפה כל נקודת עניין של החדר עומדת **על הציור הזה**, או `null`: היא
   *     לא כאן. מבחן (`tests/life-rooms-2000.test.ts`) נופל על כל נקודה בעידן שהצביעה
   *     לא אמרה עליה כלום — זה החור שבו מגירה של 1986 מרחפת באמצע מטבח של 2013;
   *   · `cast` — אותו דבר לאנשים שכבר עומדים בחדר;
   *   · `hotspots` / `actors` / `layers` — מה שיש רק בציור הזה.
   */
  titleHe?: string
  ambience?: Ambience
  air?: Ambience
  spots?: Record<string, (Pick<HotspotDef, 'x' | 'y' | 'w'> & { prop?: HotspotDef['prop']; labelHe?: string }) | null>
  cast?: Record<string, (Pick<ActorDef, 'x' | 'y'> & { flip?: boolean; figure?: string }) | null>
  hotspots?: readonly HotspotDef[]
  actors?: readonly ActorDef[]
  layers?: readonly LayerDef[]
}

/** the room as it stands in this chapter — the room itself, or the room rebuilt */
export function sceneIn(scene: SceneDef, chapter: string): SceneDef {
  const paint = scene.repaints?.find((r) => r.in(chapter))
  if (!paint) {
    const title = titleFor(scene, chapter)
    return title === scene.titleHe ? scene : { ...scene, titleHe: title }
  }
  const doors = paint.doors ?? {}
  return {
    ...scene,
    art: paint.art,
    artByEra: undefined,
    band: paint.band,
    bandByEra: undefined,
    size: paint.size,
    metre: paint.metre,
    spawns: paint.spawns,
    arrival: paint.arrival ?? undefined,
    arrivalByEra: undefined,
    stuckHe: paint.stuckHe ?? scene.stuckHe,
    stuckByEra: paint.stuckHe ? undefined : scene.stuckByEra,
    titleHe: paint.titleHe ?? scene.titleHe,
    titleByEra: paint.titleHe ? undefined : scene.titleByEra,
    ambience: paint.ambience ?? scene.ambience,
    air: paint.air ?? (paint.ambience ? undefined : scene.air),
    exits: scene.exits.flatMap((exit) => {
      if (!(exit.id in doors)) return [exit]
      const at = doors[exit.id]
      return at ? [{ ...exit, ...at, light: at.light ?? undefined }] : []
    }),
    hotspots: [
      ...scene.hotspots.flatMap((spot) => {
        const spots = paint.spots ?? {}
        if (!(spot.id in spots)) return [spot]
        const at = spots[spot.id]
        return at ? [{ ...spot, ...at, prop: at.prop ?? (spot.prop ? { ...spot.prop, at: undefined } : undefined) }] : []
      }),
      ...(paint.hotspots ?? []),
    ],
    actors: [
      ...scene.actors.flatMap((actor) => {
        const cast = paint.cast ?? {}
        if (!(actor.id in cast)) return [actor]
        const at = cast[actor.id]
        return at ? [{ ...actor, ...at }] : []
      }),
      ...(paint.actors ?? []),
    ],
    // the old building's dressing stays with the old building; the new one brings its own
    layers: [...(paint.layers ?? [])],
    repaints: undefined,
  }
}

/** the room's name in this chapter — a painting's own name, a year's, or the room's */
export function titleFor(scene: SceneDef, chapter: string): string {
  const paint = scene.repaints?.find((r) => r.in(chapter))
  if (paint?.titleHe) return paint.titleHe
  if (scene.titleByEra) for (const key of eraKeys(chapter)) if (scene.titleByEra[key]) return scene.titleByEra[key]!
  return scene.titleHe
}

/** whether this door is drawn at all in this chapter — `undefined` is always */
export function whenFor(exit: ExitDef, chapter: string): Condition | undefined {
  const base = authoredWhen(exit, chapter)
  // a place that is gone is not a door any more (World Lifecycle, 27.9.2026): folded in
  // here so every reader of a door — the room, the route, the map, travel — agrees. Doors
  // INSIDE the place are never closed by it: whoever is standing there can always leave.
  const gone = insideLifecyclePlace(exit) ? null : lifecycleWhen(chapter, exit.to)
  if (!gone) return base
  return base ? { all: [base, gone] } : gone
}

/** a door that belongs to a room of a lifecycle place and leads to another room of it */
let INTERNAL: Set<string> | null = null
function insideLifecyclePlace(exit: ExitDef): boolean {
  if (!INTERNAL) {
    INTERNAL = new Set()
    for (const scene of ALL_SCENES) {
      const place = lifecycleOfScene(scene.id)
      if (!place) continue
      for (const e of scene.exits) if (place.scenes.includes(e.to)) INTERNAL.add(`${e.id}>${e.to}`)
    }
  }
  return INTERNAL.has(`${exit.id}>${exit.to}`)
}

function authoredWhen(exit: ExitDef, chapter: string): Condition | undefined {
  if (exit.whenByEra) for (const key of eraKeys(chapter)) if (key in exit.whenByEra) return exit.whenByEra[key] ?? undefined
  return exit.when
}

/** what this door needs in this chapter — `undefined` is an open door */
export function needsFor(exit: ExitDef, chapter: string): Condition | undefined {
  if (exit.needsByEra) for (const key of eraKeys(chapter)) if (key in exit.needsByEra) return exit.needsByEra[key] ?? undefined
  return exit.needs
}

/** what this door says when it refuses, in this chapter */
export function blockedFor(exit: ExitDef, chapter: string): string | null {
  if (exit.blockedByEra) for (const key of eraKeys(chapter)) if (exit.blockedByEra[key] !== undefined) return exit.blockedByEra[key] ?? null
  return exit.blockedHe ?? null
}

/** the painting under this room in this chapter */
export function artFor(scene: SceneDef, chapter: string): string {
  const paint = scene.repaints?.find((r) => r.in(chapter))
  if (paint) return paint.art
  if (scene.artByEra) for (const key of eraKeys(chapter)) if (scene.artByEra[key]) return scene.artByEra[key]!
  return scene.art
}

/** the arrival card this room plays in this chapter, if any */
export function arrivalFor(scene: SceneDef, chapter: string): { art: string; ms: number; flag: string } | null {
  const paint = scene.repaints?.find((r) => r.in(chapter))
  if (paint) return paint.arrival ?? null
  if (scene.arrivalByEra) for (const key of eraKeys(chapter)) if (key in scene.arrivalByEra) return scene.arrivalByEra[key] ?? null
  return scene.arrival ?? null
}

export function stuckFor(scene: SceneDef, chapter: string): string | null {
  if (scene.stuckByEra) for (const key of eraKeys(chapter)) if (scene.stuckByEra[key] !== undefined) return scene.stuckByEra[key] ?? null
  return scene.stuckHe ?? null
}

/**
 * ---------------------------------------------------------------- שער 7, 1986 ----
 *
 * The terrace was repainted on 5.9.2026 from the angle its owner asked for: the camera
 * stands on the grass and the stand fills the frame, so the STEPS are the floor of the
 * scene and the pitch-side railing is in front of the child rather than behind him.
 *
 * Every number below was measured off the painting rather than agreed in advance — the
 * tread lines, the top of the railing, the mouth of the entrance (see
 * `docs/life/GATE7-GEOMETRY.md`). That is the right way round for a room where people
 * have to stand ON step edges, and it is why the file must never be re-cropped.
 *
 * The crowd is drawn twice, on purpose. A full terrace is about nine hundred people and
 * nine hundred sprites is a frame-rate bug, so everything from the ninth step back is
 * ONE baked image (`standCrowd`, composited from the same crowd sheets by
 * `scripts/life/bake-gate7-crowd.py`) and only the front rows — the ones the child walks
 * among and has to go round — are live figures that bounce. The seam is the top of the
 * walk band, where a painted shoulder and a sprite shoulder are the same size.
 */

/** the painting is 1458 x 720; a crowd sheet is 0.335 as wide as it is tall */
const GATE7_FIGURE = 0.335 / (1458 / 720)

/**
 * Eleven sheets, not twenty-eight. Every sheet a room names is a file the room downloads,
 * and this one already carries a baked terrace; the variety that matters is in the paint
 * behind these rows, and eleven bodies with flips and four sizes do not read as a pattern
 * across fifty people.
 */
const GATE7_SHEETS = [
  'adultA1', 'youngB3', 'adultB5', 'youngA4', 'adultA6', 'youngB1',
  'adultB2', 'youngA6', 'adultA3', 'youngB5', 'adultB7',
] as const

type TerraceRow = { y: number; h: number; n: number; from?: number; to?: number }

/**
 * A row of step edges turned into people.
 *
 * Deterministic, every one of it: the wobble, the lift, the sheet, the flip and the bob
 * all come from the row and column index, so the terrace is identical on every machine
 * and every run, and a diff of this file is readable. `holes` are the places nobody may
 * stand — the mouth of the entrance, which is a hole in the concrete, and the patch of
 * step where the chapter's last conversation is waiting.
 */
function terraceCrowd(
  rows: readonly TerraceRow[],
  holes: readonly { from: number; to: number }[] = [],
  clear: readonly { x: number; y: number }[] = [],
): LayerDef[] {
  const out: LayerDef[] = []
  rows.forEach((row, r) => {
    const from = row.from ?? 0.02
    const to = row.to ?? 0.98
    for (let k = 0; k < row.n; k += 1) {
      const t = row.n === 1 ? 0.5 : k / (row.n - 1)
      const wobble = (((r * 71 + k * 37) % 13) / 13 - 0.5) * ((to - from) / row.n) * 0.8
      const x = Number(Math.min(to, Math.max(from, from + (to - from) * t + wobble)).toFixed(4))
      if (holes.some((hole) => x > hole.from && x < hole.to)) continue
      const y = Number((row.y + ((((r * 29 + k * 53) % 7) - 3) / 3) * 0.003).toFixed(4))
      // Nobody stands in front of somebody you have to talk to. Only a figure NEARER than
      // the actor can cover him, so the rows further up the terrace are left alone.
      if (clear.some((who) => y >= who.y && Math.abs(x - who.x) < 0.055)) continue
      out.push({
        art: GATE7_SHEETS[(r * 5 + k * 9 + ((r * k) % 3)) % GATE7_SHEETS.length] as string,
        x,
        y,
        w: Number((row.h * GATE7_FIGURE).toFixed(4)),
        depth: y,
        foot: true,
        bob: Number((0.003 + (((r * 17 + k * 11) % 9) / 9) * 0.006).toFixed(4)),
        era: '*',
        ...((r + k) % 2 === 0 ? { flip: true } : {}),
      })
    }
  })
  return out
}

/** the front nine steps, front to back — the rows the baked crowd deliberately leaves empty */
const GATE7_ROWS: readonly TerraceRow[] = [
  { y: 0.752, h: 0.108, n: 5 },
  { y: 0.736, h: 0.106, n: 5 },
  { y: 0.720, h: 0.104, n: 6 },
  { y: 0.704, h: 0.102, n: 6 },
  { y: 0.688, h: 0.100, n: 7 },
  { y: 0.672, h: 0.098, n: 7 },
  { y: 0.656, h: 0.096, n: 8 },
  { y: 0.640, h: 0.094, n: 8 },
  { y: 0.626, h: 0.092, n: 9 },
]

/** the mouth of the entrance is a hole in the concrete — nobody stands in mid-air */
const GATE7_HOLES = [{ from: 0.258, to: 0.42 }]

/**
 * Everybody in this room who can be TALKED to, across every year it is played in, and the
 * step they stand on. The generator leaves each of them a body's width of air, so the
 * chapter's last conversation is never behind a stranger's back.
 */
const GATE7_CLEAR = [
  { x: 0.7, y: 0.688 },   // קובי, 1986 and 1990 — the ending
  { x: 0.47, y: 0.722 },  // אוהד
  { x: 0.56, y: 0.749 },  // אוהד
  { x: 0.2, y: 0.7 },     // קובי ליד העמוד, 1990
  { x: 0.52, y: 0.706 },  // האוהד עם הרדיו
  { x: 0.78, y: 0.716 },  // האוהד שיודע
  { x: 0.93, y: 0.74 },   // הילדים
  { x: 0.41, y: 0.752 },  // אופיר
]

/**
 * הג׳ובים על המפה — one hotspot per gig per chapter it exists in.
 *
 * A `Condition` cannot ask which year it is, but a hotspot's `era` can, and that is the
 * same trick the fan shop uses. So the broom is against the wall in Ussishkin from 1984
 * and the bucket appears in the car park in 1990, and neither of them is typed twice.
 */
/** the chapters an activity is open in (`activities.ts`), less the ones a room is already full in */
function actEra(id: ActivityId, except: readonly string[] = []): string[] {
  return activityChapters(ACTIVITY[id]).filter((chapter) => !except.includes(chapter))
}

function gigSpots(where: string) {
  return GIGS.filter((gig) => gig.where === where && gig.spot !== false).flatMap((gig) =>
    gigChapters(gig).map((chapter) => ({
      id: `${gig.id}-${chapter}`,
      era: chapter,
      x: gig.at.x,
      y: gig.at.y,
      w: gig.at.w,
      act: gigId(gig, chapter),
      verb: 'look' as const,
      labelHe: gig.labelHe,
      priority: 3,
      // the work is a thing in the room while it is on offer (delta 90, §22.4.1 — `Gig.look`)
      ...(gig.look ? { prop: { key: gig.look.key, size: gig.look.size } } : {}),
      /**
       * הרוטציה — a paid job is only in the room if this life was offered it this chapter
       * (`gigs.ts` → `offeredIn`, raised as a flag when the room is built). The two
       * contests carry no offer flag and are always there, because a ball in a yard does
       * not need anybody's permission.
       *
       * A row that is not in the week's deal at all (`rotates: false` — a friend's dare, the
       * shop's order, the bottles after the whistle) is there whenever its own `when` says,
       * and never behind an offer flag nobody raises (21.9.2026).
       */
      ...(isPaid(gig) && gig.rotates !== false
        ? { when: (gig.when ? { all: [{ flag: offerFlag(gig) }, gig.when] } : { flag: offerFlag(gig) }) as Condition }
        : gig.when
          ? { when: gig.when }
          : {}),
    })),
  )
}

/**
 * משימות ההוכחה — where the seven routes are actually entered, and why each is a list of
 * chapters rather than a decade.
 *
 * `lib/life/content/routes.ts` has held six authored `PROOF_*` missions since the routes
 * pass, and until now **nothing in the world started one**: no `talk` and no `act` anywhere
 * in this file reached `route-proof-*`, so the seven routes, their conversations and all the
 * arithmetic behind them were content a player could not walk into — the dead branch rule 66
 * exists against, in its largest form so far. Five of the six now have one row each, in the
 * room the work happens in; the sixth (`route-proof-found`) is deliberately not here, and
 * the reason is written where the gate5 row is.
 *
 * `ADULT_CHAPTERS` is spelled out chapter by chapter instead of `'B'` or `'1990s'` because
 * every stage of every route in `lib/life/routes.ts` asks for `minAge: 18` and the boy is
 * born in 1978 (rule 45). Tagged `'B'` these rows would offer a twelve-year-old a month of
 * wages to close and a group to lead to an away game, and a proof earned at twelve buys
 * nothing any route can hand over — the same dead threshold from the other end.
 */
const ADULT_CHAPTERS = [
  '1996-army',
  '1997-basket',
  '1998-laces',
  '1999-basket',
  '1999-cup',
  '2000-title',
  '2000-double',
  // שלב ג׳ — תסריט 2000–2026. אותו היגיון בדיוק: הוא בן 22 ומעלה בכולם.
  '2000-bridge',
  '2002-europe',
  '2006-home',
  '2007-table',
  '2007-registered',
  '2007-key',
  '2009-up',
] as const

/**
 * שלושת פרקי הייסוד — **וזו רשימה שהמבנה של הפסגה כופה, לא טעם.**
 *
 * `USSISHKIN_FOUNDER.apex` מבקש שלוש ראיות `founding_proof` ב**שלושה פרקים שונים**
 * בתוך חלון 2007. `route-proof-found` היא השיחה היחידה שמנפיקה ראיה כזאת, ועד
 * 21.9.2026 היא לא הייתה מונחת בשום חדר — הפסגה היחידה במשחק שהייתה בלתי-אפשרית
 * בהוכחה, ונמנתה בשמה ב-`tests/life-routes.test.ts` (כלל 78).
 *
 * לכן **נקודה חמה אחת בכל פרק**, ולא שלוש באותו חדר: שלוש באותו פרק היו נראות כמו
 * שלוש ראיות ונספרות כאחת, כלומר שחקן שלקח את כולן היה עומד מול פסגה נעולה בלי
 * להבין למה.
 *
 * (25.9.2026, דלתא 90) שלוש הנקודות עברו לחדרים של הפרקים עצמם — חדר הקהילה ואולם
 * האימונים (`world/rooms2000.ts`) — ונפתחות רק אחרי שנעשתה עבודה בידיים (`u:did`).
 */
const FOUNDING_CHAPTERS = ['2007-table', '2007-registered', '2007-key'] as const

/**
 * הפעולות הקטנות — השלב שלפני המשימה, ולמה הוא היה חסר.
 *
 * `SMALL_ACTIONS` בקובץ התוכן מחזיק שמונה אחר־צהריים רגילים, וכל אחד מהם נקרא **בשם**
 * בתנאי הכניסה של מסלול: `JOURNALIST.entry` מבקש `verified_report` וגם `written_account`,
 * `OWNER.entry` מבקש `balanced_budget` וגם `adult_shift`, `CREATOR.entry` מבקש
 * `creative_work`. שמונה שיחות נכתבו, שמונה קיימות ב-`CONVERSATIONS_ROUTES` — ואף חדר
 * בקובץ הזה לא פתח אחת מהן. זו בדיוק התקלה שדלתא 71 תיקנה עבור שש משימות ההוכחה, שלב
 * אחד מוקדם יותר: **שלב הכניסה של שלושה מסלולים היה בלתי-אפשרי**, ולא מפני שהוא קשה.
 *
 * למה חדר ולא תפריט: כל אחת מהשמונה היא חפץ במקום שבו העבודה הזאת באמת נעשית — שני
 * עיתונים על מדף הקיוסק, החשבונות על שולחן המטבח, לוח היציאות בקופה. הן אינן מופיעות
 * ברשימה בשום מסך, אי-אפשר לעשות את כולן באותו אחר-צהריים (השעון והאנרגיה הם התקרה),
 * והשיחה עצמה תמיד מציעה "לא עכשיו".
 *
 * `ADULT_CHAPTERS` מאותה סיבה בדיוק שכתובה מעליו: כל שלב של כל מסלול מבקש `minAge: 18`,
 * וראיה שנאספה בגיל שתים-עשרה אינה קונה דבר.
 */
const smallAction = (
  id: string,
  act: string,
  /** on the room's own band — a thing standing off the floor is a thing you cannot reach (rule 41) */
  at: { x: number; y: number; w: number },
  verb: Verb,
  labelHe: string,
): HotspotDef => ({
  id: `small-${id.toLowerCase().replace(/_/g, '-')}`,
  era: ADULT_CHAPTERS,
  x: at.x,
  y: at.y,
  w: at.w,
  act,
  verb,
  labelHe,
  // הדבר נשאר בחדר גם אחרי שעשית אותו — הענף השני של השיחה הוא מה שהוא אומר אז.
  // חפץ שנעלם ברגע שנגעת בו הוא עולם שמוחק את עצמו מול העיניים.
})

const SCENES: SceneDef[] = [
  {
    id: 'bedroom',
    titleHe: 'החדר שלך',
    art: 'bedroom',
    // The same room in three chapters. 1991 is the 1990 painting again on purpose: ten
    // months is not a repaint, and the boy who sleeps here is the same boy.
    artByEra: { '1990': 'bedroom90', '1991': 'bedroom90', '1990s': 'bedroom90', '2000s': 'bedroom90' },
    band: { far: 0.84, near: 0.97 },
    size: { far: 0.3, near: 0.38 },
    metre: 0.2923,
    ambience: 'interior',
    // (V3) no longer "the key is in the drawer": the key is not an objective any more
    stuckHe: 'הדלת לסלון — בקצה שמאל.',
    stuckByEra: { '1990': 'הדלת לסלון — משמאל, ומשם למטבח.', '1991': 'המחברת על השולחן. הדלת לסלון — משמאל.' },
    spawns: { start: { x: 0.3, y: 0.93, facing: 'left' }, fromHome: { x: 0.14, y: 0.9, facing: 'right' } },
    // 2000 on: the room of a man of twenty-two, measured on its own painting (`rooms2000.ts`)
    repaints: [BEDROOM_2000],
    actors: [],
    hotspots: [
      /**
       * התיק שלי — what he carries, and it is the life's own card (`act-bedroom-bag` opens the
       * profile, ☰'s "who you are"), not a site's card. Between the drawers (0.09–0.25) and
       * the bed (0.38–0.52), where a schoolbag is dropped. Childhood only: the bag is a boy's.
       */
      {
        id: 'my-bag',
        era: actEra('bedroom-bag'),
        x: 0.31,
        y: 0.92,
        w: 0.06,
        act: 'act-bedroom-bag',
        verb: 'look',
        labelHe: 'התיק שלי',
      },
      /**
       * חולצה משלי (delta 91) — Kobi's old white shirt on the chair, a marker and a note from
       * Rachel (`act-fan-shirt` → the bench, `fan-shirt-first`). Beside the bag on the chair,
       * 1990–1995: the years a boy makes one because the shop's costs more than the tin holds.
       */
      { id: 'fan-shirt', era: actEra('fan-shirt'), x: 0.24, y: 0.9, w: 0.06, act: 'act-fan-shirt', verb: 'take', labelHe: 'החולצה הלבנה על הכיסא' },
      { id: 'tin-a4', era: 'a4-shirt', x: 0.45, y: 0.92, w: 0.14, act: 'tin-a4', verb: 'take', labelHe: 'הפחית מתחת למיטה' },
      { id: 'shirt-a5', era: 'a5-first', x: 0.63, y: 0.9, w: 0.1, act: 'shirt-a5', verb: 'take', labelHe: 'החולצה על הכיסא', priority: 3 },
      /**
       * מתחת לכרית — the scrap of red cloth from 1983, in every Stage A year that follows
       * it. The conversation itself checks whether it was ever picked up, so the hotspot
       * exists either way: a pillow you can look under and find nothing is a room, and a
       * pillow that only appears when there is something under it is a hint.
       */
      { id: 'pillow-a2', era: ['a2-alley', 'a3-hall', 'a4-shirt', 'a5-first', 'a6-radio', 'a7-week'], x: 0.52, y: 0.9, w: 0.08, act: 'a2-scrap', verb: 'look', labelHe: 'מתחת לכרית' },
      { id: 'poster-sinai', era: '1995-sinai', x: 0.5, y: 0.82, w: 0.12, act: 'poster-look', verb: 'look', labelHe: 'הפוסטר', when: { none: [{ flag: 's2:done' }, { flag: 'life:sinai:d3' }] } },
      // (V3 §12) 1995, at night: the wall is decided with the hand — the pin, not a menu
      // spring 1996: the same wall, a season later — the box that ends the chapter is here
      // again after it was closed (`s3-room` was opened once, by a beat, and lost for good)
      { id: 'wall-s3', era: '1995-sinai', x: 0.5, y: 0.82, w: 0.12, act: 's3-room', verb: 'watch', labelHe: 'הקיר מעל המיטה', when: { flag: 'life:sinai:d3' }, priority: 5 },
      { id: 'poster-pin', era: '1995-sinai', x: 0.5, y: 0.82, w: 0.12, act: 's2-poster', verb: 'take', labelHe: 'הנעץ שבפוסטר', when: { all: [{ flag: 's2:done' }, { notFlag: 's2:poster' }, { notFlag: 'life:sinai:d3' }] }, priority: 5 },
      { id: 'bed', x: 0.45, y: 0.92, w: 0.14, act: 'bed', verb: 'look', labelHe: 'המיטה' },
      // the wall of pictures over the bed, 0.35–0.65 in the 4.9 painting
      { id: 'poster', x: 0.63, y: 0.9, w: 0.08, act: 'poster', verb: 'look', labelHe: 'הכרזה' },
      // 27.9.2026 — the second poster, Maor's approved one: the cup holders, beside the bed from
      // the first Stage A year to the last year he sleeps here. Not in the painting; looking opens
      // the paper itself (a `doc`), so nothing is drawn on a wall that was painted without it.
      {
        id: 'poster-cup',
        era: ['a2-alley', 'a3-hall', 'a4-shirt', 'a5-first', 'a6-radio', 'a7-week', '1986', '1990', '1991', '1993-cup', '1993-galil', '1995-sinai', '1996-army', '1997-basket', '1998-laces'],
        x: 0.34,
        y: 0.84,
        w: 0.06,
        act: 'poster-cup',
        verb: 'look',
        labelHe: 'פוסטר הגביע',
      },
      // 1990: the same room, four years on. The drawer holds the scarf now, not a key.
      { id: 'bed-1990', era: '1990', x: 0.45, y: 0.92, w: 0.14, act: 'bed-1990', verb: 'look', labelHe: 'המיטה' },
      { id: 'drawer-1990', era: '1990', x: 0.17, y: 0.9, w: 0.16, act: 'drawer-1990', verb: 'look', labelHe: 'המגירה' },
      // 1991: the notebook, page forty-one, and the whole evening hanging off it (§30).
      {
        id: 'desk-1991',
        era: '1991',
        x: 0.17,
        y: 0.9,
        w: 0.16,
        act: 'homework-1991',
        // not `sit` ("תשב על המחברת" is what that verb produced, and a boy does not sit on
        // his exercise book): `take` — he picks the notebook up and the page is worked by
        // hand (`chore:story:homework-91`, Director V3 §12)
        verb: 'take',
        labelHe: 'המחברת',
        priority: 3,
        prop: { key: 'propNote', size: 0.05, at: { x: 0.19, y: 0.7 } },
      },
      { id: 'bed-1991', era: '1991', x: 0.45, y: 0.92, w: 0.14, act: 'bed-1990', verb: 'look', labelHe: 'המיטה' },
      /**
       * (Director V3 §12, 25.9.2026) 2000, the four days — two of the afternoons are in this
       * room: the bed (sleep, for real) and the red box on the shelf. Measured on
       * `bedroom00` (BEDROOM_2000, band 0.66–0.88): the bed under the window at the left,
       * the box on the top shelf above 0.51.
       */
      { id: 'd-bed', era: '2000-double', x: 0.24, y: 0.76, w: 0.1, act: 'd-bed-afternoon', verb: 'sit', labelHe: 'המיטה — לישון באמת', when: { all: [{ flag: 'd:opened' }, { notFlag: 'd:final' }, { notFlag: 'd:pick1:sleep' }] }, priority: 5 },
      { id: 'd-box', era: '2000-double', x: 0.51, y: 0.72, w: 0.08, act: 'd-box-afternoon', verb: 'take', labelHe: 'הקופסה האדומה על המדף', when: { all: [{ flag: 'd:opened' }, { notFlag: 'd:final' }, { notFlag: 'd:pick1:box' }] }, priority: 5 },
      /**
       * CREATOR · `PROOF_CREATE` — הדבר שהכנת, גמור, על אותה שידה.
       *
       * The chest at 0.17 is the one surface this room has ever put a made thing on: the key
       * in 1986, the scarf in 1990, the exercise book in 1991. At eighteen what is on it is
       * finished work, and `route-proof-create` is the minute you decide whether to hand it
       * to somebody who will use it or keep it in the box. It is an OBJECT and not a person
       * on purpose — nobody has it yet; that is the whole decision — and the note is drawn on
       * the chest top at the 1991 notebook's own coordinates, so no number here was guessed.
       *
       * It is the only route row in a room with nothing else in it after 1991, which is why
       * it can take the whole run of adult chapters: `CREATOR.practice` wants two proofs in
       * two different chapters and a proof id carries the chapter, so a room that is only in
       * one year could never pay for the stage it belongs to.
       */
      {
        id: 'proof-create',
        era: ADULT_CHAPTERS,
        x: 0.17,
        y: 0.9,
        w: 0.16,
        act: 'route-proof-create',
        verb: 'look',
        labelHe: 'מה שהכנת',
        prop: { key: 'propNote', size: 0.05, at: { x: 0.19, y: 0.7 } },
      },
      /**
       * JOURNALIST · `WRITE_ACCOUNT`, ו-CREATOR · `MAKE_WORK` — אותו חדר, שני מקומות.
       *
       * אחרי 1991 החדר הזה ריק בכל הפרקים הבוגרים חוץ מהשידה: `bed`, `poster` ו-`desk`
       * כולם 1986. זה החדר שהילד למד לקרוא בו ושהגבר חוזר אליו כדי לעבוד — המחברת על
       * המיטה היא המקום היחיד בעולם שבו הוא כותב על עצמו, והפינה היא המקום היחיד שבו
       * דבר לא-גמור מותר להישאר מונח בין פרק לפרק.
       *
       * שתיהן על 0.45 ו-0.89, כלומר על המיטה ועל הפינה שהקופסה האדומה עומדת בה בשלב א׳,
       * ולא על 0.17: השידה כבר תפוסה על ידי `route-proof-create`, והמשימה היא ההחלטה מה
       * לעשות עם היצירה — לא ההכנה שלה.
       */
      smallAction('WRITE_ACCOUNT', 'route-write-account', { x: 0.45, y: 0.92, w: 0.14 }, 'look', 'המחברת הפתוחה על המיטה'),
      smallAction('MAKE_WORK', 'route-make-work', { x: 0.89, y: 0.95, w: 0.1 }, 'take', 'מה שהתחלת בפינה'),
      /**
       * DISTANCE_RETURN — ההצעה היחידה בכל המשחק שאסור לשום דבר להציע.
       *
       * `NEVER_TRIGGERS_DISTANCE` אוסר על שלושה אותות שהמנוע כבר מחזיק — משחק שהוחמץ,
       * אהבה נמוכה, ימים בלי כניסה — להתחיל את המסלול הזה, כי כל אחד מהם הוא המשחק כותב
       * חיים שהשחקן לא חי. מכאן נובע שהנקודה החמה הזאת **חייבת להיות בלי תנאי**: כל `when`
       * שאפשר היה לכתוב עליה הוא אות התנהגות בתחפושת, וזה בדיוק האיסור.
       *
       * לכן היא תריס. לא אדם שמעלה את זה, לא כרטיס ולא רמז — חלון בחדר שלו, שקיים כל
       * השנים (`look-morning-shutter` מצייר אותו כבר ב-1990), והמחשבה שמאחוריו היא שלו
       * ורק שלו. `route-distance-offer` היא הסיבה שהיא כתובה ב-`who: null` מההתחלה.
       */
      {
        id: 'distance-window',
        era: ADULT_CHAPTERS,
        x: 0.63,
        y: 0.92,
        w: 0.08,
        act: 'route-distance-offer',
        verb: 'gaze',
        labelHe: 'מהתריס החוצה',
      },
      // Wider than a drawer needs to be: it is the one thing in this room the chapter
      // cannot start without, so a child crossing the room at any speed is offered it.
      // It is NOT given priority — the door beside it must still win in the doorway, or
      // the way out of the first room disappears behind the furniture.
      { id: 'desk', x: 0.17, y: 0.9, w: 0.16, act: 'desk', verb: 'look', labelHe: 'המגירה' },
      /**
       * **הקופסה האדומה — חפץ בחדר, מ-21.9.2026.** עד היום הנקודה נקראה "הקופסה" ומה
       * שעמד עליה היה צעיף (`propScarfRed` על פינת השידה), והיא הייתה קיימת רק ב-1986.
       * כל פרק בחיים נגמר ב*"שמת את זה בקופסה האדומה"*, אז הקופסה עומדת בחדר בכל שנה
       * שיש בו חדר, במקום שהתסריט אומר:
       *
       *   · שלב א׳ ושנות התשעים — **מתחת למיטה** (*"קופסת פח מתחת למיטה"*, המעבר של
       *     1990): על הרצפה, משוכה חצי החוצה מתחת לקצה המיטה ליד השידה. הרצפה מתחילה
       *     ב-0.745 והמסילה התחתונה של המיטה נגמרת ב-0.72; כ-25 ס״מ בקנה המידה של 0.765.
       *   · משנת 2000 — **על המדף** (B01: *"החדר שלך. הקופסה על המדף."*), בקצה הימני של
       *     המדף שמעל המיטה (הקרש ב-0.305, המדף נגמר ב-0.705).
       *
       * הנגיעה פותחת את הקופסה עצמה (`RedBoxSheet`), עם כל מה שבה.
       */
      // B10 S1 (27.9.2026) — 1999-cup: the box before the final; what goes to Ramat Gan in a pocket
      { id: 'c99-box', era: '1999-cup', x: 0.63, y: 0.9, w: 0.1, act: 'c99-box', verb: 'take', labelHe: 'הקופסה האדומה — מה לוקחים לגמר', when: { none: [{ flag: 'c99:carry' }, { flag: 'c99:route' }] }, priority: 6 },
      {
        id: 'redbox',
        era: ['A', '1990s'],
        x: 0.63,
        y: 0.9,
        w: 0.1,
        act: 'redbox',
        verb: 'look',
        labelHe: 'הקופסה האדומה',
        prop: { key: 'propRedBox', size: 0.05, at: { x: 0.63, y: 0.764 } },
      },
      {
        id: 'redbox-shelf',
        // while he lives here (2000–2012); from 2013 the box is on his own bookcase
        era: chaptersWhere(livesWithParents),
        x: 0.685,
        y: 0.9,
        w: 0.09,
        act: 'redbox-shelf',
        verb: 'look',
        labelHe: 'הקופסה האדומה',
        prop: { key: 'propRedBox', size: 0.041, at: { x: 0.684, y: 0.305 } },
      },
    ],
    exits: [
      {
        id: 'out',
        x: 0.0,
        y: 0.82,
        w: 0.09,
        h: 0.18,
        to: 'home',
        spawn: 'fromBedroom',
        labelHe: 'לסלון',
        light: { x: 0.0, y: 0.62, w: 0.075, h: 0.36, tone: 'inside' },
        // Half a second, not a fifth of one. This is the first door in the game and the
        // drawer beside it is the thing the morning needs — sliding out of your own room
        // before you have looked at anything is how a chapter starts locked.
        dwellMs: 520,
      },
    ],
  },

  // ---------------------------------------------------------------------- home ----
  {
    id: 'home',
    titleHe: 'הסלון',
    // מ-2013 יש לפוגי בית משלו; בערבים שהסלון הזה הוא שוב של ההורים — הכותרת אומרת את זה
    titleByEra: Object.fromEntries(PARENTS_AFTER_2013.map((id) => [id, 'אצל ההורים'])),
    // ...ובשאר הפרקים מ-2013 זה הבית שלו, על הציור שלו (`homes.ts`, `rooms2000.ts`)
    repaints: [HOME_OWN],
    art: 'living',
    band: { far: 0.73, near: 0.97 },
    size: { far: 0.33, near: 0.43 },
    metre: 0.3308,
    ambience: 'interior',
    /**
     * A base hint may name a DOOR; it may not name a PERSON, because the base is what
     * eighteen chapters inherit and no person is in this room in all eighteen. The named
     * lines live in `stuckByEra`, one per year that actually has that person standing
     * here, and the runtime (`hintNow`) drops any of them that stops being true —
     * 1986's Kobi leaves at ten past three, and after that the room stops mentioning him.
     */
    stuckHe: 'הדלת לרחוב — שמאל. המטבח והחדר — מאחור.',
    stuckByEra: {
      // (V3, 24.9.2026) the key is no longer a lock: the door is open, the drawer is flavour
      '1986': 'אבא בכורסה — תשאל אותו מה יש היום. הדלת לרחוב — שמאל.',
      '1996-army': 'אמא אורזת. הגרביים על השולחן, הרדיו על השידה, והתיק ליד הדלת לחדר שלך.',
      '1990': 'אמא בסלון. הדלת לרחוב — שמאל, והמטבח מאחור.',
      '1991': 'הדלת לרחוב — שמאל. המטבח מאחור, ובו פנקס.',
      'a2-alley': 'אמא פה, והיא רוצה משהו. הדלת לרחוב — שמאל.',
      'a4-shirt': 'אבא בכורסה עם העיתון. הדלת לרחוב — שמאל.',
      'a7-week': 'אבא בכורסה. הדלת לרחוב — שמאל.',
    },
    // (21.9.2026) `livingTable` — a coffee table with an ashtray, cut from the living room
    // painted BEFORE this one — stood here as a layer at 0.37–0.54, in front of the kitchen
    // door, while this painting's own coffee table stands at 0.55–0.75 behind it: two
    // tables, one of them floating. The room has one table, and it is the painted one.
    layers: [],
    spawns: {
      // Every one of these sits CLEAR of the door it came through. A spawn inside its
      // own exit zone walks the player straight back where they came from, forever —
      // `tests/life.test.ts` fails the build on it now, because it happened here.
      fromBedroom: { x: 0.77, y: 0.9, facing: 'left' },
      // clear of the door (0–0.075) and as far left of Kobi's armchair (0.11–0.27) as that allows
      fromStreet: { x: 0.095, y: 0.93, facing: 'right' },
      fromKitchen: { x: 0.35, y: 0.87, facing: 'right' },
      // Stage B mornings begin in the middle of the room, facing the table.
      start: { x: 0.5, y: 0.9, facing: 'left' },
    },
    actors: [
      // ---- שלב א׳, הימים שלפני השבת (chapterStageA.ts) ----
      { id: 'rachel-a2', era: 'a2-alley', figure: 'rachel', x: 0.3, y: 0.9, size: 0.42, nameHe: 'רחל', talk: 'rachel-a2', sway: 0.004 },
      { id: 'kobi-a4', era: 'a4-shirt', figure: 'kobi-chair', x: 0.19, y: 0.74, size: 0.34, nameHe: 'קובי', talk: 'kobi-a4' },
      { id: 'rachel-a4', era: 'a4-shirt', figure: 'rachel', x: 0.3, y: 0.9, size: 0.42, nameHe: 'רחל', talk: 'rachel-a4', sway: 0.004 },
      { id: 'rachel-a6', era: 'a6-radio', figure: 'rachel-tray', x: 0.3, y: 0.9, size: 0.42, nameHe: 'רחל', talk: 'rachel-a6', sway: 0.004 },
      { id: 'kobi-a7', era: 'a7-week', figure: 'kobi-chair', x: 0.19, y: 0.74, size: 0.34, nameHe: 'קובי', talk: 'kobi-a7' },
      { id: 'rachel-a7', era: 'a7-week', figure: 'rachel', x: 0.3, y: 0.9, size: 0.42, nameHe: 'רחל', talk: 'rachel-a7', sway: 0.004 },
      {
        id: 'kobi',
        // He sits in his own chair with the sports page, which is the pose the sheet was
        // drawn for and the reason the living room has somebody in it rather than a
        // cut-out standing on a rug.
        figure: 'kobi-chair',
        // (21.9.2026) IN the painted armchair (0.11–0.27, front skirt on 0.73): the figure is
        // drawn with its own chair, and at 0.63 it put a second armchair in the middle of
        // the room, in front of the sofa. Drawn over the painted one, it IS the armchair.
        x: 0.19,
        y: 0.74,
        size: 0.34,
        nameHe: 'קובי',
        talk: 'kobi-morning',
        when: { beforeMinute: KOBI_LEAVES },
        sway: 0.003,
      },
      // 1990: Rachel moves through the flat; the schedule puts her here after half past one.
      // 1991: the same two people in the same room, on a Monday evening that has a
      // question in it. Rachel is the chapter's boss fight (§30) and Kobi is not a
      // second key to the same door — he can nudge, once, and only if he is close.
      {
        id: 'rachel-1991',
        era: '1991',
        // (21.9.2026) `rachel90-arms`, `-hips` and `-door` are cut through her forehead on the
        // sheet — a flat line where her hair should be. The poses with her whole head:
        figure: 'rachel90',
        x: 0.6,
        y: 0.84,
        size: 0.45,
        nameHe: 'רחל',
        talk: 'rachel-1991',
        sway: 0.004,
      },
      /**
       * In HIS armchair, not in front of it (21.9.2026). The chair is painted at 0.11–0.27
       * with its front skirt on 0.73 and its seat at ~0.60; a seated body with its feet on
       * 0.74 has its hips at 0.61 — on the cushion. At 0.28/0.80 he sat on the air a step
       * in front of the chair, for eight chapters.
       */
      {
        id: 'kobi-1991',
        era: '1991',
        // the approved armchair look (27.9.2026): drawn with its own chair, like `kobi-chair`
        figure: 'kobi90-chair',
        x: 0.19,
        y: 0.74,
        size: 0.34,
        nameHe: 'קובי',
        talk: 'kobi-1991',
        when: { afterMinute: 17 * 60 + 40 },
        sway: 0.003,
      },
      // 19.4.1993 — the same two, at the table and in the chair, on the evening of a final
      // that is not football.
      {
        id: 'rachel-1993',
        era: '1993-cup',
        figure: 'rachel90-apron',
        x: 0.6,
        y: 0.84,
        size: 0.426,
        nameHe: 'רחל',
        talk: 'rachel-1993',
        sway: 0.004,
      },
      {
        id: 'kobi-1993',
        era: '1993-cup',
        figure: 'kobi90-chair',
        x: 0.19,
        y: 0.74,
        size: 0.34,
        nameHe: 'קובי',
        talk: 'kobi-1993',
        sway: 0.002,
      },
      {
        id: 'rachel-army',
        era: '1996-army',
        figure: 'rachel90-3q',
        x: 0.6,
        y: 0.84,
        size: 0.426,
        nameHe: 'רחל',
        talk: 'rachel-army',
        sway: 0.004,
      },
      {
        id: 'kobi-army',
        era: '1996-army',
        figure: 'kobi90-paper',
        x: 0.19,
        y: 0.74,
        size: 0.4,
        nameHe: 'קובי',
        talk: 'kobi-army',
        sway: 0.002,
      },
      // 2.5.1998 — the careful father; 1999 and 2000 — the father with the old scarf
      { id: 'kobi-laces', era: '1998-laces', figure: 'kobi90-paper', x: 0.19, y: 0.74, size: 0.4, nameHe: 'קובי', talk: 'kobi-laces', sway: 0.002 },
      { id: 'rachel-laces', era: '1998-laces', figure: 'rachel90-watch', x: 0.6, y: 0.84, size: 0.426, nameHe: 'רחל', talk: 'rachel-laces', sway: 0.004 },
      { id: 'kobi-cup99', era: '1999-cup', figure: 'kobi90-bag', x: 0.28, y: 0.82, size: 0.42, nameHe: 'קובי', talk: 'kobi-cup99', sway: 0.002 },
      { id: 'kobi-title', era: '2000-title', figure: 'kobi90-stand', x: 0.28, y: 0.82, size: 0.42, nameHe: 'קובי', talk: 'kobi-title', sway: 0.002 },
      { id: 'kobi-double', era: '2000-double', figure: 'kobi90-cheer', x: 0.28, y: 0.82, size: 0.42, nameHe: 'קובי', talk: 'kobi-double', sway: 0.002 },
      {
        id: 'rachel-home',
        era: '1990',
        figure: 'rachel90',
        // By the sofa, not on the kitchen doorway's spawn — a mother the boy walked
        // out of the kitchen INTO was the first thing the 1990 board showed.
        x: 0.6,
        y: 0.84,
        size: 0.45,
        nameHe: 'רחל',
        talk: 'rachel-1990',
        sway: 0.004,
      },
    ],
    hotspots: [
      /**
       * הטובים ביותר, עם אבא — the paper Kobi folds to make room (`act-lounge-xi`). Only in the
       * chapters he sits in this room, and only while he is there: in 1986 until he leaves
       * for the ground, in 1991 once he is home. Beside his chair (0.19) or, from 1999, beside
       * where he stands (0.28).
       */
      {
        id: 'xi-kobi',
        era: actEra('lounge-xi').filter((chapter) => ['1993-cup', '1996-army', '1998-laces'].includes(chapter)),
        x: 0.31,
        y: 0.8,
        w: 0.06,
        act: 'act-lounge-xi',
        verb: 'talk',
        labelHe: 'הטובים ביותר, עם אבא',
      },
      {
        id: 'xi-kobi-1986',
        era: actEra('lounge-xi').filter((chapter) => chapter === '1986'),
        x: 0.31,
        y: 0.8,
        w: 0.06,
        act: 'act-lounge-xi',
        verb: 'talk',
        labelHe: 'הטובים ביותר, עם אבא',
        when: { beforeMinute: KOBI_LEAVES },
      },
      {
        id: 'xi-kobi-1991',
        era: actEra('lounge-xi').filter((chapter) => chapter === '1991'),
        x: 0.31,
        y: 0.8,
        w: 0.06,
        act: 'act-lounge-xi',
        verb: 'talk',
        labelHe: 'הטובים ביותר, עם אבא',
        when: { afterMinute: 17 * 60 + 40 },
      },
      {
        id: 'xi-kobi-2000',
        era: actEra('lounge-xi').filter((chapter) => ['1999-cup', '2000-title', '2000-double'].includes(chapter)),
        x: 0.37,
        y: 0.84,
        w: 0.06,
        act: 'act-lounge-xi',
        verb: 'talk',
        labelHe: 'הטובים ביותר, עם אבא',
      },
      /**
       * החפצים שהתסריט נוקב בהם, על הרהיטים שהציור כבר מצייר (21.9.2026) — מהגיליונות
       * של מאור מ-20.9 (`ingest-objects-2026-09-21.py`). השולחן הנמוך: מכסה 0.60, רגליים
       * 0.72, מטר אחד בעומק הזה הוא 0.25 מהגובה; השטיח מול הספה הוא הרצפה של המזוודה.
       */
      // X01 — "מה נכנס למזוודה": על הרצפה, בקצה הספה — לא בדרך לדלת
      { id: 'suitcase-x01', era: '2021-suitcase', x: 0.8, y: 0.84, w: 0.07, act: 'suitcase-x01', verb: 'look', labelHe: 'המזוודה', prop: { key: 'propSuitcase', size: 0.148, at: { x: 0.8, y: 0.785 } } },
      // A01 — "השלט אצלו", ו"איזה ספל שלך": על השולחן הנמוך, בצד שלו
      { id: 'remote-a01', era: '2019-armchair', x: 0.6, y: 0.8, w: 0.07, act: 'remote-a01', verb: 'look', labelHe: 'השלט', prop: { key: 'propRemote', size: 0.034, at: { x: 0.585, y: 0.606 } } },
      { id: 'mug-a01', era: '2019-armchair', x: 0.66, y: 0.8, w: 0.05, act: 'mug-a01', verb: 'look', labelHe: 'הספלים', prop: { key: 'propMug', size: 0.026, at: { x: 0.64, y: 0.606 } } },
      // F01 — "כמה כרטיסים?" "לנו."
      { id: 'tickets-f01', era: '2026-plan', x: 0.68, y: 0.8, w: 0.07, act: 'tickets-f01', verb: 'look', labelHe: 'הכרטיסים', prop: { key: 'propTicketsPair', size: 0.022, at: { x: 0.67, y: 0.606 } }, when: { all: [{ flag: 'f:tickets' }], none: [{ flagIs: { flag: 'f:tickets', value: 'none' } }] } },
      /**
       * **הרדיו על השידה — 21.9.2026.** השיחה אומרת *"הרדיו על השידה, בין מפית לתמונה"*,
       * קובי *"מנמיך את הרדיו"*, והנקודה נקראה "הטלוויזיה" ולא היה על השידה שום רדיו —
       * רק הטלוויזיה שבציור. עכשיו הוא עומד על המשטח משמאל לטלוויזיה (0.125–0.18 פנוי מעל
       * גב הכורסה, שמגיע ל-0.46), בגובה של רדיו אמיתי: `metre` בקו הרחוק הוא 0.254 לכל
       * מטר, ורדיו כזה הוא כ-18 ס״מ.
       */
      { id: 'radio', x: 0.155, y: 0.78, w: 0.1, act: 'radio', verb: 'look', labelHe: 'הרדיו', prop: { key: 'propRadio', size: 0.046, at: { x: 0.153, y: 0.447 } } },
      { id: 'photo', x: 0.42, y: 0.76, w: 0.08, act: 'family-photo', verb: 'look', labelHe: 'התמונות' },
      { id: 'table', x: 0.45, y: 0.84, w: 0.1, act: 'coffee-table', verb: 'look', labelHe: 'השולחן' },
      /**
       * המגירה של אבא — the sideboard under the television, and the one thing in it.
       *
       * A championship booklet from 1980/81 is not a collectible and it is not a reward:
       * it is a thing a man bought the year his son was born and then kept for forty-five
       * years in a drawer he opens twice a decade. So it is not on the table where the
       * newspaper is; you have to open the drawer, and the game never tells you to.
       *
       * Every era of this flat has it, because it never left the drawer.
       */
      { id: 'drawer', x: 0.24, y: 0.8, w: 0.07, act: 'sideboard-drawer', verb: 'look', labelHe: 'המגירה' },
      // 1990: the phone rings when you pass it, and the photograph is four years older.
      { id: 'phone-1990', era: '1990', x: 0.13, y: 0.78, w: 0.1, act: 'phone-1990', verb: 'look', labelHe: 'הטלפון' },
      { id: 'photo-1990', era: '1990', x: 0.42, y: 0.76, w: 0.08, act: 'photo-1990', verb: 'look', labelHe: 'התמונות' },
      { id: 'tv-1993', era: '1993-cup', x: 0.13, y: 0.78, w: 0.1, act: 'tv-1993', verb: 'watch', labelHe: 'הטלוויזיה' },
      // (V3 §12) A7 — asking is sitting down beside him, on the arm of the chair, with the page
      { id: 'a7-armrest', era: 'a7-week', x: 0.27, y: 0.86, w: 0.07, act: 'a7-armrest', verb: 'sit', labelHe: 'המשענת של הכורסה, ליד אבא', when: { all: [{ flag: 'a7:knows' }, { notFlag: 'a7:refused' }] }, priority: 5 },
      // (V3 §12) 2000, an afternoon on the sofa with his parents, not talking about the final
      { id: 'd-sofa', era: '2000-double', x: 0.42, y: 0.86, w: 0.1, act: 'd-home-afternoon', verb: 'sit', labelHe: 'הספה, ליד אבא ואמא', when: { all: [{ flag: 'd:opened' }, { notFlag: 'd:final' }, { notFlag: 'd:pick1:family' }] }, priority: 5 },
      /**
       * 1996 — הערב האחרון: לארוז בידיים (Director V3 §7). Three things, in the order the
       * room offers them walking from the door: the socks on the coffee table, the
       * transistor on the sideboard (take it, or leave it for Kobi), and the bag by the
       * bedroom door, which closes only on what was put in it. Rachel's last question
       * (`rachel-army`) waits for the closed bag. Not before the eve, not after it.
       */
      { id: 'pack-socks', era: '1996-army', x: 0.45, y: 0.84, w: 0.1, act: 'pack-socks', verb: 'take', labelHe: 'הגרביים על השולחן', when: { all: [{ flag: 'life:army:d1' }, { notFlag: 'a1:packed' }, { notFlag: 'life:army:d2' }] }, priority: 3 },
      { id: 'pack-radio', era: '1996-army', x: 0.155, y: 0.78, w: 0.08, act: 'pack-radio', verb: 'take', labelHe: 'הרדיו על השידה', when: { all: [{ flag: 'life:army:d1' }, { notFlag: 'a1:packed' }, { notFlag: 'life:army:d2' }] }, priority: 3 },
      { id: 'pack-bag', era: '1996-army', x: 0.8, y: 0.86, w: 0.08, act: 'pack-bag', verb: 'take', labelHe: 'התיק הצבאי', when: { all: [{ flag: 'life:army:d1' }, { notFlag: 'a1:packed' }, { notFlag: 'life:army:d2' }] }, priority: 3 },
    ],
    exits: [
      {
        id: 'street',
        x: 0.0,
        y: 0.73,
        w: 0.075,
        h: 0.27,
        to: 'street',
        spawn: 'fromHome',
        labelHe: 'לרחוב',
        // The way out of the flat: daylight on the floor at the edge of the frame. It is
        // the only cold-warm light in a room lit by an afternoon window, which is the
        // whole reason it reads as OUTSIDE rather than as another room.
        light: { x: 0.0, y: 0.6, w: 0.085, h: 0.4, tone: 'daylight' },
        /**
         * **אין יותר מנעול מפתח (Director V3 §11, 24.9.2026).** Until today this door had
         * `needs: { hasItem: 'house-key' }` and the 1986 checklist opened on "המפתח. במגירה."
         * — an implementation the design had already moved past: the drama of that Saturday
         * is "אבא אמר לא — מה אתה עושה?", not a fetch quest. The key is still in the drawer,
         * on its string, for the boy who opens it (`desk`); nobody needs it to go out.
         *
         * 1991 is the first year the front door is locked by a SENTENCE rather than by an
         * object. Until seven in the evening it is an ordinary door; after that it needs
         * either the permission Rachel gave or the note left under the glass on the
         * kitchen table (§32). Refusing is a branch, not a wall: the note is always there.
         */
        needsByEra: {
          '1991': {
            any: [
              { beforeMinute: 19 * 60 },
              { flag: 'permission:yes' },
              { flag: 'sneak:ready' },
              { flag: 'derby:over' },
            ],
          },
        },
        blockedByEra: { '1991': 'אחרי שבע לא יוצאים בלי מילה לאמא. (במטבח יש פנקס ועיפרון.)' },
        dwellMs: 260,
        priority: 2,
      },
      {
        id: 'kitchen',
        // the doorway in the back wall of the 4.9 painting: 0.33–0.44
        x: 0.325,
        y: 0.73,
        w: 0.12,
        h: 0.055,
        to: 'kitchen',
        spawn: 'fromHome',
        labelHe: 'למטבח',
        light: { x: 0.335, y: 0.14, w: 0.1, h: 0.6, tone: 'inside' },
        dwellMs: 420,
      },
      {
        id: 'bedroom',
        x: 0.895,
        y: 0.73,
        w: 0.105,
        h: 0.06,
        to: 'bedroom',
        spawn: 'fromHome',
        labelHe: 'לחדר שלך',
        light: { x: 0.9, y: 0.06, w: 0.095, h: 0.66, tone: 'inside' },
        dwellMs: 420,
      },
    ],
  },

  // ------------------------------------------------------------------- kitchen ----
  {
    id: 'kitchen',
    titleHe: 'המטבח',
    art: 'kitchen',
    // Repainted 3.9.2026. The old kitchen was a 4.3× upscale of one panel of a concept
    // board — the example `docs/life/ART-PROMPTS.md` opened with — and it was framed at a
    // three-quarter angle onto a cluttered corner, which left a walk band eight percent of
    // the frame deep. This one is straight-on with an empty floor, so the band nearly
    // doubles, and its doorway is on the LEFT and shows a corner of the living room
    // through it. That is why the exit, the spawn and both hotspots move: the room turned
    // around, and the scene turns around with it.
    band: { far: 0.68, near: 0.985 },
    size: { far: 0.24, near: 0.38 },
    metre: 0.2923,
    ambience: 'kitchen',
    // E03 (2002): the trip is packed before it is argued about — the bag by the wall, right
    // of the table (0.45 m at a floor where a metre is 0.2 of the frame)
    layers: [{ art: 'propBackpack', era: '2002-europe', x: 0.935, y: 0.73, w: 0.046, depth: 0.73, foot: true }],
    stuckHe: 'חזרה לסלון — משמאל.',
    stuckByEra: {
      '1990': 'הטבלה על השולחן, אבא לידה. חזרה לסלון — משמאל.',
      '1991': 'פנקס ועיפרון על השולחן. חזרה לסלון — משמאל.',
    },
    spawns: { fromHome: { x: 0.2, y: 0.9, facing: 'right' } , start: { x: 0.2, y: 0.9, facing: 'right' } },
    actors: [
      {
        id: 'rachel',
        figure: 'rachel',
        x: 0.55,
        y: 0.9,
        size: 0.42,
        nameHe: 'רחל',
        talk: 'rachel-kitchen',
        sway: 0.004,
      },
      // ---- 1990: the kitchen table is where the chapter opens ----
      {
        id: 'kobi-table',
        era: '1990',
        figure: 'kobi90-paper',
        // At the table, on the near chair, at the back of the room — the table in the
        // painting stands against the far wall, so a father "at the table" sits on the
        // far line of the band, small, not in the middle of the floor at full size.
        // On the near chair itself — the chairs in the painting stand at 0.77–0.8, feet
        // on the 0.68 line, the band's far edge. Actor size is absolute, not banded: a
        // man sitting that far back is drawn at the far line's size, times a sitting man.
        x: 0.785,
        y: 0.68,
        size: 0.2,
        nameHe: 'קובי',
        talk: 'kobi-table-1990',
      },
      {
        id: 'rachel-kitchen',
        era: '1990',
        figure: 'rachel90-apron',
        // At the sink, on the far line — out of the doorway the boy walks in through.
        // At 0.3/0.9 she stood on the spawn's path and he walked into her.
        x: 0.42,
        y: 0.73,
        size: 0.32,
        nameHe: 'רחל',
        talk: 'rachel-1990',
        sway: 0.004,
      },
    ],
    hotspots: [
      /**
       * ערימת העיתונים — the pile of old papers under the counter, tied with string
       * (`act-kitchen-archive`): the archive, cut to what a boy could have found at home,
       * dated before the year. At the counter's end, clear of the table's corner of the room
       * (0.7–0.95), where every chapter's own things are.
       */
      {
        id: 'old-papers',
        era: actEra('kitchen-archive'),
        x: 0.3,
        y: 0.72,
        w: 0.06,
        act: 'act-kitchen-archive',
        verb: 'look',
        labelHe: 'ערימת העיתונים הישנים',
      },
      // (21.9.2026) על השולחן — סקאלת השולחן עצמו: 0.75 מ׳ מ-0.46 עד 0.69, כלומר 0.307 לכל מטר
      // E03 — "דרכון בפעם הראשונה"
      { id: 'passport-e03', era: '2002-europe', x: 0.8, y: 0.8, w: 0.06, act: 'passport-e03', verb: 'look', labelHe: 'הדרכון', prop: { key: 'propPassport', size: 0.034, at: { x: 0.878, y: 0.464 } } },
      // C05 — קרן בטלפון (`c10-call`); הטלפון על השולחן, לא ביד של אף אחד
      { id: 'phone-c05', era: '2010-anthem', x: 0.8, y: 0.8, w: 0.06, act: 'phone-c05', verb: 'look', labelHe: 'הטלפון', prop: { key: 'propPhone2010', size: 0.03, at: { x: 0.82, y: 0.464 } } },
      // A02 — "מצאתי את התמונה": האלבום פתוח על השולחן
      { id: 'album-a02', era: '2019-armchair', x: 0.82, y: 0.8, w: 0.07, act: 'album-a02', verb: 'look', labelHe: 'האלבום', prop: { key: 'propAlbum', size: 0.03, at: { x: 0.845, y: 0.464 } } },
      ...gigSpots('kitchen'),
      /**
       * (Director V3 §12, 25.9.2026) A6 — the transistor is a thing you tune, hold and carry.
       * Alive it opens the kitchen as a passage of the hands (`ride:radio-86`: the antenna
       * to the window, both hands on it, the half-sentences); dead it can be picked up and
       * taken down the street to Liron (`a6:carried`).
       */
      { id: 'radio-a6', era: 'a6-radio', x: 0.93, y: 0.78, w: 0.05, act: 'radio-a6', verb: 'play', labelHe: 'הטרנזיסטור', prop: { key: 'propRadio', size: TABLE_RADIO.size, at: TABLE_RADIO.at }, when: { none: [{ flag: 'a6:radio-dead' }] } },
      { id: 'radio-a6-dead', era: 'a6-radio', x: 0.93, y: 0.78, w: 0.05, act: 'radio-a6-dead', verb: 'take', labelHe: 'הטרנזיסטור המת', prop: { key: 'propRadio', size: TABLE_RADIO.size, at: TABLE_RADIO.at }, when: { all: [{ flag: 'a6:radio-dead' }, { notFlag: 'a6:carried' }, { notFlag: 'a6:revived' }, { notFlag: 'a6:gave-up' }] } },
      // On the floor at the end of the run of cupboards, which is where a crate of empties
      // lives in a flat that takes them back for the deposit.
      { id: 'crate', x: 0.3, y: 0.92, w: 0.11, act: 'bottles', verb: 'take', labelHe: 'הבקבוקים' },
      // The little table under the mirror, with the oilcloth on it and the chairs pushed in.
      { id: 'table', x: 0.86, y: 0.9, w: 0.12, act: 'kitchen-table', verb: 'look', labelHe: 'השולחן' },
      // 1990: the paper open on the table, and the radio beside it.
      // (V3 §12) the paper is lifted off the table and read, and the radio is tuned by hand:
      // two of the three sources the morning triangulates (the third is Amit, in the street)
      { id: 'table-1990', era: '1990', x: 0.86, y: 0.78, w: 0.07, act: 'table-1990', verb: 'take', labelHe: 'העיתון על הטבלה', priority: 2 },
      // sit down at the table: the kitchen from the boy's own chair
      { id: 'chair-1990', era: '1990', x: 0.7, y: 0.8, w: 0.06, act: 'pano:panoKitchen90', verb: 'sit', labelHe: 'הכיסא ליד השולחן' },
      // ON the table, beside the paper: drawn on the oilcloth, reached from the floor in
      // front of it.
      { id: 'radio-1990', era: '1990', x: 0.93, y: 0.78, w: 0.05, act: 'radio-table-1990', verb: 'play', labelHe: 'הטרנזיסטור', prop: { key: 'propRadio', size: TABLE_RADIO.size, at: TABLE_RADIO.at } },
      { id: 'radio-g2', era: '1993-galil', x: 0.93, y: 0.78, w: 0.05, act: 'g2-radio-on', verb: 'play', labelHe: 'הטרנזיסטור', prop: { key: 'propRadio', size: TABLE_RADIO.size, at: TABLE_RADIO.at }, when: { all: [{ flag: 'life:galil:d2' }, { notFlag: 'g2:chose' }, { notFlag: 'life:galil:d3' }] } },
      { id: 'radio-galil', era: '1993-galil', x: 0.93, y: 0.78, w: 0.05, act: 'g4-radio', verb: 'play', labelHe: 'הטרנזיסטור', prop: { key: 'propRadio', size: TABLE_RADIO.size, at: TABLE_RADIO.at }, when: { flag: 'life:galil:d4' } },
      // 1991: the pad and the pencil Rachel writes her lists with — and the only way out
      // of a "no" that is not a lie (§32).
      { id: 'pad-1991', era: '1991', x: 0.86, y: 0.82, w: 0.08, act: 'kitchen-note-1991', verb: 'take', labelHe: 'הפנקס' },
      /**
       * OWNER · `CHECK_BUDGET` — על אותו שולחן שהפנקס של 1991 מונח עליו.
       *
       * זה לא במקרה אותו 0.86. הפתק תחת הזכוכית היה האופן שבו אמא ניהלה ערב אחד, והתקציב
       * הוא אותו רהיט עשר שנים אחר כך, כשהמספרים הם שלו. שולחן המטבח הוא המקום היחיד בבית
       * שכסף מדובר בו בקול, ולכן הוא המקום היחיד שראוי לשאת ראיה ששמה `balanced_budget`.
       */
      smallAction('CHECK_BUDGET', 'route-check-budget', { x: 0.86, y: 0.9, w: 0.12 }, 'look', 'החשבונות על השולחן'),
    ],
    exits: [
      {
        id: 'out',
        x: 0.0,
        y: 0.66,
        w: 0.09,
        h: 0.32,
        to: 'home',
        spawn: 'fromKitchen',
        labelHe: 'לסלון',
        light: { x: 0.0, y: 0.38, w: 0.095, h: 0.6, tone: 'inside' },
        dwellMs: 220,
      },
    ],
  },

  // -------------------------------------------------------------------- street ----
  //
  // Repainted 2.9.2026 to a purpose-drawn frame (`docs/life/street-backdrop-spec.png`).
  // The picture that came before it was a beautiful painting with twelve people in it,
  // and every one of them was frozen for the whole afternoon — which is why a street
  // with a schedule and an ambient system still read as dead. This one is empty on
  // purpose: everybody standing in it is drawn by the game.
  //
  // It ships in three plates. `streetGround` is the near paving, drawn BEHIND everyone;
  // the backdrop is the buildings; `streetFore` is the doorway column, the utility pole
  // and the gate pillar, drawn in FRONT. A child who walks behind a pole is the whole
  // difference between a painting and a place (brief §27).
  {
    id: 'street',
    titleHe: 'הרחוב',
    art: 'street',
    // a match day has bunting between the balconies (5.9.2026): the promotion, the last round, the finals
    artByEra: { '1990': 'street90', '1991': 'street90', '1998-laces': 'street90Flags', '1999-cup': 'street90Flags', '2000-title': 'street90Flags', '2000-double': 'street90Flags', '1990s': 'street90', '2000s': 'street90' },
    band: { far: 0.705, near: 0.86 },
    size: { far: 0.185, near: 0.29 },
    metre: 0.2231,
    ambience: 'park',
    stuckHe: 'הקיוסק משמאל, המגרש בסמטה, בית הספר בקצה. מזרחה הולכים רק כשיודעים לאן — תשאל מישהו.',
    stuckByEra: {
      '1990': 'אופיר ועמית ליד הקיוסק. מזרחה — אחרי האדומים.',
      '1991': 'בית הספר בקצה הרחוב, מזרחה יוצאים מהשכונה, הבית מאחורייך.',
    },
    // 2010–2026: the same street on its own painting (`street10`), on its own measured floor
    repaints: [STREET_2010],
    layers: [
      // Behind everybody: the near paving and the kerb, with the tree shadows on it.
      { art: 'streetGround', x: 0, y: 0, w: 1, depth: 0.69 },


      // --- הרחוב ביום משחק — the dressing -----------------------------------------
      //
      // Nothing below changes what the street DOES. It changes what the street is: a
      // painted set becomes somewhere people live, and — this is the part worth the
      // work — it changes across the afternoon. Pennants and a flag off a balcony are
      // up all day, because the neighbourhood knew before the child did. The car at the
      // kerb belongs to somebody who has not left yet, so it is gone once Kobi goes and
      // the street empties eastward. A player who crosses this street at noon and again
      // at four is looking at two different afternoons, and never reads a word about it.
      // (21.9.2026) The pennants, the planter, the bin and the parked car that stood here
      // were pen-and-ink engravings from the September props sheet — a drawn car at the
      // kerb of a photographed street. Removed; the match-day street keeps its flag.
      { art: 'propBanner', x: 0.598, y: 0.398, w: 0.138, depth: 0.66 },
      // I02 (2010-friends) — Lina's banner, blank, on its two poles on the pavement between
      // the kiosk and the pitch door: 1.6 m at a floor where a metre is 0.18 of the frame
      { art: 'propBannerBlank', era: '2010-friends', x: 0.35, y: 0.775, w: 0.113, depth: 0.775, foot: true },

      // In front of everybody: the pole, the pillar, the doorway column, the canopy.
      { art: 'streetFore', x: 0, y: 0, w: 1, depth: 0.995 },
    ],
    spawns: {
      // Clear of the doorway by more than the return clearance, so the pavement outside
      // your own front door is somewhere you can stand and look around.
      fromHome: { x: 0.175, y: 0.79, facing: 'right' },
      fromKiosk: { x: 0.395, y: 0.8, facing: 'right' },
      fromPitch: { x: 0.55, y: 0.79, facing: 'left' },
      fromRoute: { x: 0.935, y: 0.81, facing: 'left' },
      fromUss: { x: 0.82, y: 0.81, facing: 'left' },
      // back out of town, onto the pavement beside the turning at 0.725–0.783
      fromCentre: { x: 0.8, y: 0.81, facing: 'left' },
      fromSchool: { x: 0.7, y: 0.8, facing: 'left' },
      fromBus: { x: 0.8, y: 0.8, facing: 'right' },
      fromFar: { x: 0.8, y: 0.81, facing: 'right' },
    },
    actors: [
      // ---- שלב א׳, הימים שלפני השבת ----
      /**
       * (delta 92, plan §3) A3 — before they have met he is a boy you do not know yet, and the
       * prompt says so; afterwards he is Efi. One body, two names, never both at once.
       */
      { id: 'efi-a3', era: 'a3-hall', figure: 'efi', x: 0.62, y: 0.79, size: 0.26, nameHe: 'אפי', talk: 'efi-a3', sway: 0.006, when: { any: [{ flag: 'life:efi:met' }, { flag: 'life:efi:deferred' }] } },
      // (pass 28.9.2026, brief §3 S1 "אפי מגיע ביוזמת NPC") the stranger closes the last
      // metres himself when the boy wanders near — the first step of this friendship is his
      { id: 'efi-a3-stranger', era: 'a3-hall', figure: 'efi', x: 0.62, y: 0.79, size: 0.26, nameHe: 'ילד עם כדור כתום', talk: 'efi-a3', sway: 0.006, when: { none: [{ flag: 'life:efi:met' }, { flag: 'life:efi:deferred' }] }, initiative: { reachM: 2.4, when: { none: [{ flag: 'life:efi:met' }, { flag: 'life:efi:deferred' }] } } },
      // A4 — the second chance, on the step by the kiosk door (plan §3.2); gone once he has an answer
      { id: 'efi-a4', era: 'a4-shirt', figure: 'efi', x: 0.34, y: 0.8, size: 0.26, nameHe: 'אפי', talk: 'efi-a4', sway: 0.006, when: { flag: 'life:efi:deferred', none: [{ flag: 'life:efi:met' }, { flag: 'life:efi:declined' }, { flag: 'a4:ready-to-buy' }] } },
      { id: 'efi-a4-stranger', era: 'a4-shirt', figure: 'efi', x: 0.34, y: 0.8, size: 0.26, nameHe: 'ילד עם כדור כתום', talk: 'efi-a4', sway: 0.006, when: { none: [{ flag: 'life:efi:met' }, { flag: 'life:efi:declined' }, { flag: 'life:efi:deferred' }, { flag: 'a4:ready-to-buy' }] } },
      { id: 'kobi-a5', era: 'a5-first', figure: 'kobi-side', x: 0.66, y: 0.8, size: 0.32, nameHe: 'קובי', talk: 'kobi-a5', flip: true, when: { none: [{ flag: 'a5:kobi-left' }] } },
      /**
       * (pass 28.9.2026, brief §5 S2 "street social test") the first time the shirt is worn
       * in public it is worn past the two boys who have seen him every day of his life —
       * Ofir with a ball under his arm, Amit on the kerb. They are here only until the car
       * goes; Ofir walks up by himself (`a5-street`).
       */
      { id: 'ofir-a5', era: 'a5-first', figure: 'ofir', x: 0.55, y: 0.8, size: 0.26, nameHe: 'אופיר', talk: 'ofir-a5', flip: true, sway: 0.008, when: { none: [{ flag: 'a5:there' }] } },
      { id: 'amit-a5', era: 'a5-first', figure: 'amit', x: 0.36, y: 0.79, size: 0.26, nameHe: 'עמית', talk: 'ofir-a5', when: { none: [{ flag: 'a5:there' }] } },
      { id: 'liron-a6', era: 'a6-radio', figure: 'adultB2', x: 0.56, y: 0.8, size: 0.29, nameHe: 'לירון', talk: 'liron-a6' },
      { id: 'amit-a7', era: 'a7-week', figure: 'amit', x: 0.36, y: 0.79, size: 0.26, nameHe: 'עמית', talk: 'amit-a7' },
      { id: 'ofir-a7', era: 'a7-week', figure: 'ofir', x: 0.56, y: 0.79, size: 0.26, nameHe: 'אופיר', talk: 'ofir-a7', flip: true, sway: 0.006 },
      {
        id: 'ofir',
        figure: 'ofir',
        // Beside the kiosk door, not in it. A person standing inside an exit zone wins the
        // prompt over the door (`aim()` gives an actor priority 4 and a door 2), so the way
        // in disappears behind a conversation — the same defect the comment above
        // `usher-night` was written for. A schedule row usually moves him anyway; a
        // placement that is only correct because something else overrides it is not a
        // placement.
        x: 0.13,
        y: 0.775,
        size: 0.26,
        nameHe: 'אופיר',
        talk: 'ofir-wall',
        when: { beforeMinute: KOBI_LEAVES },
        sway: 0.006,
      },
      {
        id: 'amit-street',
        figure: 'amit',
        x: 0.375,
        y: 0.755,
        size: 0.28,
        nameHe: 'עמית',
        talk: 'amit-street',
        sway: 0.003,
      },
      {
        id: 'neighbour',
        // Moved left of the planter on 3.9.2026, by a guard rather than by an eye: at
        // 0.525 he stood at the back of the band with the planter drawn one thousandth of
        // a band in front of him and overlapping. Nobody had noticed, because he is
        // visible from the shoulders up — which is exactly the failure mode a person you
        // are supposed to talk to should never have.
        figure: 'adultB1',
        x: 0.41,
        y: 0.735,
        size: 0.22,
        nameHe: 'אילן השכן',
        talk: 'neighbour',
        sway: 0.004,
      },
      {
        id: 'ofir-later',
        figure: 'ofir',
        x: 0.665,
        y: 0.79,
        size: 0.26,
        nameHe: 'אופיר',
        talk: 'ofir-matchday',
        when: { afterMinute: KOBI_LEAVES },
      },
      {
        id: 'keren',
        figure: 'keren',
        x: 0.715,
        y: 0.815,
        size: 0.27,
        nameHe: 'קרן',
        talk: 'keren-street',
        sway: 0.003,
      },
      // ---- 1991: the same street after school, on a day with a night in it ----
      {
        id: 'ofir-street-1991',
        era: '1991',
        figure: 'ofir90-walk',
        // West of the kiosk door, so a boy walking home from the school gate passes him.
        x: 0.16,
        y: 0.79,
        size: 0.28,
        nameHe: 'אופיר',
        talk: 'ofir-afternoon-1991',
        sway: 0.005,
      },
      // 19.4.1993 — the street on the afternoon of the cup final. Efi is four years older
      // than Pogi (`castCards.ts`: "גדול ממך בארבע שנים") — nineteen here, seventeen in
      // 1991 — and stands on his own grown body; until 21.9.2026 it was `youngA2`, a boy of
      // thirteen seen from behind.
      {
        id: 'efi-1993',
        era: '1993-cup',
        figure: 'efi96-3q',
        x: 0.32,
        y: 0.8,
        size: 0.262,
        nameHe: 'אפי',
        talk: 'efi-1993',
        sway: 0.003,
      },
      {
        id: 'ofir-1993',
        era: '1993-cup',
        figure: 'ofir90-3q',
        x: 0.56,
        y: 0.79,
        size: 0.275,
        nameHe: 'אופיר',
        talk: 'ofir-1993',
        sway: 0.003,
      },
      {
        id: 'amit-1993',
        era: '1993-cup',
        figure: 'amit90',
        x: 0.63,
        y: 0.8,
        size: 0.283,
        nameHe: 'עמית',
        talk: 'amit-1993',
        flip: true,
      },
      // the Wednesday of game two: Michel beside his coach, notebook out, one seat
      { id: 'michel-g2', era: '1993-galil', figure: 'michel99-3q', x: 0.42, y: 0.82, size: 0.275, nameHe: 'מישל', talk: 'g2-choose', sway: 0.003, when: { all: [{ flag: 'life:galil:d2' }, { notFlag: 'g2:chose' }, { notFlag: 'life:galil:d3' }] } },
      {
        id: 'ofir-galil',
        era: '1993-galil',
        figure: 'ofir90-arms',
        x: 0.56,
        y: 0.79,
        size: 0.275,
        nameHe: 'אופיר',
        talk: 'g4-ofir',
        sway: 0.003,
        when: { flag: 'life:galil:d4' },
      },
      {
        id: 'ofir-army',
        era: '1996-army',
        figure: 'ofir90-3q',
        x: 0.56,
        y: 0.79,
        size: 0.275,
        nameHe: 'אופיר',
        talk: 'ofir-army',
        when: { flag: 'life:army:d1' },
      },
      { id: 'ofir-laces', era: '1998-laces', figure: 'ofir90-3q', x: 0.56, y: 0.79, size: 0.275, nameHe: 'אופיר', talk: 'ofir-laces' },
      { id: 'amit-laces', era: '1998-laces', figure: 'amit90-point', x: 0.63, y: 0.8, size: 0.283, nameHe: 'עמית', talk: 'ofir-laces', flip: true },
      { id: 'soko-laces', era: '1998-laces', figure: 'soko', x: 0.3, y: 0.8, size: 0.283, nameHe: 'סוקו', talk: 'soko-laces' },
      { id: 'liron-cup99', era: '1999-cup', figure: 'adultB2', x: 0.3, y: 0.8, size: 0.283, nameHe: 'לירון', talk: 'liron-cup99' },
      { id: 'michel-cup99', era: '1999-cup', figure: 'michel99-3q', x: 0.35, y: 0.8, size: 0.283, nameHe: 'מישל', talk: 'michel-cup99' },
      { id: 'ofir-cup99', era: '1999-cup', figure: 'ofir90-arms', x: 0.58, y: 0.79, size: 0.275, nameHe: 'אופיר', talk: 'ofir-cup99' },
      { id: 'efi-cup99', era: '1999-cup', figure: 'efi96-3q', x: 0.72, y: 0.8, size: 0.262, nameHe: 'אפי', talk: 'efi-cup99', flip: true },
      { id: 'michel-title', era: '2000-title', figure: 'michel99-3q', x: 0.35, y: 0.8, size: 0.283, nameHe: 'מישל', talk: 'michel-title' },
      { id: 'efi-title', era: '2000-title', figure: 'efi96-speak', x: 0.72, y: 0.8, size: 0.262, nameHe: 'אפי', talk: 'efi-title', flip: true },
      // ---- 1990: the same street, older children ----
      {
        id: 'ofir-street',
        era: '1990',
        figure: 'ofir90',
        x: 0.13,
        y: 0.78,
        size: 0.28,
        nameHe: 'אופיר',
        talk: 'ofir-1990',
        sway: 0.004,
      },
      {
        id: 'amit-street',
        era: '1990',
        figure: 'amit90',
        x: 0.57,
        y: 0.79,
        size: 0.31,
        nameHe: 'עמית',
        talk: 'amit-1990',
      },
      /**
       * קובי, אחרי שמצאת אותו — moved from 0.15 to 0.90 on 16.9.2026, for two reasons
       * that only show up once the board draws people at the size the engine draws them.
       *
       * At 0.15 he stood INSIDE Ofir (0.111–0.149 against his own 0.127–0.173) and on
       * top of the `fromHome` spawn at 0.175 — so a boy who had found his father came out
       * of his own front door onto him. Both were invisible while the board drew the
       * deprecated `size` field, and invisible on the default board besides, because he
       * only appears behind `found:kobi`.
       *
       * 0.90 is the one clear slot on this street: no exit, no hotspot, no other body, no
       * spawn. It is also the better beat — the route door is at 0.945, so stepping back
       * off the road puts the father a few metres ahead of you, facing home (`flip`).
       */
      { id: 'kobi-walk', era: '1990', figure: 'kobi90-side', x: 0.9, y: 0.8, size: 0.32, nameHe: 'קובי', talk: 'kobi-found-1990', flip: true, when: { flag: 'found:kobi' } },
      {
        // בארי — the same Gate 7 fixture from 1986, older, remembering Kobi's son (Stage A
        // Director's Cut §43: Barry's long-term seeds must pay off across decades).
        id: 'veteran',
        era: '1990',
        // Barry's own body (`barryRadio`, the canonical Barry since 23.9.2026 — `barry96` was
        // another man), as his plate (`faceBarry`, re-cut from `barryToday`) is — not a
        // stranger from behind (`adultA3`) who spoke with Barry's face
        figure: 'barryRadio-3q',
        x: 0.66,
        y: 0.8,
        size: 0.32,
        nameHe: 'בארי',
        talk: 'veteran-1990',
        flip: true,
        sway: 0.003,
      },
    ],
    hotspots: [
      /**
       * השכנה עם השקיות — about every other chapter (`neighbourAsks`, raised when the room is
       * built), by the entrance, between Rafi's errands (0.4) and the cars (0.58). A favour:
       * money, a plate or a favour owed, off the save's seed (`giftOf`).
       */
      {
        id: 'neighbour-bags',
        era: actEra('neighbour'),
        x: 0.49,
        y: 0.87,
        w: 0.06,
        act: 'act-neighbour',
        verb: 'look',
        labelHe: 'השכנה עם השקיות',
        when: { flag: 'act:offer:neighbour' },
      },
      /**
       * העבודות של הרחוב — 6.9.2026: they were being offered from the KITCHEN.
       *
       * `gigSpots('street')` had been appended to the kitchen's hotspot list, four hundred
       * lines above this one, together with the fan shop. So the bottles by the bin, the
       * scarves before the match and the errands for Rafi were all reachable by standing
       * at the sink and unreachable by standing in the street they are set in — and every
       * one of them still passed the orphan-conversation audit, because the ids WERE used,
       * in the wrong room. `tests/life-doors.test.ts` now asserts that a gig's hotspot is
       * in the room the gig says it is in.
       */
      ...gigSpots('street'),
      { id: 'wall', era: '*', x: 0.6, y: 0.745, w: 0.09, act: 'wall-writing', verb: 'look', labelHe: 'הכתובת על הקיר' },
      /**
       * שלושה מבטים שהיו כתובים ושום דבר לא פתח (כלל 78).
       *
       * `alley-look`, `kiosk-look` ו-`street-night-1991` ישבו ב-`DIALOGUE` בלי `act`, בלי
       * `talk` ובלי `goto` שמצביע עליהן — כלומר שלוש יצירות כתיבה שאיש לא יכול היה לקרוא.
       * שתי הראשונות הן הרחוב מסתכל על עצמו ולכן הן `'*'`: הסמטה והקיוסק נמצאים שם בכל שנה.
       * השלישית היא ליל 11.3.1991 בלבד, אחרי שריקת הפתיחה — הרחוב בלילה קצר יותר מהרחוב
       * ביום, וזה נכון רק בלילה.
       *
       * `gaze` ולא `look`: אלה אינם חפצים שנוגעים בהם אלא כיוונים שמביטים בהם, וזה ההבדל
       * שהפועל עושה בשורת הבקשה.
       */
      { id: 'alley-view', era: '*', x: 0.52, y: 0.79, w: 0.06, act: 'alley-look', verb: 'gaze', labelHe: 'לעבר הסמטה' },
      { id: 'kiosk-view', era: '*', x: 0.25, y: 0.79, w: 0.06, act: 'kiosk-look', verb: 'gaze', labelHe: 'לעבר הקיוסק' },
      {
        id: 'street-night-1991',
        era: '1991',
        x: 0.7,
        y: 0.8,
        w: 0.07,
        act: 'street-night-1991',
        verb: 'gaze',
        labelHe: 'ברחוב, בלילה',
        // TIP_OFF ב-`content/chapter1991.ts` הוא 20:00. המספר כתוב כאן ולא מיובא כדי
        // שקובץ העולם לא יתלה את עצמו בפרק אחד — וזו הסיבה היחידה.
        when: { afterMinute: 20 * 60 },
      },
      { id: 'poster-1990', era: '1990', x: 0.82, y: 0.82, w: 0.05, act: 'poster-1990', verb: 'look', labelHe: 'המודעה על העמוד' },
      /**
       * (Director V3 §12, 25.9.2026) 1993, the finals — getting north is a thing in the
       * street: Michel's coach with its one seat on the Wednesday (`g2-choose`), and on the
       * decisive day the cousin's car Ofir is standing by (`g4-ofir`).
       */
      // A7 — the page Amit tore out of the paper, taken from his hand (`amit-a7`)
      { id: 'a7-page', era: 'a7-week', x: 0.43, y: 0.84, w: 0.06, act: 'amit-a7', verb: 'take', labelHe: 'העמוד שעמית מחזיק', when: { notFlag: 'a7:knows' }, priority: 5 },
      { id: 'g2-coach', era: '1993-galil', x: 0.14, y: 0.84, w: 0.1, act: 'g2-choose', verb: 'enter', labelHe: 'להסעה של מישל — מקום אחד', when: { all: [{ flag: 'life:galil:d2' }, { notFlag: 'g2:chose' }, { notFlag: 'life:galil:d3' }] }, priority: 4 },
      { id: 'g4-car', era: '1993-galil', x: 0.72, y: 0.84, w: 0.1, act: 'g4-ofir', verb: 'enter', labelHe: 'לאוטו של הבן דוד', when: { all: [{ flag: 'life:galil:d4' }, { notFlag: 'g4:decided' }] }, priority: 4 },
      /**
       * 2010-teddy · D05 (LIFE 90-D) — התוכנית ליד הרכב של אולי היא לוגיסטיקה שעושים, לא
       * משפט: הרשימה על הגג (מי עולה למקום האחרון), הכסף ביד של אולי (כרטיס ודלק), ועמית —
       * איך חוזרים. כל אחד נדלק כשהקודם נעשה (`chapter2010double.ts`).
       */
      { id: 'd10-roster', era: '2010-teddy', x: 0.2, y: 0.84, w: 0.08, act: 'd10-roster', verb: 'take', labelHe: 'הרשימה של אולי, על הגג של הרכב', when: { all: [{ flagIs: { flag: 'd10:mode', value: 'venue' } }], none: [{ flag: 'd10:seated' }, { flag: 'd10:plan' }] }, priority: 5 },
      { id: 'd10-pay', era: '2010-teddy', x: 0.32, y: 0.83, w: 0.08, act: 'd10-pay', verb: 'hold', labelHe: 'לתת לאולי — כרטיס ודלק', when: { all: [{ flag: 'd10:seated' }], none: [{ flag: 'd10:paid' }, { flag: 'd10:plan' }] }, priority: 5 },
      { id: 'd10-promise', era: '2010-teddy', x: 0.62, y: 0.82, w: 0.08, act: 'd10-promise', verb: 'hold', labelHe: 'עמית — איך חוזרים', when: { all: [{ flag: 'd10:paid' }], none: [{ flag: 'd10:plan' }] }, priority: 5 },
      /**
       * delta 91 — two things Ofir brings to the street. The white shirt of his brother's,
       * folded on the fence beside where he stands (`act-friend-shirt`, in the chapters he
       * stands here); and Asaf's rolled stencil against the kiosk wall (`act-wall-stencil`).
       * Both are the CREATOR/ULTRAS slices' asks (`content/performedMissions.ts`).
       */
      { id: 'friend-shirt', era: ['1993-cup', '1996-army', '1998-laces', '1999-cup'], x: 0.6, y: 0.83, w: 0.05, act: 'act-friend-shirt', verb: 'take', labelHe: 'החולצה שאופיר הביא, על הגדר' },
      { id: 'wall-stencil', era: ['1998-laces', '1999-cup', '2000-title', '2000-double'], x: 0.2, y: 0.83, w: 0.06, act: 'act-wall-stencil', verb: 'take', labelHe: 'הקרטון המגולגל ליד הקיוסק' },
      // The pole the whole near side of the street hangs off — stickers, a scrap of a
      // torn notice, and the one place a child would stop and read something.
      { id: 'pole', x: 0.82, y: 0.82, w: 0.05, act: 'street-pole', verb: 'look', labelHe: 'העמוד' },
      {
        id: 'coin',
        x: 0.47,
        y: 0.83,
        w: 0.05,
        act: 'gutter-coin',
        verb: 'take',
        labelHe: 'משהו נוצץ',
        when: { notFlag: 'found:coin' },
        priority: 3,
      },
    ],
    exits: [
      {
        id: 'home',
        x: 0.0,
        y: 0.705,
        w: 0.085,
        h: 0.155,
        to: 'home',
        spawn: 'fromStreet',
        labelHe: 'הביתה',
        light: { x: 0.008, y: 0.44, w: 0.066, h: 0.3, tone: 'inside' },
        // 900, like the kiosk and the alley. Three hundred was the only door on this
        // street a passing step could fall through, and it is the door the whole
        // neighbourhood is arranged around: leaning left on the pavement put you back in
        // the flat before you had walked a body's width.
        dwellMs: 900,
      },
      {
        id: 'kiosk',
        /**
         * רדוד, כמו פי הסמטה — the doorway sits at the BACK of the pavement.
         *
         * Six doors open off sixteen hundred pixels of street and the child is a hundred
         * and eighty tall, so a full-height zone on each of them turns a walk east into a
         * row of drains: you cannot pass the kiosk on the way to the alley without being
         * pulled into the kiosk. The alley mouth already solved this — "you go up to it,
         * or you press the button" — and every door on this street now follows it.
         * Walking ALONG the pavement passes them; turning INTO one, or pressing the
         * button, enters. (5.9.2026, found by the robot that plays a fresh life.)
         */
        /**
         * 6.9.2026 — moved onto the kiosk it is the door of. It sat at 0.235–0.335, which
         * is the right half of the counter plus three and a half percent of blank wall
         * east of it: you could stand clear of the shop and be in the shop. The awning in
         * the painting runs 0.145–0.30 and the counter under it 0.185–0.29, so that is
         * where the door is now.
         */
        x: 0.185,
        y: 0.705,
        w: 0.105,
        h: 0.055,
        to: 'kiosk',
        spawn: 'fromStreet',
        labelHe: 'לקיוסק',
        light: { x: 0.19, y: 0.42, w: 0.115, h: 0.32, tone: 'inside' },
        // A shop is somewhere you STOP, so its door takes a moment of standing still.
        // Walking past a kiosk on your way east must never put you inside it.
        dwellMs: 900,
      },
      {
        id: 'pitch',
        // Shallow on purpose: the alley mouth sits at the BACK of the band, so a child
        // walking the pavement never falls into it. You go up to it, or you press the
        // button. A back alley you enter by accident is not a back alley.
        x: 0.425,
        y: 0.705,
        w: 0.08,
        h: 0.05,
        to: 'pitch',
        spawn: 'fromStreet',
        labelHe: 'למגרש השכונתי',
        light: { x: 0.425, y: 0.44, w: 0.07, h: 0.3, tone: 'inside' },
        dwellMs: 900,
      },
      {
        /**
         * בית הספר — the shopfront under the awning, east of the pole (0.786–0.860).
         *
         * Maor photographed this door on 6.9.2026 and drew a red box around where it
         * belongs. He was right twice over. The gate used to sit at 0.62–0.69, which in
         * this painting is the middle of a solid concrete wall — he sent the shot with
         * the marker floating on bare render and wrote "הדלת היא בתוך הקיר". It was also
         * tagged `era: '1991'`, so the one gate a child walks to every weekday of his life
         * existed in one chapter.
         *
         * Both are fixed here. The x and w are read off his own rectangle, measured back
         * to the painting by cross-correlating the phone frame against `street90.png`
         * (`scripts/life/where-is-that.py`): his box lands on 0.7859–0.8595, and the
         * doorway under the near awning is inside it. And it is a door in every era,
         * because a school is.
         */
        id: 'school',
        x: 0.786,
        y: 0.705,
        w: 0.074,
        h: 0.055,
        to: 'schoolyard',
        spawn: 'fromStreet',
        labelHe: 'לחצר בית הספר',
        light: { x: 0.79, y: 0.5, w: 0.066, h: 0.26, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        /**
         * מרכז תל אביב — the turning in the gap east of the wall (0.725–0.783).
         *
         * This is the same gap the hall used to be down, and that is the point. Maor,
         * 6.9.2026: "דלת ל'מרכז תל אביב' — שתוביל לאלנבי. באלנבי צריכה להיות הדלת
         * ל'אוסישקין' ודלת 'בלומפילד'." A boy from this neighbourhood does not walk to
         * Ussishkin street; he walks into town, and the town is what carries him north.
         * So the turning keeps its geography and loses its lie: it goes to Allenby, and
         * Allenby has the hall.
         *
         * No `when` flag on it. The hall was a secret until Efi named it — a corner of
         * your own city is not, and gating it would only hide the map from a child who
         * lives here. The discovery moved with the hall: the door out of Allenby to
         * Ussishkin is the one that waits for `life:knows:hall`.
         */
        id: 'centre',
        x: 0.725,
        y: 0.705,
        w: 0.058,
        h: 0.055,
        to: 'allenby',
        spawn: 'fromSouth',
        labelHe: 'למרכז תל אביב',
        light: { x: 0.728, y: 0.5, w: 0.052, h: 0.26, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        id: 'route',
        x: 0.945,
        y: 0.705,
        w: 0.055,
        h: 0.155,
        to: 'route',
        spawn: 'fromStreet',
        labelHe: 'לדרום תל אביב',
        light: { x: 0.935, y: 0.52, w: 0.065, h: 0.4, tone: 'daylight' },
        dwellMs: 420,
        priority: 2,
        // You cannot follow a crowd you have not noticed. Either Kobi told you there is a
        // match, or Ofir did — otherwise east is just a street, and the child says so.
        needs: { flag: 'knows:match' },
        // 1990: the table told him there is a match before he had control. East is open.
        needsByEra: { '1990': null, '1990s': null, '2000s': null },
        blockedHe: 'לאן? אתה בכלל לא יודע מה קורה שם היום.',
      },
      /**
       * Three doors that exist in one chapter each. They are not geography — the central
       * bus station, Ramat Gan and Hatikva are a bus ride away — they are the WAY a
       * chapter leaves the neighbourhood, and a beat may also carry the player there. A
       * door is still drawn, because a room the player can only be teleported into is a
       * room he can never choose to go back to.
       */
      {
        // 2006 נוספה ב-21.9.2026: `H04` הוא *"נקודת מפגש לנסיעה"*, וזו התחנה. הדלת
        // הזאת היא הדרך היחידה לשם, ו-`life:worldlines` דיווח על `ROOM_ORPHANED`
        // בעשרה קווי חיים ברגע שהביט נכתב ולפני שהדלת נפתחה — בדיוק מה שהוא קיים
        // בשבילו (כלל 75: ביט בחדר שאי אפשר להגיע אליו לא ירוץ לעולם).
        // 2017-distance — `K03` עברה לכאן מבלומפילד הסגור: ב-2017 משחק בית הוא אוטובוס.
        id: 'busStation',
        // 2023/2025 — מי שגר שם חוזר לדירה דרך התחנה והנמל; 2026 — הרציף של הסיום, גם בחזרה
        // 1999-basket נוספה 23.9.2026: `seed-hall` נוסע עכשיו צפונה מהתחנה במקום לאולם.
        era: ['1996-army', '1999-basket', '2006-home', '2017-distance', '2023-abroad', '2025-abroad', '2026-finale'],
        x: 0.872,
        y: 0.705,
        w: 0.06,
        h: 0.155,
        to: 'bus-station',
        spawn: 'start',
        labelHe: 'לתחנה המרכזית',
        light: { x: 0.876, y: 0.52, w: 0.06, h: 0.38, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        id: 'ramatGan',
        era: ['1999-cup', '2000-double'],
        x: 0.872,
        y: 0.705,
        w: 0.06,
        h: 0.155,
        to: 'ramat-gan',
        spawn: 'start',
        labelHe: 'לרמת גן, לגמר',
        light: { x: 0.876, y: 0.52, w: 0.06, h: 0.38, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        id: 'hatikva',
        era: '2000-title',
        x: 0.872,
        y: 0.705,
        w: 0.06,
        h: 0.155,
        to: 'hatikva',
        spawn: 'start',
        labelHe: 'לשכונת התקווה',
        light: { x: 0.876, y: 0.52, w: 0.06, h: 0.38, tone: 'daylight' },
        dwellMs: 900,
      },
      /**
       * ------------------------------------------ היציאה מהשכונה, 2007–2025 ----
       *
       * אותו פתח (0.872) שדרכו יוצאים לתחנה, לרמת גן ולשכונת התקווה — **הדרך שבה פרק
       * יוצא מהשכונה**, ובכל פרק היא מובילה למקום אחר. החדרים שנבנו מהציורים של 21.9.2026
       * מקבלים אותו בשנים שלהם; אף שנה לא מחזיקה שניים באותו פתח (`tests/life-rooms-2000`).
       */
      {
        id: 'hallNew',
        era: ['2007-key', '2009-up'],
        x: 0.872,
        y: 0.705,
        w: 0.06,
        h: 0.155,
        to: 'hall-new',
        spawn: 'start',
        labelHe: 'לאולם האימונים',
        light: { x: 0.876, y: 0.52, w: 0.06, h: 0.38, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        id: 'driveIn',
        era: ['2015-newhall', '2024-home'],
        x: 0.872,
        y: 0.705,
        w: 0.06,
        h: 0.155,
        to: 'drive-in',
        spawn: 'start',
        labelHe: 'לדרייב אין',
        light: { x: 0.876, y: 0.52, w: 0.06, h: 0.38, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        id: 'community',
        era: ['2007-table', '2007-registered', '2012-five', '2016-crisis', '2023-tournament'],
        x: 0.872,
        y: 0.705,
        w: 0.06,
        h: 0.155,
        to: 'community-room',
        spawn: 'start',
        labelHe: 'לחדר הקהילה',
        light: { x: 0.876, y: 0.52, w: 0.06, h: 0.38, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        id: 'office',
        era: '2025-owner',
        x: 0.872,
        y: 0.705,
        w: 0.06,
        h: 0.155,
        to: 'office',
        spawn: 'start',
        labelHe: 'למשרד',
        light: { x: 0.876, y: 0.52, w: 0.06, h: 0.38, tone: 'daylight' },
        dwellMs: 900,
      },
    ],
  },

  // --------------------------------------------------------------------- kiosk ----
  {
    id: 'kiosk',
    titleHe: 'הקיוסק',
    art: 'kiosk',
    // the two evenings at the kiosk are painted as evenings
    // 27.9.2026: the same counter across three decades (kiosk00/10/20 — same camera, checked by
    // overlay) — until then 1986's kiosk stood in every chapter up to 2026
    artByEra: { '1995-sinai': 'kioskNight', '1999-basket': 'kioskNight', '2000s': 'kiosk00', '2010s': 'kiosk10', '2020s': 'kiosk20' },
    // Repainted 3.9.2026, and the old one was not a worse painting of this place — it was
    // a painting of a DIFFERENT place. `kiosk` has always been an interior the child walks
    // into, and the art was a shopfront seen from the pavement, so the backdrop and the
    // scene disagreed about where the player was standing. This is the inside: the
    // counter, the scale and the till, shelves of boxes, the ice-cream chest, and the
    // doorway back out to the street. It is mirrored at ingest so that doorway is on the
    // right, where this scene's exit has always been.
    /**
     * הדלפק הוא הסרגל — the counter is what this room is measured against.
     *
     * Maor photographed the fault: the counter was several times the size of the man
     * behind it, which is the same sentence upside down — the PEOPLE were half the size
     * the room says they are. At the size the game draws this painting the counter
     * measures 205px and a shop counter is about 1.05m, so a metre here is 0.315 of the
     * frame: a man 0.55, a child of eight 0.40. Every figure in the room was multiplied
     * by 1.85 to get there, which is why the numbers are not round.
     */
    band: { far: 0.80, near: 0.985 },
    size: { far: 0.37, near: 0.41 },
    metre: 0.3154,
    /**
     * מה שעומד בקיוסק — dressing that knows which decade it is.
     *
     * Maor, 5.9.2026: bottles in the kiosk and in the bottle job so it feels real, and
     * things in nice places that can change by decade. So the room is measured off its
     * own metre (1 m = 0.315 of the frame, the counter) and dressed three times:
     *
     *  · **the eighties** — the deposit crate is a real thing standing on the floor:
     *    four green bottles somebody brought back this morning, the ones the child will
     *    pick up off the pavement in his own job.
     *  · **the nineties** — fewer empties, and the newspaper stand by the door, which is
     *    when a kiosk stopped being only a counter.
     *  · **the two-thousands** — the stand stays, the glass goes. Nobody was returning
     *    bottles by then, and a room that does not change in fourteen years is a room
     *    nobody lives in.
     *
     * Sizes are real: a bottle is 26 cm (0.082 of the frame), the stand is 1.4 m (0.441),
     * and the width follows from the file's own aspect. No number here was chosen by eye.
     */
    layers: [
      // The gap between Rafi (0.30) and whoever is at the counter (0.50): the only strip of
      // this floor nobody stands on, which is why the empties end up there.
      { art: 'propBottle', era: '1980s', x: 0.37, y: 0.834, w: 0.019, depth: 0.834, foot: true },
      { art: 'propBottle', era: '1980s', x: 0.395, y: 0.836, w: 0.019, depth: 0.836, foot: true },
      { art: 'propBottle', era: '1980s', x: 0.42, y: 0.832, w: 0.019, depth: 0.832, foot: true },
      { art: 'propBottleFull', era: '1980s', x: 0.445, y: 0.838, w: 0.019, depth: 0.838, foot: true },
      { art: 'propBottle', era: '1990s', x: 0.385, y: 0.835, w: 0.019, depth: 0.835, foot: true },
      { art: 'propBottleFull', era: '1990s', x: 0.415, y: 0.831, w: 0.019, depth: 0.831, foot: true },
      // (21.9.2026) The newspaper rack that stood here in the 1990s and 2000s is gone: it
      // carried The Sun — "HASTA LA VISTA TAXMAN", "BRITAIN BOUNCES BACK AT LAST" — in a
      // kiosk in south Tel Aviv. The papers of this kiosk are the ones painted on its own
      // counter, in Hebrew.
    ],
    ambience: 'day',
    stuckHe: 'הדלפק מלפנים. לצאת — ימינה.',
    stuckByEra: {
      '1986': 'רפי מחכה. לצאת — ימינה.',
      '1990': 'אופיר ועמית פה. הרחוב — ימינה, ומשם מזרחה.',
      'a2-alley': 'רפי מאחורי הדלפק, והחבר׳ה בחוץ. לצאת — ימינה.',
      'a4-shirt': 'רפי מאחורי הדלפק. לצאת — ימינה.',
    },
    spawns: { fromStreet: { x: 0.74, y: 0.93, facing: 'left' } , start: { x: 0.74, y: 0.93, facing: 'left' } },
    actors: [
      /*
       * (delta 92, upgrade plan §2.3) A2's kiosk is Rafi's and nobody else's. Ofir and Amit
       * used to stand here, beside the bread, which meant the day's dilemma — the kiosk OR
       * the alley — was staged in one room and the world told a different story from the
       * chapter. They are on the pitch now, choosing teams; Efi is not in A2 at all.
       */
      { id: 'rafi-a2', era: 'a2-alley', figure: 'oldMan', x: 0.3, y: 0.9, size: 0.535, nameHe: 'רפי מהקיוסק', talk: 'rafi-a2', sway: 0.004 },
      { id: 'rafi-a4', era: 'a4-shirt', figure: 'oldMan', x: 0.3, y: 0.9, size: 0.535, nameHe: 'רפי מהקיוסק', talk: 'rafi-a4', sway: 0.004 },
      /*
       * (delta 93) קובי בא — not a person who waits to be tapped. He is in the kiosk only from
       * the moment the thirty is on the counter (`a4:kobi-came`, raised by the beat that
       * walks him in from the street door), and he has no `talk`: the beat speaks for him.
       */
      { id: 'kobi-a4-kiosk', era: 'a4-shirt', figure: 'kobi-side', x: 0.8, y: 0.92, size: 0.32, nameHe: 'קובי', when: { flag: 'a4:kobi-came' } },
      // 1996/97, the fifth day: Rafi passing on two messages he did not want to carry (§19)
      { id: 'rafi-a5', era: '1996-army', figure: 'oldMan', x: 0.3, y: 0.9, size: 0.535, nameHe: 'רפי מהקיוסק', talk: 'a5-kiosk', sway: 0.004, when: { flag: 'life:army:d5' } },
      {
        id: 'shopkeeper',
        // 4.9.2026: the kiosk owner drawn at last — heavy, grey moustache, white shirt over
        // a vest, reading glasses pushed up. For a week he was one of the September adults
        // because the old `oldMan` was a chibi cut from the first concept board.
        figure: 'oldMan',
        x: 0.3,
        y: 0.9,
        size: 0.535,
        nameHe: 'רפי מהקיוסק',
        talk: 'kiosk-man',
        sway: 0.004,
      },
      // Before one o'clock he is in here spending his own money on the paper. Catch him
      // at the counter and the information costs you nothing; catch him in the street an
      // hour later and he has already read it and wants something for it.
      {
        id: 'amit-kiosk',
        figure: 'amit',
        x: 0.66,
        y: 0.9,
        size: 0.403,
        nameHe: 'עמית',
        talk: 'amit-kiosk',
        flip: true,
      },
      // ---- 1990 ----
      {
        id: 'shopkeeper-1990',
        era: '1990',
        figure: 'oldMan-arms',
        x: 0.3,
        y: 0.9,
        size: 0.535,
        nameHe: 'רפי מהקיוסק',
        talk: 'kiosk-man-1990',
        sway: 0.004,
      },
      {
        id: 'shopkeeper-1993',
        era: '1993-cup',
        figure: 'oldMan-arms',
        x: 0.5,
        y: 0.8,
        size: 0.535,
        nameHe: 'רפי מהקיוסק',
        talk: 'rafi-1993',
        sway: 0.003,
      },
      // 19.4.1993, late: Ofir on the rail by the kiosk, as if he never moved (`after-ofir-1993`)
      { id: 'ofir-after-1993', era: '1993-cup', figure: 'ofir90-3q', x: 0.78, y: 0.86, size: 0.535, nameHe: 'אופיר', talk: 'after-ofir-1993', flip: true, when: { all: [{ flag: 'after:walk' }, { notFlag: 'walked:home' }] } },
      // the winter of 1996/97 at the kiosk: the court sits again, with a lawyer in it
      { id: 'shopkeeper-army', era: '1996-army', figure: 'oldMan-3q', x: 0.5, y: 0.8, size: 0.535, nameHe: 'רפי מהקיוסק', talk: 'a4-winter', sway: 0.003 },
      { id: 'amit-army', era: '1996-army', figure: 'amit90-point', x: 0.3, y: 0.84, size: 0.544, nameHe: 'עמית', talk: 'a4-winter', when: { flag: 'life:army:d4' } },
      { id: 'freddy-army', era: '1996-army', figure: 'adultA2', x: 0.72, y: 0.85, size: 0.551, nameHe: 'פרדי', talk: 'a4-freddy', when: { flag: 'life:army:d4' }, flip: true },
      { id: 'liron-army', era: '1996-army', figure: 'adultB2', x: 0.86, y: 0.86, size: 0.561, nameHe: 'לירון', talk: 'a4-liron', when: { flag: 'life:army:d4' }, flip: true },
      { id: 'yaron-army', era: '1996-army', figure: 'adultA4', x: 0.14, y: 0.86, size: 0.561, nameHe: 'ירון', talk: 'yaron-base', when: { flag: 'life:army:d4' } },
      // the same kiosk, June 1994 and August 1995: the court of the poster
      { id: 'shopkeeper-sinai', era: '1995-sinai', figure: 'oldMan-arms', x: 0.5, y: 0.8, size: 0.535, nameHe: 'רפי מהקיוסק', talk: 'rafi-sinai', sway: 0.003 },
      { id: 'ofir-sinai', era: '1995-sinai', figure: 'ofir90-arms', x: 0.28, y: 0.84, size: 0.479, nameHe: 'אופיר', talk: 'ofir-sinai' },
      { id: 'amit-sinai', era: '1995-sinai', figure: 'amit90', x: 0.74, y: 0.85, size: 0.551, nameHe: 'עמית', talk: 'amit-sinai', flip: true, when: { flag: 'life:sinai:d2' } },
      { id: 'freddy-sinai', era: '1995-sinai', figure: 'adultA2', x: 0.86, y: 0.86, size: 0.561, nameHe: 'פרדי', talk: 'freddy-sinai', flip: true, when: { flag: 'life:sinai:d2' } },
      // (V3 §12) the third voice of the court: the young man in the door, a year on
      { id: 'fan-sinai', era: '1995-sinai', figure: 'adultB4', x: 0.12, y: 0.86, size: 0.54, nameHe: 'אוהד צעיר', talk: 's2-fan', when: { all: [{ flag: 'life:sinai:d2' }, { notFlag: 's2:done' }] } },
      // 1999 — the kiosk at night: Gate 5 as work before it is iconography
      { id: 'asaf-seed', era: '1999-basket', figure: 'asaf-back', x: 0.5, y: 0.84, size: 0.551, nameHe: 'אסף', talk: 'seed-voice-asaf' },
      { id: 'melamed-seed', era: '1999-basket', figure: 'adultA1', x: 0.3, y: 0.85, size: 0.551, nameHe: 'מלמד', talk: 'seed-voice-melamed' },
      { id: 'michel-seed', era: '1999-basket', figure: 'michel99-3q', x: 0.72, y: 0.85, size: 0.551, nameHe: 'מישל', talk: 'seed-voice-michel', flip: true },
      { id: 'dudu-seed', era: '1999-basket', figure: 'adultA5', x: 0.86, y: 0.86, size: 0.551, nameHe: 'דודו', talk: 'seed-voice-dudu', flip: true },
      { id: 'omer-seed', era: '1999-basket', figure: 'hermesh', x: 0.14, y: 0.86, size: 0.551, nameHe: 'עומר', talk: 'seed-voice-omer' },
      { id: 'ofir-kiosk', era: '1990', figure: 'ofir90', x: 0.6, y: 0.92, size: 0.479, nameHe: 'אופיר', talk: 'ofir-1990', flip: true },
      { id: 'amit-kiosk', era: '1990', figure: 'amit90', x: 0.5, y: 0.95, size: 0.479, nameHe: 'עמית', talk: 'amit-1990' },
    ],
    hotspots: [
      /**
       * שני סימנים בקיוסק, חורף 1997 — a half-empty shelf and a column of numbers.
       *
       * Stage B §7 B6 asks that the club's financial danger be SEEN rather than explained.
       * Two of its seven signs are in here, and neither states a fact: a row of stock that
       * did not arrive, and a page of a newspaper with some of the figures in brackets.
       */
      { id: 'sign-shelf', era: '1996-army', x: 0.24, y: 0.86, w: 0.09, act: 'sign-shelf', verb: 'look', labelHe: 'המדף', when: { flag: 'life:army:d4' } },
      { id: 'sign-paper', era: '1996-army', x: 0.47, y: 0.9, w: 0.08, act: 'sign-paper', verb: 'look', labelHe: 'העיתון על הדלפק', when: { flag: 'life:army:d4' } },
      { id: 'sign-till', era: '1996-army', x: 0.36, y: 0.88, w: 0.08, act: 'sign-till', verb: 'talk', labelHe: 'הקופה', when: { all: [{ flag: 'life:army:d4' }, { lacksSticker: 'tikva' }] } },
      /**
       * 1999 — הדף על הארגז (Director V3 §12). The list is written by walking to the five
       * around the crate (`seed-voice-*`), and closed here, on the crate, once three of them
       * are on it. Between מלמד (0.3) and אסף (0.5), clear of both.
       */
      /**
       * (Director V3 §12, 25.9.2026) 1994/95 at the counter — the radio of the cup final,
       * leaned into (`s1-radio`), and a year later Amit's newspaper, folded on the counter at
       * the table (`s2-paper`): one of the three voices the court is assembled from.
       */
      /**
       * (V3 §12) 2000 — the counter holds two of the afternoons: Rafi's apron for a double
       * shift (`d-kiosk-afternoon` → `chore:story:shift-00`), and the minibus notebook with
       * the final's tickets under a rubber band (`d-ticket-afternoon`, bought).
       */
      { id: 'd-shift', era: '2000-double', x: 0.55, y: 0.92, w: 0.08, act: 'd-kiosk-afternoon', verb: 'take', labelHe: 'הסינר של רפי — משמרת', when: { all: [{ flag: 'd:opened' }, { notFlag: 'd:final' }] }, priority: 5 },
      { id: 'd-ticket', era: '2000-double', x: 0.66, y: 0.9, w: 0.06, act: 'd-ticket-afternoon', verb: 'buy', labelHe: 'כרטיס והסעה לגמר — 60 ₪', when: { all: [{ flag: 'd:opened' }, { notFlag: 'd:final' }, { notFlag: 'd:pick1:ticket' }] }, priority: 5 },
      { id: 'radio-sinai', era: '1995-sinai', x: 0.42, y: 0.88, w: 0.07, act: 's1-radio', verb: 'play', labelHe: 'הרדיו על הדלפק', when: { all: [{ flag: 'life:sinai:d1' }, { notFlag: 's1:heard' }, { notFlag: 'life:sinai:d2' }] }, priority: 5 },
      { id: 'paper-sinai', era: '1995-sinai', x: 0.64, y: 0.9, w: 0.06, act: 's2-paper', verb: 'take', labelHe: 'העיתון המקופל על הדלפק', when: { all: [{ flag: 'life:sinai:d2' }, { notFlag: 's2:done' }] }, priority: 5 },
      { id: 'seed-page', era: '1999-basket', x: 0.4, y: 0.87, w: 0.05, act: 'seed-page', verb: 'take', labelHe: 'הדף על הארגז', when: { all: [{ flag: 'seed:hall' }, { notFlag: 'seed:list' }] }, priority: 5 },...gigSpots('kiosk'), 
      /**
       * החולצה בחלון, ואז חנות האוהדים.
       *
       * A4 is the chapter about counting a tin three times, so the shirt has to be VISIBLE
       * in the room the counting is for: it hangs at the left of Rafi's window from the
       * summer of 1985, and it is the same painting the card holds up when it is finally
       * bought. From 1990 the same rail is a shop, one hotspot per chapter because a
       * `Condition` cannot ask which year it is but an `era` can — and each of those opens
       * the conversation generated for that year's rail (`lib/life/shirts.ts`).
       */
      { id: 'shirt-rail', era: 'a4-shirt', x: 0.17, y: 0.88, w: 0.12, act: 'rafi-a4', verb: 'buy', labelHe: 'חולצה מהקולב', priority: 4, prop: { key: 'shirtVisa86', size: 0.227, at: { x: 0.185, y: 0.44 } } },
      /**
       * (Director V3 §12, 25.9.2026) A2 — the bread is a thing on the counter you pick up,
       * not a sentence Rafi says: the same conversation (`rafi-a2`, the clock on the wall
       * behind him decides which line), reached by the hand. Between Rafi (0.3) and the
       * counter (0.55), and only while the errand is open.
       */
      { id: 'bread-a2', era: 'a2-alley', x: 0.43, y: 0.9, w: 0.07, act: 'rafi-a2', verb: 'take', labelHe: 'הלחם של רחל', when: { all: [{ flag: 'a2:errand' }, { notFlag: 'a2:bread' }] }, priority: 5 },
      /**
       * החנות עברה — the rail hung in this window until 5.9.2026 and it has moved upstairs.
       *
       * One shirt in a kiosk window is 1985 and it is perfect: a boy counts a tin for the
       * thing he can see. A rail of fourteen kits in a kiosk window is a shop pretending
       * to be a kiosk. So `a4-shirt` keeps its single shirt, above, and everything from
       * 1990 is in `fan-shop` — a room, with a door, and a man who works there.
       */
      { id: 'bottles-a4', era: 'a4-shirt', x: 0.82, y: 0.88, w: 0.1, act: 'bottles-a4', verb: 'take', labelHe: 'הבקבוקים ליד הפח', when: { none: [{ flag: 'a4:bottles-all' }, { flag: 'a4:bottles-paid' }] } },{ id: 'counter', era: '*', x: 0.55, y: 0.92, w: 0.14, act: 'kiosk-counter', verb: 'look', labelHe: 'הדלפק' },
      /**
       * JOURNALIST · `PROOF_REPORT` — הסטנד, ומה מחליטים לידו.
       *
       * The newspaper stand against the left wall is dressing this room has carried since the
       * nineties, and it is the only object in the game that is a published page. That is the
       * right place for `route-proof-report`, whose whole subject is what you do with a story
       * half of which came from somebody who heard it from somebody: the rack is what it will
       * look like tomorrow either way, and the witness the mission names is *"מי שקרא את זה"*.
       *
       * Two chapters are left out and neither for taste. `1996-army` stands ירון at 0.14 and
       * `1999-basket` stands עומר there — a person is `priority: 4` and swallows a hotspot
       * inside his own body, so in those two years the prompt would be his and this rack
       * would be unreachable while looking perfectly placed in the source.
       */
      {
        id: 'proof-report',
        era: ['1997-basket', '1998-laces', '1999-cup', '2000-title', '2000-double'],
        x: 0.11,
        y: 0.86,
        w: 0.1,
        act: 'route-proof-report',
        verb: 'look',
        labelHe: 'הסטנד של העיתונים',
      },
      /**
       * OWNER · `PROOF_BUSINESS` — סוף חודש על הדלפק.
       *
       * Rafi's counter is the one business this life ever stands behind — `crates-kiosk` is
       * the work, `רפי` is the man, and the trust axis between them is already a number. So
       * the month somebody has to close is closed here, at the left end of the counter, clear
       * of the till (0.52), the crates (0.62) and the counter's own look (0.55).
       *
       * `1996-army` is left out: that chapter's winter already owns this stretch of counter
       * with three signs of its own (`sign-shelf` 0.24, `sign-till` 0.36, `sign-paper` 0.47),
       * and a seventh thing to reach between them is where a prompt starts flickering. It
       * costs the route nothing — `OWNER.practice` is `minAge: 21` and 1996 is his eighteenth
       * year, so the two proofs it wants could never have come from there anyway.
       */
      {
        id: 'proof-business',
        era: ['1997-basket', '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double'],
        x: 0.38,
        y: 0.92,
        w: 0.09,
        act: 'route-proof-business',
        verb: 'look',
        labelHe: 'הגיליון על הדלפק',
      },
      /**
       * JOURNALIST · `VERIFY_REPORT` — המדף, ולא הדלפק.
       *
       * `route-proof-report` יושב על 0.11 ושואל מה עושים עם סיפור; זה יושב על 0.24 ושואל
       * שאלה קודמת ופשוטה בהרבה — **האם זה בכלל נכון**. שני עיתונים על מדף אחד הם כל
       * המנגנון: שני מקורות שלא מסכימים, ורבע שעה כדי להחליט מי מהם צדק. הקיוסק הוא המקום
       * היחיד בעולם הזה שיש בו יותר מעיתון אחד באותו רגע.
       */
      smallAction('VERIFY_REPORT', 'route-verify-report', { x: 0.24, y: 0.88, w: 0.09 }, 'look', 'שני העיתונים על המדף')],
    exits: [
      {
        id: 'out',
        x: 0.9,
        y: 0.7,
        w: 0.1,
        h: 0.3,
        to: 'street',
        spawn: 'fromKiosk',
        labelHe: 'לרחוב',
        light: { x: 0.9, y: 0.6, w: 0.1, h: 0.38, tone: 'daylight' },
        dwellMs: 240,
      },
    ],
  },

  // --------------------------------------------------------------------- pitch ----
  {
    id: 'pitch',
    titleHe: 'המגרש',
    art: 'pitch',
    // 5.9.2026: Stage A plays in the alley itself — the improvised goal, the lane, the washing
    artByEra: { A: 'alley' },
    // Repainted 3.9.2026, for the same reason the street was repainted a day earlier: the
    // old pitch had TEN BOYS painted onto it, and every one of them was frozen there for
    // the whole afternoon. A place with people painted into it cannot have people in it.
    // This one is empty earth between a wall and a fence, and the children on it are the
    // game's — which is also why the band goes back nearly to the far wall now, and why
    // the size range widens with it: a pitch is the one place in this chapter with real
    // depth in it, and a child at the far end should read as a child at the far end.
    band: { far: 0.56, near: 0.945 },
    /**
     * 1.68×, not 2.31×, and the pitch is the screen this was found on.
     *
     * A walk band is a ground plane, and a ground plane has a scale ratio the camera
     * decides. 0.13→0.30 is a 2.3× ramp across a band that fills a third of the frame,
     * which is not perspective — it is a zoom, and it is why crossing this yard read as
     * being pushed towards the camera rather than as walking. Every other scene in this
     * game sits between 1.27× and 1.68×; the yard is the deepest space in the chapter and
     * it now sits at the top of that range instead of half again beyond it.
     */
    size: { far: 0.17, near: 0.285 },
    metre: 0.2375,
    ambience: 'park',
    stuckHe: 'הכדור באמצע. חזרה לרחוב — שמאלה.',
    spawns: { fromStreet: { x: 0.13, y: 0.84, facing: 'right' } , start: { x: 0.13, y: 0.84, facing: 'right' } },
    // מ-2000: מגרש קטן עם דשא סינתטי, ולא חצר האבנים — ציור אחר, רצפה אחרת (`rooms2000.ts`)
    repaints: [PITCH_2000S, PITCH_2000],
    actors: [
      {
        id: 'efi',
        figure: 'efi',
        // Pushed to the back of the new band on purpose. The pitch is the one place in
        // this chapter with real depth in it, and three people standing on the same line
        // is what makes a deep band look like a shallow one.
        x: 0.26,
        y: 0.74,
        size: 0.28,
        nameHe: 'אפי',
        talk: 'efi-hall',
        sway: 0.01,
      },
      { id: 'amit', figure: 'amit', x: 0.83, y: 0.87, size: 0.26, nameHe: 'עמית', talk: 'pitch-kids', flip: true },
      /**
       * A2 · spring 1984 (delta 92, plan §2.3) — the alley's two captains, on the ground the
       * teams are chosen on, so walking here IS one side of the afternoon's dilemma. The
       * teams filling up (`a2:full`) is the clock you can see.
       */
      { id: 'ofir-a2', era: 'a2-alley', figure: 'ofir', x: 0.6, y: 0.92, size: 0.3, nameHe: 'אופיר', talk: 'alley-a2', sway: 0.009 },
      { id: 'amit-a2', era: 'a2-alley', figure: 'amit', x: 0.83, y: 0.87, size: 0.26, nameHe: 'עמית', talk: 'alley-a2', flip: true },
      // Ofir moves here at twenty to two. The street he was leaning on is empty by then,
      // and a player who goes looking for him where he was is a player learning that
      // people have afternoons of their own.
      {
        id: 'ofir-pitch',
        figure: 'ofir',
        x: 0.6,
        y: 0.92,
        size: 0.3,
        nameHe: 'אופיר',
        talk: 'ofir-pitch',
        sway: 0.009,
      },
    ],
    hotspots: [...gigSpots('pitch'), 
      {
        id: 'ball',
        x: 0.5,
        y: 0.81,
        w: 0.1,
        act: 'pitch-ball',
        verb: 'play',
        labelHe: 'הכדור',
        // The old `propBall` was not a ball. It was a 126×100 mis-cut of a CHILD with
        // his arm raised, and it has been standing on this pitch at seven percent of
        // the frame — a tiny malformed person where the football should be — since
        // the day the scene was written. Found by looking at a screenshot.
        prop: { key: 'propFootball', size: 0.042 },
        priority: 3,
      },
    ],
    exits: [
      {
        id: 'back',
        x: 0.0,
        y: 0.6,
        w: 0.06,
        h: 0.38,
        to: 'street',
        spawn: 'fromPitch',
        labelHe: 'לרחוב',
        light: { x: 0.0, y: 0.55, w: 0.05, h: 0.42, tone: 'daylight' },
        dwellMs: 300,
      },
    ],
  },

  // --------------------------------------------------------------------- route ----
  //
  // The road east, repainted to `docs/life/route-backdrop-spec.png`: an empty avenue
  // with crowd barriers stacked against the far pavement, bunting overhead, and — over
  // the rooftops on the right — the first sight of the ground. Two lattice floodlight
  // pylons and the curve of one stand, and nothing else of it. That restraint is the
  // point: the gate is the next scene and the inside is two after that, so this frame
  // may only promise.
  {
    /**
     * דרום תל אביב — the road out of the neighbourhood, named for where it is.
     *
     * It was called "בדרך לבלומפילד", which describes one errand rather than a place, and
     * the door into it said "מזרחה, אחרי האנשים", which describes one afternoon. Maor,
     * 6.9.2026, listing what the street's doors should be: «"דרום תל אביב" (מה שנקרא כרגע
     * "לך מזרחה" / "בדרך לבלומפילד")». A quarter you can be in on a Tuesday for no reason
     * is worth more than a corridor to a stadium, and this is that quarter.
     */
    id: 'route',
    titleHe: 'דרום תל אביב',
    art: 'approach',
    band: { far: 0.69, near: 0.875 },
    size: { far: 0.185, near: 0.3 },
    metre: 0.2308,
    ambience: 'dusk',
    // The one arrival card that is not the stadium. Stepping out of your own
    // neighbourhood for the first time deserves a frame of its own, and it is the same
    // street from further east — a place you know, seen from somewhere you have never
    // stood (brief §33).
    arrival: { art: 'streetEast', ms: 3200, flag: 'saw:road' },
    arrivalByEra: { '1990': null, '1990s': null, '2000s': null },
    stuckHe: 'כולם הולכים מזרחה. פשוט אל תעצור.',
    stuckByEra: { '1990': 'שער 7 בקצה הדרך. אבא כבר שם.' },
    // The road fills up. A coach parks halfway along it once the ground starts pulling
    // people in, and the barrier the stewards drag out is there from the moment the
    // child first walks this way — one of them is a clock, the other is a place.
    // (21.9.2026) The coach and the barrier were engravings (see `PROP` in `art.ts`); the road
    // fills with people instead (`ambient1986.ts`), which is what it was for.
    layers: [],
    spawns: { fromStreet: { x: 0.085, y: 0.78, facing: 'right' }, fromGround: { x: 0.915, y: 0.78, facing: 'left' } , start: { x: 0.085, y: 0.78, facing: 'right' } },
    actors: [
      { id: 'fan1', figure: 'adultA1', x: 0.135, y: 0.76, size: 0.26, nameHe: 'אוהד', talk: 'route-fan' },
      { id: 'fan2', figure: 'barryRadio-3q', x: 0.45, y: 0.735, size: 0.24, nameHe: 'בארי', talk: 'route-veteran' },
      { id: 'fan3', figure: 'youngA4', x: 0.78, y: 0.8, size: 0.28, nameHe: 'אוהד', talk: 'route-fan' },
      // ---- 1990: a man walking with a radio to his ear, and Kobi beside you on the way home ----
      { id: 'radio-walker', era: '1990', figure: 'adultA5', x: 0.5, y: 0.8, size: 0.32, nameHe: 'אוהד עם רדיו', talk: 'radio-walker-1990', sway: 0.03 },
      { id: 'kobi-walk', era: '1990', figure: 'kobi90-side', x: 0.84, y: 0.8, size: 0.3, nameHe: 'קובי', talk: 'kobi-found-1990', flip: true, when: { flag: 'found:kobi' } },
      /**
       * בארי בתחנה — the old fan the boy met on this road in 1986, waiting for a bus that is
       * always late, and the memory game (`act-busstop-memory`) is what he does with the wait.
       *
       * From 1991 to the double, beside the shelter rather than in it: 0.7 belongs to the
       * shelter's own hotspots (`shelter`, `proof-travel`). Not in 1990, whose road is the
       * walk home with Kobi and a radio (and whose rows are that chapter's alone —
       * `tests/life-1990.test.ts`), and not in 1996, when he is at gate seven with Kobi
       * (`barry-gate7`) — one man, one room, one chapter. In 1986 he is `fan2` above,
       * walking, and the same game is a choice in his conversation there.
       * No new art (owner, 21.9.2026): the body is `barry96`, the one that is his.
       * 24.9.2026: it is not — Maor's canonical Barry is the slim man of `barryToday`
       * (`barry-3q-green`), so every Barry stands on `barryRadio-3q` (`LEGACY_POSE`).
       */
      {
        id: 'barry-shelter',
        era: actEra('busstop-memory', ['1986', '1990', '1996-army']),
        figure: 'barryRadio-3q',
        x: 0.61,
        y: 0.72,
        nameHe: 'בארי',
        talk: 'act-busstop-memory',
        sway: 0.003,
      },
    ],
    hotspots: [
      ...gigSpots('route'),
      { id: 'banner', era: '*', x: 0.2, y: 0.715, w: 0.09, act: 'route-banner', verb: 'look', labelHe: 'השלט' },
      { id: 'stream-1990', era: '1990', x: 0.5, y: 0.86, w: 0.12, act: 'route-stream-1990', verb: 'look', labelHe: 'הנהר האדום' },
      // The street family's reward: a gap between two buildings that everybody who grew
      // up here uses and nobody who did not would see.
      {
        id: 'shortcut',
        x: 0.31,
        y: 0.7,
        w: 0.05,
        act: 'route-shortcut',
        // (V3 §12) a gap you squeeze through, not a picture you look at
        verb: 'enter',
        labelHe: 'לרווח בין הבתים',
        priority: 2,
      },
      { id: 'shelter', x: 0.7, y: 0.71, w: 0.08, act: 'route-shelter', verb: 'look', labelHe: 'תחנת האוטובוס' },
      /**
       * TRAVELLER · `PROOF_TRAVEL` — אותה תחנה, כשאתה זה שאמר לכולם לבוא.
       *
       * The same painted shelter the eight-year-old looks at in `shelter` above, at the age
       * where a shelter is where you count people. `route-proof-travel` opens on a coach that
       * stopped with two passengers who have no fare home and one who cannot manage the steps
       * — an organiser's problem, and this is the only painted place in the world a group
       * waits in. The platform at התחנה המרכזית would have been the better picture and it is
       * one chapter wide (`street/busStation` is `era: '1996-army'`, and in the later years
       * that same door slot is Ramat Gan and שכונת התקווה), so `TRAVELLER.practice` — two
       * proofs in two chapters — could never have been reached from there.
       *
       * The road is empty of people after 1991 (`fan1..3` are 1986, the radio walker is 1990)
       * and its only other reach here is `banner` at 0.2, so 0.7 is clear in every one of
       * these years.
       */
      {
        id: 'proof-travel',
        era: ADULT_CHAPTERS,
        x: 0.7,
        y: 0.72,
        w: 0.09,
        act: 'route-proof-travel',
        verb: 'look',
        labelHe: 'התחנה, לפני הנסיעה',
      },
    ],
    exits: [
      {
        /**
         * The road home, and it is a ROAD: full height on the near line, because you walk
         * back the way you came. It shares this corner of the frame with the avenue above
         * it and never with its footprint — the avenue is a turning at the far line, this
         * is the pavement at the near one.
         */
        id: 'back',
        x: 0.0,
        y: 0.78,
        w: 0.055,
        h: 0.10,
        to: 'street',
        spawn: 'fromRoute',
        labelHe: 'חזרה לרחוב',
        dwellMs: 500,
      },
      {
        /**
         * מרכז תל אביב — the avenue that opens north out of this junction (0.026–0.124).
         *
         * Maor sent the frame with a red box drawn round it on 6.9.2026: "כאן צריכה להיות
         * הדלת ל'מרכז תל-אביב' שמשם יגיעו גם לאוסישקין". The box was measured back to
         * `approach.png` by correlating his phone frame against the painting, and it lands
         * on the one thing in this picture that is genuinely a way somewhere: a street
         * receding four blocks with balconies down both sides and a vanishing point at
         * 0.10. Everything else here is a wall, a barrier or a stadium.
         *
         * Shallow, at the far line, like every turning in this game: you go UP to it. The
         * road home is at the near line under it and the two never fight for a step.
         */
        id: 'centre',
        x: 0.026,
        y: 0.69,
        w: 0.098,
        h: 0.055,
        to: 'allenby',
        spawn: 'fromSouth',
        labelHe: 'למרכז תל אביב',
        light: { x: 0.03, y: 0.42, w: 0.09, h: 0.3, tone: 'daylight' },
        dwellMs: 900,
      },
      {
        id: 'ground',
        x: 0.945,
        y: 0.69,
        w: 0.055,
        h: 0.185,
        to: 'bloomfield-outside',
        spawn: 'fromRoute',
        labelHe: 'לאצטדיון',
        light: { x: 0.935, y: 0.5, w: 0.065, h: 0.4, tone: 'daylight' },
        dwellMs: 300,
        priority: 2,
        needsByEra: shutNeeds(),
        blockedByEra: shutBlocked(),
      },
    ],
  },

  // --------------------------------------------------------------------- אלנבי ----
  //
  // אלנבי פינת קינג ג'ורג' פינת נחלת בנימין — the junction the map now turns on.
  //
  // Maor opened it on 6.9.2026 and gave it a job: "בעמוד הרחוב… דלת ל'מרכז תל אביב' —
  // שתוביל לאלנבי. באלנבי צריכה להיות הדלת ל'אוסישקין' ודלת 'בלומפילד'." Until that
  // morning the world was a star with the neighbourhood at the middle: every place in Tel
  // Aviv was one door off the child's own street, including a sports hall six kilometres
  // north. With this corner in it the map is a city — you go into town, and town carries
  // you to the rest of it, which is how anybody who grew up in south Tel Aviv moved.
  //
  // The painting is his, delivered the same day, and it tells its own decade: a record
  // shop with vinyl in the window and wooden chairs at the café in the eighties; CDs,
  // cassettes and red plastic chairs in the nineties; a phone shop in the two-thousands.
  // Nobody reads a caption. The building, the green door at number 96, the archway through
  // the block and the awning never move, so the corner stays the same corner for twenty
  // years while everything sold on it changes — which is the whole point of a place you
  // come back to.
  {
    id: 'allenby',
    titleHe: 'אלנבי',
    art: 'allenby',
    artByEra: {
      '1990': 'allenby90', '1991': 'allenby90', '1990s': 'allenby90',
      '1993-cup': 'allenby90', '1993-galil': 'allenby90', '1995-sinai': 'allenby90',
      '1996-army': 'allenby90', '1997-basket': 'allenby90', '1998-laces': 'allenby90',
      '1999-basket': 'allenby90', '1999-cup': 'allenby90',
      '2000-title': 'allenby2000', '2000-double': 'allenby2000', '2000s': 'allenby2000',
      // 27.9.2026 — the same corner, a decade on (allenby20: same camera, checked by overlay)
      '2010s': 'allenby20', '2020s': 'allenby20',
    },
    /**
     * המדרכה היא הרצפה — the band is the pavement, and it stops at the kerb.
     *
     * This is a straight-on elevation: the buildings stand on 0.705 and the kerb runs at
     * 0.82, so a hundred and fifteen thousandths of the frame is the entire walkable
     * world. Letting the near line down into the road would double the band and put a
     * child in the traffic, and it would also blow the scale up — at 0.90 an adult is
     * three-quarters of the glass.
     *
     * `metre` is measured off the painting rather than guessed: the café door is 2.05 m
     * and is drawn from 0.415 to 0.700, so a metre at the building line (0.705) is 0.139 of
     * the frame. The horizon in this shot sits at 0.60 and ground scale goes as (y − 0.60).
     *
     * The far line is 0.725 and not the building line, and that is a camera limit rather
     * than a taste: standing a figure right at the horizon ramps him 2.2× across a band a
     * tenth of the frame deep, which no lens does, and `tests/life-walk.test.ts` says so.
     * At 0.725 against 0.82 the ramp is 1.76. A metre at the far line is then 0.1655, the
     * taper is 0.568, and a metre at the near line is 0.2914 — so the child is drawn 0.379
     * and an adult 0.51 of the frame on the kerb, which is the kiosk's register.
     */
    band: { far: 0.725, near: 0.82 },
    size: { far: 0.2152, near: 0.3788 },
    metre: 0.2914,
    ambience: 'day',
    // The first time only: a card that says where this is, because a corner nobody names
    // is a corridor. `arrival` is how `route` announced itself and how this does too.
    arrival: { art: 'allenby', ms: 3000, flag: 'saw:allenby' },
    stuckHe: 'אלנבי. הקשת באמצע עוברת דרך הבניין. שמאלה — חזרה לשכונה.',
    stuckByEra: {
      '1990': 'חנות התקליטים פתוחה, בית הקפה מלא. הקשת באמצע — משם ממשיכים צפונה.',
      '1991': 'מהקשת ממשיכים לאוסישקין. שמאלה הביתה, ימינה ליפו.',
    },
    layers: [
      /**
       * הארגז — his own crate, delivered 6.9.2026, standing where the shop put it out.
       *
       * It has been on the art-required list since delta 27 and it arrived as six passes
       * of one frame so the eighteen bottle wells could be keyed properly (see
       * `scripts/life/ingest-allenby-2026-09-06.py`). It is here because a pavement with
       * something ON it is a pavement somebody works on.
       */
      { art: 'propCrate', era: '*', x: 0.452, y: 0.792, w: 0.048, depth: 0.792, foot: true },
      { art: 'propCrate', era: '*', x: 0.213, y: 0.7455, w: 0.031, depth: 0.7455, foot: true, flip: true, alpha: 0.96 },
    ],
    spawns: {
      // in from the south — the neighbourhood, or the road out of it
      fromSouth: { x: 0.085, y: 0.79, facing: 'right' },
      // back down through the archway
      fromNorth: { x: 0.62, y: 0.782, facing: 'left' },
      // back from the ground
      fromGround: { x: 0.925, y: 0.79, facing: 'left' },
      // out of the phone shop (Liron's workshop, 2006) and down from the newsroom
      fromShop: { x: 0.262, y: 0.8, facing: 'right' },
      fromDesk: { x: 0.77, y: 0.8, facing: 'left' },
      // back out of the ticket office — on the pavement beside its door, never inside the
      // door zone itself (0.398–0.470), which is rule 41's infinite bounce
      fromTickets: { x: 0.500, y: 0.785, facing: 'right' },
      start: { x: 0.085, y: 0.79, facing: 'right' },
    },
    actors: [
      {
        /**
         * The man in the shop doorway. He is not a supporter, he is a shopkeeper, and the
         * shirts are the rail at the back — which is exactly what a shop like this was on
         * this street: records at the front, and whatever else sold.
         */
        id: 'records',
        // `era` is not optional in the way it looks: `inEra` falls back to '1986', so an
        // actor without one exists in exactly one chapter. He is here in all of them.
        era: '*',
        figure: 'manCap',
        x: 0.318,
        y: 0.752,
        nameHe: 'המוכר בפינה',
        talk: 'allenby-records',
        sway: 0.004,
      },
      {
        /**
         * The city's other half, standing by a café table on ground that belongs to
         * neither. This is the one place in the game where that conversation happens
         * without a gate between them, and that is why he is here and not at one.
         *
         * He is drawn as an ordinary man in a white shirt and nothing tells you which club
         * he follows until he says it. That is deliberate twice over: this game does not
         * put the other colours on the glass, and a rivalry you can see coming from across
         * the street is not the one worth writing.
         */
        /**
         * אפי בקשת (pass 28.9.2026, brief §3 S2 — "intersection אחד") — A3's walk has one
         * real fork, and it is this corner: tickets, the shop, the café, the arch. Efi
         * waits under the arch and steps out to meet the boy who comes near.
         */
        id: 'efi-a3-arch',
        era: 'a3-hall',
        figure: 'efi',
        x: 0.655,
        y: 0.785,
        size: 0.31,
        nameHe: 'אפי',
        talk: 'efi-a3-arch',
        flip: true,
        sway: 0.006,
        when: { all: [{ flag: 'life:efi:met' }], none: [{ flag: 'a3:inside' }] },
        initiative: { reachM: 2.2, when: { none: [{ flag: 'a3:arch' }] } },
      },
      {
        id: 'rival',
        // not in the two chapters where Liron — who stands on the same body — works on this
        // corner (the kiosk of 1996, the phone shop next door in 2006): one man in a white
        // shirt at the café and his twin behind the counter ten metres away is a clone
        era: chaptersWhere((id) => id !== '1996-army' && id !== '2006-home'),
        figure: 'adultB2',
        x: 0.862,
        y: 0.768,
        nameHe: 'הגבר מהשולחן',
        talk: 'allenby-rival',
        flip: true,
      },
    ],
    hotspots: [
      // The blue enamel plate on the corner: 96. The one thing in the frame that says where
      // in the city this is.
      { id: 'sign', era: '*', x: 0.352, y: 0.735, w: 0.05, act: 'allenby-sign', verb: 'look', labelHe: 'המספר על הפינה', priority: 2 },
      // The window: sleeves in the eighties, jewel cases in the nineties, handsets after.
      { id: 'window', era: '*', x: 0.14, y: 0.74, w: 0.11, act: 'allenby-window', verb: 'look', labelHe: 'החלון של החנות' },
      // The tables under the awning, which are where the city sits and talks about it.
      { id: 'cafe', era: '*', x: 0.795, y: 0.745, w: 0.12, act: 'allenby-cafe', verb: 'look', labelHe: 'בית הקפה' },
      /**
       * OWNER · `WORK_COMMITMENT` — המשמרת, וכמה צעדים מהחלון של החנות.
       *
       * `shop-<chapter>` על 0.263 הוא העבודה המזדמנת (`gigs.ts`): שעתיים, תשלום, ואף אחד
       * לא רשם כלום. זה אחר: **משמרת שהובטחה**, שעות שנרשמות על לוח, ושם שנשאר עליו.
       * ההבדל הזה הוא כל מה ש-`adult_shift` אומר, ולכן הוא צריך דלת משלו על אותה מדרכה.
       *
       * y על 0.78 ולא על 0.9 כמו ברוב החדרים: הרצועה כאן היא המדרכה (0.725–0.82), והכביש
       * מתחתיה אינו רצפה.
       */
      smallAction('WORK_COMMITMENT', 'route-work-commitment', { x: 0.48, y: 0.78, w: 0.1 }, 'enter', 'לחנות, למשמרת שהבטחת'),
      /**
       * חנות האוהדים — the doorway on the corner, and the only one in the game.
       *
       * Maor, 6.9.2026: "הדלת ל'חנות אוהדים' צריכה להיות במסך אלנבי." It settles two
       * things at once. It was a DOOR to a room for one delta and the room was bare, so it
       * opens the shop SCREEN instead (`components/life/ShopCard.tsx`) — his call, and the
       * right one: buying a shirt is a rail and a pocket, not a room to walk about in. And
       * it was in the wrong room entirely: these hotspots were sitting in the KITCHEN's
       * list, four hundred lines up, so the supporters' shop opened from beside the sink
       * and from nowhere else.
       *
       * One hotspot per chapter, because a `Condition` cannot ask which year it is, and
       * the rail's contents are the year.
       */
      ...SHOP_CHAPTERS.map((chapter) => ({
        id: `shop-${chapter}`,
        era: chapter,
        x: 0.263,
        y: 0.74,
        w: 0.062,
        act: shopId(chapter),
        verb: 'look' as const,
        labelHe: 'חנות האוהדים',
        priority: 4,
      })),
      ...gigSpots('allenby'),
    ],
    exits: [
      {
        /**
         * שמאלה, לאורך אלנבי — the way you came, and the way home.
         *
         * The street runs out of both sides of this frame and the whole band is the
         * pavement between them, so these two are edges rather than doorways. The one
         * doorway is the archway in the middle, and it is the one that goes somewhere you
         * cannot see.
         */
        id: 'home',
        x: 0.0,
        y: 0.725,
        w: 0.055,
        h: 0.095,
        to: 'street',
        spawn: 'fromCentre',
        labelHe: 'חזרה לשכונה',
        light: { x: 0.0, y: 0.52, w: 0.05, h: 0.3, tone: 'daylight' },
        dwellMs: 500,
      },
      {
        /**
         * בלומפילד — right, and south-west out of the frame.
         *
         * `saw:road` and not a plain door: the first sight of the floodlight pylons over
         * the rooftops is a designed moment on the road out of the neighbourhood, and a
         * short cut through town that skipped it would spend the moment before it
         * happened. Once you have walked there once, town is the quicker way — which is
         * also true, and is why the shortcut is a reward rather than a route.
         */
        id: 'bloomfield',
        x: 0.945,
        y: 0.725,
        w: 0.055,
        h: 0.095,
        to: 'bloomfield-outside',
        spawn: 'fromRoute',
        labelHe: 'לבלומפילד',
        light: { x: 0.95, y: 0.52, w: 0.05, h: 0.3, tone: 'daylight' },
        dwellMs: 900,
        needs: { flag: 'saw:road' },
        blockedHe: 'משם ממשיכים לאצטדיון. אתה עוד לא יודע את הדרך — לך פעם אחת מהשכונה.',
        /**
         * **`B: null` — הדרך ידועה מאז 1986** (21.9.2026). `saw:road` הוא דגל יום, ולכן בכל
         * פרק אחרי 1986 הקיצור הזה היה נעול עם *"אתה עוד לא יודע את הדרך"* — גם לגבר בן
         * ארבעים וחמש שהלך אליו מאות פעמים. `life:worldlines` מצא את זה כ-`STALE_READ`
         * ב-52 פרקים. שלב A שומר את הרגע המתוכנן; משלב B הדלת פתוחה, חוץ משנות הבנייה.
         */
        needsByEra: { B: null, ...shutNeeds() },
        blockedByEra: shutBlocked(),
      },
      {
        /**
         * קופת הכרטיסים — the green shopfront door, and the reason it is on this corner.
         *
         * Maor, 17.9.2026: *"אני רוצה לייצר משרד כרטיסים בפני עצמו ולא כחלק ממקום קיים,
         * אלא לפתוח מקום חדש."* Before that sentence the subscription office was a door on
         * the gate seven forecourt into the concourse under the stand. The painting he sent
         * with it is an interior with a street through its left-hand doorway and a sign
         * reading **קופת כרטיסים - תל אביב**, so the place it opens onto is town — and town,
         * on this map, is this junction (rule 24's geography, and the whole reason `allenby`
         * exists: "a boy from this neighbourhood does not walk to the Yarkon; he goes into
         * town first, like everybody else").
         *
         * Placed at the green double door under the number 96, which is the one doorway on
         * this elevation that is not already the record shop, the archway or the café. The
         * painted opening runs 0.383–0.470 between its jambs.
         *
         * **והתחום נעצר ב-0.428, כי שם עומד ארגז.** `propCrate` stands at 0.452 with a
         * width of 0.048 — it has been on that pavement since 6.9.2026, placed on a board,
         * outside a door that did not exist yet. `tests/life.test.ts` caught the overlap
         * the first time this door was written full-width, and it was right to: a crate
         * across a doorway is a door the player cannot use (rule 48). So the REACH zone is
         * the door's left half and the crate keeps its corner — the same answer the gate
         * seven office door gave when the cashier stood in it, and the right way round:
         * dressing that was placed by looking does not move for a door placed by typing.
         *
         * `1990s`/`2000s` only, carried over from the door it replaces: the first season
         * ticket in the archive is 90/91, and a door into a room with nothing to do in it
         * is dead content (rule 66).
         */
        id: 'tickets',
        era: ['1990s', '2000s'],
        x: 0.383,
        y: 0.725,
        w: 0.045,
        h: 0.095,
        to: TICKET_OFFICE,
        spawn: 'fromStreet',
        labelHe: 'קופת הכרטיסים',
        // inside, not daylight: this goes INTO a building, and rule 41 keeps daylight for
        // the way out of one. The office's own door back is the daylight half. The GLOW is
        // the whole opening even though the reach zone is half of it — a light says where
        // the door is, and the door is the door.
        light: { x: 0.383, y: 0.40, w: 0.087, h: 0.32, tone: 'inside' },
        // a counter is somewhere you stop, not somewhere you pass — the fan shop's own
        // dwell, for the same reason (rule 41)
        dwellMs: 900,
        priority: 2,
      },
      /**
       * שתי דלתות של 2006 ושל 2025, על הציור של 2000 (`allenby2000`), במקום שבו הן מצוירות:
       * הדלת של חנות הסלולר (0.235–0.29) — מאחוריה הסדנה של לירון, שמתקנת טלפונים ורדיו
       * (*"עכשיו כולם באים עם מספר טלפון"*); ודלת הזכוכית של בית הקפה (0.748–0.79) —
       * המערכת בקומה שמעליו, אותו בית קפה שבו J01 פרסם בפעם הראשונה.
       */
      {
        id: 'cellular',
        era: '2006-home',
        x: 0.235,
        y: 0.725,
        w: 0.055,
        h: 0.045,
        to: 'workshop',
        spawn: 'start',
        labelHe: 'לסדנה של לירון',
        light: { x: 0.24, y: 0.43, w: 0.05, h: 0.28, tone: 'inside' },
        dwellMs: 900,
      },
      {
        // 2012-five — N04: המדרגות למרתף של אותו בניין, לחדר החזרות
        id: 'studio',
        era: '2012-five',
        x: 0.235,
        y: 0.725,
        w: 0.055,
        h: 0.045,
        to: 'rehearsal',
        spawn: 'start',
        labelHe: 'לחדר החזרות, במרתף',
        light: { x: 0.24, y: 0.43, w: 0.05, h: 0.28, tone: 'inside' },
        dwellMs: 900,
      },
      {
        id: 'desk',
        era: ['2006-desk', '2025-owner'],
        x: 0.748,
        y: 0.725,
        w: 0.042,
        h: 0.045,
        to: 'newsroom',
        spawn: 'start',
        labelHe: 'למערכת, מעל בית הקפה',
        light: { x: 0.75, y: 0.48, w: 0.04, h: 0.21, tone: 'inside' },
        dwellMs: 900,
      },
      {
        /**
         * הקשת — the passage through the building, and the way north.
         *
         * This is where the hall's discovery moved to. It used to be a gap in a wall on
         * the child's own street, open from the first frame of the game, which handed a
         * boy in 1984 a sports hall he had no reason to know existed. Efi still names it,
         * the flag is still `life:knows:hall` — only now the turning he is describing is
         * in town, where it is, and it is an archway with steps in it and daylight at the
         * far end rather than a hole in some graffiti.
         *
         * Shallow, at the far line: you go UP to it. Walking the pavement never falls in.
         */
        id: 'ussishkin',
        /**
         * `{ area }` ולא `{ flag: 'life:knows:hall' }` — 17.9.2026, ומאור מצא את זה
         * בכיסא הנכון: *"אני אמור ללכת לאוסישקין ואין בכלל דלת לאוסישקין."*
         *
         * הדגל אומר "הוא היה שם פעם". מה שהדלת שואלת הוא "הוא יכול להיכנס עכשיו", וזה
         * נכון גם כשמישהו לוקח אותו. ההבדל אינו תיאורטי: את הדגל מרימים רק ב-`a3-hall`,
         * ו-`a3-hall` בכלל לא קורה למי שלא התיידד עם אפי ב-`a2-alley` — כלומר חצי ממי
         * שמתחיל חיים הגיע ל-1991, פרק שכל תוכנו ערב אחד באולם הזה, בלי שהמקום קיים על
         * המפה שלו. ושוב ב-1993.
         */
        when: { area: 'ussishkin' },
        x: 0.566,
        y: 0.725,
        w: 0.058,
        h: 0.045,
        to: 'ussishkin-outside',
        spawn: 'fromStreet',
        labelHe: 'לאולם אוסישקין',
        light: { x: 0.57, y: 0.42, w: 0.05, h: 0.3, tone: 'daylight' },
        dwellMs: 900,
      },
    ],
  },

  // -------------------------------------------------------------------- outside ---
  //
  // Gate seven, repainted to `docs/life/gate7-backdrop-spec.png` from Maor's approved
  // 1986 board. Everything in the perimeter is an interaction at the x it is drawn at:
  // the green palisade, the bank of turnstiles, the barred ticket hatch, and the dark
  // portal in the middle. The portal is painted DARK on purpose — the engine lights it
  // from inside, and a doorway that is already bright burns out when the glow lands.
  {
    id: 'bloomfield-outside',
    titleHe: 'בלומפילד — מבחוץ',
    art: 'gate7',
    // 27.9.2026 — gate7Old: the same gate, 2000–2015 (same camera). The rebuilt ground is a
    // `repaints` row and wins over this for the years it stands.
    artByEra: { '2000s': 'gate7Old', '2010s': 'gate7Old' },
    band: { far: 0.8, near: 0.95 },
    // the painted men at the turnstiles are big; a child at 0.2 stood at their knees
    size: { far: 0.23, near: 0.33 },
    metre: 0.2538,
    ambience: 'park',
    // The first sight of the ground: a wide establishing frame of Bloomfield from the
    // street outside — played once, the moment the child first reaches it, then it cuts
    // to the turnstiles. Same mechanism as the road's `streetEast` and the terrace's
    // `reveal`; the arrival is the arrival, not a place you stand.
    arrival: { art: 'ground', ms: 3200, flag: 'saw:ground' },
    arrivalByEra: { '1990s': null, '2000s': null },
    stuckHe: 'תדבר עם מישהו. מישהו פה ייקח אותך פנימה.',
    stuckByEra: { '1990': 'שער 7. אבא אמר ליד העמוד. הקופה — מימין.' },
    /**
     * בלומפילד המחודש — from the reopening on (26.8.2019; see the Bloomfield calendar).
     *
     * `bloomNewPlaza` is a paved square in front of the white shell, shot from a man's eye
     * height, and it was measured off the painting rather than inherited: the plaza meets
     * the fence at 0.645 and a fence of about 2.2 m stands 0.04 of the frame there, which
     * puts the horizon at ≈ 0.615. A 1.75 m man's height on the glass is then
     * (y − 0.615) × 1.75 / 1.6 — 0.366 at the near line 0.95 and 0.137 at the far line
     * 0.74 — so the metre is 0.2094 and the taper 0.373 (against 0.70 under the colonnade,
     * which is a room, not a square). The spawns of the old room all stand on the square.
     *
     * No door into the ground and no gate five: neither the tunnel nor the terrace was
     * painted rebuilt, and a door into a 1986 terrace from a 2019 square is a time machine.
     */
    repaints: [
      {
        in: bloomfieldRebuilt,
        art: 'bloomNewPlaza',
        band: { far: 0.74, near: 0.95 },
        size: { far: 0.1367, near: 0.3664 },
        metre: 0.2094,
        spawns: {
          fromRoute: { x: 0.06, y: 0.87, facing: 'right' },
          fromTunnel: { x: 0.66, y: 0.93, facing: 'left' },
          fromGate5: { x: 0.9, y: 0.88, facing: 'left' },
          fromOffice: { x: 0.66, y: 0.88, facing: 'right' },
          start: { x: 0.22, y: 0.9, facing: 'right' },
        },
        doors: { in: null, gate5: null },
        arrival: { art: 'bloomNewDay', ms: 3200, flag: 'saw:bloomNew' },
        stuckHe: 'אותו שם, מקום אחר. השלטים — לא הזיכרון.',
      },
    ],
    // Outside a ground on a matchday: barriers stacked where the stewards left them, a
    // wall somebody has been fly-posting for twenty years, and — taped up by a hand, not
    // printed by a club — the only line of Hebrew in this frame.
    layers: [
      // (21.9.2026) the stacked barriers and the fly-posted board were engravings; the
      // painting has its own barriers, and the taped-up sign stays
      { art: 'propSign', x: 0.622, y: 0.63, w: 0.048, depth: 0.6, foot: true },
    ],
    // `fromOffice` stands clear of all four doors (0–0.04, 0.45–0.58, 0.715–0.785,
    // 0.93–1.0): a spawn inside the zone you just came through is an infinite bounce,
    // and it existed in three scenes before it was a failing test (rule 41).
    spawns: { fromRoute: { x: 0.06, y: 0.87, facing: 'right' }, fromTunnel: { x: 0.66, y: 0.93, facing: 'left' }, fromGate5: { x: 0.9, y: 0.88, facing: 'left' }, fromOffice: { x: 0.66, y: 0.88, facing: 'right' }, start: { x: 0.22, y: 0.9, facing: 'right' } },
    actors: [
      /**
       * שני האנשים של 1985 — and the reason they were not here until 5.9.2026.
       *
       * `kobi-a5-gate` and `barry-a5` have existed as conversations since Stage A was
       * written and NEITHER COULD BE REACHED: nobody put them in the scene, and the
       * arrival beat ended the chapter in the same breath as the arrival. So the first
       * time a child stands at gate seven with his father, the father was not there.
       *
       * לא בארי — Stage A Director's Cut §21/§53, 6.9.2026: Barry's canonical entry is
       * 1986, Gate 7 (`gate-veteran`). This 1985 figure keeps the `barry-a5` id and its
       * line (nobody is renaming assets over a name change), but the label above his head
       * and in his dialogue box reads generic, matching `chapterStageA.ts`'s demotion.
       */
      /**
       * שני קובי ושני ותיקים עמדו כאן, ואחד מהזוגות היה עודף (16.9.2026).
       *
       * The fix above was applied twice, in two passes, and the second pass did not see
       * the first: the scene carried `kobi-a5` (x 0.42) AND `kobi-a5-gate` (x 0.36) with
       * the SAME conversation, and **two actors both called `barry-a5`** at 0.44 and 0.63.
       * So the first time a child stood at gate seven with his father there were two of
       * his father four hundredths apart and two identical strangers, and one of the
       * strangers was standing inside one of the fathers.
       *
       * A duplicate id is worse than a duplicate body: `aim()` and every lookup that
       * follows resolve by id, so which of the two answers is an accident of array order.
       *
       * The pair kept is the one at 0.36 / 0.44, because those are `kobi-gate7` and
       * `barry-gate7`'s own coordinates eleven years later — the same two men at the same
       * gate in 1985 and in 1996 is a rhyme somebody wrote on purpose.
       */
      { id: 'barry-a5', era: 'a5-first', figure: 'adultA6', x: 0.44, y: 0.91, size: 0.3, nameHe: 'אוהד ותיק', talk: 'barry-a5', sway: 0.003 },
      { id: 'kobi-a5-gate', era: 'a5-first', figure: 'kobi-scarf', x: 0.36, y: 0.9, size: 0.3, nameHe: 'קובי', talk: 'kobi-a5-gate', sway: 0.002 },
      // 16.11.1996 — the two gates. Kobi and Barry at seven; Barry has no figure yet.
      {
        id: 'kobi-gate7',
        era: '1996-army',
        figure: 'kobi90-stand',
        x: 0.36,
        y: 0.9,
        size: 0.29,
        nameHe: 'קובי',
        talk: 'kobi-gate7',
        sway: 0.002,
        // the Saturday in uniform, not the eve: before it his "stay here" would decide a
        // day that had not started yet (V3 recovery — the choice lives on the right day)
        when: { all: [{ flag: 'life:army:d2' }], none: [{ flag: 'life:army:d3' }] },
      },
      {
        id: 'barry-gate7',
        era: '1996-army',
        /**
         * בארי, ולא אדם כלשהו בשער.
         *
         * `barry96` ושבע פוזות נוספות נחתכו, נקלטו ויושבות ב-`FIGURE` וב-`heights.ts`
         * (1.81 מ׳) — ולא הוצבו באף מקום. בארי, שיש לו שם, פנים ותפקיד, צויר בדמות
         * ניצב גנרית בגובה 1.74.
         *
         * (21.9.2026: המשפט שהיה כאן — ששלושת שחקני אפי ב-1991 וב-1993 עומדים על `youngA2`
         * בצדק כי אפי "בן שלוש־עשרה" — היה טעות בחשבון. אפי גדול מפוגי בארבע שנים: בן 17 ו-19.
         * הם עומדים עכשיו על `efi96`.) ושני
         * שחקני `barry-a5` הם "אוהד ותיק" ב-1985, בכוונה בלי שם, שנה לפני הכניסה
         * הקנונית של בארי ב-1986 — לתת להם את הפלייט שלו זה להסגיר אותו מוקדם.
         */
        figure: 'barryRadio-3q',
        x: 0.44,
        y: 0.91,
        size: 0.302,
        nameHe: 'בארי',
        talk: 'barry-gate7',
        flip: true,
        when: { all: [{ flag: 'life:army:d2' }], none: [{ flag: 'life:army:d3' }] },
      },
      { id: 'asaf-laces', era: '1998-laces', figure: 'asaf', x: 0.86, y: 0.9, size: 0.3, nameHe: 'אסף', talk: 'asaf-laces', flip: true, when: { flag: 'l1:after' } },
      // 2.5.1998, the ten minutes (V3 §12): Ofir on the steps, Soko on the pavement with the papers
      { id: 'ofir-ten-98', era: '1998-laces', figure: 'ofir90-arms', x: 0.3, y: 0.88, size: 0.3, nameHe: 'אופיר', talk: 'l1-ten-ofir', when: { all: [{ flag: 'l1:ten' }, { notFlag: 'l1:cut' }] } },
      { id: 'soko-ten-98', era: '1998-laces', figure: 'soko', x: 0.68, y: 0.9, size: 0.29, nameHe: 'סוקו', talk: 'l1-ten-soko', when: { all: [{ flag: 'l1:ten' }, { notFlag: 'l1:cut' }] } },

      {
        // בארי — Gate 7, 1986: his canonical debut (Stage A Director's Cut §21/§53).
        id: 'veteran',
        // his own body from his first appearance — an old man with a shopping bag (`adultB1`)
        // spoke with Barry's face for five years of the game
        figure: 'barryRadio-3q',
        x: 0.17,
        y: 0.88,
        size: 0.24,
        nameHe: 'בארי',
        talk: 'gate-veteran',
        sway: 0.003,
      },
      {
        id: 'ofir-ground',
        figure: 'ofir',
        x: 0.27,
        y: 0.91,
        size: 0.29,
        nameHe: 'אופיר',
        talk: 'ofir-ground',
        when: { bond: { who: 'ofir', min: 40 } },
      },
      { id: 'steward', figure: 'bfSteward', x: 0.62, y: 0.86, size: 0.23, nameHe: 'סדרן', talk: 'steward' },
      { id: 'ticket', figure: 'adultA2', x: 0.7, y: 0.9, size: 0.26, nameHe: 'הקופאי', talk: 'ticket-window', flip: true },
      // The safe way in, and the one the brief insists on (§42): a child goes through a
      // turnstile with a family, in front of a steward, in daylight. Nobody climbs
      // anything. What it costs is the nerve to ask a stranger.
      { id: 'family', figure: 'adultA3', x: 0.8, y: 0.92, size: 0.27, nameHe: 'אבא עם ילד', talk: 'gate-family' },
      { id: 'crowd-a', figure: 'youngB4', x: 0.9, y: 0.94, size: 0.28, nameHe: 'אוהד', talk: 'route-fan', flip: true },
      /**
       * קובי בין היוצאים — the one person who makes `ENDINGS.late` possible.
       *
       * That card has been written since Stage A and nothing could reach it: the only
       * `kobi-found` in the game stands on the terrace INSIDE, so a boy who never got
       * through the turnstile had two endings where the chapter had written three.
       *
       * He is up at the far line of the band on purpose, the same staging note as
       * `kobi-crowd`: small, among the people coming out, and the walk over to him is
       * the ending. `notFlag: 'entry:granted'` keeps him off the screen for the boy who
       * was inside — that Saturday already has its own meeting and its own card.
       */
      {
        id: 'kobi-out-late',
        figure: 'kobi-cheer',
        x: 0.66,
        // on the band's far line: further up the forecourt than the steward at 0.86, so
        // he is behind him rather than beside him, and small among the people coming out
        y: 0.8,
        size: 0.2,
        nameHe: 'קובי',
        talk: 'kobi-out-late',
        flip: true,
        when: { all: [{ flag: 'match:over' }, { notFlag: 'entry:granted' }] },
      },
      // ---- 1990: gate seven is home ----
      { id: 'kobi-gate', era: '1990', figure: 'kobi90-stand', x: 0.62, y: 0.9, size: 0.33, nameHe: 'קובי', talk: 'kobi-gate-1990', flip: true },
      { id: 'steward-1990', era: '1990', figure: 'bfSteward', x: 0.4, y: 0.86, size: 0.3, nameHe: 'סדרן', talk: 'steward-1990' },
      { id: 'ticket-1990', era: '1990', figure: 'adultA2', x: 0.7, y: 0.9, size: 0.32, nameHe: 'הקופאי', talk: 'ticket-window-1990', flip: true },
      { id: 'ofir-ground', era: '1990', figure: 'ofir90', x: 0.33, y: 0.93, size: 0.3, nameHe: 'אופיר', talk: 'ofir-ground-1990' },
      { id: 'vendor-1990', era: '1990', figure: 'adultA6', x: 0.88, y: 0.93, size: 0.34, nameHe: 'מוכר', talk: 'vendor-1990', flip: true },
      // B5 S2 (27.9.2026) — spring 1996 at gate seven: the banner, and the man in the old number seven
      { id: 'fan-gate96', era: '1995-sinai', figure: 'adultB4', x: 0.17, y: 0.9, size: 0.3, nameHe: 'אוהד צעיר', talk: 's3-banner-96', when: { flag: 'life:sinai:d3', none: [{ flag: 's3:g:left' }] } },
      { id: 'seven-gate96', era: '1995-sinai', figure: 'manCap', x: 0.8, y: 0.92, size: 0.3, nameHe: 'אוהד בחולצה ישנה', talk: 's3-seven-96', flip: true, when: { flag: 'life:sinai:d3', none: [{ flag: 's3:g:left' }] } },
    ],
    hotspots: [
      /**
       * ארבעה סימנים בחוץ, חורף 1997 — the shutter, the ticket window, the man doing two
       * jobs, and two men outside an office who stop talking when a boy walks past.
       *
       * The other four of §7 B6's seven. They are hotspots and not a cutscene because the
       * brief's point is that a supporter finds out his club is in trouble by noticing
       * things, in the order he happens to notice them, and never all of them.
       */
      { id: 'sign-window', era: '1996-army', x: 0.2, y: 0.84, w: 0.09, act: 'sign-window', verb: 'look', labelHe: 'חלון המשרד', when: { flag: 'life:army:d4' } },
      { id: 'sign-tickets', era: '1996-army', x: 0.36, y: 0.86, w: 0.09, act: 'sign-tickets', verb: 'talk', labelHe: 'הקופה', when: { flag: 'life:army:d4' } },
      { id: 'sign-two-jobs', era: '1996-army', x: 0.62, y: 0.88, w: 0.09, act: 'sign-two-jobs', verb: 'talk', labelHe: 'הסדרן', when: { flag: 'life:army:d4' } },
      { id: 'sign-creditor', era: '1996-army', x: 0.78, y: 0.85, w: 0.1, act: 'sign-creditor', verb: 'look', labelHe: 'השניים ליד המשרד', when: { flag: 'life:army:d4' } },
      /**
       * 23.11.1996 — **הגדר באמצע** (Director V3 §7 "Between"). The third place to stand,
       * between Kobi at seven (0.36) and the door under the stand (0.93), and it is a place
       * rather than a button in the arrival box. It stands only on the Saturday and only
       * while nothing has been chosen, so it is also a way on after any closed box.
       */
      { id: 'a2-between', era: '1996-army', x: 0.7, y: 0.88, w: 0.08, act: 'a2-between', verb: 'look', labelHe: 'להישאר רגע באמצע, ליד הגדר', when: { all: [{ flag: 'life:army:d2' }, { notFlag: 'a2:chose' }, { notFlag: 'life:army:d3' }] }, priority: 3 },...gigSpots('bloomfield-outside'), 
      // שלושת המבטים של ילד — "קרוסלת ברזל, גבוהה ממך", "אבא עומד שם בכל שבת". הם היו
      // `era: '*'` ונקראו גם לאיש בן שלושים ב-2010; המקום נשאר, המשפטים שייכים לילד.
      { id: 's3-banner', era: '1995-sinai', x: 0.27, y: 0.91, w: 0.08, act: 's3-banner-96', verb: 'take', labelHe: 'המכחול, והבד על הבטון', when: { flag: 'life:sinai:d3', none: [{ flag: 's3:g:left' }, { flag: 's3:g:done' }] }, priority: 5, prop: { key: 'propBannerBlank', size: 0.045, at: { x: 0.28, y: 0.935 } } },
      { id: 's3-watch', era: '1995-sinai', x: 0.66, y: 0.87, w: 0.06, act: 's3-watch-96', verb: 'watch', labelHe: 'להישען על הגדר ולהסתכל', when: { flag: 'life:sinai:d3', none: [{ flag: 's3:g:left' }, { flag: 's3:g:done' }] }, priority: 4 },
      { id: 'gate7', era: ['1980s', '1990s'], x: 0.515, y: 0.86, w: 0.07, act: 'gate-seven', verb: 'look', labelHe: 'שער 7' },
      { id: 'look-gate', era: '1990', x: 0.25, y: 0.9, w: 0.07, act: 'pano:panoGate7', verb: 'gaze', labelHe: 'סביב' },
      { id: 'fence', era: ['1980s', '1990s'], x: 0.08, y: 0.85, w: 0.07, act: 'fence-look', verb: 'look', labelHe: 'הגדר' },
      { id: 'turnstile', era: ['1980s', '1990s'], x: 0.36, y: 0.85, w: 0.09, act: 'gate-turnstile', verb: 'look', labelHe: 'הקרוסלה' },
      /**
       * (Director V3 §12, 25.9.2026) the way in is a place you go through, not a line you
       * are given.
       *
       *  · A5 — the first Saturday in the shirt: the turnstile is pushed once, with Kobi's
       *    hand on your shoulder, and the terrace is behind it (`a5-turnstile`).
       *  · A7 — a week before 24.5.1986 the ground is empty and Ofir's "גם אם צריך לטפס על
       *    הגדר" is a gap under the fence at the third post; a boy who went and looked at it
       *    knows a way in on the Saturday (`life:a7:scouted`).
       *  · 1986 — three ways in that are done with the body: the hatch (buy), the turnstile
       *    beside a father and son (the queue), and the gap — where a steward's hand on the
       *    collar is not the end of the day but the way to the old man at the fence.
       */
      /**
       * (Director V3 §12, 25.9.2026) 2.5.1998 — the ten minutes after the whistle are a
       * place: the steps beside Ofir, the way Asaf's people are going, the middle of the
       * forecourt where a boy can only stand and look. Soko and Ofir stand here too.
       */
      // 2000 — the banner on the ground outside Bloomfield, for the one who has been at five
      { id: 'd-banner', era: '2000-double', x: 0.5, y: 0.9, w: 0.12, act: 'd-gate5-afternoon', verb: 'take', labelHe: 'המכחול, והבד על הרצפה', when: { all: [{ flag: 'd:opened' }, { notFlag: 'd:final' }, { notFlag: 'd:pick1:gate5' }, { gateEver: 'gate5' }] }, priority: 4 },
      { id: 'l1-steps', era: '1998-laces', x: 0.24, y: 0.88, w: 0.07, act: 'l1-ten-ofir', verb: 'sit', labelHe: 'המדרגות, ליד אופיר', when: { all: [{ flag: 'l1:ten' }, { notFlag: 'l1:cut' }] }, priority: 4 },
      { id: 'l1-follow', era: '1998-laces', x: 0.94, y: 0.88, w: 0.06, act: 'l1-ten-asaf', verb: 'exit', labelHe: 'אחרי אסף ואנשיו', when: { all: [{ flag: 'l1:ten' }, { notFlag: 'l1:cut' }] }, priority: 4 },
      { id: 'l1-look', era: '1998-laces', x: 0.46, y: 0.86, w: 0.06, act: 'l1-ten-look', verb: 'watch', labelHe: 'מה שקורה בחוץ — לעמוד ולזכור', when: { all: [{ flag: 'l1:ten' }, { notFlag: 'l1:cut' }] }, priority: 3 },
      { id: 'a5-turnstile', era: 'a5-first', x: 0.36, y: 0.85, w: 0.09, act: 'a5-turnstile', verb: 'enter', labelHe: 'בקרוסלה, דחיפה אחת', when: { all: [{ flag: 'a5:there' }, { notFlag: 'a5:in' }] }, priority: 4 },
      { id: 'a7-gap', era: 'a7-week', x: 0.11, y: 0.86, w: 0.07, act: 'a7-gap', verb: 'enter', labelHe: 'לרווח מתחת לגדר, ליד העמוד השלישי', when: { flag: 'a7:knows-gap' }, priority: 4 },
      { id: 'hatch-1986', era: '1986', x: 0.7, y: 0.88, w: 0.06, act: 'ticket-window', verb: 'buy', labelHe: 'כרטיס לילד, באשנב', when: { notFlag: 'entry:granted' }, priority: 5 },
      { id: 'turnstile-1986', era: '1986', x: 0.36, y: 0.85, w: 0.09, act: 'gate-family', verb: 'enter', labelHe: 'לתור לקרוסלה, ליד אבא וילד', when: { notFlag: 'entry:granted' }, priority: 5 },
      { id: 'gap-1986', era: '1986', x: 0.11, y: 0.86, w: 0.07, act: 'gap-1986', verb: 'enter', labelHe: 'לרווח מתחת לגדר', when: { all: [{ notFlag: 'entry:granted' }, { any: [{ flag: 'life:a7:scouted' }, { personalityAbove: { key: 'streetSmarts', min: 14 } }] }] }, priority: 5 },
      /**
       * ULTRAS · `ORGANIZE_GROUP` — הכיכר שלפני השער, במקום שאנשים עומדים בו וממתינים.
       *
       * `group_delivered` הוא ראיה עם קהל (`audience: 'gate5'`), וזה המקום היחיד בעולם
       * שקהל באמת עומד בו לפני משחק. לא בתוך היציע — שם כבר מאוחר מדי לארגן — ולא בשער 5
       * עצמו, שאינו נגיש בארבעה מהפרקים הבוגרים ולכן לא יכול לשאת שלב שדורש שני פרקים.
       */
      smallAction('ORGANIZE_GROUP', 'route-organize-group', { x: 0.78, y: 0.88, w: 0.1 }, 'take', 'המפגש על עצמך'),
      /**
       * הפרלמנט ליד הגדר — two to four of the chapter's crowd (`parliamentOf`, off the save's
       * seed) arguing about how a goal went in, and the goal game is the argument
       * (`act-parliament`). In front of the barriers by the office door, on the old ground
       * only: not in 1990, when the gate is Kobi's and the vendor stands here, not in 1998,
       * when Asaf does, and not on the rebuilt plaza, which was never measured for it.
       */
      {
        id: 'parliament',
        era: actEra('parliament', ['1990', '1998-laces']).filter((chapter) => !bloomfieldRebuilt(chapter)),
        x: 0.87,
        y: 0.9,
        w: 0.07,
        act: 'act-parliament',
        verb: 'talk',
        labelHe: 'הוויכוח ליד הגדר',
      },
    ],
    exits: [
      {
        /**
         * שער 5 נפתח גם ב-`2012-five` וב-`2023-tournament` (21.9.2026). `N03` ו-`Z03`
         * הן *"מפגש אוהדים"* על מה שמציעים לאוהדים במבנה הבעלות, וזה החדר שהיציע
         * מדבר בו מאז 96 — לא הרחבה של הגאוגרפיה אלא פרקים נוספים שנכנסים בדלת
         * שכבר קיימת.
         */
        id: 'gate5',
        // 2023 is not here: gate five of the old ground was rebuilt with the rest of it
        era: ['1996-army', '1998-laces', '1999-basket', '2012-five', '2001-terrace', '2012-terrace'],
        x: 0.93,
        y: 0.82,
        w: 0.07,
        h: 0.16,
        to: 'gate5',
        spawn: 'start',
        labelHe: 'מתחת ליציע, לשער 5',
        light: { x: 0.92, y: 0.55, w: 0.08, h: 0.4, tone: 'inside' },
        dwellMs: 500,
        priority: 2,
      },
      {
        /**
         * **ליציע החדש** (21.9.2026) — בלומפילד המחודש מבפנים (`bloomNewTerrace`) הגיע, ועד
         * היום הרחבה הייתה חדר בלי פנים: *"No door into the ground"*, כי היציע לא היה מצויר.
         * עכשיו הוא מצויר, והשער בין העמודים (0.615–0.665, על הרחבה) מוביל אליו — רק בשנים
         * שבהן הרחבה היא הרחבה החדשה.
         */
        id: 'stand',
        era: CHAPTERS.map((c) => c.id).filter(bloomfieldRebuilt),
        x: 0.6,
        y: 0.8,
        w: 0.08,
        h: 0.05,
        to: 'bloomfield-inside',
        spawn: 'start',
        labelHe: 'ליציע',
        light: { x: 0.615, y: 0.5, w: 0.05, h: 0.14, tone: 'inside' },
        needsByEra: { '2018-return': { flag: BLOOMFIELD_REOPENED } },
        blockedHe: 'עוד סגור. קודם הרחבה.',
        dwellMs: 700,
      },

      /**
       * ------------------------------------------------------------------------------
       * משרד הכרטיסים כבר לא כאן, ו**זו הכרעה ולא ניקיון** (17.9.2026).
       *
       * A door stood at 0.715 of this frame from 16.9.2026 — the painted double door
       * under the stand — and it went to `ticket-office`, which was then the concourse
       * behind it. Maor asked for the opposite of that arrangement:
       *
       *   *"אני רוצה לייצר משרד כרטיסים בפני עצמו ולא כחלק ממקום קיים, אלא לפתוח מקום
       *   חדש."*
       *
       * So the room moved into town and this door went with it — `allenby` → `tickets`,
       * on the green shopfront under the number 96. Keeping this one as well would have
       * been the softer change and the dishonest one: two doorways a kilometre apart
       * opening into one painting whose own left-hand door shows a street.
       *
       * **Nothing dangles and nothing dead-locks.** The room keeps exactly one way in and
       * one way out, `street → centre → allenby → tickets` reaches it in every chapter that
       * sells a card, and `npm run life:deadends` walks that graph per chapter. What the
       * ground keeps is the thing it always had and that this door was never the same as:
       * `ticket-window` at 0.70, the matchday hatch — one game, today, cash.
       *
       * `fromOffice` stays in this scene's spawn table and is now reached by nothing. It
       * is left because a spawn is a measured point on a painting, this frame has not
       * moved, and the day a chapter wants the concourse back it is the coordinate that
       * was checked against all four doors. Deleting it would cost that and save nothing.
       * ------------------------------------------------------------------------------
       */

      {
        id: 'back',
        x: 0.0,
        y: 0.8,
        w: 0.04,
        h: 0.15,
        to: 'route',
        spawn: 'fromGround',
        labelHe: 'חזרה',
        dwellMs: 600,
      },
      {
        id: 'in',
        x: 0.45,
        y: 0.8,
        w: 0.13,
        h: 0.13,
        to: 'bloomfield-tunnel',
        spawn: 'start',
        labelHe: 'פנימה, בשער 7',
        when: { flag: 'entry:granted' },
        /**
         * An adult with a ticket walks in. The 1996 chapter keeps him outside on purpose
         * (the gates are the scene); every later evening the turnstile is just a door.
         *
         * **ו-`a5-first` הצטרף לרשימה ב-17.9.2026, אחרי שהוא נמצא סגור מאז שנכתב.**
         * `entry:granted` הוא הפאזל של 24.5.1986 — כרטיס, הוותיק, משפחה בסבסוב — ו-28.9.1985
         * לא כתב לעצמו אף אחד משלושתם: זה היום שאבא לוקח אותו, וכל הפרק בנוי סביב זה. המנעול
         * פשוט **עבר בירושה** מ-1986 לחדר משותף, וזו המחלקה בדיוק שבגללה `needsByEra`
         * ו-`whenByEra` קיימים (כלל 54: "מנעול המפתח של 1986 הוחל על 1990 במשך שבוע").
         *
         * מה שזה עלה, ואיש לא ראה: הביט `a5-in` יורה ב-`bloomfield-tunnel`, ולכן לא ירה
         * מעולם. הדרך היחידה ל-`a5-close` נשארה הביט של השעון, שמרים `a5:late` **לפני**
         * שהוא פותח את השיחה — אז כל משחק של הפרק נגמר ב"התחיל בלעדיך", וארבעת הסופים
         * האחרים, שהם מה ש-a4 קונה, לא נראו בעיני איש.
         */
        whenByEra: { 'a5-first': null, '1998-laces': null, '1999-cup': null, '2000-title': null, '2000-double': null, '2010-anthem': null },
        light: { x: 0.455, y: 0.55, w: 0.125, h: 0.28, tone: 'inside' },
        dwellMs: 260,
        priority: 3,
      },
    ],
  },

  // --------------------------------------------------------------------- tunnel ---
  {
    id: 'bloomfield-tunnel',
    titleHe: 'המנהרה',
    art: 'corridor',
    // `corridor` was a placeholder from the day this scene was written: a dim interior
    // that stood in for a tunnel because there was no tunnel. On 3.9.2026 it became one —
    // the mouth of the players' tunnel, the light at the end of it, and a full stand
    // beyond — and the band had to move with it, because 0.6 put the child THROUGH the
    // opening and standing on the pitch. The concrete under his feet starts at 0.76.
    band: { far: 0.76, near: 0.985 },
    // 1.79×, and it stays: a tunnel is a genuinely deep space seen down its own axis, and
    // this is the one frame in the game where the vanishing point is dead centre.
    size: { far: 0.2, near: 0.358 },
    metre: 0.2754,
    ambience: 'tunnel',
    stuckHe: 'קדימה, לכיוון האור.',
    spawns: { start: { x: 0.5, y: 0.95 } },
    actors: [],
    hotspots: [
      /**
       * (Director V3 §12, 25.9.2026) A5 — "אם אתה מאבד אותי — פה, ליד הברזל הזה." The rail
       * at the mouth of the tunnel is the place Kobi named, and holding it is the kick-off:
       * the first push of the terrace, a shout or two hands on the iron (`a5-kickoff`).
       */
      { id: 'a5-iron', era: 'a5-first', x: 0.28, y: 0.84, w: 0.09, act: 'a5-kickoff', verb: 'hold', labelHe: 'את הברזל שאבא אמר', when: { all: [{ flag: 'a5:in' }, { notFlag: 'a5:closed' }] }, priority: 5 },
    ],
    exits: [
      {
        id: 'up',
        // At the MOUTH now, not out on the grass: the opening is the exit, and the child
        // reaches it by walking to the back of the band rather than by leaving it.
        x: 0.36,
        y: 0.72,
        w: 0.28,
        h: 0.06,
        to: 'bloomfield-inside',
        spawn: 'start',
        labelHe: 'אל האור',
        light: { x: 0.4, y: 0.52, w: 0.2, h: 0.24, tone: 'daylight' },
        dwellMs: 120,
        priority: 3,
      },
      {
        id: 'back',
        x: 0.0,
        y: 0.84,
        w: 0.07,
        h: 0.16,
        to: 'bloomfield-outside',
        spawn: 'fromTunnel',
        labelHe: 'חזרה החוצה',
        dwellMs: 700,
      },
    ],
  },



  // --------------------------------------------------------------------- inside ---
  {
    id: 'bloomfield-inside',
    titleHe: 'בלומפילד',
    art: 'stand',
    // The most important repaint in the delivery, and the one that was most obviously
    // wrong before it. `stand` was an ILLUSTRATED AERIAL of the whole bowl — a map, drawn
    // from somewhere no eight-year-old has ever been — and the child stood at 86 minutes
    // on a drawing with no ground in it and nothing to hold onto. This is the terrace at
    // his own eye level: concrete underfoot, a crash barrier across the frame, and
    // somebody's red-and-white scarf knotted round it. The `rail` hotspot below has been
    // labelled המעקה since the scene was written; there is finally a railing there.
    // Measured off the repainted terrace (5.9.2026): the lowest tread sits at 0.747 and
    // the top of the pitch-side railing at 0.761, so the child's feet stop on the bottom
    // step and the railing is always in FRONT of him — which is the whole reason this
    // frame says "you are in the stand". `far` is the ninth step back, where the baked
    // crowd begins.
    band: { far: 0.632, near: 0.752 },
    // A metre is 0.056 of this frame (the railing is 1.1m and measures 0.061), so a child
    // of eight is 0.072 and a man 0.098. Everybody here is drawn at 1.3 times that — one
    // consistent cheat across every figure, which reads as a camera four metres closer
    // rather than as an error, and keeps an eight-year-old findable on a phone.
    size: { far: 0.098, near: 0.108 },
    metre: 0.0831,
    ambience: 'stadium',
    // the stadium's sound, and the air of a day outside a gate: the terrace's paper flecks
    // read as snow over a photographed street (21.9.2026)
    air: 'day',
    // 5.9.2026: the boy himself at the tunnel mouth, painted — the ground opening in front of him
    arrival: { art: 'tunnelReveal', ms: 5200, flag: 'saw:reveal' },
    // 1990: he knows this terrace. The card is the arithmetic in his head, not the bowl.
    arrivalByEra: { '1990': null, '1990s': null, '2000s': null },
    // היציע של שנות האלפיים ושל בלומפילד המחודש — כל אחד על הציור שלו (`rooms2000.ts`)
    // ...and on a day with no match, the photographed ground of its decade (24.9.2026)
    repaints: [STAND_NEW, STAND_OLD, STAND_90S, STAND_80S],
    stuckHe: 'הוא איפשהו ביציע. תסתכל טוב.',
    stuckByEra: { '1990': 'מי שיודע משהו — אומר. הרדיו, הילדים, הוותיקים. אבא ליד העמוד.' },
    spawns: { start: { x: 0.08, y: 0.748, facing: 'right' } },
    /**
     * היציע אחרי השריקה — sixteen people who appear the moment the title is won.
     *
     * They are DRESSING and not actors, and the distinction is the whole design of the
     * ending. The chapter's last objective is `למצוא את אבא`, and the player has to walk a
     * terrace and find one man in a crowd. An actor is somebody you can talk to; sixteen
     * of them would turn a search into sixteen dialogue boxes opening as you brush past,
     * and the two supporters who ARE actors would stop being worth talking to. Dressing is
     * scenery you have to look through, which is precisely the obstacle this moment wants.
     *
     * They bounce, on their own phases, because a still crowd at the instant a
     * championship is won is the one thing on this terrace that would read as a mistake.
     * The `depth` of each is its own `y`, so the child walks in front of the ones nearer
     * the rail and BEHIND the ones nearer the camera — which is what makes his father hard
     * to see rather than merely far away.
     *
     * Every one of them is a different figure from the twenty-eight-person crowd sheets.
     * Nobody in this stadium is standing next to himself.
     */
    layers: [
      /**
       * היציע, אפוי — nine hundred people for one draw.
       *
       * Everything from the ninth step back is a single image composited out of the same
       * twenty-eight crowd sheets the live figures are cut from, so a man in the tenth row
       * and a man in the eighth are the same painting at the same size
       * (`scripts/life/bake-gate7-crowd.py`). Its depth is the seam: anybody standing
       * lower on the terrace draws in front of it.
       */
      { art: 'standCrowd', x: 0, y: 0, w: 1, depth: 0.616, era: '*' },
      // and the front nine steps, live — a terrace that does not move is a photograph
      ...terraceCrowd(GATE7_ROWS, GATE7_HOLES, GATE7_CLEAR),
    ],
    actors: [
      {
        id: 'kobi-crowd',
        figure: 'kobi-cheer',
        // Between two rows of the celebrating crowd, on the far side of the terrace from
        // where the child comes in. He is not hidden — nothing in this game hides the
        // thing it is asking for — he is just one more man in a red shirt among sixteen,
        // and the player has to walk over and look. That walk IS the ending.
        x: 0.7,
        y: 0.688,
        size: 0.128,
        nameHe: 'קובי',
        talk: 'kobi-found',
        when: { flag: 'match:over' },
        // he sees the boy first: the last two metres are his (delta 93)
        initiative: { reachM: 2.2, when: { none: [{ flag: 'found:kobi' }] } },
      },
      { id: 'terrace-a', figure: 'adultA4', x: 0.47, y: 0.722, size: 0.122, nameHe: 'אוהד', talk: 'terrace-fan' },
      { id: 'terrace-b', figure: 'adultB1', x: 0.56, y: 0.749, size: 0.13, nameHe: 'אוהד', talk: 'terrace-fan', flip: true },
      /**
       * ---- 1990: the transistor network ----
       * Every `net:*` conversation is GENERATED by the match director from the anchor and
       * the rumour state, never authored: these people say what their radio says, at the
       * delay their radio has, and the kids say what kids say. Kobi stands by the second
       * pillar, as the veteran promised, until the whistle — then he is one man in a
       * crowd again, and the walk to him is the ending, as it was in 1986.
       */
      { id: 'net-kobi', era: '1990', figure: 'kobi90-lean', x: 0.2, y: 0.7, size: 0.118, nameHe: 'קובי', talk: 'net:kobi', when: { notFlag: 'match:over' } },
      { id: 'net-radio', era: '1990', figure: 'adultA1', x: 0.52, y: 0.706, size: 0.125, nameHe: 'אוהד עם רדיו', talk: 'net:radio', flip: true, when: { notFlag: 'match:over' } },
      { id: 'net-brain', era: '1990', figure: 'adultB3', x: 0.78, y: 0.716, size: 0.126, nameHe: 'אוהד שיודע', talk: 'net:brain', when: { notFlag: 'match:over' } },
      { id: 'net-kids', era: '1990', figure: 'youngB5', x: 0.93, y: 0.74, size: 0.105, nameHe: 'ילדים', talk: 'net:kids', flip: true, when: { notFlag: 'match:over' } },
      { id: 'net-ofir', era: '1990', figure: 'ofir90', x: 0.41, y: 0.752, size: 0.115, nameHe: 'אופיר', talk: 'net:ofir', when: { all: [{ flag: 'went:withFriends' }, { notFlag: 'match:over' }] } },
      { id: 'kobi-lost', era: '1990', figure: 'kobi90-cheer', x: 0.7, y: 0.688, size: 0.128, nameHe: 'קובי', talk: 'kobi-found-1990', when: { flag: 'match:over' } },
    ],
    // The scarf is tied to the barrier at the left of the frame — somebody left it there,
    // which is the whole reason to walk over and look at it.
    hotspots: [
      { id: 'rail', era: '*', x: 0.15, y: 0.753, w: 0.13, act: 'terrace-rail', verb: 'look', labelHe: 'המעקה' },
      { id: 'look-terrace', era: '1986', x: 0.88, y: 0.744, w: 0.09, act: 'pano:panoTerrace1986', verb: 'gaze', labelHe: 'סביב', when: { flag: 'saw:reveal' } },
      // 1990: the radio on the concrete, only while it is there (see the director).
      { id: 'radio-floor', era: '1990', x: 0.46, y: 0.75, w: 0.09, act: 'net:floor', verb: 'take', labelHe: 'הטרנזיסטור על הרצפה', when: { flag: 'radio:dropped' }, priority: 5, prop: { key: 'propRadio', size: 0.032 } },
    ],
    exits: [
      // The way home. It opens the moment the chapter's last objective is met — you found
      // him — and not before: nobody walks out of a final. Straight to the street outside
      // the ground; the tunnel is a way IN.
      {
        id: 'home',
        era: '*',
        // The way out is the thing the painter put there: the mouth of the entrance,
        // black under its red canopy, with the white handrails round it. It used to be
        // the left edge of the frame, which is where doors go when a room has none.
        x: 0.278,
        y: 0.66,
        w: 0.115,
        h: 0.095,
        to: 'bloomfield-outside',
        spawn: 'fromTunnel',
        labelHe: 'החוצה, הביתה',
        when: { flag: 'found:kobi' },
        /**
         * **ובכל פרק שהמנהרה פתוחה בו לגבר עם כרטיס — גם הדרך החוצה פתוחה** (21.9.2026).
         * `found:kobi` הוא הפאזל של 24.5.1986 (*"nobody walks out of a final"*), והוא
         * עבר בירושה לכל שנה שבה `whenByEra` של המנהרה פותח את שער 7 — כלומר מי שנכנס
         * ליציע ב-2010 לבנפיקה (C06) לא יכול היה לצאת ממנו לליון (C07) בבית, ומי שנכנס
         * לבלומפילד ביום של גמר ברמת גן נתקע שם. אותה מחלקה בדיוק שכלל 54 מתאר, בכיוון
         * ההפוך: הפעם לא מנעול שנכנס — דלת יציאה שלא. `life:worldlines` (`ROOM_TRAP`).
         */
        // `found:kobi` is 1986's; a grown man leaves a stand when he wants to (every chapter from 2000)
        whenByEra: { '1998-laces': null, '1999-cup': null, '2000s': null },
        light: { x: 0.292, y: 0.645, w: 0.088, h: 0.085, tone: 'daylight' },
        dwellMs: 700,
      },
    ],
  },

  // ------------------------------------------------------ אולם אוסישקין — מבחוץ ----
  // The three Ussishkin backdrops (`ussExt`, `ussHall`, `ussHallPre`) shipped as art in
  // September and had NO scene, so nothing in the game ever drew them — a backdrop with
  // no room is invisible by construction. These two scenes give them a room. Kept
  // deliberately bare (no actors, no hotspots): the point of this first pass is to walk
  // in and SEE the hall in-engine. The basketball night that belongs here is authored
  // next, to the directing standard the football Saturday is held to.
  {
    id: 'ussishkin-outside',
    titleHe: 'אולם אוסישקין — מבחוץ',
    art: 'ussExt',
    band: { far: 0.82, near: 0.96 },
    /**
     * מדוד מהקהל שעל הקיר — the painted crowd along the front of the building.
     *
     * A man standing at the doors measures 116px at the size the game draws this
     * painting, and he is about eight metres behind the kerb the child stands on, which
     * at this camera makes an adult at the FRONT about 178px — so a child of eight is
     * 130px, or 0.203 of the frame, and the room's metre is 0.159. The child was rendering
     * at 0.331: two and a half times a painted adult, standing in a crowd of people half
     * his size, with the usher exactly his height. Every figure here is now derived from
     * that metre and a real body height.
     */
    size: { far: 0.185, near: 0.203 },
    metre: 0.1465,
    ambience: 'dusk',
    stuckHe: 'הכניסה לאולם באמצע, מתחת לגג. חזרה לרחוב — משמאל.',
    stuckByEra: { '1991': 'הסדרן ליד הדלת, המוכר מימין. פנימה — באמצע.' },
    /**
     * ערב משחק (27.9.2026) — `ussExtDusk` is the same corner at dusk with the crowd painted in:
     * the first sight of the hall on a night it plays (A3's reveal, the derby, the finals, the
     * two relegation nights). It is the CARD, not the room — the walkable room stays the empty
     * `ussExt`, whose floor every person here is measured on. Afternoons (1993-cup, the double)
     * and days nobody plays get no card.
     */
    arrivalByEra: {
      'a3-hall': { art: 'ussExtDusk', ms: 3000, flag: 'saw:ussDusk' },
      '1991': { art: 'ussExtDusk', ms: 3000, flag: 'saw:ussDusk' },
      '1993-galil': { art: 'ussExtDusk', ms: 3000, flag: 'saw:ussDusk' },
      '1997-basket': { art: 'ussExtDusk', ms: 3000, flag: 'saw:ussDusk' },
      '1999-basket': { art: 'ussExtDusk', ms: 3000, flag: 'saw:ussDusk' },
    },
    spawns: {
      fromStreet: { x: 0.12, y: 0.9, facing: 'right' },
      fromHall: { x: 0.5, y: 0.93, facing: 'left' },
      // evenings that begin at the hall (1993, 1997, 1999): outside the doors, facing them
      start: { x: 0.62, y: 0.92, facing: 'left' },
    },
    actors: [
      { id: 'usher-a3', era: 'a3-hall', figure: 'usher-wave', x: 0.2, y: 0.9, size: 0.278, nameHe: 'סדרן', talk: 'usher-a3', sway: 0.004 },
      { id: 'efi-a3-door', era: 'a3-hall', figure: 'efi', x: 0.55, y: 0.92, size: 0.204, nameHe: 'אפי', talk: 'efi-a3', flip: true },
      /**
       * 11.3.1991 — the three people the initiation chapter is about, on the pavement it
       * happens on. They were written for 1993 and the boy met them there, two years after
       * the night he was supposedly initiated. `when` keeps them outside only until he is
       * in: once `uss:arrived` is up the forecourt empties, because they went in too.
       */
      /**
       * שלושה אנשים עמדו על אותה נקודה בחצר של אוסישקין (16.9.2026).
       *
       * `usher-wave` is nearly twice as wide as a standing body — the arm is out, waving
       * people toward the doors — and he stood at 0.55 between Limor at 0.52 and Efi at
       * 0.58. Each of them had **86% of their body behind his**, which on the board is a
       * three-person pile-up with an arm through the middle of it, and in the game is
       * three people trading one prompt as the boy shuffles a centimetre.
       *
       * The usher moves to 0.50 — beside the door and not in it, which the comment above
       * `usher-night` has asked for since the night he was placed, and his arm now reaches
       * toward the entrance at 0.45 instead of through Limor. Limor takes the space he
       * left; Efi goes to the far end of the forecourt, past Shachor, which is where the
       * only other clear stretch of this band is.
       */
      { id: 'efi-1991', era: '1991', figure: 'efi96-3q', x: 0.9, y: 0.9, size: 0.262, nameHe: 'אפי', talk: 'efi-1991', flip: true, sway: 0.006, when: { none: [{ flag: 'derby:over' }] } },
      // לימור — a woman who knows the side entrance; `youngB3` was a boy of thirteen from
      // behind. She stands on the body her plate (`faceLimor`) was cut from (21.9.2026)
      { id: 'limor-1991', era: '1991', figure: 'adultB5', x: 0.6, y: 0.9, size: 0.258, nameHe: 'לימור', talk: 'limor-1991', sway: 0.003, when: { none: [{ flag: 'uss:arrived' }] } },
      { id: 'shachor-1991', era: '1991', figure: 'shachor', x: 0.82, y: 0.92, size: 0.278, nameHe: 'שחור', talk: 'shachor-1991', flip: true, when: { none: [{ flag: 'uss:arrived' }] } },
      // ---- 11.3.1991, an hour before the doors ----
      // The usher stands BESIDE the door and not in it: a person in a doorway wins the
      // prompt over the door, and the way into the room disappears behind a conversation.
      {
        id: 'usher-night',
        era: '1991',
        figure: 'usher-wave',
        // 0.55 → 0.50: beside the door (which ends at 0.45), with the waving arm reaching
        // toward it rather than through Limor. See the note above `efi-1991`.
        x: 0.5,
        y: 0.9,
        size: 0.278,
        nameHe: 'סדרן',
        talk: 'usher-night',
        flip: true,
        sway: 0.003,
      },
      // The corridor kiosk (§36). It is OUT here and not inside the hall, because that is
      // what makes it cost something: history does not wait for a queue.
      {
        id: 'hall-vendor',
        era: '1991',
        figure: 'hallVendor',
        x: 0.72,
        y: 0.92,
        size: 0.278,
        nameHe: 'מוכר',
        talk: 'hall-vendor',
        flip: true,
        sway: 0.004,
      },
      // 19.4.1993 — the corner the bus to the big hall leaves from.
      // Michel runs the transport and Limor knows the way in; two jobs, two people.
      {
        id: 'michel-1993',
        era: '1993-cup',
        figure: 'michel99-3q',
        x: 0.5,
        y: 0.9,
        size: 0.278,
        nameHe: 'מישל',
        talk: 'michel-1993',
        sway: 0.003,
      },
      {
        id: 'limor-1993',
        era: '1993-cup',
        figure: 'adultB5',
        x: 0.62,
        y: 0.9,
        size: 0.262,
        nameHe: 'לימור',
        talk: 'limor-1993',
        sway: 0.003,
      },
      {
        id: 'shachor-1993',
        era: '1993-cup',
        figure: 'shachor',
        x: 0.8,
        y: 0.92,
        size: 0.278,
        nameHe: 'שחור',
        talk: 'shachor-1993',
        flip: true,
        when: { beforeMinute: 18 * 60 + 42 },
      },
      // 9–19.5.1993 — the finals. The same corner on four evenings, and the morning after.
      {
        id: 'efi-galil',
        era: '1993-galil',
        figure: 'efi96-3q',
        x: 0.68,
        y: 0.9,
        size: 0.262,
        nameHe: 'אפי',
        talk: 'efi-galil',
        sway: 0.003,
      },
      {
        id: 'michel-galil',
        era: '1993-galil',
        figure: 'michel99-3q',
        x: 0.46,
        y: 0.92,
        size: 0.278,
        nameHe: 'מישל',
        talk: 'g4-michel',
        sway: 0.003,
        when: { flag: 'life:galil:d4', none: [{ flag: 'life:galil:after' }] },
      },
      {
        id: 'shachor-galil',
        era: '1993-galil',
        figure: 'shachor-back',
        x: 0.84,
        y: 0.92,
        size: 0.278,
        nameHe: 'שחור',
        talk: 'after-shachor-galil',
        when: { flag: 'life:galil:after' },
      },
      {
        id: 'soko-galil',
        era: '1993-galil',
        figure: 'soko',
        x: 0.2,
        y: 0.92,
        size: 0.278,
        nameHe: 'סוקו',
        talk: 'after-soko',
        when: { flag: 'life:galil:after' },
      },
      // 1997 and 1999 — the two relegation nights, and the corner that works through them
      { id: 'shachor-hall97', era: '1997-basket', figure: 'shachor', x: 0.8, y: 0.92, size: 0.278, nameHe: 'שחור', talk: 'h1-corner', flip: true, when: { none: [{ flag: 'life:hall:d2' }] } },
      { id: 'shachor-hall98', era: '1997-basket', figure: 'shachor-back', x: 0.8, y: 0.92, size: 0.278, nameHe: 'שחור', talk: 'h2-corner', when: { flag: 'life:hall:d2' } },
      { id: 'limor-hall', era: '1997-basket', figure: 'adultB5', x: 0.62, y: 0.9, size: 0.262, nameHe: 'לימור', talk: 'h1-corner', sway: 0.003 },
      { id: 'freddy-hall', era: '1997-basket', figure: 'adultA2', x: 0.16, y: 0.92, size: 0.278, nameHe: 'פרדי', talk: 'h1-freddy', when: { none: [{ flag: 'life:hall:d2' }] } },
      // B7 S1 (27.9.2026) — Efi at the corner on the relegation night: who he kept a place for
      { id: 'efi-hall97', era: '1997-basket', figure: 'efi96-3q', x: 0.245, y: 0.9, size: 0.262, nameHe: 'אפי', talk: 'efi-hall-97', flip: true, sway: 0.006, when: { none: [{ flag: 'life:hall:d2' }, { flag: 'h1:football' }] } },
      { id: 'shachor-seed', era: '1999-basket', figure: 'shachor', x: 0.8, y: 0.92, size: 0.278, nameHe: 'שחור', talk: 'seed-corner', flip: true },
      { id: 'limor-seed', era: '1999-basket', figure: 'adultB5', x: 0.62, y: 0.9, size: 0.262, nameHe: 'לימור', talk: 'seed-corner', sway: 0.003 },
      { id: 'soko-seed', era: '1999-basket', figure: 'soko', x: 0.2, y: 0.92, size: 0.278, nameHe: 'סוקו', talk: 'seed-inside' },
      // 2000-double, `d-uss-afternoon` (rule 85, 23.9.2026): שחור waits in his own corner
      // for the banner errand instead of walking in after the player on room entry.
      { id: 'shachor-double', era: '2000-double', figure: 'shachor', x: 0.8, y: 0.92, size: 0.278, nameHe: 'שחור', talk: 'd-uss-afternoon', flip: true, when: { flag: 'd:opened', none: [{ flag: 'd:final' }] } },
    ],
    hotspots: [...gigSpots('ussishkin-outside'), 
      /**
       * הפנקס של שחור — the black wall, opened from his folded notebook (`act-shachor-lesson`).
       * At the corner beside him, where he stands in every one of these years (0.8–0.84), and
       * not in 1991, when Efi waits on that corner for the derby.
       */
      {
        id: 'shachor-notebook',
        era: actEra('shachor-lesson', ['1991']).filter((chapter) => ['1993-cup', '1993-galil', '1997-basket', '1999-basket'].includes(chapter)),
        x: 0.93,
        y: 0.92,
        w: 0.05,
        act: 'act-shachor-lesson',
        verb: 'talk',
        labelHe: 'הפנקס של שחור',
      },
      // 1993, the decisive day: the organised bus north at the corner, until four (`g4-michel`);
      // the day after, the step beside Michel's notebook (`after-michel`)
      { id: 'g4-bus', era: '1993-galil', x: 0.15, y: 0.84, w: 0.14, act: 'g4-michel', verb: 'enter', labelHe: 'לאוטובוס לצפון', when: { all: [{ flag: 'life:galil:d4' }, { notFlag: 'g4:decided' }, { notFlag: 'g4:bus-gone' }] }, priority: 3 },
      { id: 'michel-ledger', era: '1993-galil', x: 0.5, y: 0.9, w: 0.08, act: 'after-michel', verb: 'sit', labelHe: 'המדרגה ליד הפנקס של מישל', when: { all: [{ flag: 'after:open' }, { notFlag: 'after:michel' }, { notFlag: 'after:done' }] }, priority: 3 },
      { id: 'bus-1993', era: '1993-cup', x: 0.15, y: 0.84, w: 0.14, act: 'bus-1993', verb: 'enter', labelHe: 'האוטובוס', priority: 3, when: { notFlag: 'final:over' } },
      // (V3 §12) after the final the same bus is back at the corner, door open, still singing
      { id: 'bus-back-1993', era: '1993-cup', x: 0.15, y: 0.84, w: 0.14, act: 'after-bus-1993', verb: 'enter', labelHe: 'לאוטובוס חזרה, עם החבר׳ה', priority: 3, when: { all: [{ flag: 'after:walk' }, { notFlag: 'walked:home' }] } },
      /**
       * (Director V3 §12, 25.9.2026) A3 — the way in is the queue, and you are in it: between
       * two coats, behind Efi, up to the usher who asks your name. The usher's own box is the
       * same one (`usher-a3`); this is the walk to it.
       */
      // 1997 — after the crates, staying is walking through the door you carried them to
      { id: 'h1-door', era: '1997-basket', x: 0.3, y: 0.88, w: 0.06, act: 'h1-stay', verb: 'enter', labelHe: 'לאולם — להישאר', when: { all: [{ flag: 'h1:crates-carried' }, { notFlag: 'h1:decided' }] }, priority: 5 },
      { id: 'a3-queue', era: 'a3-hall', x: 0.36, y: 0.9, w: 0.1, act: 'a3-queue', verb: 'enter', labelHe: 'לתור, אחרי אפי', when: { all: [{ flag: 'knows:hall' }, { notFlag: 'entry:granted' }] }, priority: 4 },

      // delta 91 — the stack of old papers and the scissors by the hall door (`act-hall-confetti`, Efi's ask)
      { id: 'hall-confetti', era: ['1991', '1993-galil'], x: 0.4, y: 0.9, w: 0.05, act: 'act-hall-confetti', verb: 'take', labelHe: 'ערימת העיתונים ליד הדלת' },
      { id: 'queue', era: '1991', x: 0.25, y: 0.9, w: 0.12, act: 'uss-queue', verb: 'look', labelHe: 'התור' },
    ],
    exits: [
      {
        /**
         * Back the way you came, and since 6.9.2026 that is town rather than the child's
         * own pavement. A boy on the Yarkon does not step through one door and find his
         * own street; he walks back down through Allenby, and from Allenby he is one more
         * door from home. That door is also where the film goes: `promenade-walk` plays
         * on exactly this crossing.
         */
        id: 'back',
        x: 0.0,
        y: 0.82,
        w: 0.05,
        h: 0.14,
        to: 'allenby',
        spawn: 'fromNorth',
        labelHe: 'חזרה לעיר',
        light: { x: 0.006, y: 0.55, w: 0.05, h: 0.3, tone: 'daylight' },
        dwellMs: 500,
      },
      {
        // The glass doors under the canopy, at 0.33–0.45 of the frame. First placed at
        // 0.47–0.59 — the corner pillar, where the painting has three men standing and
        // no door at all. Rendered with the boxes on 3.9.2026 and moved.
        id: 'in',
        x: 0.33,
        y: 0.8,
        w: 0.12,
        h: 0.15,
        to: 'ussishkin-hall',
        spawn: 'fromOut',
        labelHe: 'פנימה, לאולם',
        // 1984: the door is the usher. Six years old, you do not walk past him.
        needsByEra: { 'a3-hall': { flag: 'entry:granted' } },
        blockedByEra: { 'a3-hall': 'הסדרן בדלת. אפי מכיר אותו — תדבר.' },
        light: { x: 0.335, y: 0.5, w: 0.11, h: 0.3, tone: 'inside' },
        dwellMs: 300,
        priority: 2,
      },
    ],
  },

  // ------------------------------------------------------- אולם אוסישקין — פנים ----
  //
  // 4.9.2026: the hall is the RECONSTRUCTION now — five angles of one room rebuilt from
  // the weinstocka footage (`USSISHKIN-RECONSTRUCTION-V2`): the red-and-charcoal stand,
  // the cream stand opposite, the end wall with the old basket, the high corner, the
  // floor at a child's eye. The roof, the beams and the window strip never move between
  // them, which is what makes them one place. The main stand is the room you walk; the
  // high corner is how you first see it; the end wall is where the basket is, one door
  // along. Empty on purpose: on a Saturday in 1986 the hall IS empty, the parquet is
  // reflecting the windows, and two men are shooting around. The derby night (11.3.1991)
  // layers its crowd over this same geometry.
  {
    id: 'ussishkin-hall',
    titleHe: 'אולם אוסישקין',
    art: 'ussMain',
    // 5.9.2026: the two relegation nights are painted as nights — the hall lit, half empty
    artByEra: { '1997-basket': 'ussHallNight', '1999-basket': 'ussHallNight' },
    band: { far: 0.72, near: 0.96 },
    // 11.3.1991 — courtside, not centre court (Maor, 6.9.2026: "הפרקט עדיין מלא בדמויות")
    bandByEra: { '1991': { far: 0.855, near: 0.965 } },
    /**
     * גם הילד — `size` is the player's OWN near/far height (`playerSize()`), not only the
     * taper ratio `bodySizeAt` borrows from it (`size.far / size.near`). Shrinking `metre`
     * alone fixed the usher against the stand and broke him against the boy: Pogi doesn't
     * read off `metre` at all, so he stayed the old (too big) size and came out taller
     * than the grown man beside him. Both endpoints scaled by the same 0.6374 the metre
     * below did, so the ratio — and every era's `player.scale` multiple of it — is
     * unchanged; only the absolute size is.
     */
    size: { far: 0.1084, near: 0.1912 },
    /**
     * המטר של `ussMain` — measured off the painting, not off the old number.
     *
     * Maor sent a measured reference of the real hall on 6.9.2026 (stand ≈4.5–5.0m, a row
     * ≈0.32–0.35m) and the usher was standing eye-level with the TOP of the stand behind
     * him — a grown man nearly as tall as ten rows of seats. Measured directly off
     * `ussMain.png` itself, with no perspective assumed: the rim sits 3.05m above the
     * floor (FIBA, fixed) at 215px in the 900px painting; the seating block above the same
     * floor spans 310px — 4.4 metres, matching Maor's own reference almost exactly. The
     * ART was right. `metre` was not: 0.2165 was carried over from a different room and
     * never re-measured against this one's own painting. Converted through the room's own
     * far/near taper (0.17/0.3), the painting's true scale is 0.138. `ussishkin-end`
     * (`ussEnd.png`) was checked the same way, off its own free-throw circle — its 0.2165
     * already matches its painting, so it is untouched.
     */
    metre: 0.138,
    ambience: 'hall',
    // The first sight of the hall, from the high corner — almost all of it at once — held
    // for a breath, then the cut down to the sideline at the boy's height.
    arrival: { art: 'ussHigh', ms: 3800, flag: 'saw:ussHigh' },
    /**
     * 11.3.1991 — a different arrival, and deliberately the opposite one (§34).
     *
     * The empty hall is met from the high corner: almost all of it at once, held, then
     * the cut down to the floor. A derby night may not use that card. Bloomfield says
     * the world is bigger than the boy; Ussishkin says the world is TOO CLOSE to him —
     * so the night arrives on `ussLow`, the floor at a child's eye height, where the
     * court is a strip of light between other people's shoulders.
     */
    arrivalByEra: { '1991': { art: 'ussLow', ms: 2600, flag: 'saw:ussNight' } },
    stuckHe: 'הפרקט מבריק, הסל בקצה. היציאה משמאל, מאיפה שנכנסת.',
    stuckByEra: { '1991': 'עמית שמר מדרגה. המעקה לפניך, השעון מעל הדלת, והיציאה — משמאל.' },
    spawns: { fromOut: { x: 0.12, y: 0.93, facing: 'right' }, fromEnd: { x: 0.9, y: 0.9, facing: 'left' } , start: { x: 0.12, y: 0.93, facing: 'right' } },
    /**
     * הקהל — eight hundred people, drawn the way the terrace at full time is drawn.
     *
     * Dressing, not actors, for the reason the 1986 terrace gives at length: a crowd you
     * can talk to is a crowd that opens a dialogue box every time you brush past it. The
     * far rows sit BEHIND the walk band, packed along the base of the stand, so the boy
     * moves along the sideline in front of them; the four nearest are inside the band,
     * so he has to go round them. Every one of them bounces on its own phase, because a
     * still crowd in a hall this size is the one thing that would read as a mistake.
     *
     * Over all of it: two plates from the September package — the floodlight haze that
     * a tin roof's lamps make of the dust, and, once it is won, red smoke.
     */
    layers: [
      /**
       * הקהל ביציע — ולא על הפרקט.
       *
       * Maor, 6.9.2026: *"האוהדים אינם ביציע, הפרקט עדיין מלא בדמויות"* — and he was right,
       * completely. Twenty supporter cut-outs were standing in a line ON THE COURT, between
       * the advertising boards and the sideline, on a night eight hundred people were
       * supposedly packed into the stand behind them. The stand itself was empty painted
       * seats. It read as a school hall with some men loitering on the parquet, which is the
       * opposite of the memory this room exists to hold.
       *
       * The crowd is now ONE piece: the stand Maor drew and sent — a packed 1980s Ussishkin
       * terrace, higher on the left, sloping away to the right, with its own staircases and
       * a diagonal handrail — keyed off its white ground and fitted to the painted tiers.
       * The fit is measured, not eyeballed: the painting's front row sits at y=505 of 900
       * and its top row runs from y=190 on the left to y=300 on the right; the crowd plate
       * is 1672x453 and at a width of 1170px its own slope lands on that same line, bottom
       * edge on the front row. Nothing on the parquet at all.
       *
       * The two hall nights at the end of the decade are NOT this. 1997 and 1999 are the
       * relegation years and the hall was half empty, so the same plate is placed narrower
       * and only over the left block — a full corner and bare seats beside it, which is what
       * a bad night actually looks like from the floor.
       */
      { art: 'ussCrowd', era: '1991', x: 0.3656, y: 0.5611, w: 0.731, depth: 0.56, foot: true },
      { art: 'ussCrowd', era: '1993-cup', x: 0.3656, y: 0.5611, w: 0.731, depth: 0.56, foot: true },
      { art: 'ussCrowd', era: '1997-basket', x: 0.17, y: 0.5611, w: 0.34, depth: 0.56, foot: true },
      { art: 'ussCrowd', era: '1999-basket', x: 0.17, y: 0.5611, w: 0.34, depth: 0.56, foot: true },

      // The air of the room, and then the smoke that only exists once it is over.
      { art: 'overlayHaze', era: '1991', x: 0, y: 0, w: 1, depth: 0.995, alpha: 0.5 },
      { art: 'overlaySmoke', era: '1991', x: 0, y: 0, w: 1, depth: 0.996, alpha: 0.55, when: { flag: 'derby:over' } },
    ],
    actors: [
      // Two men in plain red, shooting around at the far end of the floor: the hall is
      // used, not abandoned. Nameless, no number, no talk — scenery that breathes.
      { id: 'hooper-a', era: '*', figure: 'hooperRed-dribble', x: 0.62, y: 0.74, size: 0.17, nameHe: 'שחקן', sway: 0.006 },
      { id: 'hooper-b', era: '*', figure: 'hooperRed-stretch', x: 0.45, y: 0.73, size: 0.16, nameHe: 'שחקן', sway: 0.004 },
      // The usher by the door: the one person who talks, and what he says depends on
      // whether there is a game tonight.
      // (pass 28.9.2026) not in A3: that evening has a game on, and its own usher below
      { id: 'usher', era: chaptersWhere((id) => id !== 'a3-hall'), figure: 'usher', x: 0.2, y: 0.9, size: 0.3, nameHe: 'סדרן', talk: 'usher-hall', sway: 0.003 },
      { id: 'usher-a3-in', era: 'a3-hall', figure: 'usher', x: 0.2, y: 0.9, size: 0.3, nameHe: 'סדרן', talk: 'usher-a3-hall', sway: 0.003 },
      /**
       * אפי ליד המעקה — the boy who brought him, standing where he said he would be.
       *
       * A3's arrival line ends with "אני פה, לא בורח", and until 6.9.2026 that was a
       * promise the room could not keep: the chapter ended on the threshold and Efi was
       * never in it. He is now, and he is also the way the evening closes.
       */
      { id: 'efi-a3-hall', era: 'a3-hall', figure: 'efi', x: 0.62, y: 0.9, size: 0.29, nameHe: 'אפי', talk: 'efi-a3-hall', sway: 0.006 },
      // ---- 11.3.1991: the two people you came with ----
      { id: 'amit-hall', era: '1991', figure: 'amit90-cheer', x: 0.42, y: 0.9, size: 0.29, nameHe: 'עמית', talk: 'amit-hall', sway: 0.006 },
      { id: 'ofir-hall', era: '1991', figure: 'ofir90-arms', x: 0.3, y: 0.93, size: 0.3, nameHe: 'אופיר', talk: 'derby:friend', flip: true, sway: 0.007 },
    ],
    hotspots: [
      ...gigSpots('ussishkin-hall'),
      { id: 'look-hall', era: '*', x: 0.62, y: 0.9, w: 0.16, act: 'pano:panoUssHall', verb: 'gaze', labelHe: 'סביב', priority: 3, when: { notFlag: 'uss:arrived' } },
      // 1991: the same look, on a night when the hall is full of people (§38).
      { id: 'look-derby', era: '1991', x: 0.62, y: 0.9, w: 0.16, act: 'pano:panoUssDerby', verb: 'gaze', labelHe: 'סביב', priority: 3, when: { flag: 'uss:arrived' } },
      // The step Amit asked you to hold, the rail a metre from the line, and the clock
      // over the door that this whole chapter is really about.
      // Priority 5: higher than a person, because a boy standing on the step he promised
      // to hold should not have to push past his own friend to press the button.
      { id: 'the-spot', era: '1991', x: 0.5, y: 0.88, w: 0.09, act: 'hall-spot', verb: 'sit', labelHe: 'המדרגה', priority: 5 },
      { id: 'hall-rail', era: '1991', x: 0.68, y: 0.84, w: 0.1, act: 'hall-rail', verb: 'look', labelHe: 'המעקה' },
      { id: 'hall-clock', era: '1991', x: 0.86, y: 0.8, w: 0.08, act: 'hall-clock', verb: 'look', labelHe: 'השעון' },
      /**
       * (Director V3 §12, 25.9.2026) A3 — a place in the hall, found with the body: a step in
       * the stand beside Efi, and a ball that rolls to your feet from the warm-up. Each is
       * also one of the two things the evening needs him to have looked at (`saw:stand`,
       * `saw:parquet` → `life:seen:ussishkin`), so the day closes on what he DID.
       */
      { id: 'a3-step', era: 'a3-hall', x: 0.55, y: 0.82, w: 0.08, act: 'a3-step', verb: 'sit', labelHe: 'מדרגה ביציע, ליד אפי', when: { all: [{ flag: 'a3:inside' }, { notFlag: 'a3:seat' }] }, priority: 5 },
      { id: 'a3-ball', era: 'a3-hall', x: 0.4, y: 0.9, w: 0.08, act: 'a3-ball', verb: 'play', labelHe: 'הכדור שהתגלגל אליך', when: { all: [{ flag: 'a3:inside' }, { notFlag: 'a3:ball' }, { notFlag: 'a3:tipoff' }] }, priority: 5, prop: { key: 'propBasketball', size: 0.03 } },
      // (pass 28.9.2026, brief §3 S4) the painted door under the far basket, open a crack
      // for the warm-up only — the whistle shuts it (`a3-tipoff`)
      { id: 'a3-locker', era: 'a3-hall', x: 0.86, y: 0.8, w: 0.06, act: 'a3-locker', verb: 'look', labelHe: 'הדלת מתחת לסל, פתוחה סדק', when: { all: [{ flag: 'a3:inside' }, { notFlag: 'a3:locker' }, { notFlag: 'a3:tipoff' }] }, priority: 4 },
      { id: 'parquet', era: '*', x: 0.4, y: 0.88, w: 0.1, act: 'uss-parquet', verb: 'look', labelHe: 'הפרקט' },
      { id: 'stand', era: '*', x: 0.55, y: 0.78, w: 0.12, act: 'uss-stand', verb: 'look', labelHe: 'היציע' },
      { id: 'windows', era: '*', x: 0.75, y: 0.8, w: 0.1, act: 'uss-windows', verb: 'look', labelHe: 'החלונות' },
    ],
    exits: [
      {
        // Wider than the room needs on an empty Saturday, because on 11.3.1991 this door
        // IS the choice (§41): half past nine arrives while the hall is shaking, and a
        // way out that has to be hunted for is not an answer a thirteen-year-old can give.
        id: 'back',
        x: 0.0,
        y: 0.78,
        w: 0.085,
        h: 0.2,
        to: 'ussishkin-outside',
        spawn: 'fromHall',
        labelHe: 'החוצה',
        light: { x: 0.006, y: 0.55, w: 0.06, h: 0.3, tone: 'inside' },
        dwellMs: 500,
        priority: 3,
      },
      {
        // along the sideline to the end wall, where the basket is
        id: 'end',
        x: 0.94,
        y: 0.74,
        w: 0.06,
        h: 0.22,
        to: 'ussishkin-end',
        spawn: 'fromMain',
        labelHe: 'לקצה, אל הסל',
        light: { x: 0.9, y: 0.5, w: 0.1, h: 0.2, tone: 'inside' },
        dwellMs: 420,
      },
    ],
  },
  {
    id: 'ussishkin-end',
    titleHe: 'אוסישקין — קיר הקצה',
    art: 'ussEnd',
    band: { far: 0.74, near: 0.96 },
    size: { far: 0.17, near: 0.3 },
    metre: 0.2165,
    ambience: 'hall',
    stuckHe: 'הסל מעליך. חזרה לאורך הקו — משמאל.',
    spawns: { fromMain: { x: 0.08, y: 0.9, facing: 'right' } , start: { x: 0.08, y: 0.9, facing: 'right' } },
    actors: [
      { id: 'hooper-c', era: '*', figure: 'hooperRed-shoot', x: 0.5, y: 0.76, size: 0.2, nameHe: 'שחקן', sway: 0.004 },
      { id: 'hooper-d', era: '*', figure: 'hooperRed-bent', x: 0.7, y: 0.8, size: 0.18, nameHe: 'שחקן', sway: 0.005 },
    ],
    hotspots: [
      ...gigSpots('ussishkin-end'),
      { id: 'basket', era: '*', x: 0.5, y: 0.9, w: 0.12, act: 'uss-basket', verb: 'look', labelHe: 'הסל' },
      { id: 'board', era: '*', x: 0.28, y: 0.86, w: 0.1, act: 'uss-board', verb: 'look', labelHe: 'לוח התוצאות' },
      /**
       * USSISHKIN_FOUNDER · `HELP_TEAM` — הקצה של האולם, ששם מה שלא נעשה עדיין נשאר מונח.
       *
       * `community_help` נושא `audience: 'ussishkin'`, והמועדון הזה הוא מקום אמיתי עם
       * כיסאות שצריך להזיז וכדורים שצריך לאסוף. האולם עצמו (`ussishkin-hall`) צפוף
       * בשמונה דברים; קיר הקצה מחזיק שניים, ולכן הוא זה שיכול לשאת עוד אחד בלי להפוך
       * חדר לרשימה.
       */
      smallAction('HELP_TEAM', 'route-help-team', { x: 0.14, y: 0.9, w: 0.1 }, 'take', 'המשימה שאף אחד לא לקח'),
    ],
    exits: [
      {
        id: 'back',
        x: 0.0,
        y: 0.78,
        w: 0.05,
        h: 0.2,
        to: 'ussishkin-hall',
        spawn: 'fromEnd',
        labelHe: 'חזרה לאורך הקו',
        light: { x: 0.006, y: 0.55, w: 0.05, h: 0.3, tone: 'inside' },
        dwellMs: 500,
      },
    ],
  },

  // ------------------------------------------------------------------ הכיתה ------
  //
  // 11.3.1991, and the first room in this game that is not a Saturday.
  //
  // The painting is a real classroom with nobody in it: windows down the left wall, the
  // board and the teacher's desk in the middle, two clusters of desks, and — this is what
  // makes it a room rather than a picture — an empty floor across the whole front, from
  // the near desks to the camera. That strip is the walk band, so the boy moves along the
  // front of the class in front of everybody, which is exactly the wrong place to be
  // holding a folded piece of paper.
  //
  // The children are DRESSING and not actors, for the same reason as the terrace at full
  // time: eight seated twelve-year-olds who each open a dialogue box would turn a lesson
  // into a corridor of text. Two people in this room talk, and one of them is the teacher.
  {
    id: 'classroom',
    titleHe: 'הכיתה',
    art: 'classroom',
    // 5.9.2026: the Sunday morning of 1998 has its own room — a map on the wall, a radiator
    artByEra: { '1998-laces': 'classroom98' },
    band: { far: 0.74, near: 0.97 },
    size: { far: 0.22, near: 0.32 },
    metre: 0.2309,
    ambience: 'classroom',
    stuckHe: 'הפתק על השולחן שלך. המורה ליד הלוח. הדלת למסדרון — ימינה.',
    spawns: {
      start: { x: 0.34, y: 0.88, facing: 'right' },
      fromYard: { x: 0.8, y: 0.9, facing: 'left' },
    },
    actors: [
      {
        // In the aisle in front of her own desk, where a teacher stands when she is
        // talking and not writing.
        id: 'teacher',
        era: '1991',
        figure: 'teacher',
        x: 0.47,
        y: 0.76,
        size: 0.3,
        nameHe: 'המורה',
        talk: 'teacher-1991',
        sway: 0.004,
      },
      {
        id: 'keren-desk',
        era: '1991',
        figure: 'keren90-sit',
        x: 0.78,
        y: 0.745,
        size: 0.24,
        nameHe: 'קרן',
        talk: 'keren-class',
        flip: true,
        sway: 0.003,
      },
      { id: 'teacher-1998', era: '1998-laces', figure: 'teacher-hand', x: 0.47, y: 0.76, size: 0.259, nameHe: 'המורה', talk: 'l2-tayeb' },
    ],
    layers: [
      // Seated children at the two clusters. Their depth is BEHIND the band on purpose:
      // the boy walks along the front of the class, never between the rows.
      { art: 'pupil-back1', era: '1991', x: 0.16, y: 0.7, w: 0.055, depth: 0.7, foot: true },
      { art: 'pupil-back2', era: '1991', x: 0.27, y: 0.71, w: 0.055, depth: 0.71, foot: true },
      { art: 'pupil-sideA', era: '1991', x: 0.35, y: 0.69, w: 0.05, depth: 0.69, foot: true, flip: true },
      { art: 'pupil-back3', era: '1991', x: 0.68, y: 0.7, w: 0.055, depth: 0.7, foot: true },
      { art: 'pupil-pass', era: '1991', x: 0.88, y: 0.71, w: 0.055, depth: 0.71, foot: true, flip: true },
      { art: 'pupil-turn', era: '1991', x: 0.6, y: 0.68, w: 0.05, depth: 0.68, foot: true },
    ],
    hotspots: [
      ...gigSpots('classroom'),
      {
        id: 'my-desk',
        era: '1991',
        x: 0.3,
        y: 0.82,
        w: 0.1,
        act: 'note-1991',
        verb: 'look',
        labelHe: 'השולחן שלך',
        priority: 3,
        prop: { key: 'propNote', size: 0.04, at: { x: 0.29, y: 0.645 } },
      },
      { id: 'board', era: '1991', x: 0.52, y: 0.79, w: 0.1, act: 'class-board', verb: 'look', labelHe: 'הלוח' },
      { id: 'class-window', era: '1991', x: 0.1, y: 0.8, w: 0.09, act: 'class-window', verb: 'look', labelHe: 'החלון' },
      { id: 'class-bag', era: '1991', x: 0.21, y: 0.9, w: 0.08, act: 'class-bag', verb: 'look', labelHe: 'התיק' },
      { id: 'look-class', era: '1991', x: 0.42, y: 0.9, w: 0.09, act: 'pano:panoClassroom', verb: 'gaze', labelHe: 'סביב' },
    ],
    exits: [
      {
        id: 'yard',
        x: 0.93,
        y: 0.72,
        w: 0.07,
        h: 0.26,
        to: 'schoolyard',
        spawn: 'fromSchool',
        labelHe: 'למסדרון ולחצר',
        light: { x: 0.95, y: 0.5, w: 0.05, h: 0.32, tone: 'inside' },
        // A lesson you can slide out of is not a lesson: the door works, and it takes a
        // decision to walk through it.
        dwellMs: 800,
      },
    ],
  },

  // ------------------------------------------------------------------ החצר -------
  {
    id: 'schoolyard',
    titleHe: 'החצר',
    art: 'schoolyard',
    // 27.9.2026 — the same yard thirty years on, for his son's school (schoolyard20, same camera)
    artByEra: { '2020s': 'schoolyard20' },
    band: { far: 0.68, near: 0.95 },
    size: { far: 0.18, near: 0.28 },
    metre: 0.202,
    ambience: 'park',
    stuckHe: 'הכיתה מאחורייך, דרך הדלת. השער לרחוב — משמאל. הסל בקצה החצר.',
    spawns: {
      fromSchool: { x: 0.34, y: 0.86, facing: 'right' },
      fromStreet: { x: 0.14, y: 0.9, facing: 'right' },
    },
    actors: [
      { id: 'ofir-yard', era: '1991', figure: 'ofir90', x: 0.36, y: 0.82, size: 0.26, nameHe: 'אופיר', talk: 'ofir-yard', sway: 0.005 },
      { id: 'amit-yard', era: '1991', figure: 'amit90', x: 0.6, y: 0.86, size: 0.27, nameHe: 'עמית', talk: 'amit-yard', flip: true },
      // on the stone bench under the tree (0.73–0.79, seat ~0.62): `keren90` is cut at the hip,
      // and a floor-anchored actor drew it as a torso standing on the asphalt (21.9.2026)
      { id: 'keren-yard', era: '1991', figure: 'keren90-sit', x: 0.76, y: 0.68, size: 0.25, nameHe: 'קרן', talk: 'keren-yard', flip: true },
    ],
    hotspots: [...gigSpots('schoolyard'),
      {
        id: 'hoop',
        era: '1991',
        x: 0.66,
        y: 0.74,
        w: 0.1,
        act: 'yard-ball',
        verb: 'play',
        labelHe: 'הסל בחצר',
        prop: { key: 'propBasketball', size: 0.03, at: { x: 0.62, y: 0.72 } },
      },
      // Clear of the gate's own zone: a thing to look at must never stand in a doorway.
      { id: 'fence', era: '1991', x: 0.15, y: 0.76, w: 0.06, act: 'yard-fence', verb: 'look', labelHe: 'הגדר' },
    ],
    exits: [
      {
        // Wide, because it is the way OUT of a school and because a child walking left
        // along a yard at six frames a second should meet it, not miss it by a thumb.
        id: 'street',
        x: 0.0,
        y: 0.68,
        w: 0.1,
        h: 0.28,
        to: 'street',
        spawn: 'fromSchool',
        labelHe: 'מהשער, לרחוב',
        light: { x: 0.005, y: 0.42, w: 0.06, h: 0.4, tone: 'daylight' },
        dwellMs: 420,
        priority: 2,
      },
      {
        // the dark doorway in the middle of the building, at 0.22–0.27 of the painting
        id: 'school',
        x: 0.2,
        y: 0.66,
        w: 0.09,
        h: 0.16,
        to: 'classroom',
        spawn: 'fromYard',
        labelHe: 'חזרה לכיתה',
        light: { x: 0.215, y: 0.44, w: 0.07, h: 0.2, tone: 'inside' },
        dwellMs: 900,
      },
    ],
  },
  // --------------------------------------------------------------- שער 5 (1996+) ----
  // Under the stand: concrete, a drum, a hand-painted cloth. `undercroft` was painted for
  // the road plan of 1983–2000 and had no scene; the Gate 5 approach is what it is.
  {
    id: 'gate5',
    titleHe: 'שער 5',
    art: 'gate5',
    // The same wall, the same fence, the same turnstiles — `bloomOldGates` overlays this
    // painting pixel for pixel (checked by blending the two, 21.9.2026), repainted in the
    // colours the ground wore between 2000 and 2016. So it is a swap, not a remeasure.
    artByEra: { '2000s': 'bloomOldGates' },
    band: { far: 0.74, near: 0.95 },
    size: { far: 0.24, near: 0.32 },
    metre: 0.2265,
    ambience: 'stadium',
    stuckHe: 'מתחת ליציע. התוף לא מפסיק.',
    layers: [
      // (21.9.2026) no red smoke at this gate: the chapters here are a November afternoon in
      // uniform, a volunteer's first job, a meeting about the club — none of them a match
      // with flares lit, and a red cloud over all of them read as a permanent fire
      // T01 (2001) "ציוד, מתנדבים" and T02 (2012) "מי פותח": the drum is the equipment, on
      // the concrete between the people who carry it (0.55 m; a metre is 0.23 here)
      { art: 'propDrum', era: '2001-terrace', x: 0.59, y: 0.875, w: 0.078, depth: 0.875, foot: true },
      // 1996 — "לענות למלמד": his darbuka, beside him (0.45 m)
      { art: 'propDarbuka', era: '1996-army', x: 0.735, y: 0.895, w: 0.043, depth: 0.895, foot: true },
      { art: 'propDrum', era: '2012-terrace', x: 0.54, y: 0.85, w: 0.075, depth: 0.85, foot: true },
    ],
    actors: [
      {
        id: 'asaf-gate5',
        era: '1996-army',
        figure: 'asaf',
        x: 0.5,
        y: 0.86,
        size: 0.324,
        nameHe: 'אסף',
        talk: 'asaf-gate5',
        when: { all: [{ flag: 'life:army:d2' }], none: [{ flag: 'life:army:d3' }] },
      },
      {
        id: 'melamed-gate5',
        era: '1996-army',
        // (21.9.2026) a clean stand-in, like Freddy: see `STANDIN_FACES` in `era.ts`
        figure: 'adultA1',
        x: 0.68,
        y: 0.9,
        size: 0.341,
        nameHe: 'מלמד',
        talk: 'asaf-gate5',
        flip: true,
        when: { all: [{ flag: 'life:army:d2' }], none: [{ flag: 'life:army:d3' }] },
      },
    ],
    hotspots: [...gigSpots('gate5'),
      /**
       * 23.11.1996 — the small real work under the stand (Director V3 §7): Asaf's first
       * sentence is "move your bag out of the aisle", and the cloth somebody painted needs
       * a third hand. Neither is required; both change what Asaf says next (`asaf-gate5`).
       * Between the spawn (0.2) and Asaf (0.5), so walking in is walking past them.
       */
      { id: 'a2-gate5-bag', era: '1996-army', x: 0.3, y: 0.9, w: 0.06, act: 'a2-gate5-bag', verb: 'take', labelHe: 'התיק שלך, באמצע המעבר', when: { all: [{ flag: 'life:army:d2' }, { notFlag: 'a2:chose' }, { notFlag: 'life:army:d3' }] }, priority: 3 },
      { id: 'a2-banner', era: '1996-army', x: 0.39, y: 0.88, w: 0.06, act: 'a2-banner', verb: 'take', labelHe: 'הקצה של הבד', when: { all: [{ flag: 'life:army:d2' }, { notFlag: 'a2:chose' }, { notFlag: 'life:army:d3' }] }, priority: 3 },
      /**
       * ULTRAS · `PROOF_LEAD` — הערב שצריך לסדר, ומי נשאר עד שהכול יורד.
       *
       * `banner-gate5` at 0.36 is the job אסף gives you — "תרים", and you hold the other end
       * of the cloth. `route-proof-lead` is the step after it: nobody asks, there is simply
       * nobody else who will do it, and the mission is only closed by staying until the flags
       * come down. So it stands in the same room, past the turnstiles at 0.62 where the gig's
       * reach ends, and it is `verb: 'talk'` on a group rather than a drawn actor for the
       * reason `sign-two-jobs` is: a person who exists for one sentence is a prompt, not a
       * body to place in a band.
       *
       * The two chapters are the ones this room can be entered in and is empty in. The door
       * (`bloomfield-outside/gate5`) is open in `1996-army` too, and that evening already has
       * אסף and מלמד standing at 0.5 and 0.68 — this hotspot would be inside מלמד. Two is what
       * `ULTRAS.practice` asks for anyway: two proofs, in two different chapters.
       *
       * -----------------------------------------------------------------------------------
       * **ולמה `route-proof-found` איננו כאן, ולא באוסישקין.**
       *
       * The sixth mission is the founding one, and it is the only one with no honest room in
       * the game as written. `FOUNDING_YEAR` is 2007 and the last chapter is 2000 —
       * `tests/life-routes.test.ts` asserts `FOUNDING_YEAR > LAST_YEAR` precisely so the
       * window is never quietly moved to fit the chapters that exist — and the mission's own
       * effects raise the apex's three window-scoped commitments (`own:founding:*`). Standing
       * it in 1997 or 1999 would let a 2007 apex be satisfied by work taken a decade before
       * the association existed, and `chapter1999basket.ts` says in its own header that that
       * evening is *"the prehistory of something this stage does not found"*. Rule 17 covers
       * the rest. It belongs in `ussishkin-outside`/`ussishkin-hall` on the day the three
       * 2007 chapters are written, and it is one row when they are.
       */
      /**
       * delta 91 — the cloth on the concrete and two unopened tins (`act-banner-letters`: Asaf's
       * "הצבע הגיע רק עכשיו"), between the gig's edge of the cloth (0.36) and the group at the
       * turnstiles (0.62); and in the two terrace chapters the tifo night Erez hands over
       * (`act-tifo-night`) — the coordinate-and-craft mission whose evidence is `leadership_proof`.
       */
      { id: 'banner-letters', era: ['1998-laces', '1999-basket'], x: 0.48, y: 0.9, w: 0.06, act: 'act-banner-letters', verb: 'take', labelHe: 'הבד על הרצפה, ופחי הצבע' },
      { id: 'tifo-night', era: ['2001-terrace', '2012-terrace'], x: 0.46, y: 0.9, w: 0.06, act: 'act-tifo-night', verb: 'take', labelHe: 'הבד המגולגל, ושלושה אנשים' },
      {
        id: 'proof-lead',
        era: ['1998-laces', '1999-basket'],
        x: 0.62,
        y: 0.9,
        w: 0.1,
        act: 'route-proof-lead',
        verb: 'talk',
        labelHe: 'החבורה ליד הקרוסלות',
      },
    ],
    exits: [
      {
        id: 'back',
        x: 0.0,
        y: 0.76,
        w: 0.08,
        h: 0.22,
        to: 'bloomfield-outside',
        spawn: 'fromGate5',
        labelHe: 'החוצה, לשער 7',
        light: { x: 0.0, y: 0.5, w: 0.08, h: 0.45, tone: 'daylight' },
        dwellMs: 400,
      },
    ],
    spawns: { start: { x: 0.2, y: 0.88 } },
  },

  // ------------------------------------------- קופת כרטיסים — תל אביב (1990 ואילך) ----
  //
  // **המקום הזה עבר, ולא שופץ.** Until 17.9.2026 this room was `undercroft` — the
  // concourse under Bloomfield's stand, reached through a red door at gate seven — and
  // the paragraph that used to stand here explained, at length, why re-using an unplaced
  // painting was the right call. Maor's answer to it was one sentence:
  //
  //   *"אני רוצה לייצר משרד כרטיסים בפני עצמו ולא כחלק ממקום קיים, אלא לפתוח מקום חדש."*
  //
  // So it is a place now. `ticketOffice` (17.9.2026) is an interior whose sign reads
  // **קופת כרטיסים - תל אביב**: a counter with a brass till in a framed window, theatre
  // bills papering both walls, a newspaper rack, and a doorway to the street on the left.
  // It is a shop in town, not a corridor under a terrace — which is why the door into it
  // moved with it, off the gate seven forecourt and onto Allenby. The office is open in
  // the summer; the matchday hatch (`ticket-window`, x 0.70 at the ground) is a metre from
  // the turnstiles and sells one game, today, cash. They were never the same counter, and
  // now they are not the same building either.
  //
  // **What did NOT change, and it is most of the room.** There are still no actors and no
  // hotspots, and that is still the design rather than a gap: the window IS the card.
  // `WorldScene.announceSeasonTicket` fires `season: 'counter'` on arrival while a season
  // is open and unheld, so walking in is the whole interaction — the same call the fan
  // shop's door makes (Maor, 6.9.2026, on the shop: buying is "a rail and a pocket, not a
  // room to walk about in"). What is a room here is the WALK, which is the half of it he
  // asked for: *"גם במקום שצריך ללכת אליו"*. A hotspot on the bills or the rack would need
  // a conversation to open, and a hotspot whose `act` names no conversation is a hole
  // `npm run life:deadends` reports — so the paper on those walls stays paint until
  // somebody writes what it says.
  //
  // From 1990 only. The office is there in 1985 too, but the first season ticket in the
  // archive is 90/91 — a door into a room with nothing to do in it is dead content
  // (rule 66), and `subscription.ts` decides which years have a card.
  {
    id: TICKET_OFFICE,
    titleHe: 'קופת כרטיסים — תל אביב',
    art: 'ticketOffice',
    /**
     * הרצפה, ואיפה היא נגמרת — measured off the painting and off its own floor tiles.
     *
     * The back wall meets the tiles at y 0.805 and the picture ends at 1.0, so the whole
     * walkable world in this room is the last fifth of the frame. The band starts a step
     * in front of the skirting (0.830) and stops before the bottom edge (0.940), which is
     * also where the newspaper rack and the lectern have their feet: a boy who could walk
     * past those would be walking through them.
     *
     * **הקצב נמדד מהאריחים ולא הוערך.** The hex floor gives a horizontal tile period of
     * 0.0378 of the width at y 0.835 and 0.0486 at y 0.895 and below — 1.29×, which is a
     * room's foreshortening and not a corridor's (rule 50: about 1.3 for a room, up to 1.8
     * down a corridor). Across 0.830 → 0.940 that is 1.32.
     *
     * **המטר** is read off two objects that stand on the floor rather than off the wall,
     * because the wall is behind the counter and the counter is what makes this shop look
     * shallower than it is: the newspaper rack is 1.05 m and is drawn from 0.530 to 0.905,
     * and the lectern is 1.20 m and is drawn from 0.500 to 0.920 — 0.357 and 0.350 of the
     * frame per metre, at the same depth. 0.352 at the near line, and the player therefore
     * comes back out of it at 1.412 m, which is `gate5`'s and `ramat-gan`'s register and
     * the right one: this is a room of the nineties and the two-thousands, never 1986.
     */
    band: { far: 0.830, near: 0.940 },
    size: { far: 0.377, near: 0.497 },
    metre: 0.352,
    ambience: 'interior',
    stuckHe: 'החלון של המנויים. אם יצא מנוי לעונה — הוא נמכר כאן, ורק כאן.',
    actors: [],
    hotspots: [
      /**
       * הסקר בחלון — the clerk asks one question of the club's survey through the slot
       * (`act-ticket-poll`). An answer stays in this life (owner, 21.9.2026): nothing is cast
       * to the gate's ballot. At the window's near edge, clear of the timetable (0.52–0.64).
       */
      {
        id: 'window-poll',
        era: actEra('ticket-poll'),
        x: 0.44,
        y: 0.9,
        w: 0.07,
        act: 'act-ticket-poll',
        verb: 'talk',
        labelHe: 'שאלה מהקופאי',
      },
      /**
       * TRAVELLER · `PLAN_JOURNEY` — החלון, כי כאן כתובים השעות והמחיר.
       *
       * *"לתכנן דרך מאושרת עם מידע בדוק"* — וההבדל בין זה לבין לשלוח מישהו לדרך על סמך
       * מה ששמעת הוא בדיוק החלון הזה: מאחוריו יש לוח, ובלוח יש מספרים שמישהו אחראי להם.
       * זה גם החדר היחיד בעולם שבו הם קיימים, ולכן הוא לא נבחר מתוך כמה אפשרויות.
       *
       * x 0.58 הוא הכיוון שהשחקן נולד לתוכו (`spawns.start` על 0.46, פונה ימינה), ו-y על
       * הרצועה עצמה (0.830–0.940) ולא על מפתן הדלפק שמאחוריה.
       */
      smallAction('PLAN_JOURNEY', 'route-plan-journey', { x: 0.58, y: 0.9, w: 0.12 }, 'look', 'החלון — השעות והמחירים'),
    ],
    exits: [
      {
        /**
         * הדלת לרחוב — on the LEFT of the painting, and it is the only way out.
         *
         * The street shows through it from y 0.33 down to the threshold at 0.79, with the
         * kerb and a striped awning in it. The zone sits on the band rather than on the
         * threshold, because the threshold is behind the far line and a door you cannot
         * reach is not a door (rule 41). `daylight` is the tone reserved for the way OUT
         * of a building, and this room has exactly one.
         */
        id: 'back',
        x: 0.0,
        y: 0.820,
        w: 0.10,
        h: 0.16,
        to: 'allenby',
        spawn: 'fromTickets',
        labelHe: 'החוצה, לאלנבי',
        light: { x: 0.0, y: 0.30, w: 0.095, h: 0.50, tone: 'daylight' },
        dwellMs: 500,
      },
    ],
    /**
     * Standing at the window, facing it, a step clear of the door zone (which ends at
     * x 0.10) — rule 41: no spawn may sit inside an exit.
     */
    spawns: {
      fromStreet: { x: 0.46, y: 0.905, facing: 'right' },
      start: { x: 0.46, y: 0.905, facing: 'right' },
    },
  },

  // -------------------------------------------------------- התחנה המרכזית (1996) ----
  // A platform at dawn. The painting is the nineties' street standing in until the
  // station is drawn (GRAPHICS-REQUESTS); the scene, the clock and the bus are real.
  {
    id: 'bus-station',
    titleHe: 'התחנה המרכזית — רציף',
    art: 'busStation',
    band: { far: 0.705, near: 0.86 },
    size: { far: 0.185, near: 0.29 },
    metre: 0.2106,
    ambience: 'station',
    // 2017–2026: the fans' platform on its own painting (`busStation20`, `rooms2000.ts`)
    repaints: [BUS_STATION_2017],
    stuckHe: 'רציף. שעון. אוטובוס אחד שמגיע בזמן.',
    actors: [],
    hotspots: [
      ...gigSpots('bus-station'),
      /**
       * December 1996 — the decision is the station, not a menu (Director V3 §8). The bus
       * is painted with its door open at 0.29–0.34; the station's glass door is at 0.9; the
       * bench is at 0.6–0.74; the timetable pole at 0.51. Each is one of the answers the old
       * box offered: get on, walk away, sit ("עוד רגע"), or run for another line.
       */
      { id: 'bus', era: '1996-army', x: 0.315, y: 0.76, w: 0.07, act: 'a3-bus', verb: 'enter', labelHe: 'דלת האוטובוס — לעלות', priority: 3, when: { flag: 'life:army:d3' } },
      { id: 'bus-walk-away', era: '1996-army', x: 0.91, y: 0.8, w: 0.07, act: 'a3-walk-away', verb: 'exit', labelHe: 'לא לעלות. לצאת מהרציף', priority: 3, when: { all: [{ flag: 'life:army:d3' }, { notFlag: 'a3:decided' }, { notFlag: 'life:army:d4' }] } },
      { id: 'bus-bench', era: '1996-army', x: 0.67, y: 0.78, w: 0.08, act: 'a3-bench', verb: 'sit', labelHe: 'הספסל — עוד רגע', priority: 2, when: { all: [{ flag: 'life:army:d3' }, { notFlag: 'a3:decided' }, { notFlag: 'life:army:d4' }] } },
      { id: 'bus-timetable', era: '1996-army', x: 0.51, y: 0.8, w: 0.05, act: 'a3-timetable', verb: 'look', labelHe: 'לוח הזמנים על העמוד', priority: 2, when: { all: [{ flag: 'life:army:d3' }, { notFlag: 'a3:decided' }, { notFlag: 'life:army:d4' }] } },
    ],
    exits: [
      {
        id: 'back',
        x: 0.0,
        y: 0.7,
        w: 0.08,
        h: 0.3,
        to: 'street',
        spawn: 'fromBus',
        labelHe: 'חזרה לשכונה',
        light: { x: 0.005, y: 0.45, w: 0.07, h: 0.4, tone: 'daylight' },
        // December 1996, while the bus waits: walking off the platform IS the refusal, and
        // it is the station door (`bus-walk-away`) that says so — not a quiet way home
        whenByEra: { '1996-army': { none: [{ all: [{ flag: 'life:army:d3' }, { notFlag: 'a3:decided' }, { notFlag: 'life:army:d4' }] }] } },
        dwellMs: 600,
      },
      {
        /**
         * 7.5.2026 — עולים לאוטובוס, והוא לשדה התעופה. הדלת של האוטובוס המצויר (0.29–0.34)
         * היא הדלת; מעבר לה — נמל ההגעה באירופה (F02). היא מחכה ל-Q10 (`f-name`) כמו שהשיחה
         * של הדרך מחכה לה: קודם שואלים איך מציגים אותך שם, אחר כך נוסעים.
         */
        id: 'flight',
        // 2023/2025: מי שגר שם וביקר בתל אביב — אותו אוטובוס, חזרה לדירה (דרך הנמל)
        era: ['2026-finale', '2023-abroad', '2025-abroad'],
        x: 0.28,
        y: 0.705,
        w: 0.075,
        h: 0.05,
        to: 'port-europe',
        spawn: 'start',
        labelHe: 'לאוטובוס, לשדה התעופה',
        light: { x: 0.29, y: 0.3, w: 0.05, h: 0.35, tone: 'inside' },
        needs: {
          any: [
            { flag: 'f:name' },
            { flagIs: { flag: 'life:finale:party', value: 'saving' } },
            { notFlag: 'life:finale:party' },
          ],
        },
        needsByEra: { '2023-abroad': null, '2025-abroad': null },
        blockedHe: 'רגע. קובי עוד שואל משהו.',
        dwellMs: 700,
      },
    ],
    spawns: { start: { x: 0.25, y: 0.8, facing: 'right' } },
  },

  // ------------------------------------------------------- אצטדיון רמת גן (1999, 2000) ----
  // אצטדיון רמת גן — ציור ייעודי, קונספט ולא שחזור אדריכלי (27.9.2026). `ramatGan` נכתב מחדש
  // תחת אותו שם: לא עוד היציע התחתון של 5.9.2026 (2.56:1) אלא ציור 16:9 מהמסדרון שליד
  // המסלול — מדרגות עולות ליציע משמאל, המעקה והגדר מול המגרש המואר, הזרקורים. הכול נמדד מחדש:
  //   · הגדר עם המעקה (כ-2.2 מ׳) עומדת בבסיס 0.79 מימין ו-0.705 משמאל, והראש שלה ב-0.55 לכל
  //     אורכה — כלומר הראש שלה הוא האופק, והמצלמה בגובה הגדר: אופק 0.55, מטר = 0.4625 × (y − 0.55).
  //   · הרצועה היא רצפת המסדרון מלפני הגדר (0.80–0.95, רמפה 1.6). גבר בן 1.78 ב-0.80 הוא 0.206
  //     מהמסגרת, ארבע חמישיות מהגדר שמאחוריו — זו הבדיקה.
  // השערים הם המדרגות משמאל (למעלה, ליציע); הדרך הביתה — ימינה, לאורך הגדר, אל מחוץ לתמונה.
  // From 17.9.2026 it also has an OUTSIDE — see the arrival card below.
  {
    id: 'ramat-gan',
    titleHe: 'אצטדיון רמת גן',
    art: 'ramatGan',
    band: { far: 0.8, near: 0.95 },
    size: { far: 0.1503, near: 0.2405 },
    metre: 0.185,
    ambience: 'stadium',
    /**
     * השערים של רמת גן — the arrival, and it is an arrival rather than a room.
     *
     * `ramatGanGates` (17.9.2026) is the forecourt: the turnstiles under **אצטדיון לאומי -
     * רמת גן**, fans in shirts waiting on the tarmac, the floodlight pylon over the roof,
     * nineties cars at the kerb. It is the same relationship `ground` has with
     * `bloomfield-outside` and `streetEast` with `route` — the picture you get before you
     * are inside, which is not a place you stand (rule 52).
     *
     * Once, not twice: `saw:ramatGan` is a person-flag, so the second final does not
     * re-announce a ground he has already walked into. Both chapters that come here are
     * cup finals and both are worth the beat the first time — this is a boy who has never
     * been to the national stadium, and forty thousand people are the point.
     */
    arrival: { art: 'ramatGanGates', ms: 3400, flag: 'saw:ramatGan' },
    stuckHe: 'המדרגות ליציע — משמאל. הביתה — ימינה, לאורך הגדר.',
    // (27.9.2026) no overlays on the new painting: it carries its own floodlight glow, and the old
    // full-frame haze and red smoke — laid over the 5.9 terrace — covered the stairs, the way out
    // and both pylons, and hung red smoke over an empty concourse
    layers: [],
    actors: [],
    /**
     * (Director V3 §12, 25.9.2026) the two finals start at the gates: the turnstiles under
     * the sign are pushed through, and the match is inside them (`c99-kickoff`, `d-kickoff`).
     */
    hotspots: [
      // the stairs up into the stand (0–0.16), where the queue for the turnstiles starts
      { id: 'rg-gate-99', era: '1999-cup', x: 0.1, y: 0.83, w: 0.12, act: 'rg-gate-99', verb: 'enter', labelHe: 'במדרגות ליציע, עם כולם', when: { all: [{ flag: 'c99:arrived' }, { notFlag: 'c99:in' }] }, priority: 4 },
      { id: 'rg-gate-00', era: '2000-double', x: 0.1, y: 0.83, w: 0.12, act: 'rg-gate-00', verb: 'enter', labelHe: 'במדרגות ליציע, עם כולם', when: { all: [{ flag: 'd:arrived' }, { notFlag: 'd:in' }] }, priority: 4 },
    ],
    exits: [
      {
        id: 'back',
        // the concourse carries on out of the frame to the right, along the fence
        x: 0.94,
        y: 0.8,
        w: 0.06,
        h: 0.15,
        to: 'street',
        spawn: 'fromFar',
        labelHe: 'הביתה, אחרי המשחק',
        light: { x: 0.95, y: 0.74, w: 0.05, h: 0.22, tone: 'daylight' },
        dwellMs: 600,
        // the gates are a place you stand in now, so the way home waits for the whistle
        // (only once he is at the gates for the final: a boy who walked here early walks back)
        needsByEra: { '1999-cup': { any: [{ flag: 'c99:over' }, { notFlag: 'c99:arrived' }] }, '2000-double': { any: [{ flag: 'd:over' }, { notFlag: 'd:arrived' }] } },
        blockedByEra: { '1999-cup': 'אחרי המשחק. אף אחד לא יוצא מגמר.', '2000-double': 'אחרי המשחק. אף אחד לא יוצא מגמר.' },
      },
    ],
    spawns: { start: { x: 0.62, y: 0.87, facing: 'left' } },
  },

  // ------------------------------------------------------ שכונת התקווה (13.5.2000) ----
  // Stand-in: the ground outside Bloomfield, under a card that names the quarter.
  {
    id: 'hatikva',
    titleHe: 'שכונת התקווה',
    art: 'hatikva',
    band: { far: 0.8, near: 0.95 },
    size: { far: 0.2, near: 0.29 },
    metre: 0.2053,
    ambience: 'stadium',
    stuckHe: 'מגרש קטן. שכונה שמסתכלת מהמרפסות.',
    layers: [
      // the red smoke rises from the two bottom corners of the whole frame. It was placed from the
      // frame's CENTRE (x 0.5, y 0.5), so one corner of it lay on the pavement in the middle of the
      // picture as a red stain — it read as blood (21.9.2026)
      { art: 'overlaySmoke', x: 0, y: 0, w: 1.0, depth: 0.1, alpha: 0.6, era: '*' },
      // T01 (2001) "ציוד, מתנדבים" and T02 (2012) "מי פותח": the drum is the equipment, on
      // the concrete between the people who carry it (0.55 m; a metre is 0.23 here)
      { art: 'propDrum', era: '2001-terrace', x: 0.59, y: 0.875, w: 0.078, depth: 0.875, foot: true },
      // 1996 — "לענות למלמד": his darbuka, beside him (0.45 m)
      { art: 'propDarbuka', era: '1996-army', x: 0.735, y: 0.895, w: 0.043, depth: 0.895, foot: true },
      { art: 'propDrum', era: '2012-terrace', x: 0.54, y: 0.85, w: 0.075, depth: 0.85, foot: true },
    ],
    actors: [],
    /**
     * 2000 — האישור המקביל (Director V3 §12). After the whistle the room holds three
     * sources, and only two of them are news: the balcony (a rumour), the transistor by the
     * fence (twice), the stranger with the phone. Only on that afternoon, only between the
     * whistle and the count closing.
     */
    hotspots: [
      { id: 't-src-rumour', era: '2000-title', x: 0.52, y: 0.86, w: 0.06, act: 't-src-rumour', verb: 'look', labelHe: 'הצועק מהמרפסת', when: { all: [{ flag: 't:matched' }, { notFlag: 't:confirmed' }] }, priority: 3 },
      { id: 't-src-radio', era: '2000-title', x: 0.68, y: 0.9, w: 0.06, act: 't-src-radio', verb: 'play', labelHe: 'הטרנזיסטור ליד הגדר', when: { all: [{ flag: 't:matched' }, { notFlag: 't:confirmed' }] }, priority: 3 },
      { id: 't-src-phone', era: '2000-title', x: 0.84, y: 0.88, w: 0.06, act: 't-src-phone', verb: 'take', labelHe: 'הפלאפון של האיש ליד הגדר', when: { all: [{ flag: 't:matched' }, { notFlag: 't:confirmed' }] }, priority: 3 },
    ],
    exits: [
      {
        id: 'back',
        x: 0.0,
        y: 0.7,
        w: 0.08,
        h: 0.3,
        to: 'street',
        spawn: 'fromFar',
        labelHe: 'הביתה, אחרי המשחק',
        light: { x: 0.005, y: 0.45, w: 0.07, h: 0.4, tone: 'daylight' },
        dwellMs: 600,
      },
    ],
    spawns: { start: { x: 0.3, y: 0.9, facing: 'right' } },
  },

  // 2000–2026: the rooms Maor painted, each on its own measured floor (`rooms2000.ts`)
  ...NEW_ROOMS,
  // the city, 27.9.2026 — `world/city2027/` (Jaffa, the promenade, Teddy, Europe 2010, Menora…)
  ...CITY_ROOMS,
]

/**
 * האנשים של 2000–2026 נכנסים לחדרים שלהם — לחדר עצמו, או לציור שהחדר עומד עליו באותה
 * שנה. שחקן שהוצב ב-2019 בסלון של ההורים לא יכול לעמוד על הרצפה של `homeAdult`, ולהפך:
 * כל שורה ב-`STAGED` נמדדה על הציור של השנה שלה, ולכן היא נכנסת לצביעה של אותה שנה.
 */
for (const scene of SCENES) {
  for (const actor of [...(STAGED[scene.id] ?? []), ...(PASS_C_STAGED[scene.id] ?? [])]) {
    const era = typeof actor.era === 'string' ? actor.era : ''
    const paint = scene.repaints?.find((r) => r.in(era))
    if (paint) {
      const holder = paint as { actors?: readonly ActorDef[] }
      holder.actors = [...(holder.actors ?? []), actor]
    } else scene.actors.push(actor)
  }
}

/**
 * הדלתות אל העיר (27.9.2026) — every door into a place of `world/city2027/` is declared by
 * the area that owns the place and added here to the room it opens from. A door that
 * belongs to a painting of certain years goes into that painting's `doors`-less exit list
 * exactly like any other exit: `era` on the exit decides the years it exists.
 */
for (const { from, exit, onPaint } of CITY_EXITS) {
  const scene = SCENES.find((s) => s.id === from)
  if (!scene) throw new Error(`city exit from unknown room ${from}`)
  scene.exits.push(exit)
  // a room repainted in the door's years places the door on THAT painting (`Repaint.doors`)
  if (onPaint) {
    for (const paint of scene.repaints ?? []) {
      const at = onPaint[paint.art]
      if (at === undefined) continue
      const holder = paint as { doors?: Record<string, unknown> }
      holder.doors = { ...(holder.doors ?? {}), [exit.id]: at }
    }
  }
}

/**
 * הנקודות של הפרקים הבוגרים (90-E, `quests90e.ts`) — מסירה, מקור, ציוד, כרטיס — נכנסות
 * לציור של השנה שלהן בדיוק כמו האנשים של `STAGED`.
 */
for (const scene of SCENES) {
  for (const spot of [...(QUEST_SPOTS[scene.id] ?? []), ...(PASS_C_SPOTS[scene.id] ?? []), ...(PASS_D_SPOTS[scene.id] ?? [])]) {
    const era = typeof spot.era === 'string' ? spot.era : ''
    const paint = scene.repaints?.find((r) => r.in(era))
    if (paint) {
      const holder = paint as { hotspots?: readonly HotspotDef[] }
      holder.hotspots = [...(holder.hotspots ?? []), spot]
    } else scene.hotspots.push(spot)
  }
}

export const SCENE: Record<Exclude<LocationId, 'prologue-1972'>, SceneDef> = Object.fromEntries(
  SCENES.map((scene) => [scene.id, scene]),
) as Record<Exclude<LocationId, 'prologue-1972'>, SceneDef>

export function sceneFor(id: LocationId): SceneDef {
  return SCENE[id as Exclude<LocationId, 'prologue-1972'>] ?? (SCENES[0] as SceneDef)
}

export const ALL_SCENES: readonly SceneDef[] = SCENES
