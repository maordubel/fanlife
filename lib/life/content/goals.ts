import type { LifeState, LocationId } from '../types'

/**
 * לאן הפרק שולח אותך — every chapter, in one file, so nobody has to guess again.
 *
 * Maor, 6.9.2026, standing in the street in the autumn of 1984 with Efi telling him to go
 * "after the wall, right": *"אין לי מושג מה הכוונה במשפט הזה."* He was right and the line
 * was not the bug. A game with rooms and doors already knows the way; it simply had no
 * place to write down where a chapter wants the player, so it could not say so — not in
 * the hint, not with the arrow, and not on the map.
 *
 * That is what this file is. One function per chapter, returning the ROOM the day
 * currently wants, or null when the day genuinely has no opinion. `world/route.ts` turns
 * that into the next door and reads the label painted on it, so what reaches the player is
 * «בדרך: למרכז תל אביב» rather than a wall a six-year-old remembers.
 *
 * The rules these all obey:
 *
 *   - Return null once the day's want is satisfied. A chapter that keeps pointing after
 *     you have arrived is nagging.
 *   - Return null when the want is a JOB rather than a place ("collect thirty shekels").
 *     Pointing at a door for that would be the game inventing an errand it did not write.
 *   - Never point at something the player has not been told exists. A3 waits for Efi to
 *     name the hall; before that the arrow would be spoiling a scene.
 *   - These mirror each chapter's own `objective`, because the objective already encodes
 *     the chain. Where the two ever disagree, the objective is the text and this is the
 *     geography, and the geography is what a thumb needs.
 */

const flag = (state: LifeState, name: string) => Boolean(state.flags[name])

/** 24.5.1986 — the key, the father, the road east, the gate, and finding him after. */
export const goal1986 = (state: LifeState): LocationId | null => {
  if (flag(state, 'found:kobi')) return null
  if (flag(state, 'entry:granted')) return 'bloomfield-inside'
  if (flag(state, 'kobi:left')) return 'bloomfield-outside'
  return null
}

/** 12.5.1990 — the arithmetic at the table, then the ground, then the man in the crowd. */
export const goal1990 = (state: LifeState): LocationId | null => {
  if (flag(state, 'walked:home')) return null
  if (flag(state, 'found:kobi')) return 'home'
  if (flag(state, 'entry:granted')) return 'bloomfield-inside'
  if (flag(state, 'knows:math') || flag(state, 'kobi:left')) return 'bloomfield-outside'
  return 'kitchen'
}

/** 11.3.1991 — school, the notebook, the permission, and a hall at eight in the evening. */
export const goal1991 = (state: LifeState): LocationId | null => {
  if (flag(state, 'walked:home')) return null
  if (flag(state, 'derby:over')) return 'home'
  if (flag(state, 'permission:yes') || flag(state, 'sneak:ready')) return 'ussishkin-hall'
  if (flag(state, 'hw:done') || flag(state, 'hw:half') || flag(state, 'hw:faked')) return 'home'
  if (flag(state, 'school:done')) return 'home'
  return 'classroom'
}

/** 19.4.1993 — the money, the route, the hall, and the walk home. */
export const goal1993Cup = (state: LifeState): LocationId | null => {
  if (flag(state, 'walked:home')) return null
  if (flag(state, 'final:over')) return 'home'
  if (flag(state, 'route:tv')) return 'home'
  if (flag(state, 'route:efi') || flag(state, 'route:ofir')) return 'ussishkin-outside'
  // the money is a job, not a place
  return null
}

/** 9–19.5.1993 — five games; the ones you can reach are the hall and, at the end, north. */
export const goalGalil = (state: LifeState): LocationId | null => {
  if (flag(state, 'life:galil:d5')) return flag(state, 'after:done') ? null : 'ussishkin-outside'
  /**
   * Game four is decided at the CORNER, where Limor has the list for the organised bus —
   * not at the central bus station, which has no door into it in 1993 and which the boy
   * has no reason to walk to. `goalGalil` pointed there for one afternoon on 6.9.2026 and
   * `tests/life-goals.test.ts` caught it before anybody played it, which is exactly what
   * that test is for: a destination nothing can reach is a dead end with a signpost.
   */
  if (flag(state, 'life:galil:d4')) return flag(state, 'g4:decided') ? null : 'ussishkin-outside'
  if (flag(state, 'life:galil:d3')) return 'ussishkin-hall'
  if (flag(state, 'life:galil:d2')) return 'kitchen'
  return 'ussishkin-hall'
}

