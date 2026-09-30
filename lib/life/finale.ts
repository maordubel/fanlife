import type { LifeEvent } from './events'
import { redHeartReading } from './profile'
import { flagOn, type LifeState } from './types'
import { PRESETS } from './history/presets'

/**
 * מה נשאר ממנו — the end of Stage A, as a judgement the game is willing to make.
 *
 * Every other screen in THE WORKER LIFE describes; this one CONCLUDES, and that is a
 * different and much riskier job. A chapter that ends by listing what happened has not
 * ended, it has stopped. So this file answers one question in one sentence — what did
 * this afternoon make of this child — and it answers it from what the player actually
 * did, never from a score.
 *
 * The rules it follows are the ones the systems pass set and this screen must not break:
 *
 * · **No numbers reach the player.** `redHeartReading` already turns the Red Heart into
 *   bands and words; this reads the bands and picks a sentence. Nothing here prints a
 *   value and nothing here can, because it never sees one.
 * · **There is no best ending.** The four sentences below are four different children,
 *   not a ladder with a win at the top. The child who got in on somebody's kindness is
 *   not behind the child who got in on a ticket — §26 of the brief, and the whole reason
 *   the chapter has more than one way into the ground.
 * · **It is pure.** State in, words out, no engine, no bus, no Phaser. Which means
 *   `tests/life-systems.test.ts` can walk a dozen different afternoons through it and
 *   assert that every one of them gets a sentence, and that no two obviously-different
 *   lives get the same one.
 */

export type FinaleCard = {
  titleHe: string
  bodyHe: string
  becameHe: string
  /** the real ticket is only shown to a child who actually had one */
  keptTicket: boolean
  /** paper in the air — earned by being inside the ground, not by finishing */
  carnival: boolean
}

export function buildFinale(state: LifeState, events: readonly LifeEvent[], chapter = '1986'): FinaleCard {
  if (chapter === '1990') return buildFinale1990(state, events)
  const sawGoal = flagOn(state, 'saw:goal')
  const gotIn = flagOn(state, 'entry:granted') || sawGoal
  const alone = flagOn(state, 'went:alone')
  const hadTicket = flagOn(state, 'entry:ticket') || (state.inventory['ticket-stub'] ?? 0) > 0
  const heart = new Map(redHeartReading(state).map((entry) => [entry.key, entry.band]))
  const community = heart.get('community') ?? 0
  const football = heart.get('footballLove') ?? 0
  const kept = events.some((event) => event.t === 'redbox.item_added')

  if (sawGoal) {
    return {
      titleHe: 'היית שם',
      bodyHe:
        'ארבעים שנה אחר כך אנשים עוד יריבו על הנבדל הזה, ואתה תדע בדיוק איפה עמדת כשזה קרה. לא שמעת את זה ברדיו ולא סיפרו לך במוצאי שבת. ראית.',
      becameHe: becameLine({ alone, community, football, gotIn: true }),
      keptTicket: hadTicket || kept,
      carnival: true,
    }
  }

  if (gotIn) {
    return {
      titleHe: 'נכנסת',
      bodyHe:
        'הגעת אחרי שזה כבר קרה, לתוך יציע שכבר צרח. לא ראית את הכדור נכנס — אבל עמדת בפנים כשכולם עוד רעדו, וזה גם משהו שלא לוקחים ממך.',
      becameHe: becameLine({ alone, community, football, gotIn: true }),
      keptTicket: hadTicket || kept,
      carnival: true,
    }
  }

  return {
    titleHe: 'שמעת מבחוץ',
    bodyHe:
      'עמדת ברחוב כשהרעש עלה מכיוון מזרח, וידעת מיד מה זה. כל השכונה ידעה. פשוט לא היית בפנים, והיום הזה נגמר לך אחרת מאיך שהוא נגמר לכולם.',
    becameHe: becameLine({ alone, community, football, gotIn: false }),
    keptTicket: hadTicket || kept,
    carnival: false,
  }
}

/**
 * The one sentence. Four children, no ranking.
 *
 * Order matters and is not arbitrary: the strongest, most specific claim is tested first,
 * so a child who did the hardest thing is not described by a line that would also fit
 * somebody who did the easiest.
 */
