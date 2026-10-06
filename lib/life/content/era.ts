import type { HistoricalAnchor } from '../anchors'
import type { RandomEncounter } from '../encounters'
import type { LifeOpportunity } from '../opportunities'
import type { NPCScheduleEntry } from '../schedules'
import type { LocationId, LifeState } from '../types'
import type { Beat } from './beats'

import { AMBIENT_1986, AMBIENT_1990, type AmbientActor } from './ambient1986'
import { ENDINGS, OBJECTIVES, PORTRAIT, type EndingCard } from './chapter1986'
import { ENDINGS_1990, OBJECTIVES_1990, PORTRAIT_1990 } from './chapter1990'
import { ENDINGS_1991, OBJECTIVES_1991, PORTRAIT_1991, TIP_OFF, timeGate1991 } from './chapter1991'
import { BEATS_1993, ENCOUNTERS_1993, ENDINGS_1993, objective1993, PORTRAIT_1993, TIP_OFF_93 } from './chapter1993cup'
import { BEATS_GALIL, ENDINGS_GALIL, objectiveGalil, PORTRAIT_GALIL } from './chapter1993galil'
import { BEATS_SINAI, ENDINGS_SINAI, objectiveSinai, PORTRAIT_SINAI } from './chapter1995sinai'
// 1996 uses the full gameplay chapter again (Director V3, 24.9.2026). The compact Director
// replacement removed world conversations that scenes.ts still points at (Kobi/Barry/Asaf,
// the bus, the winter); its historical and flow corrections now live in chapter1996army.ts.
import { BEATS_ARMY, ENDINGS_ARMY, objectiveArmy, PORTRAIT_ARMY } from './chapter1996army'
import { BEATS_HALL, ENDINGS_HALL, objectiveHall, PORTRAIT_HALL } from './chapter1997basket'
import {
  BEATS_A2, BEATS_A3, BEATS_A4, BEATS_A5, BEATS_A6, BEATS_A7,
  ENDINGS_A2, ENDINGS_A3, ENDINGS_A4, ENDINGS_A5, ENDINGS_A6, ENDINGS_A7,
  objectiveA2, objectiveA3, objectiveA4, objectiveA5, objectiveA6, objectiveA7,
  goalA2, goalA3, goalA4, goalA5, goalA6, goalA7,
  PORTRAIT_STAGE_A,
} from './chapterStageA'
import {
  BEATS_DESK01, BEATS_DESK02, BEATS_INTERVIEW, BEATS_TERRACE01, BEATS_TERRACE02, BEATS_TERRACE03,
  ENDINGS_DESK01, ENDINGS_DESK02, ENDINGS_INTERVIEW, ENDINGS_TERRACE01, ENDINGS_TERRACE02, ENDINGS_TERRACE03,
  objectiveDesk01, objectiveDesk02, objectiveInterview, objectiveTerrace01, objectiveTerrace02, objectiveTerrace03,
  PORTRAIT_CAREER,
} from './chapterCareer'
import { BEATS_FRIENDS, BEATS_LINA, ENDINGS_FRIENDS, ENDINGS_LINA, objectiveFriends, objectiveLina, PORTRAIT_FRIENDS } from './chapterFriends'
import { BEATS_ABROAD, BEATS_REUNION, BEATS_SUITCASE, BEATS_VISIT, ENDINGS_ABROAD, ENDINGS_REUNION, ENDINGS_SUITCASE, ENDINGS_VISIT, objectiveAbroad, objectiveReunion, objectiveSuitcase, objectiveVisit, PORTRAIT_ABROAD } from './chapterAbroad'
import { BEATS_OWNER, ENDINGS_OWNER, objectiveOwner, PORTRAIT_OWNER } from './chapterOwner'
import { COMBO_BEATS } from './chapterCombos'
import { BEATS_TEAM, ENDINGS_TEAM, objectiveTeam, PORTRAIT_TEAM } from './chapterTeam'
import { BEATS_LACES, ENDINGS_LACES, objectiveLaces, PORTRAIT_LACES } from './chapter1998laces'
import { BEATS_SEED, ENDINGS_SEED, objectiveSeed, PORTRAIT_SEED } from './chapter1999basket'
import { BEATS_CUP99, ENDINGS_CUP99, objectiveCup99, PORTRAIT_CUP99 } from './chapter1999cup'
import { BEATS_DOUBLE, BEATS_TITLE, ENDINGS_DOUBLE, ENDINGS_TITLE, objectiveDouble, objectiveTitle, PORTRAIT_2000 } from './chapter2000double'
import { BEATS_BRIDGE, ENDINGS_BRIDGE, objectiveBridge, PORTRAIT_BRIDGE } from './chapter2000bridge'
import { BEATS_EUROPE, ENDINGS_EUROPE, objectiveEurope, PORTRAIT_EUROPE } from './chapter2002europe'
import { BEATS_HOME, ENDINGS_HOME, objectiveHome, PORTRAIT_HOME } from './chapter2006home'
import {
  BEATS_KEY, BEATS_REGISTERED, BEATS_TABLE, BEATS_UP,
  ENDINGS_KEY, ENDINGS_REGISTERED, ENDINGS_TABLE, ENDINGS_UP,
  objectiveKey, objectiveRegistered, objectiveTable, objectiveUp,
  PORTRAIT_FOUNDING,
} from './chapter2007founding'
import { BEATS_CUP10, BEATS_TEDDY, ENDINGS_CUP10, ENDINGS_TEDDY, objectiveCup10, objectiveTeddy, PORTRAIT_2010 } from './chapter2010double'
import { PORTRAIT_CHAMPIONS, objectiveQualify, objectiveAnthem, ENDINGS_QUALIFY, ENDINGS_ANTHEM, BEATS_QUALIFY, BEATS_ANTHEM } from './chapter2010champions'
import { PORTRAIT_GROWTH, objectiveCups, objectiveFive, ENDINGS_CUPS, ENDINGS_FIVE, BEATS_CUPS, BEATS_FIVE } from './chapter2012growth'
import { PORTRAIT_NEWHALL, objectiveNewHall, ENDINGS_NEWHALL, BEATS_NEWHALL } from './chapter2015newhall'
import { PORTRAIT_COLLAPSE, objectiveCrisis, objectiveAfter, ENDINGS_CRISIS, ENDINGS_AFTER, BEATS_CRISIS, BEATS_AFTER } from './chapter2016collapse'
import { PORTRAIT_RETURN, objectiveReturn, objectiveLosses, ENDINGS_RETURN, ENDINGS_LOSSES, BEATS_RETURN, BEATS_LOSSES } from './chapter2018return'
import { PORTRAIT_HOME24, objectiveHome24, goalHome24, ENDINGS_HOME24, BEATS_HOME24 } from './chapter2024home'
import { PORTRAIT_LATE, objectiveTournament, objectiveQuiet, objectiveEurocup, ENDINGS_TOURNAMENT, ENDINGS_QUIET, ENDINGS_EUROCUP, BEATS_TOURNAMENT, BEATS_QUIET, BEATS_EUROCUP } from './chapter2023late'
import { PORTRAIT_FINALE, objectivePlan, objectiveFinale, ENDINGS_PLAN, ENDINGS_FINALE, BEATS_PLAN, BEATS_FINALE } from './chapter2026finale'
import { PORTRAIT_FAMILY, objectivePeople, objectiveHousehold, ENDINGS_PEOPLE, ENDINGS_HOUSEHOLD, BEATS_PEOPLE, BEATS_HOUSEHOLD } from './chapter2011family'
import { PORTRAIT_PROMISES, objectivePromises, ENDINGS_PROMISES, BEATS_PROMISES } from './chapter2021promises'
import { PORTRAIT_WINDOWS, objectiveDistance, objectiveArmchair, ENDINGS_DISTANCE, ENDINGS_ARMCHAIR, BEATS_DISTANCE, BEATS_ARMCHAIR } from './chapterWindows'
import { HERO80_WALK, KID_WALK } from '../runtime/art'
import { ENCOUNTERS_1986 } from './encounters1986'
import { ENCOUNTERS_1990 } from './encounters1990'
import { ENCOUNTERS_1991 } from './encounters1991'
import { encountersForStageB } from './encountersStageB'
import { OPPORTUNITIES_1986 } from './opportunities1986'
import { OPPORTUNITIES_1990 } from './opportunities1990'
import { OPPORTUNITIES_1991 } from './opportunities1991'
import {
  goal1986, goal1990, goal1991, goal1993Cup, goalGalil, goalSinai, goalArmy,
  goalHall, goalLaces, goalSeed, goalCup99, goalTitle, goalDouble, goalBridge, goalEurope, goalHome, goalTable, goalRegistered, goalKeyNight, goalUp, goalCup10, goalTeddy, goalQualify, goalAnthem, goalCups, goalFive, goalNewHall, goalCrisis, goalAfter, goalReturn, goalLosses, goalTournament, goalQuiet, goalEurocup, goalPlan, goalFinale, goalPeople, goalHousehold, goalPromises, goalDistance, goalArmchair, goalTeam, goalTerrace01, goalTerrace02, goalTerrace03, goalDesk01, goalDesk02, goalInterview, goalFriends, goalLina, goalSuitcase, goalVisit, goalOwner, goalAbroad, goalReunion,
} from './goals'
import { HEARD_BEATS, HEARD_CHAPTERS } from './routes'
import { CALLBACK_BEATS } from './callbackBeats'
import { SCHEDULE_1986 } from './schedules1986'
import { SCHEDULE_1990 } from './schedules1990'
import { SCHEDULE_1991 } from './schedules1991'
import { BEATS_1986 } from './threads'
import { facesFor, playerFor, STANDIN_FACES } from '../world/castFigures'
import { ambientFor } from './ambient2000'

