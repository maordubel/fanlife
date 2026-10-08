/**
 * A NIGHT FROM THE ARCHIVE.
 *
 * The one kind of chapter that stands on history. It is built from a single approved row of the
 * club's archive and it states NOTHING that row does not: the title is printed as it was
 * recorded, the date as it was recorded, and no line of dialogue adds an opponent, a scorer, a
 * minute or a place. What the chapter invents is where the supporter was sitting — which is his
 * to remember and nobody's to verify.
 *
 * If the row's title is a scoreline the engine can read ("A 2–1 B"), the room reacts to the
 * result. If it is not, the room reacts to nothing and says so.
 *
 * Two small things are the supporter's own: where he sat, and whom he guessed. The guess is drawn
 * from the club's recorded line-up for that day (archive data, never invented) and the night says
 * the record agrees with him only when the record lists that man among its scorers. It never
 * names a minute and it never says he was wrong.
 *
 * What a night leaves behind is one flag — `life:night:win|loss|draw` — which the first scene of
 * the next ordinary chapter reads, so that somebody in the room can say a word about it. A mood,
 * not a fact: no score, no opponent, no scorer travels with it.
 */
import {readMatch} from '../match'
import type {ArchiveRef, Branch, CardDef, Chapter, Cond, Effect, Line, Talk} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export type NightResult = 'won' | 'lost' | 'drew' | 'unread'
export type NightEra = 'child' | 'teen' | 'adult'
type Locale = 'en' | 'he'

/** Reads a recorded scoreline. Anything it cannot read with certainty is `unread` — never a guess. */
export const readResult = (title: string, clubNames: readonly string[]): NightResult => readMatch(title, clubNames)?.result ?? 'unread'

/** How many names the supporter may choose between before the kick-off. */
const GUESS_NAMES = 4

type Whistle = {child: Line[]; teen: Line[]; adult: Line[]; ending: string}
/** The ages by which the ordinary chapters have raised the flags an adult night reads (a night may fall before them). */
const HOUSEHOLD_AGE = 26, DAD_AGE = 31, FAMILY_AGE = 41

const L = (locale: Locale) => (en: string, he: string) => locale === 'he' ? he : en