function becameLine(args: { alone: boolean; community: number; football: number; gotIn: boolean }): string {
  if (args.gotIn && args.alone && args.community >= 2) {
    return 'הלכת לבד, ואנשים זרים לקחו אותך פנימה. מהיום אתה יודע שהאדומים זה לא הקבוצה — זה מי שעומד לידך.'
  }
  if (args.gotIn && args.alone) {
    return 'יצאת מהדלת לבד וסידרת את זה לבד. אף אחד לא לקח אותך לשם — הלכת.'
  }
  if (args.football >= 2) {
    return 'משהו נכנס לך היום מתחת לעור ולא ייצא משם. עוד לא קוראים לזה בשם, אבל זה כבר שלך.'
  }
  return 'לא כל יום גדול הוא היום שלך. גם את זה למדת היום, וזה שיעור שאף אחד לא בוחר.'
}

/**
 * 1990 — the end of the stage's first movement. Same three shapes; a different question.
 * In 1986 the question was whether you saw the goal. In 1990 it is whether you knew
 * before the whistle — and whether your father heard it from you.
 */
function buildFinale1990(state: LifeState, events: readonly LifeEvent[]): FinaleCard {
  const inside = flagOn(state, 'entry:granted')
  const over = flagOn(state, 'match:over')
  const told = flagOn(state, 'net:toldKobi')
  const six = flagOn(state, 'net:six')
  const lost = flagOn(state, 'radio:lost')
  const saved = flagOn(state, 'radio:saved')
  const withKobi = flagOn(state, 'went:withKobi') || flagOn(state, 'entry:kobi')
  const withFriends = flagOn(state, 'went:withFriends')
  const kept = events.some((event) => event.t === 'redbox.item_added')
  const hadTicket = (state.inventory['ticket-stub'] ?? 0) > 0
  if (inside && over) {
    return {
      titleHe: 'עלינו',
      bodyHe: six
        ? 'אמרת שש בבוקר, בצחוק, ליד שולחן המטבח. אחר הצהריים היו שש. אבא לא אמר כלום, ולא יגיד אף פעם, ואתה תזכור את זה יותר מכל שער.'
        : told
          ? 'ידעת לפני אבא. פעם אחת, לדקה אחת, ביום שכל השכונה חיכתה לחדשות — החדשות באו ממך. הוא בדק ברדיו שלו. ואז הוא האמין לך.'
          : 'שמעת את זה בקטעים, מרדיו לרדיו, בין רעש לרעש, ובסוף ידעת. לא כי אמרו לך. כי הרכבת את זה בעצמך.',
      becameHe: became1990({ withKobi, withFriends, told, lost, saved }),
      keptTicket: hadTicket || kept,
      carnival: true,
    }
  }
  if (inside) {
    return {
      titleHe: 'נכנסת',
      bodyHe: 'הגעת אחרי שהדשא כבר היה מלא. לא ראית שער; ראית מה שער עושה לשבעת אלפים איש.',
      becameHe: became1990({ withKobi, withFriends, told, lost, saved }),
      keptTicket: hadTicket || kept,
      carnival: true,
    }
  }
  return {
    titleHe: 'שמעת מבחוץ',
    bodyHe: 'הרעש הגיע ממזרח בגלים, ואתה ספרת אותם. ידעת מה כל גל אומר. פשוט לא היית שם כשהוא נאמר.',
    becameHe: became1990({ withKobi, withFriends, told, lost, saved }),
    keptTicket: hadTicket || kept,
    carnival: false,
  }
}

function became1990(args: { withKobi: boolean; withFriends: boolean; told: boolean; lost: boolean; saved: boolean }): string {
  if (args.told) return 'מהיום, לפעמים, אתה זה שמביא את החדשות הביתה. זה לא מפסיק להיות מוזר. גם לא לו.'
  if (args.withFriends) return 'הלכת עם חברים, ואבא היה שם בנפרד, ושניכם ידעתם איפה השני. ככה זה יהיה מעכשיו.'
  if (args.saved) return 'הרדיו של אבא בידיים שלך, עם אנטנה מכופפת פעמיים. הוא יישאר אצלך. גם כשלא תצטרך אותו.'
  if (args.lost) return 'בלי רדיו למדת לשאול אנשים. זה שיעור שמחזיק יותר שנים מרדיו.'
  if (args.withKobi) return 'הלכתם זה לצד זה. לא הוא לפניך. זה השינוי הכי קטן והכי גדול של היום.'
  return 'בין הרדיו לרדיו, בין הרעש לרעש, למדת להרכיב אמת מחתיכות. זה יעזור לך בחיים. גם כשלא מדובר בכדורגל.'
}