/**
 * העידן — everything about a chapter that the runtime used to import by name.
 *
 * `WorldScene` was written for one Saturday and imported that Saturday's timetable, its
 * opportunities, its encounters, its endings and its objectives at the top of the file,
 * by their 1986 names. That was correct for a game with one chapter and it is the one
 * thing that made a second chapter impossible without a second scene — which brief §52
 * forbids in so many words. So the chapter is data: one record per era, looked up from
 * `state.chapter`, and the scene asks the record instead of the import.
 *
 * What is NOT here is deliberate. The rooms (`world/scenes.ts`) are shared — 1990 walks
 * the same street, redressed — and so is the dialogue registry, keyed by conversation id.
 * An era owns the PEOPLE in the rooms (`era` on actors and layers), the timetable, and the
 * shape of its day; it does not own the geography.
 */
export type PlayerFigure = {
  pose: { down: string; downSide: string; side: string; up: string }
  walk: readonly string[]
  /**
   * How tall this year's boy stands against the room's band, which was measured for the
   * eight-year-old. Twelve is a head taller than eight; the rooms do not know that.
   */
  scale?: number
}

export type Era = {
  chapter: string
  year: number
  /** the anchor this chapter's history hangs on — resolved server-side, keyed by chapter */
  anchorKey: string
  schedule: readonly NPCScheduleEntry[]
  opportunities: readonly LifeOpportunity[]
  encounters: readonly RandomEncounter[]
  ambient: readonly AmbientActor[]
  endings: Record<string, EndingCard>
  /** the one vague line under the clock — see `chapter1986.ts` OBJECTIVES */
  objective: (state: LifeState, sceneId: string, matchOver: boolean) => string | null
  /**
   * לאן הפרק רוצה אותך עכשיו — the room this chapter is currently pointing at, or null.
   *
   * The objective says what the day is ABOUT; this says where the day is. They are not the
   * same thing and conflating them is how «אפי אמר שיש משהו אחרי הקיר» became a chapter a
   * player could not leave: a true sentence, in the voice of a six-year-old giving
   * directions, that names no door in a city with six of them on one street.
   *
   * With a destination the game can do the rest itself — `world/route.ts` walks the doors
   * that are open in THIS chapter and finds the next one, so the room says the label that
   * is actually painted on it and the arrow points at it. Return null when the chapter
   * genuinely does not care where the player is; do not return a room he is already in.
   */
  goal?: (state: LifeState) => LocationId | null
  /** the archival film this chapter may open onto, by registry id; null when there is none */
  cutscene: string | null
  /**
   * §12 C for a chapter without beats: when only TIME stands between the player and the
   * next meaningful thing, the gate it is waiting on (see `world/flow.ts`). Optional.
   */
  timeGate?: (state: LifeState) => import('../world/flow').TimeGate | null
  player: PlayerFigure
  /** prefix for memory ids this chapter writes — `1986-the-goal` */
  memoryPrefix: string
  /** speaker → portrait plate, for this chapter's faces */
  portraits: Record<string, string>
  /**
   * הביטים — what the chapter does by itself, as rows (`beats.ts`). Chapters after 1991
   * have no branch in `WorldScene`; everything they play unprompted is here.
   */
  beats?: readonly Beat[]
  /**
   * The clock the chapter's history happens on, for the HUD's second clock and the
   * objective: minute of the anchor's start, or null for a chapter with no fixed hour.
   */
  eventMinute?: number | null
}

/**
 * הגוף לפי גיל — the four figures the September sheets drew for him, as player records.
 * Each walks on two frames (side + walk) the way 1990 does; only the eight-year-old and
 * the twelve-year-old have an eight-frame cycle.
 */
export const TEEN: PlayerFigure = {
  pose: { down: 'teen', downSide: 'teen-3q', side: 'teen-side', up: 'teen-back' },
  walk: ['teen-side', 'teen-walk'],
  scale: 1.22,
}
export const SOLDIER: PlayerFigure = {
  pose: { down: 'soldier', downSide: 'soldier-stand', side: 'soldier-side', up: 'soldier-back' },
  walk: ['soldier-side', 'soldier-march'],
  scale: 1.26,
}
export const YOUNG_MAN: PlayerFigure = {
  pose: { down: 'hero90', downSide: 'hero90-3q', side: 'hero90-side', up: 'hero90-back' },
  walk: ['hero90-side', 'hero90-walk'],
  scale: 1.26,
}

