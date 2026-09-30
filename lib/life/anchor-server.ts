import 'server-only'

import { archive } from '@/lib/game/archive'

import { DEVELOPMENT_ANCHOR, type HistoricalAnchor } from './anchors'

/**
 * The resolver, and the only bridge between the canonical archive and the game.
 *
 * It runs on the server — `lib/game/archive.ts` is `server-only`, and it should stay
 * that way — and the route hands the resulting plain object to the client. THE WORKER
 * LIFE therefore never reads Red-Fans data, never reads `content/manual/*` and never
 * parses anything: it receives one typed object per anchor. That is the flow the brief
 * draws, enforced by the module boundary rather than by a convention.
 *
 * **The placeholder retired itself, exactly as it said it would.**
 *
 * For three passes this resolver returned the CHAMPIONSHIP and a note saying the match
 * that decided it was not in the archive: no date, no opponent, no score, no scorer. The
 * scene was written around that limit and the note was printed on screen rather than
 * hidden, because a placeholder you can see is one somebody replaces.
 *
 * On 3.9.2026 somebody did. `content/manual/matches.json` now holds 24.5.1986, Hapoel Tel
 * Aviv v Maccabi Haifa at Bloomfield, and `match-events.json` holds the goal: minute 86,
 * Gili Landau, from Moshe Sinai. Both at confidence 2, sourced, entered from a ticket
 * kept for forty years and two dated pages of מעריב ספורט.
 *
 * So this function does now what its own comment promised: it looks the match up, fills
 * `anchor.match`, and sets `placeholder` to null. Nothing else changed — which was the
 * point of writing it this way. If the row ever goes away the note comes back by itself.
 */

const SEASON = '1985/86'
const LEAGUE = 'ליגת-העל'
const PROLOGUE_SEASON = '1982/83'
const CUP = 'גביע-המדינה'

export function resolveChapterAnchor(): HistoricalAnchor {
  const trophy = archive.trophies.find(
    (row) =>
      row.seasonLabel === SEASON &&
      row.competitionSlug === LEAGUE &&
      row.result === 'won' &&
      // Rule 6: sport scope is asserted at the point of use, never assumed from context.
      row.sport === 'football',
  )

  if (!trophy) return DEVELOPMENT_ANCHOR

  const venue = archive.venues.find((row) => row.slug === 'בלומפילד' && row.sport === 'football')
  const decider = findDecider(SEASON, LEAGUE)

  return {
    id: `trophy:${LEAGUE}:${SEASON}`,
    sport: 'football',
    seasonLabel: trophy.seasonLabel,
    year: 1986,
    competitionSlug: trophy.competitionSlug,
    // Built from canonical fields only. No opponent, no score, no date.
    headlineHe: `אליפות ${trophy.seasonLabel}`,
    venueSlug: venue?.slug ?? null,
    sourceTitle: trophy.sourceTitle,
    sourceUrl: trophy.sourceUrl,
    confidence: trophy.confidence,
    titlesSoFar: countTitles(SEASON, LEAGUE),
    match: decider,
    // The note survives for exactly as long as the archive cannot answer, and no longer.
    placeholder: decider
      ? null
      : {
          what: 'המשחק המכריע עצמו — יריבה, תאריך, תוצאה ומבקיעים — אינו מוצג, ואינו קיים בארכיון.',
          needs: 'שורת משחק מעונת 1985/86 ב-content/manual/matches.json ברמת ודאות 2 ומעלה.',
        },
  }
}

const US = 'הפועל-תל-אביב'

/**
 * השם של היריבה כפי שהמקור כתב אותו — קודם מהשורות שעברו את רף הביטחון, ואחר כך
 * מהרשימה המלאה (`archive.clubNames`), ורק בסוף מהסלאג. הסדר הזה הוא מה שמונע
 * מ-`בית"ר-י-ם` להופיע על כרטיס היסטורי כ-`בית"ר י ם`.
 */
function opponentNameHe(slug: string): string {
  return (
    archive.clubs.find((row) => row.slug === slug && row.sport === 'football')?.nameHe ??
    archive.clubNames.find((row) => row.slug === slug && (row.sport ?? 'football') === 'football')?.nameHe ??
    slug.replace(/-/g, ' ')
  )
}

/**
 * How many of this competition the club had won by the end of this season.
 *
 * A season label sorts lexicographically in the right order (`1968/69` < `1980/81`), which
 * is the one thing that makes this two lines instead of a date parser. It counts rows and
 * says so; if a title is missing from the archive the number is smaller, which is the
 * failure mode a count of rows should have.
 */
function countTitles(season: string, competitionSlug: string): number | null {
  const won = archive.trophies.filter(
    (row) =>
      row.competitionSlug === competitionSlug &&
      row.result === 'won' &&
      row.sport === 'football' &&
      (row.clubSlug ?? US) === US &&
      row.seasonLabel <= season,
  )
  return won.length > 0 ? won.length : null
}

/**
 * The deciding match of the season, read out of the archive and nowhere else.
 *
 * Deliberately narrow: the LAST played fixture of that season and competition that the
 * club was in, with a score on it, at confidence 2 or better. It is found by the shape of
 * the data — season, competition, status — rather than by a hard-coded date, which is why
 * one function answers for the 1985/86 league AND for the 1982/83 cup, where "the last
 * fixture in the competition" happens to mean the final. Later chapters get it free.
 *
 * The goal comes from `match-events.json` by natural key. If the events file says nothing,
 * `decidedBy` is null and the scene shows a match with a result and no scorer, which is
 * the truthful shape of "we know who won and not who scored".
 */
function findDecider(season: string, competitionSlug: string): HistoricalAnchor['match'] {
  const played = archive.matches
    .filter(
      (row) =>
        row.seasonLabel === season &&
        row.competitionSlug === competitionSlug &&
        (row.homeClubSlug === US || row.awayClubSlug === US) &&
        row.homeScore !== null &&
        row.awayScore !== null &&
        (row.confidence ?? 0) >= 2,
    )
    .sort((a, b) => String(a.playedOn ?? '').localeCompare(String(b.playedOn ?? '')))

  const match = played[played.length - 1]
  if (!match || !match.playedOn) return null

  const atHome = match.homeClubSlug === US
  const opponentSlug = atHome ? match.awayClubSlug : match.homeClubSlug
  const venue = match.venueSlug
    ? archive.venues.find((row) => row.slug === match.venueSlug && row.sport === 'football')
    : null

  const key = [match.seasonLabel, match.competitionSlug, match.homeClubSlug, match.awayClubSlug, match.stage].join('|')
  const goals = archive.matchEvents
    .filter((row) => row.matchNaturalKey === key && row.type === 'goal' && row.clubSlug === US)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
  const last = goals[goals.length - 1]

  return {
    playedOn: match.playedOn,
    opponentHe: opponentNameHe(opponentSlug),
    scoredFor: (atHome ? match.homeScore : match.awayScore) ?? 0,
    scoredAgainst: (atHome ? match.awayScore : match.homeScore) ?? 0,
    atHome,
    venueHe: venue?.nameHe ?? null,
    decidedBy:
      last && last.minute !== null
        ? {
            minute: last.minute,
            scorerHe: nameOf(last.personSlug),
            assistHe: last.relatedPersonSlug ? nameOf(last.relatedPersonSlug) : null,
          }
        : null,
    sourceTitle: match.sourceTitle ?? trophySource(),
    sourceUrl: match.sourceUrl ?? null,
  }
}