// ---------------------------------------------------------------- the match report ---
/**
 * דו"ח המשחק — what the archive knows about the day the chapter just played, assembled
 * for the one screen that is allowed to print it.
 *
 * Maor asked for the end of every match to be an EXPERIENCE, "כמו שעשינו ב-86" — and what
 * 1986 actually has is not a better animation. It is a real ticket, four real pages of
 * מעריב ספורט, a scorer, a minute and a source line under all of it. Every other match in
 * the game ended on three sentences and a button, and the gap between them was never a
 * design decision; it was that 1986 was the only day anybody had put the paper into.
 *
 * So this is not a new system. It is the 1986 card's own shape, made general and fed from
 * `lib/life/history/days.ts` — which is where rule 60 already put the documented days.
 * Four things follow from that and each one matters more than the layout:
 *
 * · **It is pure and it is derived.** State in, rows out; no component may assemble this
 *   for itself, and no number, name or minute on the card was typed by a designer. The
 *   chapter is looked up through `PRESETS`, which is the mapping the director already
 *   uses, so a day cannot be reported here and played differently.
 * · **A day with nothing documented gets nothing.** `null`, and the card renders exactly
 *   as it did before. There is no empty section with a dash in it, because a screen that
 *   says "מבקיעים: —" has told the player the archive failed rather than that the archive
 *   was never asked.
 * · **Only the sources actually cited come back.** A day may list a source that only one
 *   of its venues leans on; printing the full list under a card that used three of them
 *   is padding a bibliography, which is the citation version of inventing a fact.
 * · **`detailHe` may be printed and never spoken.** That is rule 60.2 read the right way
 *   round: a character may not say a thing no terrace could know, and a card that prints
 *   its source may say anything the source says.
 */
/**
 * שער, כפי שכרטיס מדפיס אותו — the archive's event plus the two things the card would
 * otherwise have to work out for itself.
 *
 * Both are deliberate. `ours` is a comparison against a club SLUG, which is archive
 * vocabulary and has no business inside a React component — and `tests/brand.test.ts`
 * agrees for its own reason, since a Hebrew literal in `components/` is a user-facing
 * string until proven otherwise. `minuteHe` is the rule-60.1 decision about which minute
 * may be printed, and it is made once, here, rather than at every call site that might
 * be tempted by `pacingMinute`.
 */
export type ReportGoal = import('./history/types').HistoricalMatchEvent & {
  ours: boolean
  minuteHe: string | null
  /**
   * שם שאין לו מקור חיצוני — true when the archive holds a scorer for this goal and the
   * only thing backing him is an internal document of this project.
   *
   * `speakable` already stops such a name reaching a player's ears; this stops it reaching
   * their eyes, and the two fences exist for one reason Maor stated himself: *"מסמך פנימי
   * הוא לא מקור היסטורי"*. The goal still appears — it happened, the result is verified —
   * with its conflict note saying exactly why nobody is named. 2.5.1998 is the live case:
   * Wikipedia verifies the 1–0 and names nobody, and one internal audit names a scorer.
   */
  nameWithheld: boolean
}

const US_SLUG = 'הפועל-תל-אביב'

/**
 * The archive's slug for the State Cup, exported because a CARD has to know it and may not
 * spell it: a Hebrew literal in `components/` is a user-facing string until proven
 * otherwise, and `tests/brand.test.ts` is right to say so. A competition slug is archive
 * vocabulary and lives on this side of the boundary.
 */
export const CUP_SLUG = 'גביע-המדינה'