export const ERA_1986: Era = {
  chapter: '1986',
  year: 1986,
  anchorKey: '1986',
  schedule: SCHEDULE_1986,
  opportunities: OPPORTUNITIES_1986,
  encounters: ENCOUNTERS_1986,
  ambient: AMBIENT_1986,
  endings: ENDINGS,
  objective: (state, sceneId, matchOver) => {
    if (state.flags['found:kobi']) return null
    if (sceneId === 'bloomfield-inside' && matchOver) return OBJECTIVES.findKobi
    if (state.flags['entry:granted']) return null
    if (sceneId === 'bloomfield-outside') return OBJECTIVES.atGround
    if (state.flags['kobi:left']) return OBJECTIVES.onTheWay
    if (state.flags['knows:match']) return OBJECTIVES.decideToday
    return OBJECTIVES.matchToday
  },
  goal: goal1986,
  cutscene: '1986-championship',
  player: {
    pose: { down: 'pogi', downSide: 'pogi-3q', side: 'pogi-side', up: 'pogi-back' },
    walk: KID_WALK,
  },
  memoryPrefix: '1986',
  portraits: PORTRAIT,
  /**
   * הבוקר שאחרי — 25.5.1986, יום ראשון, בית ספר. הביט היחיד ב-1986, והוא נתלה על
   * `found:kobi` ולא על סיום הפרק: לילד שלא נכנס ולא מצא את אבא שלו אין מה לספר למחרת.
   */
  beats: BEATS_1986,
}

/**
 * 1990 — twelve, and the same boy. `hero80` is the turnaround Maor drew of Pogi grown out
 * of the first chapter: the tracksuit top, the same face four years on. Two walk frames,
 * for the same reason as 1986 — a matching sheet or nothing.
 */
export const ERA_1990: Era = {
  chapter: '1990',
  year: 1990,
  anchorKey: '1990',
  schedule: SCHEDULE_1990,
  opportunities: OPPORTUNITIES_1990,
  encounters: ENCOUNTERS_1990,
  // The same neighbourhood traffic: the ambient list is location-keyed and nameless, and
  // the people crossing a street in 1990 are the same shapes as in 1986.
  ambient: AMBIENT_1990,
  endings: ENDINGS_1990,
  objective: (state, sceneId, matchOver) => {
    if (state.flags['found:kobi']) return state.flags['walked:home'] ? null : OBJECTIVES_1990.walkHome
    if (sceneId === 'bloomfield-inside' && matchOver) return OBJECTIVES_1990.findKobi
    if (sceneId === 'bloomfield-inside') return OBJECTIVES_1990.promoted
    if (matchOver && !state.flags['entry:granted']) return OBJECTIVES_1990.heardIt
    if (state.flags['entry:granted']) return null
    if (sceneId === 'bloomfield-outside' && state.minute >= 16 * 60 + 48 && !matchOver) return OBJECTIVES_1990.halfGate
    if (sceneId === 'bloomfield-outside' || sceneId === 'route') return OBJECTIVES_1990.gate7
    if (state.flags['kobi:left']) return OBJECTIVES_1990.leftWithout
    if (state.flags['knows:math']) return OBJECTIVES_1990.leaving
    return OBJECTIVES_1990.howMany
  },
  goal: goal1990,
  cutscene: null,
  player: {
    pose: { down: 'hero80', downSide: 'hero80-3q', side: 'hero80-side', up: 'hero80-back' },
    walk: HERO80_WALK,
    scale: 1.12,
  },
  memoryPrefix: '1990',
  portraits: PORTRAIT_1990,
}

/**
 * 1991 — the same boy, ten months later, on a Monday.
 *
 * Everything about this record is a small edit to 1990 and one large idea: the day is
 * not built around a match the father is taking him to. The timetable belongs to a
 * school; the windows compete with each other rather than with a kickoff; the objective
 * chain runs note → homework → permission → the road → the step → a clock on a wall.
 * `cutscene` is null and will stay null until the archive holds film of 11.3.1991 that
 * anybody has the right to play (rule 11): the derby is a row, and a row is enough.
 */
export const ERA_1991: Era = {
  chapter: '1991',
  year: 1991,
  anchorKey: '1991',
  schedule: SCHEDULE_1991,
  opportunities: OPPORTUNITIES_1991,
  encounters: ENCOUNTERS_1991,
  ambient: AMBIENT_1990,
  endings: ENDINGS_1991,
  objective: (state, sceneId) => {
    if (state.chapterDone) return OBJECTIVES_1991.morning
    if (state.flags['derby:over']) return state.flags['walked:home'] ? null : OBJECTIVES_1991.home
    if (sceneId === 'ussishkin-hall') {
      if (state.flags['curfew:now']) return OBJECTIVES_1991.curfew
      if (state.flags['spot:asked'] && !state.flags['spot:held'] && !state.flags['spot:lost']) {
        return OBJECTIVES_1991.spot
      }
      return state.minute < TIP_OFF ? OBJECTIVES_1991.tipoff : null
    }
    if (sceneId === 'classroom' && !state.flags['school:done']) return OBJECTIVES_1991.note
    if (state.flags['permission:yes'] || state.flags['sneak:ready']) return OBJECTIVES_1991.onTheWay
    if (state.flags['hw:done'] || state.flags['hw:half'] || state.flags['hw:faked']) {
      return OBJECTIVES_1991.permission
    }
    if (state.flags['hw:given'] && state.flags['school:done']) return OBJECTIVES_1991.homework
    return OBJECTIVES_1991.school
  },
  goal: goal1991,
  timeGate: timeGate1991,
  cutscene: null,
  player: {
    pose: { down: 'hero80', downSide: 'hero80-3q', side: 'hero80-side', up: 'hero80-back' },
    walk: HERO80_WALK,
    // A centimetre on 1990. He is not a new person; he is the same one, in March.
    scale: 1.14,
  },
  memoryPrefix: '1991',
  portraits: PORTRAIT_1991,
}

/**
 * 1993 — fifteen, and the day is not built around a father at all.
 *
 * The first chapter written as DATA: no branch in `WorldScene`, everything the day does
 * by itself is a row in `BEATS_1993`, and the chapter file holds its people, its ends and
 * its objective. `teen` is the figure the September sheets drew for him at this age.
 */
export const ERA_1993_CUP: Era = {
  chapter: '1993-cup',
  year: 1993,
  anchorKey: '1993-cup',
  schedule: [],
  opportunities: [],
  encounters: ENCOUNTERS_1993,
  ambient: AMBIENT_1990,
  endings: ENDINGS_1993,
  objective: (state, sceneId) => objective1993(state, sceneId),
  goal: goal1993Cup,
  cutscene: null,
  player: TEEN,
  memoryPrefix: '1993-cup',
  portraits: PORTRAIT_1993,
  beats: BEATS_1993,
  eventMinute: TIP_OFF_93,
}

export const ERA_1993_GALIL: Era = {
  chapter: '1993-galil',
  year: 1993,
  anchorKey: '1993-galil',
  schedule: [],
  opportunities: [],
  encounters: encountersForStageB('1993-galil'),
  ambient: AMBIENT_1990,
  endings: ENDINGS_GALIL,
  objective: (state, sceneId) => objectiveGalil(state, sceneId),
  goal: goalGalil,
  cutscene: null,
  player: TEEN,
  memoryPrefix: '1993-galil',
  portraits: PORTRAIT_GALIL,
  beats: BEATS_GALIL,
  eventMinute: null,
}