/** 1995 — a radio at Rafi's, an argument, a poster on a wall. */
export const goalSinai = (state: LifeState): LocationId | null => {
  // the third day is a room, not an errand: the rupture happens alone (§7 B5)
  if (flag(state, 'life:sinai:d3')) return null
  if (flag(state, 's2:done')) return 'bedroom'
  if (flag(state, 'life:sinai:d2')) return 'kiosk'
  if (flag(state, 's1:argued')) return 'bedroom'
  if (flag(state, 's1:heard')) return 'kiosk'
  return 'kiosk'
}

/** 1996–97 — the last evening at home, the gates, the bus at half six, Liron's car. */
export const goalArmy = (state: LifeState): LocationId | null => {
  // the fifth day: two journeys and one afternoon, both offered at the counter (§19)
  if (flag(state, 'life:army:d5')) return flag(state, 'a5:done') ? null : 'kiosk'
  if (flag(state, 'life:army:d4')) return flag(state, 'a4:road') ? null : 'kiosk'
  if (flag(state, 'life:army:d3')) return flag(state, 'a3:decided') ? null : 'bus-station'
  if (flag(state, 'life:army:d2')) {
    // (V3) asked of everybody in uniform, whatever gate he stood at before; under the stand
    // the goal is the room he is in — pointing him back out would answer the question for him
    if (flag(state, 'a2:chose')) return null
    return state.location === 'gate5' ? 'gate5' : 'bloomfield-outside'
  }
  return flag(state, 'a1:packed') ? null : 'home'
}

/** 1997–98 — the hall the night it went down, or Bloomfield with his father. */
export const goalHall = (state: LifeState): LocationId | null => {
  if (flag(state, 'life:hall:h2')) return flag(state, 'h2:done') ? null : 'ussishkin-hall'
  if (flag(state, 'h1:decided')) return null
  // the whole beat is the choice between two rooms; pointing at one would answer it
  return null
}

/** 2.5.1998 — Bloomfield at five, and an Arabic lesson the morning after. */
export const goalLaces = (state: LifeState): LocationId | null => {
  if (flag(state, 'life:laces:l2')) return flag(state, 'l2:done') ? null : 'classroom'
  if (flag(state, 'l1:after') || flag(state, 'l1:inside')) return null
  return 'bloomfield-outside'
}

/** 1999 — the hall the second time it went down, and a kiosk with a sheet of paper on it. */
export const goalSeed = (state: LifeState): LocationId | null => {
  if (flag(state, 'seed:list')) return null
  if (flag(state, 'seed:hall')) return 'kiosk'
  return 'bus-station'
}

/** 19.5.1999 — Ramat Gan at eight, and who you go with. */
export const goalCup99 = (state: LifeState): LocationId | null => {
  if (flag(state, 'c99:over')) return null
  return flag(state, 'c99:route') ? 'ramat-gan' : null
}

/** 13.5.2000 — Hatikva at three. */
export const goalTitle = (state: LifeState): LocationId | null => {
  if (flag(state, 't:over')) return null
  return flag(state, 't:route') ? 'hatikva' : null
}

/** 17.5.2000 — Ramat Gan, the second time, and the Double. */
export const goalDouble = (state: LifeState): LocationId | null => {
  if (flag(state, 'd:over')) return null
  return flag(state, 'd:final') ? 'ramat-gan' : null
}

/**
 * 2000, הלילה שאחרי — והמטרה היא **חדר**, לא אצטדיון.
 *
 * כל שאר פרקי שלב ב׳ מכוונים למגרש, וזה הפרק הראשון שלא: התסריט של 2000–2026 נפתח
 * בשלוש סצנות ביתיות, ומה שהיום מחכה לו הוא הקופסה על המדף ואז הקיוסק של רפי. חץ
 * שמצביע על רמת גן בלילה שאחרי הגמר הוא חץ שמשקר.
 */
export const goalBridge = (state: LifeState): LocationId | null => {
  if (flag(state, 'b:done')) return null
  if (!flag(state, 'b:night')) return null
  if (!flag(state, 'b:box')) return 'bedroom'
  if (!flag(state, 'b:commit')) return 'kiosk'
  return null
}

/**
 * 2001–2002 — והמטרה עוברת בין שלושה חדרים לפי מה שכבר נעשה.
 *
 * שתי הסצנות האחרונות (משחק הבית וההדחה) יורות על השעון ולא על דלת, ולכן החץ נכבה
 * אחרי המטבח: חץ שמצביע על חדר שאתה כבר בו הוא רעש.
 */