export type MatchReport = {
  dayId: string
  dateHe: string
  venueHe: string
  /** the archive's own final, home–away, as the day records it */
  finalHe: string | null
  goals: readonly ReportGoal[]
  shootout: import('./history/types').Shootout | null
  facts: readonly import('./history/types').DayFact[]
  documents: readonly import('./history/types').DayDocument[]
  films: readonly import('./history/types').DayFilm[]
  /** every source the rows above actually cite, in the order the day lists them */
  sources: readonly import('./history/types').HistorySource[]
  /** what the archive will not say about this day */
  silenceHe: string
}

export function buildMatchReport(chapter: string): MatchReport | null {
  const day = PRESETS[chapter]?.day
  if (!day) return null
  const venue = day.venues.find((row) => row.venueId === day.primaryVenueId) ?? day.venues[0]
  if (!venue) return null

  const goals: ReportGoal[] = venue.events
    .filter((event) => event.type === 'goal')
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((event) => {
      const external = event.sourceIds.some((id) => day.sources.find((source) => source.id === id)?.kind !== 'brief')
      return {
        ...event,
        ours: event.teamSlug === US_SLUG,
        minuteHe: printableMinute(event),
        nameWithheld: !external && Boolean(event.personHe),
        ...(external ? {} : { personHe: undefined, assistHe: undefined }),
      }
    })
  const shootout = venue.shootout ?? null
  const facts = day.facts ?? []
  const documents = day.documents ?? []
  const films = day.films ?? []

  // Nothing documented beyond the bare row the anchor already prints: say nothing.
  if (goals.length === 0 && !shootout && facts.length === 0 && documents.length === 0 && films.length === 0) return null

  const cited = new Set<string>()
  for (const goal of goals) for (const id of goal.sourceIds) cited.add(id)
  for (const id of shootout?.sourceIds ?? []) cited.add(id)
  for (const kick of shootout?.kicks ?? []) for (const id of kick.sourceIds) cited.add(id)
  for (const row of [...facts, ...documents, ...films]) for (const id of row.sourceIds) cited.add(id)

  return {
    dayId: day.id,
    dateHe: day.dateHe,
    venueHe: venue.nameHe,
    finalHe: venue.finalHe,
    goals,
    shootout,
    facts,
    documents,
    films,
    sources: day.sources.filter((source) => cited.has(source.id)),
    silenceHe: day.silenceHe,
  }
}

/**
 * הדקה שמותר להדפיס — `displayMinute` first, then the archive's own number, then nothing.
 *
 * Never `pacingMinute`, under any circumstance. That field is a directing decision and
 * putting it on a card is the exact confusion rule 60.1 exists to prevent: the game may
 * play a goal wherever it likes, and it may state a minute only where a source gave one.
 */
export function printableMinute(event: import('./history/types').HistoricalMatchEvent): string | null {
  if (event.displayMinute) return event.displayMinute
  return event.minute === null ? null : `${event.minute}׳`
}

/** the short labels behind a row's `sourceIds`, for the line printed under it (rule 16) */
export function sourceTitles(report: MatchReport, ids: readonly string[]): string[] {
  return ids
    .map((id) => {
      const source = report.sources.find((row) => row.id === id)
      return source ? (source.shortHe ?? source.titleHe) : null
    })
    .filter((title): title is string => Boolean(title))
}

/**
 * מה שחזר איתו הביתה — the one document a day-closing card may hold up, or null.
 *
 * `EndingCard` closes a Saturday and `StageFinale` closes a chapter (rule 49), and this
 * is the line between them in code: the ending card gets the object that was in his
 * pocket, the finale gets everything the archive holds. So a trophy photographed on its
 * plinth never reaches the ending card however good the picture is, and a front page
 * never does either — nobody came home with either of them.
 *
 * **And it is gated on where he actually was.** Showing a man a ticket stub for a night
 * he spent beside a radio on a base is the cheapest possible lie, and it is exactly the
 * kind this game is built not to tell. `inside` and `late` are the two presences that
 * mean he was in the ground; everything else gets nothing, and the card is complete
 * without it.
 */
export function keepsakeFor(chapter: string, presence: string | null | undefined): import('./history/types').DayDocument | null {
  if (presence !== 'inside' && presence !== 'late') return null
  const day = PRESETS[chapter]?.day
  return day?.documents?.find((doc) => doc.keepsake) ?? null
}