export const ERA_1995_SINAI: Era = {
  chapter: '1995-sinai',
  year: 1994,
  anchorKey: '1994-cup',
  schedule: [],
  opportunities: [],
  encounters: encountersForStageB('1995-sinai'),
  ambient: AMBIENT_1990,
  endings: ENDINGS_SINAI,
  objective: (state) => objectiveSinai(state),
  goal: goalSinai,
  cutscene: null,
  player: TEEN,
  memoryPrefix: '1995-sinai',
  portraits: PORTRAIT_SINAI,
  beats: BEATS_SINAI,
  eventMinute: null,
}

export const ERA_1996_ARMY: Era = {
  chapter: '1996-army',
  year: 1996,
  anchorKey: '1997-sale',
  schedule: [],
  opportunities: [],
  encounters: encountersForStageB('1996-army'),
  ambient: AMBIENT_1990,
  endings: ENDINGS_ARMY,
  objective: (state, sceneId) => objectiveArmy(state, sceneId),
  goal: goalArmy,
  cutscene: null,
  player: SOLDIER,
  memoryPrefix: '1996-army',
  portraits: PORTRAIT_ARMY,
  beats: BEATS_ARMY,
  eventMinute: null,
}

/**
 * B7–B11 — the second half of the decade, one record each.
 *
 * They share a shape on purpose: no timetable (the beats ARE the timetable), no
 * opportunities, no random encounters. A chapter that is a single evening does not need
 * a neighbourhood that goes on without you; it needs the four people who matter placed
 * where the beat says, and a clock that only moves when the story does.
 */
function stageB(chapter: string, year: number, anchorKey: string, extra: Pick<Era, 'endings' | 'objective' | 'portraits' | 'beats' | 'player' | 'goal'>): Era {
  return {
    chapter,
    year,
    anchorKey,
    schedule: [],
    opportunities: [],
    encounters: encountersForStageB(chapter),
    ambient: AMBIENT_1990,
    cutscene: null,
    memoryPrefix: chapter,
    eventMinute: null,
    ...extra,
  }
}

export const ERA_1997_BASKET = stageB('1997-basket', 1997, '1997-relegation', {
  endings: ENDINGS_HALL,
  objective: (state) => objectiveHall(state),
  goal: goalHall,
  portraits: PORTRAIT_HALL,
  beats: BEATS_HALL,
  player: YOUNG_MAN,
})

export const ERA_1998_LACES = stageB('1998-laces', 1998, '1998', {
  endings: ENDINGS_LACES,
  objective: (state, sceneId) => objectiveLaces(state, sceneId),
  goal: goalLaces,
  portraits: PORTRAIT_LACES,
  beats: BEATS_LACES,
  player: YOUNG_MAN,
})

export const ERA_1999_BASKET = stageB('1999-basket', 1999, '1999-relegation', {
  endings: ENDINGS_SEED,
  objective: (state, sceneId) => objectiveSeed(state, sceneId),
  goal: goalSeed,
  portraits: PORTRAIT_SEED,
  beats: BEATS_SEED,
  player: YOUNG_MAN,
})

export const ERA_1999_CUP = stageB('1999-cup', 1999, '1999-cup', {
  endings: ENDINGS_CUP99,
  objective: (state, sceneId) => objectiveCup99(state, sceneId),
  goal: goalCup99,
  portraits: PORTRAIT_CUP99,
  beats: BEATS_CUP99,
  player: YOUNG_MAN,
})

export const ERA_2000_TITLE = stageB('2000-title', 2000, '2000-title', {
  endings: ENDINGS_TITLE,
  objective: (state, sceneId) => objectiveTitle(state, sceneId),
  goal: goalTitle,
  portraits: PORTRAIT_2000,
  beats: BEATS_TITLE,
  player: YOUNG_MAN,
})

export const ERA_2000_DOUBLE = stageB('2000-double', 2000, '2000-cup', {
  endings: ENDINGS_DOUBLE,
  objective: (state, sceneId) => objectiveDouble(state, sceneId),
  goal: goalDouble,
  portraits: PORTRAIT_2000,
  beats: BEATS_DOUBLE,
  player: YOUNG_MAN,
})

/**
 * ...והפרק שאחריו, שהוא הראשון של תסריט ההמשך.
 *
 * `stageB` עדיין מתאים לו כצורה — אותם חדרים, אותה דמות, אותו עוגן — אבל הוא **לא**
 * שלב ב׳: `stage: 'C'` ב-`chapters.ts` אומר שהמקור שלו הוא תסריט 2000–2026 ולא
 * הבריף המקורי. העוגן נשאר `2000-cup`, כי הגמר הוא מה שקרה **אתמול** בחיים האלה.
 */
export const ERA_2000_BRIDGE = stageB('2000-bridge', 2000, '2000-cup', {
  endings: ENDINGS_BRIDGE,
  objective: (state, sceneId) => objectiveBridge(state, sceneId),
  goal: goalBridge,
  portraits: PORTRAIT_BRIDGE,
  beats: BEATS_BRIDGE,
  player: YOUNG_MAN,
})

/** 2001–2002 — המסע, והפרק הראשון שנתלה על הפסד (`2002-milan`, סן סירו) */
/**
 * 2007 — שלושה פרקים, וזה מבנה שהפסגה כופה (ראה `chapter2007founding.ts`).
 * 2009 — הרביעי, והוא כבר לא ייסוד אלא מה שגדל ממנו.
 */