function nameOf(slug: string | null): string {
  if (!slug) return ''
  return archive.people.find((row) => row.slug === slug)?.fullNameHe ?? slug.replace(/-/g, ' ')
}

function trophySource(): string {
  return 'ארכיון הפרויקט'
}

/**
 * The prologue's anchor — 1982/83, the State Cup.
 *
 * Rebased with everything else. The prologue used to be 1971/72 and used to belong to
 * the father; now the protagonist is born in 1978, so the earliest thing he can possibly
 * remember is the cup of 1982/83, when he was five and on somebody's shoulders. That is
 * a better prologue than the old one for a reason that has nothing to do with dates: the
 * first line of this game is now something that happened TO him, and the last line of the
 * chapter is something he does himself.
 *
 * **This placeholder retired itself too, and by the same route.**
 *
 * Until 3.9.2026 this function ended with `match: null` and a comment saying the 1986
 * anchor had earned its match row and 1983's had not. `content/manual/matches.json` now
 * holds 1.6.1983, Hapoel Tel Aviv 3 Maccabi Tel Aviv 2 — the Tel Aviv derby final — and
 * `match-events.json` holds Gili Landau's 67th-minute winner, put in with his hand three
 * years before Maradona did the same thing in the same decade. Both rows at confidence 2,
 * sourced to ynet.
 *
 * The venue stays null on purpose: a cup final is played somewhere neutral and the archive
 * does not say where. `findDecider` copies that null through instead of guessing, so the
 * prologue names a date, an opponent and a score, and no stadium.
 */
export function resolvePrologueAnchor(): HistoricalAnchor {
  const trophy = archive.trophies.find(
    (row) =>
      row.seasonLabel === PROLOGUE_SEASON &&
      row.competitionSlug === CUP &&
      row.result === 'won' &&
      row.sport === 'football',
  )

  if (!trophy) {
    return {
      ...DEVELOPMENT_ANCHOR,
      id: 'DEV-PLACEHOLDER-PROLOGUE',
      seasonLabel: PROLOGUE_SEASON,
      year: 1983,
      competitionSlug: CUP,
      venueSlug: null,
      placeholder: {
        what: 'אין עוגן היסטורי מאושר מהארכיון לפרולוג; המסך מציג ממלא מקום מסומן.',
        needs: `שורת גביע עונת ${PROLOGUE_SEASON} בארכיון הקנוני, ברמת ודאות 2 ומעלה.`,
      },
    }
  }

  const decider = findDecider(PROLOGUE_SEASON, CUP)

  return {
    id: `trophy:${CUP}:${PROLOGUE_SEASON}`,
    sport: 'football',
    seasonLabel: trophy.seasonLabel,
    year: 1983,
    competitionSlug: trophy.competitionSlug,
    headlineHe: `גביע המדינה ${trophy.seasonLabel}`,
    // Null, and it stays null: a cup final is neutral ground and the archive does not
    // record which. The prologue is written to work without a stadium name.
    venueSlug: null,
    sourceTitle: trophy.sourceTitle,
    sourceUrl: trophy.sourceUrl,
    confidence: trophy.confidence,
    titlesSoFar: countTitles(PROLOGUE_SEASON, CUP),
    match: decider,
    placeholder: decider
      ? null
      : {
          what: 'הגמר עצמו — יריבה, תאריך ותוצאה — אינו מוצג, ואינו קיים בארכיון.',
          needs: `שורת משחק גמר גביע ${PROLOGUE_SEASON} בארכיון הקנוני ברמת ודאות 2 ומעלה.`,
        },
  }
}

/**
 * שלב ב׳ — 12.5.1990, the promotion. Not a trophy, so it does not come from
 * `trophies.json`: it is the last played match of the 1989/90 second-division season in
 * `matches.json`, at confidence 2, with its source — and the headline is built from the
 * competition name and the season, nothing else. The parallel match that decided the
 * race is in the same file with NO score, at confidence 1, and `findDecider` skips it
 * for exactly that reason: a row with no score is a row the game may not read a number
 * from. If the row is ever removed, the placeholder comes back and says what is missing.
 */
const STAGE_B_SEASON = '1989/90'
const SECOND_TIER = 'ליגה-ארצית'

export function resolveStageBAnchor(): HistoricalAnchor {
  const competition = archive.competitions.find((row) => row.slug === SECOND_TIER && row.sport === 'football')
  const venue = archive.venues.find((row) => row.slug === 'בלומפילד' && row.sport === 'football')
  const decider = findDecider(STAGE_B_SEASON, SECOND_TIER)
  return {
    id: `promotion:${SECOND_TIER}:${STAGE_B_SEASON}`,
    sport: 'football',
    seasonLabel: STAGE_B_SEASON,
    year: 1990,
    competitionSlug: SECOND_TIER,
    headlineHe: `העלייה מ${competition?.nameHe ?? 'הליגה הארצית'}, ${STAGE_B_SEASON}`,
    venueSlug: venue?.slug ?? null,
    sourceTitle: decider?.sourceTitle ?? 'content/manual/matches.json',
    sourceUrl: decider?.sourceUrl ?? null,
    confidence: decider ? 2 : 0,
    titlesSoFar: null,
    match: decider,
    placeholder: decider
      ? null
      : {
          what: 'משחק העלייה של 1989/90 — יריבה, תאריך ותוצאה — אינו בארכיון.',
          needs: 'שורת משחק מעונת 1989/90 בליגה הארצית ב-content/manual/matches.json ברמת ודאות 2 ומעלה.',
        },
  }
}