function whistleOf(result: NightResult, locale: Locale): Whistle {
  const x = L(locale)
  switch (result) {
    case 'won': return {
      child: [tell(x('Dad makes a sound you have never heard a grown-up make.', 'אבא משמיע קול שמעולם לא שמעת מבוגר משמיע.')), tell(x('He picks you up and the room goes round once, slowly, with everything still on its shelves.', 'הוא מרים אותך והחדר מסתובב פעם אחת, לאט, כשהכול נשאר על המדפים.')), say('dad', x('Remember this. I am telling you now so that you know to.', 'תזכור את זה. אני אומר לך עכשיו כדי שתדע לזכור.'))],
      teen: [tell(x('The whole pavement goes up at once, like something thrown.', 'כל המדרכה עולה בבת אחת, כמו משהו שזרקו.')), tell(x('Somebody you have never met is holding your face in both hands and shouting the name of the club into it.', 'מישהו שמעולם לא פגשת מחזיק את הפנים שלך בשתי ידיים וצועק לתוכן את שם המועדון.')), say('friend', x('We were here! Say it — we were here!', 'היינו פה! תגיד את זה — היינו פה!'))],
      adult: [tell(x('You are on your feet and you do not remember standing.', 'אתה על הרגליים ואתה לא זוכר שקמת.')), tell(x('The flat is too small for it. You open the window, and the street is already shouting back.', 'הדירה קטנה מדי בשביל זה. אתה פותח חלון, והרחוב כבר צועק בחזרה.'))],
      ending: x('A night the club wrote down, and you were awake for all of it. The archive has the result. You have where you were standing.', 'לילה שהמועדון רשם, ואתה היית ער לכולו. הארכיון מחזיק את התוצאה. אצלך נשאר המקום שבו עמדת.'),
    }
    case 'lost': return {
      child: [tell(x('Dad switches the set off before the voices can start explaining.', 'אבא מכבה את המכשיר לפני שהקולות מתחילים להסביר.')), tell(x('He sits for a while with his hands on his knees.', 'הוא יושב זמן מה עם הידיים על הברכיים.')), say('dad', x('You stay anyway. That is the whole trick. You stay anyway.', 'אתה נשאר בכל זאת. זה כל הסוד. אתה נשאר בכל זאת.'))],
      teen: [tell(x('Nobody says anything. The little screen keeps talking to itself.', 'אף אחד לא אומר כלום. המסך הקטן ממשיך לדבר לעצמו.')), tell(x('{kiosk} turns it down, then off, and starts stacking crates that did not need stacking.', '{kiosk} מנמיך, אחר כך מכבה, ומתחיל לערום ארגזים שלא היה צריך לערום.')), say('friend', x('Walk you home?', 'ללוות אותך הביתה?'))],
      adult: [tell(x('You turn it off and the flat is suddenly a place where a fridge hums.', 'אתה מכבה והדירה פתאום היא מקום שבו מקרר מזמזם.')), tell(x('It should matter less by now. That was the promise of getting older, and it was not kept.', 'זה אמור להיות פחות חשוב עד עכשיו. זה היה ההבטחה של להזדקן, והיא לא נשמרה.'))],
      ending: x('A night the club wrote down, and it did not go your way. The archive has the result. You have the walk home.', 'לילה שהמועדון רשם, והוא לא הלך בדרך שלך. הארכיון מחזיק את התוצאה. אצלך נשארה ההליכה הביתה.'),
    }
    case 'drew': return {
      child: [tell(x('It ends, and nobody in the room knows what face to make.', 'זה נגמר, ואף אחד בחדר לא יודע איזה פרצוף לעשות.')), say('dad', x('Not nothing. Not everything.', 'לא כלום. לא הכול.')), say('dad', x('You will have a lot of these. Learn to carry them.', 'יהיו לך הרבה כאלה. תלמד לשאת אותם.'))],
      teen: [tell(x('It ends level, and the pavement breathes out all at once.', 'זה נגמר שווה, והמדרכה נושפת בבת אחת.')), say('friend', x('I do not know if I am happy.', 'אני לא יודע אם אני שמח.')), say('kiosk', x('Then you are a supporter. Go home.', 'אז אתה אוהד. לך הביתה.'))],
      adult: [tell(x('It ends level. You sit with it the way you sit with weather.', 'זה נגמר שווה. אתה יושב איתו כמו שיושבים עם מזג אוויר.')), tell(x('Your tea has gone cold twice. You drink it anyway.', 'התה שלך התקרר פעמיים. אתה שותה אותו בכל זאת.'))],
      ending: x('A night the club wrote down. The archive has the result. You have the feeling of not knowing what to do with your hands.', 'לילה שהמועדון רשם. הארכיון מחזיק את התוצאה. אצלך נשארה ההרגשה של אי־ידיעה מה לעשות עם הידיים.'),
    }
    default: return {
      child: [tell(x('Afterwards you could not have said what happened. You could have said exactly where everybody was sitting.', 'אחר כך לא יכולת להגיד מה קרה. יכולת להגיד בדיוק איפה כל אחד ישב.')), say('dad', x('You will be telling people about tonight. Start practising.', 'אתה עוד תספר לאנשים על הערב. תתחיל להתאמן.'))],
      teen: [tell(x('Afterwards you could not have told it in order. You could have drawn the pavement from memory.', 'אחר כך לא יכולת לספר את זה לפי הסדר. יכולת לצייר את המדרכה מהזיכרון.')), say('friend', x('We were here for it. That is ours now.', 'היינו פה בשביל זה. זה שלנו עכשיו.'))],
      adult: [tell(x('Afterwards you sit with the lamp off and let the night be what it was.', 'אחר כך אתה יושב כשהמנורה כבויה ונותן ללילה להיות מה שהיה.')), tell(x('The archive will keep what happened. You will keep the room.', 'הארכיון ישמור מה שקרה. אתה תשמור את החדר.'))],
      ending: x('A night the club wrote down. What happened is in the archive, in its own words. Where you were is yours.', 'לילה שהמועדון רשם. מה שקרה נמצא בארכיון, במילים שלו. איפה שהיית שייך לך.'),
    }
  }
}