export const ERA_2007_TABLE = stageB('2007-table', 2007, '2007-founding', {
  endings: ENDINGS_TABLE, objective: (state, sceneId) => objectiveTable(state, sceneId),
  goal: goalTable, portraits: PORTRAIT_FOUNDING, beats: BEATS_TABLE, player: YOUNG_MAN,
})
export const ERA_2007_REGISTERED = stageB('2007-registered', 2007, '2007-demolition', {
  endings: ENDINGS_REGISTERED, objective: (state, sceneId) => objectiveRegistered(state, sceneId),
  goal: goalRegistered, portraits: PORTRAIT_FOUNDING, beats: BEATS_REGISTERED, player: YOUNG_MAN,
})
export const ERA_2007_KEY = stageB('2007-key', 2007, '2007-founding', {
  endings: ENDINGS_KEY, objective: (state, sceneId) => objectiveKey(state, sceneId),
  goal: goalKeyNight, portraits: PORTRAIT_FOUNDING, beats: BEATS_KEY, player: YOUNG_MAN,
})
/** 2010 — הדאבל השני, בשני פרקים מאותה סיבה שהראשון היה */
export const ERA_2010_CUP = stageB('2010-cup', 2010, '2010-cup', {
  endings: ENDINGS_CUP10, objective: (state, sceneId) => objectiveCup10(state, sceneId),
  goal: goalCup10, portraits: PORTRAIT_2010, beats: BEATS_CUP10, player: YOUNG_MAN,
})
export const ERA_2010_TEDDY = stageB('2010-teddy', 2010, '2010-title', {
  endings: ENDINGS_TEDDY, objective: (state, sceneId) => objectiveTeddy(state, sceneId),
  goal: goalTeddy, portraits: PORTRAIT_2010, beats: BEATS_TEDDY, player: YOUNG_MAN,
})
/** 2010 — אירופה, בשני פרקים: הקיץ שהעלה לשלב הבתים, והסתיו שבתוכו */
export const ERA_2010_QUALIFY = stageB('2010-qualify', 2010, '2010-salzburg', {
  endings: ENDINGS_QUALIFY, objective: (state, sceneId) => objectiveQualify(state, sceneId),
  goal: goalQualify, portraits: PORTRAIT_CHAMPIONS, beats: BEATS_QUALIFY, player: YOUNG_MAN,
})
export const ERA_2010_ANTHEM = stageB('2010-anthem', 2010, '2010-benfica', {
  endings: ENDINGS_ANTHEM, objective: (state, sceneId) => objectiveAnthem(state, sceneId),
  goal: goalAnthem, portraits: PORTRAIT_CHAMPIONS, beats: BEATS_ANTHEM, player: YOUNG_MAN,
})
/** 2011–2013 — הצלחה אינה מנוחה, בשני פרקים */
export const ERA_2012_CUPS = stageB('2012-cups', 2012, '2012-cup', {
  endings: ENDINGS_CUPS, objective: (state, sceneId) => objectiveCups(state, sceneId),
  goal: goalCups, portraits: PORTRAIT_GROWTH, beats: BEATS_CUPS, player: YOUNG_MAN,
})
export const ERA_2012_FIVE = stageB('2012-five', 2012, '2012-promotion', {
  endings: ENDINGS_FIVE, objective: (state, sceneId) => objectiveFive(state, sceneId),
  goal: goalFive, portraits: PORTRAIT_GROWTH, beats: BEATS_FIVE, player: YOUNG_MAN,
})
/** 2015–2016 — בית עם כתובת אחרת */
export const ERA_2015_NEWHALL = stageB('2015-newhall', 2015, '2015-drivein', {
  endings: ENDINGS_NEWHALL, objective: (state, sceneId) => objectiveNewHall(state, sceneId),
  goal: goalNewHall, portraits: PORTRAIT_NEWHALL, beats: BEATS_NEWHALL, player: YOUNG_MAN,
})
/** 2016–2018 — מה נשאר אחרי המספרים */
export const ERA_2016_CRISIS = stageB('2016-crisis', 2016, '2016-freeze', {
  endings: ENDINGS_CRISIS, objective: (state, sceneId) => objectiveCrisis(state, sceneId),
  goal: goalCrisis, portraits: PORTRAIT_COLLAPSE, beats: BEATS_CRISIS, player: YOUNG_MAN,
})
export const ERA_2017_AFTER = stageB('2017-after', 2017, '2017-nine', {
  endings: ENDINGS_AFTER, objective: (state, sceneId) => objectiveAfter(state, sceneId),
  goal: goalAfter, portraits: PORTRAIT_COLLAPSE, beats: BEATS_AFTER, player: YOUNG_MAN,
})
/** 2018–2022 — חוזרים אחרת */
export const ERA_2018_RETURN = stageB('2018-return', 2018, '2018-promotion', {
  endings: ENDINGS_RETURN, objective: (state, sceneId) => objectiveReturn(state, sceneId),
  goal: goalReturn, portraits: PORTRAIT_RETURN, beats: BEATS_RETURN, player: YOUNG_MAN,
})
export const ERA_2021_LOSSES = stageB('2021-losses', 2021, '2021-cup', {
  endings: ENDINGS_LOSSES, objective: (state, sceneId) => objectiveLosses(state, sceneId),
  goal: goalLosses, portraits: PORTRAIT_RETURN, beats: BEATS_LOSSES, player: YOUNG_MAN,
})
/** 2023–2025 — שני סיפורים באותו צבע */
export const ERA_2023_TOURNAMENT = stageB('2023-tournament', 2023, '2023-derby', {
  endings: ENDINGS_TOURNAMENT, objective: (state, sceneId) => objectiveTournament(state, sceneId),
  goal: goalTournament, portraits: PORTRAIT_LATE, beats: BEATS_TOURNAMENT, player: YOUNG_MAN,
})
export const ERA_2023_QUIET = stageB('2023-quiet', 2023, '2024-relegation', {
  endings: ENDINGS_QUIET, objective: (state, sceneId) => objectiveQuiet(state, sceneId),
  goal: goalQuiet, portraits: PORTRAIT_LATE, beats: BEATS_QUIET, player: YOUNG_MAN,
})
/** 2024 — איפה הבית? (תנ"ך מהדורה 2) */
export const ERA_2024_HOME = stageB('2024-home', 2024, '2024-safra', {
  endings: ENDINGS_HOME24, objective: (state, sceneId) => objectiveHome24(state, sceneId),
  goal: goalHome24, portraits: PORTRAIT_HOME24, beats: BEATS_HOME24, player: YOUNG_MAN,
})
export const ERA_2025_EUROCUP = stageB('2025-eurocup', 2025, '2025-eurocup', {
  endings: ENDINGS_EUROCUP, objective: (state, sceneId) => objectiveEurocup(state, sceneId),
  goal: goalEurocup, portraits: PORTRAIT_LATE, beats: BEATS_EUROCUP, player: YOUNG_MAN,
})
/** 2025–2026 — סוף הציר הראשי */
export const ERA_2026_PLAN = stageB('2026-plan', 2025, '2025-promotion', {
  endings: ENDINGS_PLAN, objective: (state, sceneId) => objectivePlan(state, sceneId),
  goal: goalPlan, portraits: PORTRAIT_FINALE, beats: BEATS_PLAN, player: YOUNG_MAN,
})
export const ERA_2026_FINALE = stageB('2026-finale', 2026, '2026-botevgrad', {
  endings: ENDINGS_FINALE, objective: (state, sceneId) => objectiveFinale(state, sceneId),
  goal: goalFinale, portraits: PORTRAIT_FINALE, beats: BEATS_FINALE, player: YOUNG_MAN,
})
/** חיי בית — ענף רשות, בשני פרקים */
export const ERA_2011_PEOPLE = stageB('2011-people', 2011, '2011-cup', {
  endings: ENDINGS_PEOPLE, objective: (state, sceneId) => objectivePeople(state, sceneId),
  goal: goalPeople, portraits: PORTRAIT_FAMILY, beats: BEATS_PEOPLE, player: YOUNG_MAN,
})
export const ERA_2013_HOUSEHOLD = stageB('2013-household', 2013, '2012-derby', {
  endings: ENDINGS_HOUSEHOLD, objective: (state, sceneId) => objectiveHousehold(state, sceneId),
  goal: goalHousehold, portraits: PORTRAIT_FAMILY, beats: BEATS_HOUSEHOLD, player: YOUNG_MAN,
})
export const ERA_2021_PROMISES = stageB('2021-promises', 2021, '2021-cup', {
  endings: ENDINGS_PROMISES, objective: (state, sceneId) => objectivePromises(state, sceneId),
  goal: goalPromises, portraits: PORTRAIT_PROMISES, beats: BEATS_PROMISES, player: YOUNG_MAN,
})
/** חלונות חיים — נפתחים רק בחיים שהרוויחו אותם (`ChapterDef.when`) */
export const ERA_2017_DISTANCE = stageB('2017-distance', 2017, '2017-nine', {
  endings: ENDINGS_DISTANCE, objective: (state, sceneId) => objectiveDistance(state, sceneId),
  goal: goalDistance, portraits: PORTRAIT_WINDOWS, beats: BEATS_DISTANCE, player: YOUNG_MAN,
})
export const ERA_2019_ARMCHAIR = stageB('2019-armchair', 2019, '2018-promotion', {
  endings: ENDINGS_ARMCHAIR, objective: (state, sceneId) => objectiveArmchair(state, sceneId),
  goal: goalArmchair, portraits: PORTRAIT_WINDOWS, beats: BEATS_ARMCHAIR, player: YOUNG_MAN,
})
/** חלון TOURNAMENT — קיץ 2000, "עוד התקפה אחת" */
export const ERA_2000_TEAM = stageB('2000-team', 2000, '2000-cup', {
  endings: ENDINGS_TEAM, objective: (state, sceneId) => objectiveTeam(state, sceneId),
  goal: goalTeam, portraits: PORTRAIT_TEAM, beats: BEATS_TEAM, player: YOUNG_MAN,
})
/** חלונות CAREER — T01–T03, J01–J03 (`chapterCareer.ts`) */
export const ERA_2001_TERRACE = stageB('2001-terrace', 2001, '2000-cup', {
  endings: ENDINGS_TERRACE01, objective: (state, sceneId) => objectiveTerrace01(state, sceneId),
  goal: goalTerrace01, portraits: PORTRAIT_CAREER, beats: BEATS_TERRACE01, player: YOUNG_MAN,
})
export const ERA_2002_DESK = stageB('2002-desk', 2002, '2002-milan', {
  endings: ENDINGS_DESK01, objective: (state, sceneId) => objectiveDesk01(state, sceneId),
  goal: goalDesk01, portraits: PORTRAIT_CAREER, beats: BEATS_DESK01, player: YOUNG_MAN,
})
export const ERA_2006_DESK = stageB('2006-desk', 2006, '2004-derby', {
  endings: ENDINGS_DESK02, objective: (state, sceneId) => objectiveDesk02(state, sceneId),
  goal: goalDesk02, portraits: PORTRAIT_CAREER, beats: BEATS_DESK02, player: YOUNG_MAN,
})
export const ERA_2012_TERRACE = stageB('2012-terrace', 2012, '2012-promotion', {
  endings: ENDINGS_TERRACE02, objective: (state, sceneId) => objectiveTerrace02(state, sceneId),
  goal: goalTerrace02, portraits: PORTRAIT_CAREER, beats: BEATS_TERRACE02, player: YOUNG_MAN,
})
export const ERA_2024_TERRACE = stageB('2024-terrace', 2024, '2024-relegation', {
  endings: ENDINGS_TERRACE03, objective: (state, sceneId) => objectiveTerrace03(state, sceneId),
  goal: goalTerrace03, portraits: PORTRAIT_CAREER, beats: BEATS_TERRACE03, player: YOUNG_MAN,
})
export const ERA_2025_INTERVIEW = stageB('2025-interview', 2025, '2025-eurocup', {
  endings: ENDINGS_INTERVIEW, objective: (state, sceneId) => objectiveInterview(state, sceneId),
  goal: goalInterview, portraits: PORTRAIT_CAREER, beats: BEATS_INTERVIEW, player: YOUNG_MAN,
})
/** חלון INTERNATIONAL — I01–I03 (2010), I04 (2024) */
export const ERA_2010_FRIENDS = stageB('2010-friends', 2010, '2010-salzburg', {
  endings: ENDINGS_FRIENDS, objective: (state, sceneId) => objectiveFriends(state, sceneId),
  goal: goalFriends, portraits: PORTRAIT_FRIENDS, beats: BEATS_FRIENDS, player: YOUNG_MAN,
})
export const ERA_2024_LINA = stageB('2024-lina', 2024, '2024-relegation', {
  endings: ENDINGS_LINA, objective: (state, sceneId) => objectiveLina(state, sceneId),
  goal: goalLina, portraits: PORTRAIT_FRIENDS, beats: BEATS_LINA, player: YOUNG_MAN,
})
/** חלון ABROAD — X01 (2021), X04 (2023) */
export const ERA_2021_SUITCASE = stageB('2021-suitcase', 2021, '2021-cup', {
  endings: ENDINGS_SUITCASE, objective: (state, sceneId) => objectiveSuitcase(state, sceneId),
  goal: goalSuitcase, portraits: PORTRAIT_ABROAD, beats: BEATS_SUITCASE, player: YOUNG_MAN,
})
export const ERA_2023_VISIT = stageB('2023-visit', 2023, '2024-relegation', {
  endings: ENDINGS_VISIT, objective: (state, sceneId) => objectiveVisit(state, sceneId),
  goal: goalVisit, portraits: PORTRAIT_ABROAD, beats: BEATS_VISIT, player: YOUNG_MAN,
})
/** X02–X03, Q05 — הדירה שם, ערב הדרבי של 2023 */
export const ERA_2023_ABROAD = stageB('2023-abroad', 2023, '2023-derby', {
  endings: ENDINGS_ABROAD, objective: (state, sceneId) => objectiveAbroad(state, sceneId),
  goal: goalAbroad, portraits: PORTRAIT_ABROAD, beats: BEATS_ABROAD, player: YOUNG_MAN,
})
/** X05 — הדירה שם, לקראת 2026 */
export const ERA_2025_ABROAD = stageB('2025-abroad', 2025, '2025-eurocup', {
  endings: ENDINGS_REUNION, objective: (state, sceneId) => objectiveReunion(state, sceneId),
  goal: goalReunion, portraits: PORTRAIT_ABROAD, beats: BEATS_REUNION, player: YOUNG_MAN,
})
/** חלון OWNER — O01–O05, ענף בדיוני, קיץ 2025 */
export const ERA_2025_OWNER = stageB('2025-owner', 2025, '2025-eurocup', {
  endings: ENDINGS_OWNER, objective: (state, sceneId) => objectiveOwner(state, sceneId),
  goal: goalOwner, portraits: PORTRAIT_OWNER, beats: BEATS_OWNER, player: YOUNG_MAN,
})
export const ERA_2009_UP = stageB('2009-up', 2009, '2009-promotion', {
  endings: ENDINGS_UP, objective: (state, sceneId) => objectiveUp(state, sceneId),
  goal: goalUp, portraits: PORTRAIT_FOUNDING, beats: BEATS_UP, player: YOUNG_MAN,
})