/**
 * שלב ב׳, המערכה השנייה — 11.3.1991, אוסישקין. הכדורסל, ורק הכדורסל.
 *
 * The football resolvers above read `matches.json`; this one may not, and the separation
 * is enforced by the file it reads rather than by a comment: `basketball-matches.json` is
 * its own store, its rows carry `sport: 'basketball'`, and nothing in the football canon
 * can reach them. That is the rule the research pass turned into schema — a Ussishkin
 * night is stored as basketball throughout, and a basketball record never leaks into a
 * football one.
 *
 * The row is the league administration's own archive of the 1990/91 season: round 15,
 * 11.3.1991, Hapoel Tel Aviv 97 Maccabi Tel Aviv 87, at the club's listed home hall. The
 * chapter states none of that in a line of dialogue — the director reads the final off
 * this anchor at the horn, and the one number anybody says out loud (the margin, whispered
 * across a classroom the next morning) is computed from it.
 *
 * If the row ever goes away, the placeholder comes back by itself and says exactly what
 * the archive would have to hold, which is the shape every anchor in this file has.
 */
const USSISHKIN_SEASON = '1990/91'
const BASKETBALL_LEAGUE = 'ליגה-לאומית-כדורסל'

export function resolveUssishkinAnchor(): HistoricalAnchor {
  const derby = archive.basketballMatches
    .filter(
      (row) =>
        row.sport === 'basketball' &&
        row.seasonLabel === USSISHKIN_SEASON &&
        row.homeScore !== null &&
        row.awayScore !== null &&
        (row.confidence ?? 0) >= 2,
    )
    .sort((a, b) => String(a.playedOn ?? '').localeCompare(String(b.playedOn ?? '')))
    .at(-1)

  const atHome = derby?.homeClubSlug === US
  const match = derby
    ? {
        playedOn: derby.playedOn ?? '',
        opponentHe: atHome ? derby.awayClubHe : derby.homeClubHe,
        scoredFor: (atHome ? derby.homeScore : derby.awayScore) ?? 0,
        scoredAgainst: (atHome ? derby.awayScore : derby.homeScore) ?? 0,
        atHome,
        venueHe: derby.venueHe,
        // A basketball row holds no minute-by-minute events in this archive and the game
        // is written so that it never needs one: `decidedBy` stays null on purpose, and
        // the hall's mood is authored rather than derived from a scoring run nobody
        // recorded (brief §38).
        decidedBy: null,
        sourceTitle: derby.sourceTitle,
        sourceUrl: derby.sourceUrl,
      }
    : null

  return {
    id: `derby:${BASKETBALL_LEAGUE}:${USSISHKIN_SEASON}`,
    sport: 'basketball',
    seasonLabel: USSISHKIN_SEASON,
    year: 1991,
    competitionSlug: BASKETBALL_LEAGUE,
    headlineHe: `הדרבי באוסישקין, ${USSISHKIN_SEASON}`,
    venueSlug: derby?.venueSlug ?? null,
    sourceTitle: derby?.sourceTitle ?? 'content/manual/basketball-matches.json',
    sourceUrl: derby?.sourceUrl ?? null,
    confidence: derby?.confidence ?? 0,
    titlesSoFar: null,
    match,
    placeholder: match
      ? null
      : {
          what: 'הדרבי של 11.3.1991 באוסישקין — יריבה, תאריך ותוצאה — אינו בארכיון.',
          needs: `שורת משחק כדורסל מעונת ${USSISHKIN_SEASON} ב-content/manual/basketball-matches.json ברמת ודאות 2 ומעלה.`,
        },
  }
}

/**
 * העשור — the anchors of Stage B after 1991, one resolver for all of them.
 *
 * Every chapter from 1993 to 2000 hangs on ONE row the archive holds, found by its
 * natural key — season, competition, the day it was played — in `matches.json` or, for a
 * hall, `basketball-matches.json`. The chapter's text never states the row; it reads the
 * anchor at the moment it needs a number, and if the row is ever removed the placeholder
 * comes back and says what the archive would have to hold.
 *
 * `ANCHOR_SPECS` is the whole map from a chapter's `anchorKey` to its row. A chapter that
 * hangs on an EVENT rather than a match (the sale of the club in 1997, a relegation) is
 * given the last match the archive holds for that season, and a headline of its own —
 * the fact the chapter is about is in `noteHe` of the trophies and seasons files and in
 * the chapter's own honest lines, never in a score.
 */
type AnchorSpec = {
  sport: 'football' | 'basketball'
  seasonLabel: string
  competitionSlug: string
  playedOn: string
  year: number
  headlineHe: string
  /** count titles of this competition up to this season, for a card that celebrates one */
  countTitles?: boolean
  placeholderHe: string
  /** a season anchor: no match row is looked up, this sentence and source are the fact */
  summaryHe?: string
  summarySourceTitle?: string
  summarySourceUrl?: string
  /**
   * **עוגן שקורא רגע מהארכיון במקום להקליד אותו מחדש** (21.9.2026).
   *
   * `summaryHe` נכתב ביד, וזו הייתה הצורה היחידה שהייתה לעובדה בלי משחק (עליית 2009,
   * האולם החדש של 2015). היא עובדת, ויש לה מחיר: המשפט חי בשני מקומות, ומי שיתקן את
   * הארכיון לא ידע שיש עותק שני (כלל 59). `momentSlug` מצביע על שורה ב-`moments.json`
   * והמשפט, המקור והתאריך נקראים ממנה — כלומר הארכיון נשאר המקור היחיד, וזה גם מה
   * שכל שאר הקובץ הזה עושה עם משחקים.
   */
  momentSlug?: string
}