export const goalEurope = (state: LifeState): LocationId | null => {
  if (flag(state, 'e:after')) return null
  if (!flag(state, 'e:chelsea')) return null
  if (!flag(state, 'e:beds')) return 'allenby'
  if (!flag(state, 'e:trip')) return 'kitchen'
  // E05 — after Milan, the terminal: the beat carries him there, the arrow waits for it
  if (flag(state, 'e:flown') && !flag(state, 'e:after')) return 'port-europe'
  return null
}

/** 2004–2006 — ארבעה חדרים לפי הסדר, וזה כל החץ */
export const goalHome = (state: LifeState): LocationId | null => {
  if (flag(state, 'h:done')) return null
  if (!flag(state, 'h:derby')) return 'ussishkin-hall'
  if (!flag(state, 'h:door')) return 'ussishkin-outside'
  if (!flag(state, 'h:work')) return 'workshop'
  if (!flag(state, 'h:oli')) return 'bus-station'
  return null
}

/** 2007 — שלושה פרקים, וכל אחד מצביע על חדר אחד בלבד */
export const goalTable = (state: LifeState): LocationId | null => {
  if (!flag(state, 'u:role')) return 'community-room'
  // (דלתא 90) מי שלקח את התפעול סופר את המחסן בידיים לפני שהיום נסגר
  if (state.flags['u:roleKind'] === 'operations' && !flag(state, 'u:counted')) return 'storeroom'
  return null
}
export const goalRegistered = (state: LifeState): LocationId | null => {
  if (flag(state, 'u:loss')) return null
  if (!flag(state, 'u:deliver')) return 'community-room'
  // (delta 92, §8) the last evening: the hall itself; the morning after: the walk to the fence
  if (!flag(state, 'u:lastEve')) return null
  if (!flag(state, 'u:morning')) return flag(state, 'u:last') ? null : 'ussishkin-hall'
  if (!flag(state, 'u:news')) return null
  return 'ussishkin-outside'
}
export const goalKeyNight = (state: LifeState): LocationId | null => (flag(state, 'u:key') ? null : 'hall-new')
/** 2009 — אולם האימונים, אחרי משחק העלייה */
export const goalUp = (state: LifeState): LocationId | null => (flag(state, 'u:after') ? null : 'hall-new')

/** 2010, החלק הראשון — המגרש של החבר׳ה, ואז הקיוסק; הדרבי והגמר הם רגעים על השעון */
export const goalCup10 = (state: LifeState): LocationId | null => {
  if (!flag(state, 'd10:photo')) return 'pitch'
  if (!flag(state, 'd10:math')) return 'kiosk'
  return null
}
/** 2010, החלק השני — הרחוב ליד הרכב, ואז המטבח בבוקר */
export const goalTeddy = (state: LifeState): LocationId | null => {
  if (!flag(state, 'd10:plan')) return 'street'
  // (27.9.2026) the away end is a room: whoever took the seat stands in it until the way out
  const venue = state.flags['d10:mode'] === 'venue'
  if (venue && flag(state, 'd10:road') && !flag(state, 'd10:back')) return 'teddy'
  if (venue && flag(state, 'd10:back') && !flag(state, 'd10:carDone')) return 'street'
  if (flag(state, 'd10:back') && !flag(state, 'd10:morning')) return 'kitchen'
  return null
}

/** 2010, אירופה — הקיוסק ואז בית הקפה; אחר כך הסלון, הערב, המטבח, בלומפילד והסלון שוב */
export const goalQualify = (state: LifeState): LocationId | null => {
  if (!flag(state, 'c10:qualify')) return 'kiosk'
  if (!flag(state, 'c10:trip')) return 'allenby'
  return null
}
export const goalAnthem = (state: LifeState): LocationId | null => {
  if (!flag(state, 'c10:debut')) return 'home'
  if (!flag(state, 'c10:host')) return 'allenby'
  if (!flag(state, 'c10:call')) return 'kitchen'
  if (!flag(state, 'c10:benfica')) return 'bloomfield-inside'
  if (!flag(state, 'c10:lyon')) return 'home'
  return null
}