/** 2004–2006 — הבית הישן, ומה שנשאר כשהוא מפסיק להיות מקום המשחק */
export const ERA_2006_HOME = stageB('2006-home', 2006, '2004-derby', {
  endings: ENDINGS_HOME,
  objective: (state, sceneId) => objectiveHome(state, sceneId),
  goal: goalHome,
  portraits: PORTRAIT_HOME,
  beats: BEATS_HOME,
  player: YOUNG_MAN,
})

export const ERA_2002_EUROPE = stageB('2002-europe', 2002, '2002-milan', {
  endings: ENDINGS_EUROPE,
  objective: (state, sceneId) => objectiveEurope(state, sceneId),
  goal: goalEurope,
  portraits: PORTRAIT_EUROPE,
  beats: BEATS_EUROPE,
  player: YOUNG_MAN,
})

/** the six days before the Saturday — the same boy, the same rooms, a beat each */
function stageA(chapter: string, year: number, extra: Pick<Era, 'endings' | 'objective' | 'beats' | 'goal'> & Partial<Pick<Era, 'anchorKey' | 'player'>>): Era {
  return {
    chapter,
    year,
    anchorKey: '1986',
    schedule: [],
    opportunities: [],
    encounters: [],
    ambient: AMBIENT_1990,
    cutscene: null,
    player: ERA_1986.player,
    memoryPrefix: chapter,
    portraits: PORTRAIT_STAGE_A,
    eventMinute: null,
    ...extra,
  }
}