const ANCHOR_SPECS: Record<string, AnchorSpec> = {
  '1993-cup': {
    sport: 'basketball',
    seasonLabel: '1992/93',
    competitionSlug: 'גביע-המדינה-כדורסל',
    playedOn: '1993-04-19',
    year: 1993,
    headlineHe: 'גמר גביע המדינה בכדורסל, 1992/93',
    placeholderHe: 'גמר גביע המדינה בכדורסל של 19.4.1993',
  },
  '1993-galil': {
    sport: 'basketball',
    seasonLabel: '1992/93',
    competitionSlug: 'ליגה-לאומית-כדורסל',
    playedOn: '1993-05-19',
    year: 1993,
    headlineHe: 'סדרת הגמר, 1992/93 — המשחק המכריע',
    placeholderHe: 'המשחק המכריע של סדרת הגמר מול גליל עליון, 19.5.1993',
  },
  '1994-cup': {
    sport: 'football',
    seasonLabel: '1993/94',
    competitionSlug: 'גביע-המדינה',
    playedOn: '1994-06-07',
    year: 1994,
    headlineHe: 'גמר גביע המדינה, 1993/94',
    placeholderHe: 'גמר גביע המדינה של 7.6.1994',
  },
  '1995-europe': {
    sport: 'football',
    seasonLabel: '1995/96',
    competitionSlug: 'גביע-אופא',
    playedOn: '1995-08-22',
    year: 1995,
    headlineHe: 'הסיבוב המוקדם של גביע אופ"א, 1995/96',
    placeholderHe: 'משחק הגומלין מול זימברו קישינב, אוגוסט 1995',
  },
  /**
   * Three SEASON anchors. They used to borrow another season's match row so the card
   * would have a scoreline — which put a 1995 European tie on the 1996/97 finale. A
   * season that is a fact and not a match gets a sentence and a source instead.
   */
  '1997-sale': {
    sport: 'football',
    seasonLabel: '1996/97',
    competitionSlug: 'ליגת-העל',
    playedOn: '1997-06-01',
    year: 1997,
    headlineHe: 'החורף של 1996/97 — הישרדות ומכירה',
    placeholderHe: 'שורת ההקשר של עונת 1996/97',
    summaryHe: 'עונת 1996/97: הפועל תל אביב נאבקה בתחתית הליגה ושרדה. באותה עונה נמכרה קבוצת הכדורגל מידי ההסתדרות לקבוצת בעלים פרטית — סוף העידן ההסתדרותי.',
    summarySourceTitle: 'ynet — הפועל תל אביב, 1989–2017 (רטרוספקטיבה)',
    summarySourceUrl: 'https://www.ynet.co.il/articles/0,7340,L-4958060,00.html',
  },
  '1997-relegation': {
    sport: 'basketball',
    seasonLabel: '1996/97',
    competitionSlug: 'ליגה-לאומית-כדורסל',
    playedOn: '1997-06-01',
    year: 1997,
    headlineHe: 'הירידה של הכדורסל, 1996/97',
    placeholderHe: 'שורת הקשר לעונת 1996/97 בכדורסל',
    summaryHe: 'עונת 1996/97: קבוצת הכדורסל של הפועל תל אביב ירדה מהליגה הבכירה — הירידה הראשונה בתולדותיה. בעונה שאחריה עלתה חזרה.',
    summarySourceTitle: 'basket.co.il — דף הקבוצה, עונות',
    summarySourceUrl: 'https://basket.co.il/team.asp?TeamId=399&sType=p2',
  },
  '1998': {
    sport: 'football',
    seasonLabel: '1997/98',
    competitionSlug: 'ליגת-העל',
    playedOn: '1998-05-02',
    year: 1998,
    headlineHe: 'המחזור ה-29, 1997/98',
    placeholderHe: 'המשחק של 2.5.1998 בבלומפילד',
  },
  '1999-relegation': {
    sport: 'basketball',
    seasonLabel: '1998/99',
    competitionSlug: 'ליגה-לאומית-כדורסל',
    playedOn: '1999-06-01',
    year: 1999,
    headlineHe: 'הירידה השנייה של הכדורסל, 1998/99',
    placeholderHe: 'שורת הקשר לעונת 1998/99 בכדורסל',
    summaryHe: 'עונת 1998/99: שנה אחת אחרי העלייה חזרה, קבוצת הכדורסל של הפועל תל אביב ירדה שוב. המשבר לא נגמר בעלייה — הוא רק חיכה.',
    summarySourceTitle: 'basket.co.il — דף הקבוצה, עונות',
    summarySourceUrl: 'https://basket.co.il/team.asp?TeamId=399&sType=p2',
  },
  '1999-cup': {
    sport: 'football',
    seasonLabel: '1998/99',
    competitionSlug: 'גביע-המדינה',
    playedOn: '1999-05-19',
    year: 1999,
    headlineHe: 'גמר גביע המדינה, 1998/99',
    countTitles: true,
    placeholderHe: 'גמר גביע המדינה של 19.5.1999 ברמת גן',
  },
  '2000-title': {
    sport: 'football',
    seasonLabel: '1999/00',
    competitionSlug: 'ליגת-העל',
    playedOn: '2000-05-13',
    year: 2000,
    headlineHe: 'האליפות הוכרעה, 1999/00',
    countTitles: true,
    placeholderHe: 'המשחק של 13.5.2000 בשכונת התקווה',
  },
  '2000-cup': {
    sport: 'football',
    seasonLabel: '1999/00',
    competitionSlug: 'גביע-המדינה',
    playedOn: '2000-05-17',
    year: 2000,
    headlineHe: 'גמר גביע המדינה, 1999/00 — הדאבל',
    countTitles: true,
    placeholderHe: 'גמר גביע המדינה של 17.5.2000 ברמת גן',
  },
  /**
   * שלב ג׳ — העוגן הראשון של תסריט ההמשך, ומה שהארכיון כבר החזיק (21.9.2026).
   *
   * `EUROPE` הוא מסע ולא משחק: צ׳לסי בבלומפילד, לוקומוטיב, פארמה, ואז מילאן. הפרק
   * נתלה על **משחק הגומלין** ב-21.3.2002 בסן סירו — הרגע שבו הוא נגמר — כי זו הסצנה
   * שהתסריט כותב במפורש (`E05`: *"הצג 0:2 במילאנו לפי הארכיון"*).
   *
   * **וזה בדיוק מה שכלל 39 הבטיח.** אף שורה בתוכן לא נוקבת בתוצאה, ביריבה או בכובש.
   * הארכיון מחזיק את השורה בביטחון 2 עם מקור — ESPN, עם 20,000 צופים ו-7,000 שנסעו
   * — והסצנה קוראת אותה ברגע שהיא צריכה מספר. אם השורה תוסר, הפלייסהולדר חוזר ואומר
   * מה הארכיון היה צריך להחזיק.
   */
  /**
   * 2004 — והפעם **הארכיון לא החזיק את השורה, אז היא נקראה ונוספה** (21.9.2026).
   *
   * `H01` כותב *"ניצחון הדרבי 96:71 הוא עוגן"*, ו-`basketball-matches.json` החזיק שש
   * שורות בלבד, כולן מ-1991–1993. כלל 49 אומר בדיוק מה לעשות במצב הזה: *"שים את
   * המשחק בארכיון והסצנה מרימה אותו בלי שינוי קוד"* — ולא להקליד את התוצאה בתסריט.
   *
   * **והמקור הוא האתר של מכבי תל אביב עצמה**, שמדווחת על ההפסד שלה: *"הפסד שלישי
   * העונה בליגת העל, 71-96 באוסישקין"*. שתי אמירות בלתי-תלויות באותו עמוד מסכימות —
   * הכותרת ופירוט הרבעים, שבו הפער הסופי הוא עשרים וחמש, בדיוק כשם הסצנה (כלל 77).
   * נוספה גם `ליגת-העל-כדורסל` ל-`competitions.json`: ב-2004 זו כבר לא הליגה
   * הלאומית, וקישור השורה לתחרות של 1993 היה טענה שגויה על איזו ליגה זו.
   */
  '2004-derby': {
    sport: 'basketball',
    seasonLabel: '2003/04',
    competitionSlug: 'ליגת-העל-כדורסל',
    playedOn: '2004-03-08',
    year: 2004,
    headlineHe: 'הדרבי באוסישקין, 2003/04',
    placeholderHe: 'הדרבי של 8.3.2004 באולם אוסישקין',
  },
  /**
   * 2007 — שני עוגנים בחודש אחד, ושניהם **עוגני סיכום** ולא משחקים.
   *
   * ההקמה אינה משחק וההריסה אינה משחק, ולכן `summaryHe` — אותו מנגנון של `1997-sale`.
   * שתי העובדות יושבות בארכיון מלפני התסריט: `association-events.json` מחזיק את
   * 25.6.2007 עם `dateConfirmed: true` ומקור מאתר המועדון (אומת ב-20.9.2026), ו-
   * `moments.json` + `ussishkin.json` מחזיקים את 25.7.2007 עם ציטוטי ynet.
   *
   * **ואף אחד מהם לא נוקב בשעת ההריסה.** `fact-conflicts.json` מחזיק סתירה פתוחה
   * (6:39 בבוקר מול 12:00 בצהריים), וכלל 60 §3 אומר לשמור אותה ולא להכריע בה —
   * ולכן גם `summaryHe` כאן כתוב בלעדיה.
   */
  '2007-founding': {
    sport: 'basketball',
    seasonLabel: '2007/08',
    competitionSlug: 'ליגה-ב-כדורסל',
    playedOn: '2007-06-25',
    year: 2007,
    headlineHe: 'הפועל אוסישקין נרשמה, 25.6.2007',
    placeholderHe: 'רישום העמותה של 25.6.2007',
    summaryHe: 'ב-25 ביוני 2007 נרשמה הפועל אוסישקין תל אביב לליגה ב׳ בכדורסל — קבוצה בבעלות אוהדים, שהוקמה בידי קבוצת אנשים ולא בידי אדם אחד.',
    summarySourceTitle: 'אתר מועדון הכדורסל — דף הקבוצה',
    summarySourceUrl: 'https://basket.co.il/teams/9/data?id=1142',
  },
  '2007-demolition': {
    sport: 'basketball',
    seasonLabel: '2006/07',
    competitionSlug: 'ליגה-ב-כדורסל',
    playedOn: '2007-07-25',
    year: 2007,
    headlineHe: 'אוסישקין נהרס, 25.7.2007',
    placeholderHe: 'יום ההריסה, 25.7.2007',
    summaryHe: 'ב-25 ביולי 2007 נהרס אולם אוסישקין. אוהדים שעמדו שם קרעו את חולצותיהם. חודש ויום קודם לכן נרשמה קבוצה חדשה שנושאת את שמו.',
    summarySourceTitle: 'ynet — יום ההריסה של אוסישקין',
    summarySourceUrl: 'https://www.ynet.co.il/articles/0,7340,L-3427391,00.html',
  },
  /**
   * 2009 — העלייה, ו**התאריך המדויק אינו בארכיון**.
   *
   * `association-events.json` מחזיק את העונה הראשונה — *"22 ניצחונות ללא הפסד ועלייה
   * לליגה א׳"* — עם `happenedOn: null` ו-`dateConfirmed: false`. זה בדיוק המצב שכלל 11
   * מתאר: מה שלא ידוע נשאר `null` ולא מנוחש, ולכן זה עוגן סיכום. הסצנה של U05 אינה
   * נוקבת בתוצאה, בתאריך או ביריבה — היא על מה שגדל, לא על מה שנגמר.
   */
  '2009-promotion': {
    sport: 'basketball',
    seasonLabel: '2008/09',
    competitionSlug: 'ליגה-ב-כדורסל',
    playedOn: '2009-06-01',
    year: 2009,
    headlineHe: 'העונה שנגמרה בעלייה',
    placeholderHe: 'עונת העלייה של הפועל אוסישקין',
    summaryHe: 'בעונתה הראשונה סיימה הפועל אוסישקין 22 ניצחונות ללא הפסד ועלתה ליגה. התאריך המדויק של משחק העלייה אינו מתועד בארכיון הזה.',
    summarySourceTitle: 'ONE — הפועל אוסישקין, העונה הראשונה',
    summarySourceUrl: 'https://www.one.co.il/Article/136776.html',
  },
  /**
   * 2010 — שני עוגנים, ושניהם שורות ויקיפועל בביטחון 2 שהיו בארכיון מלפני התסריט.
   *
   * גמר הגביע של 11.5.2010 ובטדי ב-15.5.2010. **המשחק המקביל של אותו יום אינו כאן**:
   * `matches.json` מחזיק רק את המשחקים של הפועל, והתוצאה המקבילה אינה שורה — ולכן שום
   * סצנה לא נוקבת בה (כלל 60 §2).
   */
  '2010-cup': {
    sport: 'football',
    seasonLabel: '2009/10',
    competitionSlug: 'גביע-המדינה',
    playedOn: '2010-05-11',
    year: 2010,
    headlineHe: 'גמר גביע המדינה, 2009/10',
    countTitles: true,
    placeholderHe: 'גמר גביע המדינה של 11.5.2010',
  },
  '2010-title': {
    sport: 'football',
    seasonLabel: '2009/10',
    competitionSlug: 'ליגת-העל',
    playedOn: '2010-05-15',
    year: 2010,
    headlineHe: 'האליפות הוכרעה, 2009/10',
    countTitles: true,
    placeholderHe: 'המחזור האחרון של 15.5.2010',
  },
  /**
   * 2010 — אירופה, שני עוגנים, ושתי הערות שהן נתוני ארכיון ולא נתוני LIFE.
   *
   * **א · הפלייאוף מול זלצבורג רשום פעמיים.** `matches.json` מחזיק 17.8 (הפועל בבית 3:2)
   * וגם 18.8 (זלצבורג בבית 2:3), ואז 24.8 וגם 25.8 (שתיהן הפועל בבית 1:1). זה אותו תיק
   * בשתי גרסאות — בית/חוץ הפוכים, תאריך שנבדל ביום. הסתירה נרשמה ב-`fact-conflicts.json`
   * ולא הוכרעה מכאן (כלל 60 §3); **הוכרע 25.9.2026 (דלתא 89): 24.8, לפי רישום המשחק של אופ"א (matchId=2002390).** לפני כן העוגן קרא את 25.8, השורה היחידה מבין הארבע שנושאת
   * **אצטדיון** והערה מפורטת, וזו בחירה של קריאוּת ולא פסיקה על הארכיון.
   *
   * **ב · בנפיקה יושבת תחת שני סלאגים** — `בנפיקה-ליסבון` ב-14.9 ו-`בנפיקה` ב-24.11.
   * איחוד ישויות עובר ב-`entity_alias` ובידיים של בעל הבית (כלל 7), לא בפרק.
   */
  '2010-salzburg': {
    sport: 'football',
    seasonLabel: '2010/11',
    competitionSlug: 'ליגת-האלופות',
    playedOn: '2010-08-24',
    year: 2010,
    headlineHe: 'הערב שבו עלינו לשלב הבתים',
    placeholderHe: 'משחק החזרה של הפלייאוף, 24.8.2010',
  },
  '2010-benfica': {
    sport: 'football',
    seasonLabel: '2010/11',
    competitionSlug: 'ליגת-האלופות',
    playedOn: '2010-11-24',
    year: 2010,
    headlineHe: 'שלב הבתים, המחזור החמישי',
    placeholderHe: 'המשחק בבלומפילד של 24.11.2010',
  },
  /**
   * 2012 — שני עוגנים, ואחד מהם נקרא היום.
   *
   * גמר הגביע של 15.5.2012 היה בארכיון מלפני התסריט. **העלייה בכדורסל של 16.5.2012
   * לא הייתה** — התסריט נוקב בה כעובדה `H30` עם מקור, כלל 49 אומר מה עושים, והמקור
   * (וואלה ספורט, דיווח בזמן האירוע) נקרא ואומת: הכותרת "הפועל תל אביב חוזרת לליגת
   * העל" והגוף, 83:56 מול מכבי באר יעקב, שלוש-אחת בסדרה. שתי אמירות בלתי-תלויות
   * באותו עמוד שמסכימות (כלל 77). האולם אינו נקוב במקור ונשאר `null`.
   */
  '2012-cup': {
    sport: 'football',
    seasonLabel: '2011/12',
    competitionSlug: 'גביע-המדינה',
    playedOn: '2012-05-15',
    year: 2012,
    headlineHe: 'גמר גביע המדינה, 2011/12',
    countTitles: true,
    placeholderHe: 'גמר גביע המדינה של 15.5.2012',
  },
  '2012-promotion': {
    sport: 'basketball',
    seasonLabel: '2011/12',
    competitionSlug: 'ליגה-לאומית-כדורסל',
    playedOn: '2012-05-16',
    year: 2012,
    headlineHe: 'החזרה לליגת העל בכדורסל',
    placeholderHe: 'המשחק המכריע של 16.5.2012',
  },
  /**
   * 2015 — **הערב הראשון, ולא החנוכה.** עד 27.9.2026 זה היה עוגן סיכום בלי תאריך
   * ("התאריך המדויק של הערב הראשון אינו מתועד בארכיון הזה"). עכשיו הוא מתועד:
   * `basketball-matches.json` מחזיק את 4.1.2015, 81:67 על הפועל ירושלים — ynet הודיע
   * עליו מראש ווואלה דיווח עליו למחרת (כלל 77). החנוכה העירונית של 24.12.2014, בלי
   * נציגי הפועל, היא רקע בפרק ולא העוגן: העוגן הוא הערב שבו האוהדים פתחו את האולם.
   */
  '2015-drivein': {
    sport: 'basketball',
    seasonLabel: '2014/15',
    competitionSlug: 'ליגת-העל-כדורסל',
    playedOn: '2015-01-04',
    year: 2015,
    headlineHe: 'בית חדש, אחרי שבע שנים',
    placeholderHe: 'הערב הראשון בדרייב אין, 4.1.2015',
  },
  /**
   * 2016–2017 — שני עוגנים שקוראים **רגע** מהארכיון, לא משחק.
   *
   * צו הקפאת ההליכים של 12.12.2016 והפחתת תשע הנקודות של 10.1.2017 הם עובדות עם
   * תאריך ובלי משחק. שתיהן נקראו ממקורות בני הזמן ונכתבו ל-`moments.json` — הפחתת
   * הנקודות מוצלבת בין הדיווח בן הזמן לבין טבלת הסיום של RSSSF, שנושאת את ההערה
   * על ההפחתה ואת הסימון Relegated באותה שורה (כלל 77).
   *
   * **ומה שהתסריט אוסר במפורש, ונשמר:** *"לא ממציאים נושה אמיתי, שכר שלא שולם לאדם
   * מסוים או אשמה של אדם ציבורי."* השורות בארכיון נוקבות במוסדות ובסכום הכולל בלבד;
   * אף אדם אינו נקוב בשם, לא בארכיון ולא בסצנה (כללים 11, 17).
   */
  '2016-freeze': {
    sport: 'football',
    seasonLabel: '2016/17',
    competitionSlug: 'ליגת-העל',
    playedOn: '2016-12-12',
    year: 2016,
    headlineHe: 'דצמבר 2016',
    placeholderHe: 'צו הקפאת ההליכים של 12.12.2016',
    momentSlug: 'הקפאת-הליכים-2016',
  },
  '2017-nine': {
    sport: 'football',
    seasonLabel: '2016/17',
    competitionSlug: 'ליגת-העל',
    playedOn: '2017-01-10',
    year: 2017,
    headlineHe: 'תשע נקודות',
    placeholderHe: 'הפחתת תשע הנקודות של 10.1.2017',
    momentSlug: 'תשע-נקודות-2017',
  },
  /**
   * 2018 ו-2021 — רגע בלי תאריך, ומשחק שהיה בארכיון מלפני התסריט.
   *
   * העלייה של 2017/18 היא **עונה** ולא ערב: RSSSF נוקב בראש הטבלה ובעלייה, ולא
   * בערב שבו זה נחתם, ולכן ל-`עלייה-2018` אין `happenedOn` והוא נשאר `null`
   * (כלל 80). גמר הגביע של 2.6.2021 הוא שורה רגילה.
   */
  '2018-promotion': {
    sport: 'football',
    seasonLabel: '2017/18',
    competitionSlug: 'ליגה-לאומית',
    playedOn: '2018-05-21',
    year: 2018,
    headlineHe: 'אלופת הלאומית, וחזרה למעלה',
    placeholderHe: 'העלייה של עונת 2017/18',
    momentSlug: 'עלייה-2018',
  },
  '2021-cup': {
    sport: 'football',
    seasonLabel: '2020/21',
    competitionSlug: 'גביע-המדינה',
    playedOn: '2021-06-02',
    year: 2021,
    headlineHe: 'גמר גביע המדינה, 2020/21',
    placeholderHe: 'גמר הגביע של 2.6.2021',
  },
  /**
   * 2023–2025 — ערב, ירידה, עלייה, וגמר אירופי.
   *
   * `2023-derby` הוא **המשחק השני בסדרת הגמר**, זה שהשווה אותה — לא אליפות, ולא
   * תואר, וזה מה שהתסריט מקפיד עליו בשם. שני הרגעים בלי תאריך (`ירידה-2024`,
   * `עלייה-2025`) נקראים מ-`moments.json`.
   */
  '2023-derby': {
    sport: 'basketball',
    seasonLabel: '2022/23',
    competitionSlug: 'ליגת-העל-כדורסל',
    playedOn: '2023-06-11',
    year: 2023,
    headlineHe: 'הדרבי של סדרת הגמר',
    placeholderHe: 'הדרבי של 11.6.2023',
  },
  /**
   * **הירידה קיבלה ערב (27.9.2026).** עד היום זה היה רגע בלי תאריך. השורה של 11.5.2024
   * כבר ישבה ב-`matches.json` (0:2 בבית לאשדוד), ושלושה מקורות מאותו ערב — הארץ, וואלה,
   * ONE — קובעים שבו נחתמה הירידה; `moments.json` קשור אליה עכשיו ב-`matchNaturalKey`.
   * זה המהלך של כלל 49: השורה נחתה, והסצנה מקבלת ערב בלי שינוי אחר.
   */
  '2024-relegation': {
    sport: 'football',
    seasonLabel: '2023/24',
    competitionSlug: 'ליגת-העל',
    playedOn: '2024-05-11',
    year: 2024,
    headlineHe: 'שוב הלאומית',
    placeholderHe: 'הירידה של 11.5.2024',
  },
  /**
   * 2024 — **שני סיפורי בעלות באותה שנה**, ולכן עוגן סיכום: אין משחק שהוא הסיפור.
   * שני התאריכים שהמשפט נוקב בהם נקראו משני מקורות בני הזמן — ההודעה של 12.7.2024
   * (הארץ) והאישור של 15.8.2024 (וואלה, ספורט1). העוגן לא נוקב באף סכום: מקור אחד
   * מזכיר השקעה מתוכננת, ואף מקור לא נוקב במחיר.
   */
  '2024-safra': {
    sport: 'football',
    seasonLabel: '2024/25',
    competitionSlug: 'ליגה-לאומית',
    playedOn: '2024-08-15',
    year: 2024,
    headlineHe: 'בעלים חדשים, ליגה אחרת',
    placeholderHe: 'העברת הזכויות של אוגוסט 2024',
    summaryHe:
      'ב-12 ביולי 2024 הודיע המועדון שסוכמה רכישתו בידי אדמונד ספרא, וב-15 באוגוסט 2024 אישרה ועדת העברת הזכויות בהתאחדות את ההעברה. הקבוצה פתחה את עונת 2024/25 בליגה הלאומית.',
    summarySourceTitle: 'וואלה ספורט, 15.8.2024 — אושרה העברת הזכויות (מוצלב מול הארץ, 12.7.2024)',
    summarySourceUrl: 'https://sports.walla.co.il/item/3684875',
  },
  '2025-promotion': {
    sport: 'football',
    seasonLabel: '2024/25',
    competitionSlug: 'ליגה-לאומית',
    playedOn: '2025-05-19',
    year: 2025,
    headlineHe: 'אלופת הלאומית, שוב',
    placeholderHe: 'העלייה של עונת 2024/25',
    momentSlug: 'עלייה-2025',
  },
  '2025-eurocup': {
    sport: 'basketball',
    seasonLabel: '2024/25',
    competitionSlug: 'יורוקאפ',
    playedOn: '2025-04-11',
    year: 2025,
    headlineHe: 'היורוקאפ',
    placeholderHe: 'המשחק שסגר את סדרת הגמר, 11.4.2025',
  },
  /**
   * 7.5.2026, בוטבגרד — **הערב שהציר הראשי נגמר בו**, ושורת ארכיון ככל שורה אחרת.
   *
   * התסריט מסמן את הרשומה `immutable`, וזה בדיוק מה שהיא: 81 להפועל, 87 לריאל,
   * המשחק הרביעי ברבע הגמר. שני מקורות בלתי-תלויים מסכימים על היום, על התוצאה ועל
   * האולם, והשני נוקב גם בסדרה (כלל 77). **התוצאה אינה תנאי לסיום האישי** ואין
   * סצנת אליפות חלופית — הפרק נגמר בשלוש הבחירות של `F04`, לא בלוח.
   */
  '2026-botevgrad': {
    sport: 'basketball',
    seasonLabel: '2025/26',
    competitionSlug: 'יורוליג',
    playedOn: '2026-05-07',
    year: 2026,
    headlineHe: 'רבע גמר היורוליג, המשחק הרביעי',
    placeholderHe: 'הערב של 7.5.2026 בבוטבגרד',
  },
  /**
   * חיי בית — שני פרקים אישיים, ולכן שני ערבים מהארכיון שקרו **לידם** ולא בתוכם.
   * גמר הגביע של 25.5.2011 והדרבי של 11.11.2012 הם שורות ויקיפועל רגילות; הכרטיס
   * שלהם הוא העולם שבחוץ, והפרק הוא מה שקורה בזמן שהוא קורה.
   */
  '2011-cup': {
    sport: 'football',
    seasonLabel: '2010/11',
    competitionSlug: 'גביע-המדינה',
    playedOn: '2011-05-25',
    year: 2011,
    headlineHe: 'גמר גביע המדינה, 2010/11',
    countTitles: true,
    placeholderHe: 'גמר הגביע של 25.5.2011',
  },
  '2012-derby': {
    sport: 'football',
    seasonLabel: '2012/13',
    competitionSlug: 'ליגת-העל',
    playedOn: '2012-11-11',
    year: 2012,
    headlineHe: 'דרבי, נובמבר 2012',
    placeholderHe: 'הדרבי של 11.11.2012',
  },
  '2002-milan': {
    sport: 'football',
    seasonLabel: '2001/02',
    competitionSlug: 'גביע-אופא',
    playedOn: '2002-03-21',
    year: 2002,
    headlineHe: 'רבע גמר גביע אופ״א, 2001/02',
    placeholderHe: 'משחק הגומלין של רבע הגמר, 21.3.2002 בסן סירו',
  },
}