/** 2011–2013 — הגביע השלישי בסלון; ואז אלנבי, היציע, וחדר שאינו חדר */
/** 2012-cups (pass C) — the hour, Kobi, then the place the plan names: fridge and street door, sofa, or the promise */
export const goalCups = (state: LifeState): LocationId | null => {
  if (!flag(state, 'n:cups')) return 'home'
  const plan = state.flags['n:plan']
  const promised: LocationId = state.flags['life:partner'] ? 'allenby' : 'street'
  if (plan === 'there' && !flag(state, 'n:final')) return flag(state, 'n:fridge') ? 'street' : 'kitchen'
  if (plan === 'sofa' && !flag(state, 'n:watching')) return 'home'
  if ((flag(state, 'n:go') || plan === 'elsewhere') && !flag(state, 'n:sat') && !flag(state, 'n:moved')) return promised
  return null
}
export const goalFive = (state: LifeState): LocationId | null => {
  if (!flag(state, 'n:five')) return 'allenby'
  if (!flag(state, 'n:own')) return 'gate5'
  if (flag(state, 'n:toRoom') && !flag(state, 'n:room')) return 'rehearsal'
  // Q03, for a founder who is also on the terrace: the storeroom behind the community room
  if (flag(state, 'n:room') && flag(state, 'own:route:USSISHKIN_FOUNDER:entry') && flag(state, 'own:route:ULTRAS:entry') && !flag(state, 'q:shirts')) return 'storeroom'
  return null
}

/** 2015–2016 — הרחוב לפני האולם החדש, ואז הסלון של אבא */
export const goalNewHall = (state: LifeState): LocationId | null => {
  if (!flag(state, 'nr:hall')) return 'drive-in'
  // (pass D) the empty hall, the doors, the first game — all in the drive-in
  if (flag(state, 'nr:prep') && !flag(state, 'nr:first')) return 'drive-in'
  if (!flag(state, 'nr:route')) return 'home'
  return null
}

/** 2016–2018 — הקיוסק, המגרש, אלנבי; ואז הקיוסק והסלון. הטבלה וההזמנה הן רגעים */
export const goalCrisis = (state: LifeState): LocationId | null => {
  if (!flag(state, 'p:news')) return 'kiosk'
  // (90-E) the two sources and the answer to Amit are in the kiosk
  if (state.flags['p:info'] === 'checking') return 'kiosk'
  if (!flag(state, 'p:till')) return 'pitch'
  if (!flag(state, 'p:deliver') && flag(state, 'p:commit')) {
    // the next parcel still in his hands, nearest first — then back to Matuki
    const holds = (id: string) => flag(state, `p:carry:${id}`) && !flag(state, `p:hand:${id}`)
    if (holds('a')) return flag(state, 'p:a-moved') ? 'allenby' : 'street'
    if (holds('b')) return 'pitch'
    if (holds('c')) return 'allenby'
    return 'community-room'
  }
  if (!flag(state, 'p:deliver')) return 'community-room'
  return null
}
export const goalAfter = (state: LifeState): LocationId | null => {
  if (!flag(state, 'p:amit')) return 'kiosk'
  if (!flag(state, 'p:choice')) return 'home'
  return null
}

/** 2018–2022 — הקיוסק ובלומפילד מבחוץ; ואז הבית והקיוסק. הערב של הצעירים הוא רגע */
export const goalReturn = (state: LifeState): LocationId | null => {
  if (!flag(state, 'r:back')) return 'kiosk'
  // between R01 and the jump to 2019 the ground is shut, and the jump brings him there itself
  if (!flag(state, 'r:reopen')) return null
  if (!flag(state, 'r:signs')) return 'bloomfield-outside'
  return null
}
export const goalLosses = (state: LifeState): LocationId | null => {
  if (!flag(state, 'r:indoors')) return 'home'
  if (!flag(state, 'r:cup')) return 'kiosk'
  return null
}

/** 2023–2025 — המגרש והיציע; הבית והמטבח; הבית והקיוסק. הדרבי הוא רגע */
export const goalTournament = (state: LifeState): LocationId | null => {
  if (!flag(state, 'z:role')) return 'pitch'
  // (90-E) the tournament is produced and played on the pitch — unless he only came for the after
  if (state.flags['z:tournament'] !== 'social' && !flag(state, 'z:after')) return 'pitch'
  if (!flag(state, 'z:derby')) return null
  if (!flag(state, 'z:grow')) return 'community-room'
  return null
}
export const goalQuiet = (state: LifeState): LocationId | null => {
  if (!flag(state, 'z:aid')) return 'home'
  if (!flag(state, 'z:again')) return 'home'
  return null
}
export const goalEurocup = (state: LifeState): LocationId | null => {
  if (!flag(state, 'z:euro')) return 'home'
  if (!flag(state, 'z:up')) return 'kiosk'
  return null
}