const ECHO: Record<NightResult, string | null> = {won: 'win', lost: 'loss', drew: 'draw', unread: null}

/** A few names from the recorded line-up, evenly spread; none when the record does not list enough. */
export function guessNames(anchor: ArchiveRef): string[] {
  const lineup = (anchor.match?.detail?.lineup ?? []).filter((n, i, a) => n.trim() && a.indexOf(n) === i)
  if (lineup.length < 3) return []
  const take = Math.min(GUESS_NAMES, lineup.length)
  return Array.from({length: take}, (_, i) => lineup[Math.round(i * (lineup.length - 1) / (take - 1))]!).filter((n, i, a) => a.indexOf(n) === i)
}

/** One anchored night. `n` keeps ids unique when a life has several. */
export function nightChapter(anchor: ArchiveRef, age: number, result: NightResult, n: number, centre = false, locale: Locale = 'en'): Chapter {
  const x = L(locale)
  const era: NightEra = age < 13 ? 'child' : age < 20 ? 'teen' : 'adult'
  const id = `night-${n}`, f = (k: string) => `${id}:${k}`
  const item = `night:${anchor.factId}`
  const m = anchor.match
  const whistle = whistleOf(result, locale)
  const names = guessNames(anchor)
  const scorers = new Set((m?.detail?.scorers ?? []).map(s => s.name))
  // a match the archive states in full is told as a match: the two sides first, the result when the whistle goes
  const card: CardDef = {id: 'archive', kicker: x('From the archive', 'מהארכיון'), title: anchor.title, body: anchor.hint, archive: anchor, stage: m ? 'result' : undefined}
  const kickoff: CardDef | null = m ? {id: 'kickoff', kicker: x('Tonight', 'הערב'), title: `${m.home} v ${m.away}`, body: anchor.hint, archive: anchor, stage: 'kickoff'} : null
  const echo = ECHO[result]
  /** at the whistle the recorded result is laid on the table, then the night is over */
  const done: Effect[] = [
    {e: 'sound', cue: result === 'won' ? 'roar' : 'whistle'},
    ...(m ? [{e: 'card' as const, card: 'archive'}] : []),
    flag(f('over')), keep(item), heart((result === 'won' ? 8 : 5) + (centre ? 4 : 0)), {e: 'standing', by: centre ? 6 : 3},
    ...(['win', 'loss', 'draw'] as const).map(k => flag(`life:night:${k}`, echo === k)),
    {e: 'end' as const, ending: 'night'},
  ]
  /** the card that shows the night before it starts: with a readable match it is the kick-off, otherwise the record itself */
  const watching: Effect[] = [{e: 'sound', cue: 'murmur'}, {e: 'card', card: kickoff ? 'kickoff' : 'archive'}]

  // before the kick-off: a guess, drawn from the record's own line-up
  const goesTo = names.length ? 'guess' : 'watch'
  const guessTalk: Talk[] = names.length ? [{id: 'guess', branches: [{
    lines: [tell(x('A voice near you asks, to nobody: who is going to do it tonight? You find that you have an answer.', 'קול לידך שואל, לאף אחד: מי הולך לעשות את זה הערב? אתה מגלה שיש לך תשובה.'))],
    choices: [...names.map((nm, i) => ({id: `g${i}`, t: nm, then: [flag(f('guess'), nm)], next: 'watch'})), {id: 'none', t: x('Nobody in particular — let it happen', 'אף אחד בפרט — שיקרה מה שיקרה'), then: [flag(f('guess'), '')], next: 'watch'}],
  }]}] : []
  // at the whistle: where the record lists the man he named among its scorers, it says so — and says nothing when it does not
  const agree = (lines: Line[]): Branch[] => names.filter(nm => scorers.has(nm)).map(nm => ({
    when: {is: [f('guess'), nm]} as Cond,
    lines: [tell(x(`You said ${nm}. The record lists ${nm} among the scorers.`, `אמרת ${nm}. ברשומה ${nm} ברשימת הכובשים.`)), ...lines], then: done,
  }))
  const whistleTalk = (lines: Line[]): Talk => ({id: 'whistle', branches: [...agree(lines), {lines, then: done}]})

  const base = {
    id, act: (era === 'child' ? 1 : era === 'teen' ? 2 : 3) as 1 | 2 | 3, age,
    title: centre ? x('The Night', 'הלילה') : x('A Night from the Archive', 'לילה מהארכיון'),
    kicker: centre ? x(`Age ${age} · the match`, `גיל ${age} · המשחק`) : x(`Age ${age} · a night the club wrote down`, `גיל ${age} · לילה שהמועדון רשם`),
    anchor, ...(centre ? {centrepiece: true} : {}),
    cards: kickoff ? [kickoff, card] : [card],
    keepsakes: [{id: item, name: anchor.title, note: x('A night from the archive. You know where you were.', 'לילה מהארכיון. אתה יודע איפה היית.')}],
    endings: {night: {title: x('You Were There', 'היית שם'), body: whistle.ending, keep: item}},
  }
  const wearsBoth: Cond = {wears: 'both'}
  const wearsAny: Cond = {any: [{wears: 'shirt'}, {wears: 'scarf'}, {wears: 'both'}]}

  if (era === 'child') return {
    ...base,
    intro: x('Tonight you are allowed to stay up. Nobody has said why, and nobody needs to: the flat has been holding its breath since the afternoon.', 'הערב מותר לך להישאר ער. אף אחד לא אמר למה, ואף אחד לא צריך: הדירה עוצרת את הנשימה מאז הצהריים.'),
    start: {room: 'bedroom', spawn: 'start', time: 'night'},
    cast: [{who: 'dad', room: 'room', slot: 'sofa', talk: 'dad'}, {who: 'mum', room: 'room', slot: 'byDoor', talk: 'mum'}],
    doors: [
      {id: 'bed-out', room: 'bedroom', door: 'door', to: 'room', spawn: 'fromBedroom', label: x('The living room', 'הסלון')},
      {id: 'room-bed', room: 'room', door: 'south', to: 'bedroom', spawn: 'fromLiving', label: x('Your room', 'החדר שלך')},
    ],
    spots: [
      {id: 'wardrobe', room: 'bedroom', spot: 'wardrobe', when: {not: f('dressed')}, talk: 'dress', verb: 'open', label: x('The wardrobe', 'הארון')},
      {id: 'set', room: 'room', spot: 'tv', talk: 'set', verb: 'look', label: x('The set in the corner', 'המכשיר בפינה')},
    ],
    beats: [],
    objectives: [
      {id: 'dress', t: x('You cannot watch it in pyjamas. The wardrobe', 'אי אפשר לראות את זה בפיג׳מה. הארון'), done: {flag: f('dressed')}, room: 'bedroom'},
      {id: 'sit', t: x('Find your place before it starts', 'למצוא את המקום שלך לפני שזה מתחיל'), done: {flag: f('over')}, room: 'room'},
    ],
    talks: [
      {id: 'dress', branches: [
        {when: {is: ['life:shirt:origin', 'handed']}, lines: [tell(x('The shirt that used to be your father’s goes on first, sleeves rolled. Then the scarf. Then you look at yourself in the wardrobe door for longer than you would admit.', 'החולצה שהייתה של אבא עולה ראשונה, שרוולים מקופלים. אחר כך הצעיף. אחר כך אתה מסתכל על עצמך בדלת הארון יותר ממה שתודה.'))], then: [flag(f('dressed')), {e: 'wear', what: 'both'}]},
        {when: wearsAny, lines: [tell(x('You already have half of it on. You put on the other half and look at yourself in the wardrobe door for longer than you would admit.', 'חצי מזה כבר עליך. אתה לובש את החצי השני ומסתכל על עצמך בדלת הארון יותר ממה שתודה.'))], then: [flag(f('dressed')), {e: 'wear', what: 'both'}]},
        {lines: [tell(x('The scarf goes on first. Then you look at yourself in the wardrobe door for longer than you would admit.', 'הצעיף עולה ראשון. אחר כך אתה מסתכל על עצמך בדלת הארון יותר ממה שתודה.'))], then: [flag(f('dressed')), {e: 'wear', what: 'both'}]},
      ]},
      {id: 'set', branches: [{lines: [tell(x('The set is warming up. Everybody in the room is pretending to do something else.', 'המכשיר מתחמם. כולם בחדר מעמידים פנים שהם עושים משהו אחר.'))]}]},
      {id: 'mum', branches: [
        {when: {flag: f('dressed')}, lines: [say('mum', x('I am not nervous. I am folding.', 'אני לא לחוצה. אני מקפלת.')), tell(x('She has folded the same towel three times.', 'היא קיפלה את אותה מגבת שלוש פעמים.'))]},
        {lines: [say('mum', x('You are not watching it dressed like that. Go on — properly.', 'אתה לא רואה את זה לבוש ככה. קדימה — כמו שצריך.'))]},
      ]},
      {id: 'dad', branches: [
        {when: {all: [{flag: f('dressed')}, {is: ['life:first:question', 'asked']}]}, lines: [say('dad', x('You asked me once what makes them ours. Sit where you like. Tonight you find out.', 'שאלת אותי פעם מה הופך אותם לשלנו. שב איפה שאתה רוצה. הערב אתה מגלה.'))], choices: [
          {id: 'next', t: x('Next to Dad', 'ליד אבא'), then: [bond('dad', 6)], next: goesTo},
          {id: 'rug', t: x('On the rug, exactly where you sat last time', 'על השטיח, בדיוק איפה שישבת בפעם הקודמת'), then: [heart(4)], next: goesTo},
          {id: 'behind', t: x('Behind the sofa, where you do not have to look', 'מאחורי הספה, איפה שלא חייבים להסתכל'), then: [flag(f('hid'))], next: goesTo},
        ]},
        {when: {flag: f('dressed')}, lines: [say('dad', x('Good. Now — where do you sit? It matters. Do not ask me why it matters.', 'טוב. עכשיו — איפה אתה יושב? זה חשוב. אל תשאל אותי למה זה חשוב.'))], choices: [
          {id: 'next', t: x('Next to Dad', 'ליד אבא'), then: [bond('dad', 6)], next: goesTo},
          {id: 'rug', t: x('On the rug, exactly where you sat last time', 'על השטיח, בדיוק איפה שישבת בפעם הקודמת'), then: [heart(4)], next: goesTo},
          {id: 'behind', t: x('Behind the sofa, where you do not have to look', 'מאחורי הספה, איפה שלא חייבים להסתכל'), then: [flag(f('hid'))], next: goesTo},
        ]},
        {lines: [say('dad', x('Not like that. Tonight you dress for it.', 'לא ככה. הערב מתלבשים בשביל זה.'))]},
      ]},
      ...guessTalk,
      {id: 'watch', branches: [
        {when: wearsBoth, lines: [tell(x('It starts. You are wearing all of it, and the evening has no minutes in it, only breaths.', 'זה מתחיל. אתה לובש הכול, ובערב אין דקות, רק נשימות.'))], then: watching, next: 'whistle'},
        {lines: [tell(x('It starts. After that the evening has no minutes in it, only breaths.', 'זה מתחיל. אחרי זה בערב אין דקות, רק נשימות.'))], then: watching, next: 'whistle'},
      ]},
      whistleTalk(whistle.child),
    ],
  }

  if (era === 'teen') return {
    ...base,
    intro: x('Nobody arranged it. By the time it gets dark, everybody you know is standing outside the kiosk, because that is where the little screen is.', 'אף אחד לא סידר את זה. עד שמחשיך, כל מי שאתה מכיר עומד מחוץ לקיוסק, כי שם נמצא המסך הקטן.'),
    start: {room: 'street', spawn: 'fromHome', time: 'night'},
    cast: [
      {who: 'kiosk', room: 'street', slot: 'kiosk', talk: 'kiosk'}, {who: 'friend', room: 'street', slot: 'customer', talk: 'friend'}, {who: 'elder', room: 'street', slot: 'wall', talk: 'elder'},
      {who: 'rival', room: 'street', slot: 'corner', talk: 'rival', when: {is: ['life:rival:link', 'open']}},
    ],
    doors: [],
    spots: [{id: 'crates', room: 'street', spot: 'crates', talk: 'crates', verb: 'look', label: x('The crates', 'הארגזים')}],
    beats: [],
    objectives: [
      {id: 'friend', t: x('Find {friend} in the crowd outside the kiosk', 'למצוא את {friend} בקהל מחוץ לקיוסק'), done: {flag: f('met')}, room: 'street'},
      {id: 'place', t: x('Get a place where you can see the screen', 'להשיג מקום שרואים ממנו את המסך'), done: {flag: f('over')}, room: 'street'},
    ],
    talks: [
      {id: 'crates', branches: [{lines: [tell(x('Three crates. On a normal night they are crates. Tonight they are the best seats on the street.', 'שלושה ארגזים. בלילה רגיל הם ארגזים. הערב הם המושבים הכי טובים ברחוב.'))]}]},
      {id: 'elder', branches: [{lines: [say('elder', x('I have seen worse nights than this start better.', 'ראיתי לילות גרועים יותר מתחילים טוב יותר.')), say('elder', x('Stand still when it begins. Whoever moves is to blame.', 'תעמוד במקום כשזה מתחיל. מי שזז אשם.'))]}]},
      {id: 'rival', branches: [{lines: [say('rival', x('I support the other lot. I am here because the screen is here. Do not read anything into it.', 'אני של הצד השני. אני פה כי המסך פה. אל תקרא בזה שום דבר.'))]}]},
      {id: 'friend', branches: [
        {when: {flag: f('met')}, lines: [say('friend', x('Go and ask him. He likes you more than he likes me.', 'לך תשאל אותו. הוא אוהב אותך יותר ממה שהוא אוהב אותי.'))]},
        {when: {is: ['life:away:help', 'helped']}, lines: [say('friend', x('You came. After the coach I thought you might come anywhere I did.', 'באת. אחרי האוטובוס חשבתי שתבוא לכל מקום שאני בא.')), say('friend', x('We need a place. Ask {kiosk} — he decides who stands where.', 'אנחנו צריכים מקום. תשאל את {kiosk} — הוא מחליט מי עומד איפה.'))], then: [flag(f('met')), bond('friend', 5)]},
        {lines: [say('friend', x('You came. I was going to say I did not care if you came.', 'באת. התכוונתי להגיד שלא אכפת לי אם תבוא.')), say('friend', x('We need a place. Ask {kiosk} — he decides who stands where.', 'אנחנו צריכים מקום. תשאל את {kiosk} — הוא מחליט מי עומד איפה.'))], then: [flag(f('met')), bond('friend', 5)]},
      ]},
      {id: 'kiosk', branches: [
        {when: {flag: f('met')}, lines: [say('kiosk', x('Tonight nobody buys anything and everybody stands in my light.', 'הערב אף אחד לא קונה כלום וכולם עומדים לי באור.')), say('kiosk', x('Fine. Where do you want to be?', 'טוב. איפה אתה רוצה להיות?'))], choices: [
          {id: 'front', t: x('At the front, by the counter', 'מלפנים, ליד הדלפק'), then: [heart(4)], next: goesTo},
          {id: 'crate', t: x('Up on the crate, over everybody’s heads', 'למעלה על הארגז, מעל הראשים של כולם'), then: [bond('friend', 4)], next: goesTo},
          {id: 'back', t: x('At the back, where you can leave if you have to', 'מאחור, איפה שאפשר לעזוב אם צריך'), then: [flag(f('hid'))], next: goesTo},
        ]},
        {lines: [say('kiosk', x('You are looking for your friend, not for me. Over there.', 'אתה מחפש את החבר שלך, לא אותי. שם.'))]},
      ]},
      ...guessTalk,
      {id: 'watch', branches: [
        {when: wearsAny, lines: [tell(x('The street goes quiet the way a classroom does. Somebody notices what you are wearing and nods, once. Then it starts, and the evening has no minutes in it, only breaths.', 'הרחוב נהיה שקט כמו כיתה. מישהו שם לב למה שאתה לובש ומהנהן, פעם אחת. ואז זה מתחיל, ובערב אין דקות, רק נשימות.'))], then: watching, next: 'whistle'},
        {lines: [tell(x('The street goes quiet the way a classroom does. Then it starts, and the evening has no minutes in it, only breaths.', 'הרחוב נהיה שקט כמו כיתה. ואז זה מתחיל, ובערב אין דקות, רק נשימות.'))], then: watching, next: 'whistle'},
      ]},
      whistleTalk(whistle.teen),
    ],
  }

  return {
    ...base,
    intro: x('You are the one with the keys now, and the one who pays for the electricity. Tonight the flat is arranged around one corner of one room, the way it always was.', 'אתה זה עם המפתחות עכשיו, וזה ששילם על החשמל. הערב הדירה מסודרת סביב פינה אחת של חדר אחד, כמו שהייתה תמיד.'),
    start: {room: 'kitchen', spawn: 'start', time: 'night'},
    cast: [
      {who: 'dad', room: 'room', slot: 'sofa', talk: 'dad'},
      ...(age >= HOUSEHOLD_AGE ? [{who: 'friend', room: 'room', slot: 'rug', talk: 'partner', when: {is: ['life:household:kind', 'partner'] as [string, string]}}] : []),
      ...(age >= FAMILY_AGE ? [{who: 'child', room: 'room', slot: 'sofaEnd', talk: 'little', when: {is: ['life:family', 'child'] as [string, string]}}] : []),
    ],
    doors: [
      {id: 'kitchen-room', room: 'kitchen', door: 'door', to: 'room', spawn: 'fromKitchen', label: x('The living room', 'הסלון')},
      {id: 'room-kitchen', room: 'room', door: 'east', to: 'kitchen', spawn: 'fromLiving', label: x('The kitchen', 'המטבח')},
    ],
    spots: [
      {id: 'shelf', room: 'kitchen', spot: 'shelf', when: {not: f('glasses')}, talk: 'glasses', verb: 'take', label: x('Two glasses', 'שתי כוסות')},
      {id: 'set', room: 'room', spot: 'tv', talk: 'set', verb: 'look', label: x('The set in the corner', 'המכשיר בפינה')},
    ],
    beats: [],
    objectives: [
      {id: 'glasses', t: x('Two glasses, from the shelf. He will not ask', 'שתי כוסות, מהמדף. הוא לא יבקש'), done: {flag: f('glasses')}, room: 'kitchen'},
      {id: 'sit', t: x('Sit down with him before it starts', 'לשבת איתו לפני שזה מתחיל'), done: {flag: f('over')}, room: 'room'},
    ],
    talks: [
      {id: 'glasses', branches: [{lines: [tell(x('Two glasses. The good ones are too good; these are the ones that have seen matches.', 'שתי כוסות. הטובות טובות מדי; אלה הכוסות שראו משחקים.'))], then: [flag(f('glasses'))]}]},
      {id: 'set', branches: [{lines: [tell(x('The same corner. A different set, three sets later. The room still points at it.', 'אותה פינה. מכשיר אחר, שלושה מכשירים אחרי. החדר עדיין מצביע עליו.'))]}]},
      ...(age >= HOUSEHOLD_AGE ? [{id: 'partner', branches: [{lines: [say('friend', x('I did not come for the match. I came for the face you make during it.', 'לא באתי בשביל המשחק. באתי בשביל הפנים שאתה עושה בזמן שלו.'))]}]}] : []),
      ...(age >= FAMILY_AGE ? [{id: 'little', branches: [{lines: [say('child', x('Is it loud when they score? Can I be loud?', 'זה רועש כשהם מבקיעים? אפשר להיות רועש?'))]}]}] : []),
      {id: 'dad', branches: [
        ...(age >= DAD_AGE ? [{when: {all: [{flag: f('glasses')}, {is: ['life:dad:contact', 'regular'] as [string, string]}]}, lines: [say('dad', x('You rang every week, so I have saved things up to say. They can wait. Sit.', 'התקשרת כל שבוע, אז צברתי דברים להגיד. הם יכולים לחכות. שב.'))], choices: [
          {id: 'next', t: x('Next to him, like always', 'לידו, כמו תמיד'), then: [bond('dad', 6)], next: goesTo},
          {id: 'floor', t: x('On the floor, like when you were small', 'על הרצפה, כמו כשהיית קטן'), then: [heart(4), bond('dad', 3)], next: goesTo},
          {id: 'stand', t: x('Standing, by the door. You cannot sit tonight', 'עומד, ליד הדלת. הערב אי אפשר לשבת'), then: [flag(f('hid'))], next: goesTo},
        ]}] : []),
        {when: {flag: f('glasses')}, lines: [say('dad', x('You took your time.', 'לקחת את הזמן.')), tell(x('He is in his place. He has been in his place for an hour.', 'הוא במקום שלו. הוא במקום שלו כבר שעה.')), say('dad', x('Sit where you like. It is your sofa.', 'שב איפה שאתה רוצה. זו הספה שלך.'))], choices: [
          {id: 'next', t: x('Next to him, like always', 'לידו, כמו תמיד'), then: [bond('dad', 6)], next: goesTo},
          {id: 'floor', t: x('On the floor, like when you were small', 'על הרצפה, כמו כשהיית קטן'), then: [heart(4), bond('dad', 3)], next: goesTo},
          {id: 'stand', t: x('Standing, by the door. You cannot sit tonight', 'עומד, ליד הדלת. הערב אי אפשר לשבת'), then: [flag(f('hid'))], next: goesTo},
        ]},
        {lines: [say('dad', x('I am fine. I am early, that is all.', 'אני בסדר. אני מוקדם, זה הכול.')), say('dad', x('Bring glasses. Not the good ones.', 'תביא כוסות. לא את הטובות.'))]},
      ]},
      ...guessTalk,
      {id: 'watch', branches: [
        ...(age >= FAMILY_AGE ? [{when: {is: ['life:family', 'child'] as [string, string]}, lines: [tell(x('It starts. A small hand finds your sleeve and does not let go, and the evening has no minutes in it, only breaths — yours, his, and a smaller one.', 'זה מתחיל. יד קטנה מוצאת את השרוול שלך ולא עוזבת, ובערב אין דקות, רק נשימות — שלך, שלו, ועוד אחת קטנה יותר.'))], then: watching, next: 'whistle'}] : []),
        {lines: [tell(x('It starts. After that the evening has no minutes in it, only breaths — his and yours, not quite together.', 'זה מתחיל. אחרי זה בערב אין דקות, רק נשימות — שלו ושלך, לא ממש יחד.'))], then: watching, next: 'whistle'},
      ]},
      whistleTalk(whistle.adult),
    ],
  }
}