export const STAGE_B_ANCHOR_KEYS = Object.keys(ANCHOR_SPECS)

export function resolveStageBAnchors(): Record<string, HistoricalAnchor> {
  return Object.fromEntries(Object.entries(ANCHOR_SPECS).map(([key, spec]) => [key, resolveSpec(key, spec)]))
}

function resolveSpec(key: string, spec: AnchorSpec): HistoricalAnchor {
  if (spec.momentSlug) {
    const moment = archive.moments.find((row) => row.slug === spec.momentSlug)
    return {
      id: `${key}:${spec.competitionSlug}:${spec.seasonLabel}`,
      sport: spec.sport,
      seasonLabel: spec.seasonLabel,
      year: spec.year,
      competitionSlug: spec.competitionSlug,
      headlineHe: spec.headlineHe,
      venueSlug: null,
      sourceTitle: moment?.sourceTitle ?? 'content/manual/moments.json',
      sourceUrl: moment?.sourceUrl ?? null,
      confidence: moment ? 2 : 0,
      titlesSoFar: null,
      match: null,
      // A row that is gone takes its sentence with it, and the placeholder says what is missing.
      placeholder: moment
        ? null
        : { what: `${spec.placeholderHe} — אינו בארכיון.`, needs: `שורה ב-content/manual/moments.json עם slug "${spec.momentSlug}".` },
      summaryHe: moment?.bodyHe,
    }
  }
  if (spec.summaryHe) {
    return {
      id: `${key}:${spec.competitionSlug}:${spec.seasonLabel}`,
      sport: spec.sport,
      seasonLabel: spec.seasonLabel,
      year: spec.year,
      competitionSlug: spec.competitionSlug,
      headlineHe: spec.headlineHe,
      venueSlug: null,
      sourceTitle: spec.summarySourceTitle ?? 'content/manual',
      sourceUrl: spec.summarySourceUrl ?? null,
      confidence: 2,
      titlesSoFar: null,
      match: null,
      placeholder: null,
      summaryHe: spec.summaryHe,
    }
  }
  if (spec.sport === 'basketball') {
    const row = archive.basketballMatches.find(
      (r) => r.sport === 'basketball' && r.seasonLabel === spec.seasonLabel && r.competitionSlug === spec.competitionSlug && r.playedOn === spec.playedOn,
    )
    const atHome = row?.homeClubSlug === US
    const match =
      row && row.homeScore !== null && row.awayScore !== null
        ? {
            playedOn: row.playedOn ?? '',
            opponentHe: atHome ? row.awayClubHe : row.homeClubHe,
            scoredFor: (atHome ? row.homeScore : row.awayScore) ?? 0,
            scoredAgainst: (atHome ? row.awayScore : row.homeScore) ?? 0,
            atHome,
            venueHe: row.venueHe,
            decidedBy: null,
            sourceTitle: (row as { sourceTitle?: string }).sourceTitle ?? 'content/manual/basketball-matches.json',
            sourceUrl: (row as { sourceUrl?: string | null }).sourceUrl ?? null,
          }
        : null
    return {
      id: `${key}:${spec.competitionSlug}:${spec.seasonLabel}`,
      sport: 'basketball',
      seasonLabel: spec.seasonLabel,
      year: spec.year,
      competitionSlug: spec.competitionSlug,
      headlineHe: spec.headlineHe,
      venueSlug: row?.venueSlug ?? null,
      sourceTitle: match?.sourceTitle ?? 'content/manual/basketball-matches.json',
      sourceUrl: match?.sourceUrl ?? null,
      confidence: (row as { confidence?: number } | undefined)?.confidence ?? 0,
      titlesSoFar: null,
      match,
      placeholder: match
        ? null
        : { what: `${spec.placeholderHe} — אינו בארכיון.`, needs: `שורת כדורסל מעונת ${spec.seasonLabel} ב-content/manual/basketball-matches.json.` },
    }
  }

  const row = archive.matches.find(
    (r) =>
      r.seasonLabel === spec.seasonLabel &&
      r.competitionSlug === spec.competitionSlug &&
      r.playedOn === spec.playedOn &&
      (r.homeClubSlug === US || r.awayClubSlug === US),
  )
  let match: HistoricalAnchor['match'] = null
  if (row && row.playedOn && row.homeScore !== null && row.awayScore !== null) {
    const atHome = row.homeClubSlug === US
    const opponentSlug = atHome ? row.awayClubSlug : row.homeClubSlug
    const venue = row.venueSlug ? archive.venues.find((r) => r.slug === row.venueSlug && r.sport === 'football') : null
    match = {
      playedOn: row.playedOn,
      opponentHe: opponentNameHe(opponentSlug),
      scoredFor: (atHome ? row.homeScore : row.awayScore) ?? 0,
      scoredAgainst: (atHome ? row.awayScore : row.homeScore) ?? 0,
      atHome,
      venueHe: venue?.nameHe ?? null,
      decidedBy: null,
      sourceTitle: row.sourceTitle ?? trophySource(),
      sourceUrl: row.sourceUrl ?? null,
    }
  }
  const venue = row?.venueSlug ? archive.venues.find((r) => r.slug === row.venueSlug) : null
  return {
    id: `${key}:${spec.competitionSlug}:${spec.seasonLabel}`,
    sport: 'football',
    seasonLabel: spec.seasonLabel,
    year: spec.year,
    competitionSlug: spec.competitionSlug,
    headlineHe: spec.headlineHe,
    venueSlug: venue?.slug ?? null,
    sourceTitle: match?.sourceTitle ?? 'content/manual/matches.json',
    sourceUrl: match?.sourceUrl ?? null,
    confidence: (row as { confidence?: number } | undefined)?.confidence ?? 0,
    titlesSoFar: spec.countTitles ? countTitles(spec.seasonLabel, spec.competitionSlug) : null,
    match,
    placeholder: match
      ? null
      : { what: `${spec.placeholderHe} — אינו בארכיון.`, needs: `שורת משחק מעונת ${spec.seasonLabel} ב-content/manual/matches.json ברמת ודאות 2 ומעלה.` },
  }
}