/** 2025–2026 — הקיוסק והסלון; ואז הרציף. האולם והדרך חזרה הם רגעים */
export const goalPlan = (state: LifeState): LocationId | null => {
  if (!flag(state, 'f:money')) return 'kiosk'
  // (90-E) the plan is built at the ticket office before it is shown — unless there is no money for it yet
  const preparing = state.flags['f:funding'] === 'preparation'
  if (!preparing && !flag(state, 'f:sheet') && (!flag(state, 'f:tickets') || !flag(state, 'life:finale:route'))) return 'ticket-office'
  if (!preparing && !flag(state, 'f:sheet')) return null
  if (!flag(state, 'f:plan')) return 'home'
  return null
}
/**
 * 7.5.2026 — הרציף, נמל ההגעה, מחוץ לאולם, המושבים, ושוב בחוץ. חמישה חדרים, כי מאז
 * 21.9.2026 לכל אחד מהם יש ציור, והנסיעה היא כבר לא כרטיס וזמן אלא דרך שהולכים בה.
 */
export const goalFinale = (state: LifeState): LocationId | null => {
  if (flag(state, 'f:back')) return null
  if (!flag(state, 'f:road')) return flag(state, 'f:name') || !state.flags['life:finale:party'] || state.flags['life:finale:party'] === 'saving' ? 'port-europe' : 'bus-station'
  if (!flag(state, 'f:seats')) return 'arena-out'
  if (!flag(state, 'f:inside')) return 'arena-seats'
  return 'arena-out'
}

/** חיי בית — שלושה מפגשים; ואז המטבח והסלון. הערב הראשון הוא מעבר זמן */
export const goalPeople = (state: LifeState): LocationId | null => {
  if (!flag(state, 'l:melanie')) return 'allenby'
  if (!flag(state, 'l:dor')) return 'street'
  if (!flag(state, 'l:tamar')) return 'kiosk'
  return null
}
export const goalHousehold = (state: LifeState): LocationId | null => {
  if (!flag(state, 'hh:diary')) return 'home'
  if (!flag(state, 'hh:parent')) return 'home'
  return null
}

/** 2021 — הבית (אם יש ילד), המטבח, והמגרש (אם יש ילד) */
export const goalPromises = (state: LifeState): LocationId | null => {
  const child = flag(state, 'life:child')
  if (child && !flag(state, 'pr:first')) return 'home'
  if (!flag(state, 'pr:promise')) return 'home'
  // (pass D) the promised evening itself, for the life without a child
  if (!child && flag(state, 'pr:out') && !flag(state, 'pr:evened')) return 'promenade'
  if (child && !flag(state, 'pr:scarf')) {
    // (90-E) L09 — two sheets to read, his Saturday in the schoolyard, and for the split the run to Bloomfield
    const ask = state.flags['pr:ask']
    if (ask === 'checking') return !flag(state, 'pr:saw:his') ? 'home' : !flag(state, 'pr:saw:ours') ? 'kiosk' : 'pitch'
    if (ask === 'go' || ask === 'split') return state.flags['pr:sat'] === 'run' ? 'bloomfield-outside' : 'schoolyard'
    return 'pitch'
  }
  return null
}