export const ERA_A2 = stageA('a2-alley', 1984, { endings: ENDINGS_A2, objective: (state, sceneId) => objectiveA2(state, sceneId), beats: BEATS_A2, goal: goalA2 })
export const ERA_A3 = stageA('a3-hall', 1992, { anchorKey: '1993-cup', player: ERA_1990.player, endings: ENDINGS_A3, objective: (state, sceneId) => objectiveA3(state, sceneId), beats: BEATS_A3, goal: goalA3 })
export const ERA_A4 = stageA('a4-shirt', 1985, { endings: ENDINGS_A4, objective: (state, sceneId) => objectiveA4(state, sceneId), beats: BEATS_A4, goal: goalA4 })
export const ERA_A5 = stageA('a5-first', 1985, { anchorKey: '1985-hpt', endings: ENDINGS_A5, objective: (state, sceneId) => objectiveA5(state, sceneId), beats: BEATS_A5, goal: goalA5 })
export const ERA_A6 = stageA('a6-radio', 1985, { anchorKey: '1985-bj', endings: ENDINGS_A6, objective: (state, sceneId) => objectiveA6(state, sceneId), beats: BEATS_A6, goal: goalA6 })
export const ERA_A7 = stageA('a7-week', 1986, { endings: ENDINGS_A7, objective: (state, sceneId) => objectiveA7(state, sceneId), beats: BEATS_A7, goal: goalA7 })

/**
 * הפנים בתיבה הן הפנים על הרצפה (21.9.2026).
 *
 * כל פרק מ-1990 ועד 2026 מיפה את `פוגי` ל-`faceHero80` — הילד בן השתים-עשרה עם הצעיף —
 * כולל פרקים שבהם הדמות שהולכת על הרצפה היא חייל (`SOLDIER`) או איש צעיר (`YOUNG_MAN`,
 * הגוף של `hero90`). בשיחה של 2019 מול בלומפילד המחודש ישב בתיבה ילד. `faceHero90` ו-
 * `faceSoldier` צוירו כלוחות דיוקן (`PORTRAIT_ART`) לאותם גופים ולא חוברו לשום פרק.
 *
 * אז הלוח נגזר מהגוף, במקום אחד, ולא בארבעים מפות: פרק שהשחקן בו לובש `hero90` מדבר
 * עם `faceHero90`, ופרק שהוא חייל בו — עם `faceSoldier`. מפה שבחרה במכוון משהו אחר
 * (`facePogi` של 1986) לא נדרסת: רק ברירת המחדל של הילד מוחלפת.
 */
const FACE_OF_BODY: Record<string, string> = { hero90: 'faceHero90', soldier: 'faceSoldier' }
/**
 * ...ואותו דבר לחברים. `faceOfir`, `faceAmit` ו-`faceKeren` הם החיתוכים הישנים של ילדי
 * 1986 (צ'יבי, ראש גדול — `ART-BRIEF-COMPLETE.md` כבר קרא להם "לצייר מחדש"), והם דיברו
 * בתיבה עד 2026. הלוחות של 1990 (`faceOfir90`, `faceAmit90`, `faceKeren90`) הם הפנים של
 * הגופים `ofir90`/`amit90`/`keren90` שעומדים בחדרים מאז 1990 — ורק `1991` חיבר אחד מהם.
 * עדיין לא בני ארבעים; אבל אדם צעיר קרוב לאיש בן ארבעים יותר מילד בן שמונה.
 */
// 21.9.2026: and Kobi — `kobi90` has stood in every room since 1990 and the box still showed
// the man of the 1986 concept board
// ...and Efi, who stands on `efi96` from 1991 (four years older than Pogi — 17 that year)
const GROWN_PLATE: Record<string, string> = { faceOfir: 'faceOfir90', faceAmit: 'faceAmit90', faceKeren: 'faceKeren90', faceKobi: 'faceKobi90', faceEfi: 'faceEfi96', faceRachel: 'faceRachel90' }
function ownFace(era: Era): Era['portraits'] {
  let portraits = era.portraits
  // 2000 on: the people of the adult life speak with the face of the body they stand on
  // (`FACES_2000`) — Dor was a boy of thirteen in the box and a woman on the floor
  // (24.9.2026: by year — the faces age with the bodies, `castFigures.ts` `faceFromYear`)
  if (era.year >= 2000) portraits = { ...portraits, ...facesFor(era.year) }
  // Freddy and Melamed stand on clean stand-ins from their first chapter (1995, 1996): their
  // own sheets are drawn, not photographed, and so were the plates cut from them
  else if (era.year >= 1990) portraits = { ...portraits, ...STANDIN_FACES }
  const face = FACE_OF_BODY[era.player.pose.down]
  if (face && portraits['פוגי'] === 'faceHero80') portraits = { ...portraits, 'פוגי': face }
  if (era.year >= 1990) {
    const grown = Object.entries(portraits).filter(([, plate]) => GROWN_PLATE[plate])
    if (grown.length > 0) portraits = { ...portraits, ...Object.fromEntries(grown.map(([who, plate]) => [who, GROWN_PLATE[plate]!])) }
  }
  return portraits
}