/** חלונות — הריחוק (קיוסק, בית, בלומפילד מבחוץ) והכורסה (בית, מטבח, רחוב) */
export const goalDistance = (state: LifeState): LocationId | null => {
  if (!flag(state, 'k:told')) return 'kiosk'
  if (!flag(state, 'k:life')) return 'promenade'
  if (!flag(state, 'k:back')) return 'bus-station'
  return null
}
export const goalTeam = (state: LifeState): LocationId | null => {
  if (!flag(state, 'y:name')) return 'pitch'
  if (!flag(state, 'y:guest')) return 'kiosk'
  if (!flag(state, 'y:train')) return 'pitch'
  if (!flag(state, 'y:match')) return 'pitch'
  if (!flag(state, 'y:after')) return 'street'
  return null
}
/** חלונות CAREER — סצנה אחת כל אחד, ולכן יעד אחד */
/** T01 — Asaf at the gate, then the work under the stand until the gate opens (`gate5-stand`, 27.9.2026) */
export const goalTerrace01 = (state: LifeState): LocationId | null => {
  if (!flag(state, 't:first')) return 'gate5'
  if (state.flags['life:terrace:role'] !== 'active') return null
  return flag(state, 't:credit') ? null : 'gate5-stand'
}
/** T02 — Yevgeny waits under the stand, by the stairs; the test happens there too */
export const goalTerrace02 = (state: LifeState): LocationId | null => (flag(state, 't:hand') && !flag(state, 't:mode') ? null : flag(state, 't:test') ? null : 'gate5-stand')
export const goalTerrace03 = (state: LifeState): LocationId | null => (flag(state, 't:lead') ? null : 'bloomfield-inside')
export const goalDesk01 = (state: LifeState): LocationId | null => {
  if (flag(state, 'j:first')) return null
  // J01 (pass C) — verifying sends him to the ticket office for the second source, then back
  if (flag(state, 'j:verifying') && flag(state, 'j:photoOk') && !flag(state, 'j:second')) return 'ticket-office'
  return 'allenby'
}
export const goalDesk02 = (state: LifeState): LocationId | null => (flag(state, 'j:fix') ? null : 'newsroom')
export const goalInterview = (state: LifeState): LocationId | null => {
  if (flag(state, 'j:asked')) return null
  // J03 ביפו (27.9.2026): מי שבחר בסמטה הולך אליה; השאר — אלנבי
  return state.flags['life:interview:at'] === 'jaffa' ? 'jaffa-alley' : 'allenby'
}
export const goalFriends = (state: LifeState): LocationId | null => {
  if (!flag(state, 'i:meet')) return 'allenby'
  if (!flag(state, 'i:banner')) return 'street'
  if (!flag(state, 'i:lineup')) return 'pitch'
  return null
}
/** I04 ביפו (27.9.2026): הטלפון בבית → מגדל השעון → המקום שבחרתם לדבר בו */
export const goalLina = (state: LifeState): LocationId | null => {
  if (flag(state, 'i:call')) return null
  if (!flag(state, 'i:phone')) return 'home'
  if (!flag(state, 'i:jaffa')) return null
  if (!flag(state, 'i:tower')) return 'jaffa'
  const walk = state.flags['life:lina:walk']
  return walk === 'alley' ? 'jaffa-alley' : walk === 'boulevard' ? 'jaffa-boulevard' : null
}
/** X01: מי שסגר תוכנית מעבר יוצא לערב אחרון בטיילת */
export const goalSuitcase = (state: LifeState): LocationId | null => {
  if (!flag(state, 'x:suitcase')) return 'home'
  return flag(state, 'x:move') && !flag(state, 'x:sea') ? 'promenade' : null
}
/** X04: הקיוסק, ואז הערב שנבחר — קובי בטיילת או החברים בסמטה ביפו */
export const goalVisit = (state: LifeState): LocationId | null => {
  if (!flag(state, 'x:visit')) return 'kiosk'
  if (flag(state, 'x:evening')) return null
  const visit = state.flags['life:abroad:visit']
  return visit === 'family' ? 'promenade' : visit === 'friends' ? 'jaffa-alley' : null
}
/** הדירה שם — ערב אחד בבית, ושני פרקים שלא יוצאים ממנה */
export const goalAbroad = (state: LifeState): LocationId | null => (flag(state, 'x:done') ? null : 'flat-abroad')
export const goalReunion = (state: LifeState): LocationId | null => (flag(state, 'x:reunion') ? null : 'flat-abroad')
export const goalOwner = (state: LifeState): LocationId | null => {
  if (!flag(state, 'o:fork')) return 'office'
  // (pass D) the seller's hour, then the meeting — both in the office
  if (flag(state, 'o:forkGo') && !flag(state, 'o:verdict')) return 'office'
  if (flag(state, 'o:dealGo') && !flag(state, 'o:team')) return 'office'
  if (flag(state, 'o:moneyGo') && !flag(state, 'o:sign')) return 'home'
  if (flag(state, 'o:signGo') && flag(state, 'own:route:JOURNALIST:entry') && !flag(state, 'o:conflict') && !flag(state, 'own:route:conflict:stop_covering') && !flag(state, 'own:route:conflict:personal_column') && !flag(state, 'own:route:conflict:disclose_and_pay')) return 'newsroom'
  if (flag(state, 'o:signGo') && !flag(state, 'o:monday')) return 'ticket-office'
  return null
}
export const goalArmchair = (state: LifeState): LocationId | null => {
  if (!flag(state, 'a:remote')) return 'home'
  if (!flag(state, 'a:photo')) return 'kitchen'
  if (!flag(state, 'a:saturday')) return 'street'
  return null
}