const ERAS: Record<string, Era> = {
  'a2-alley': ERA_A2,
  'a3-hall': ERA_A3,
  'a4-shirt': ERA_A4,
  'a5-first': ERA_A5,
  'a6-radio': ERA_A6,
  'a7-week': ERA_A7,
  '1986': ERA_1986,
  '1990': ERA_1990,
  '1991': ERA_1991,
  '1993-cup': ERA_1993_CUP,
  '1993-galil': ERA_1993_GALIL,
  '1995-sinai': ERA_1995_SINAI,
  '1996-army': ERA_1996_ARMY,
  '1997-basket': ERA_1997_BASKET,
  '1998-laces': ERA_1998_LACES,
  '1999-basket': ERA_1999_BASKET,
  '1999-cup': ERA_1999_CUP,
  '2000-title': ERA_2000_TITLE,
  '2000-double': ERA_2000_DOUBLE,
  '2000-bridge': ERA_2000_BRIDGE,
  '2002-europe': ERA_2002_EUROPE,
  '2006-home': ERA_2006_HOME,
  '2007-table': ERA_2007_TABLE,
  '2007-registered': ERA_2007_REGISTERED,
  '2007-key': ERA_2007_KEY,
  '2009-up': ERA_2009_UP,
  '2010-cup': ERA_2010_CUP,
  '2010-teddy': ERA_2010_TEDDY,
  '2010-qualify': ERA_2010_QUALIFY,
  '2010-anthem': ERA_2010_ANTHEM,
  '2012-cups': ERA_2012_CUPS,
  '2012-five': ERA_2012_FIVE,
  '2015-newhall': ERA_2015_NEWHALL,
  '2016-crisis': ERA_2016_CRISIS,
  '2017-after': ERA_2017_AFTER,
  '2018-return': ERA_2018_RETURN,
  '2021-losses': ERA_2021_LOSSES,
  '2023-tournament': ERA_2023_TOURNAMENT,
  '2023-quiet': ERA_2023_QUIET,
  '2024-home': ERA_2024_HOME,
  '2025-eurocup': ERA_2025_EUROCUP,
  '2026-plan': ERA_2026_PLAN,
  '2026-finale': ERA_2026_FINALE,
  '2011-people': ERA_2011_PEOPLE,
  '2013-household': ERA_2013_HOUSEHOLD,
  '2021-promises': ERA_2021_PROMISES,
  '2017-distance': ERA_2017_DISTANCE,
  '2019-armchair': ERA_2019_ARMCHAIR,
  '2000-team': ERA_2000_TEAM,
  '2001-terrace': ERA_2001_TERRACE,
  '2002-desk': ERA_2002_DESK,
  '2006-desk': ERA_2006_DESK,
  '2012-terrace': ERA_2012_TERRACE,
  '2024-terrace': ERA_2024_TERRACE,
  '2025-interview': ERA_2025_INTERVIEW,
  '2010-friends': ERA_2010_FRIENDS,
  '2024-lina': ERA_2024_LINA,
  '2021-suitcase': ERA_2021_SUITCASE,
  '2023-visit': ERA_2023_VISIT,
  '2023-abroad': ERA_2023_ABROAD,
  '2025-abroad': ERA_2025_ABROAD,
  '2025-owner': ERA_2025_OWNER,
}

/**
 * אירועי הידיעה של המסלולים — beats that belong to a SYSTEM, not to a Saturday.
 *
 * Two of the six proof missions have no witness on purpose (`content/routes.ts`), so
 * their standing waits in `reputation.pending` for somebody to find out. The two
 * conversations that do the finding out existed and nothing in the game opened them.
 * They are attached here, once, to every chapter old enough for a route to pay for
 * anything — rather than pasted into eight `BEATS_*` arrays, where the ninth chapter
 * would be written without them and nobody would notice for a month.
 *
 * A chapter's own beats stay FIRST. `WorldScene` runs the first row that is due, and a
 * chapter's opening line, its clock and its ending are its own business; a supplier
 * saying your name waits its turn behind them.
 */
for (const chapter of HEARD_CHAPTERS) {
  const era = ERAS[chapter]
  if (!era) continue
  ERAS[chapter] = { ...era, beats: [...(era.beats ?? []), ...HEARD_BEATS] }
}
// ...the world callbacks (delta 91, `content/callbackBeats.ts`): a banner painted years ago is
// seen over the stand, a friend turns up in the shirt made for him — attached once, to every
// chapter old enough, behind the chapter's own beats for the same reason as the hearings above
for (const [chapter, beats] of Object.entries(CALLBACK_BEATS)) {
  const era = ERAS[chapter]
  if (era) ERAS[chapter] = { ...era, beats: [...(era.beats ?? []), ...beats] }
}
// ...the COMBINATIONS scenes that live inside other chapters (`chapterCombos.ts`), after
// each chapter's own beats so its opening, its clock and its ending stay its own business
for (const [chapter, beats] of Object.entries(COMBO_BEATS)) {
  const era = ERAS[chapter]
  if (era) era.beats = [...(era.beats ?? []), ...beats]
}
// ...and the face in the box, from the body on the floor (`ownFace`, above `ERAS`). In
// place, on purpose: `eraFor('1990')` IS `ERA_1990`, and three tests hold that identity.
// ...and the grown man ages on screen (24.9.2026): `hero90` until 2009, then 32/40/47
// (`playerFor` in `castFigures.ts`; the same object back when nothing changes)
for (const era of Object.values(ERAS)) era.player = playerFor(era.year, era.player)
for (const era of Object.values(ERAS)) era.portraits = ownFace(era)
// ...and the people crossing the picture: no cast body among them, from 2000 (`ambient2000.ts`)
// (27.9.2026) on the floor of the painting the room stands on that year — `street10`, `busStation20`
for (const era of Object.values(ERAS)) if (era.year >= 2000) era.ambient = ambientFor(era.year)
// ...and in the nineties, the stand-in bodies of the named people of those years (Melamed on
// A1, Freddy on A2, Yaron on A4) do not cross the picture as strangers either
const NINETIES_CAST = new Set(['adultA1', 'adultA2', 'adultA4'])
for (const era of Object.values(ERAS)) if (era.year >= 1995 && era.year < 2000) era.ambient = era.ambient.filter((row) => !NINETIES_CAST.has(row.figure))

/**
 * הפרולוג הוא לא 1986 — the one chapter that fell through and printed the wrong decade.
 *
 * `{anchor}` in a line is resolved from the era of the chapter being played, and the
 * prologue had no era, so it fell through to 1986. The result: the single factual line in
 * the first memory of this game — a State Cup final on 1 June 1983, on a five-year-old's
 * father's shoulders — printed the 1985/86 championship. A game whose first rule is that
 * it never states a fact it cannot source was stating the wrong one, in its first minute,
 * to every player. (Found 6.9.2026 by auditing the brief against the code.)
 *
 * The prologue is an era now: 1983, its own anchor key, and nothing else — it has no
 * timetable, no opportunities and no rooms, because it is one painting and four
 * conversations. Everything unknown still falls through to 1986, which is correct: that is
 * the chapter this game started as.
 */
export const ERA_PROLOGUE: Era = {
  ...stageA('prologue', 1983, {
    endings: {},
    objective: () => null,
    beats: [],
    goal: () => null,
  }),
  anchorKey: 'prologue',
  memoryPrefix: 'prologue',
}

export function eraFor(chapter: string): Era {
  if (chapter === 'prologue') return ERA_PROLOGUE
  return ERAS[chapter] ?? ERA_1986
}


export const ERA_KEYS = Object.keys(ERAS)

export type AnchorSet = Record<string, HistoricalAnchor>

export function anchorFor(anchors: AnchorSet, era: Era, fallback: HistoricalAnchor): HistoricalAnchor {
  return anchors[era.anchorKey] ?? fallback
}
