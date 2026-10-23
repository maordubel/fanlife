/**
 * The matchday as the city lives it — written into the story.
 *
 * Every ordinary chapter that goes to the ground gets the club's own meet-up before it: the place the crew meets in that
 * year, what goes round, the word they greet you with, and the way to the ground — all from `ritual.ts`, which names a
 * source for each piece. One choice: what you have with them (or just walk with them). It is remembered, and the next
 * matchday's crew remembers it back ("the usual?").
 *
 * And the archive's nights reach the family: the ordinary chapter after a night has the paper from the morning after on
 * the kitchen table (or pinned in the kiosk window), with the night printed exactly as the archive recorded it — the
 * archive card, nothing added. The family's part is where it lies and who ringed it.
 *
 * Side content, like the jobs and the benches: never required, never blocking, done once a chapter. Its flags start with
 * `ritual:` (the day) or `life:ritual:` (what he had last time) and are read by nothing but these talks, so the simulator
 * leaves them out of its state (sim.ts `SIDE_FLAG`).
 */
import type {ArchiveRef, CardDef, Chapter, Choice, Line, SpotUse, Talk} from '../types'
import {ritualIn, type MatchdayRitual} from '../ritual'
import {bond, flag, heart, say, tell} from './kit'

type Locale = 'en' | 'he'
const MATCH_ROOMS = new Set(['route', 'gate'])
/** where the meet-up is offered, in order: the walk to the ground, then the home street */
const MEET_AT: [string, string][] = [['route', 'sign'], ['route', 'flags'], ['street', 'window'], ['street', 'graffiti'], ['street', 'crates'], ['street', 'bin']]
/** where the morning paper lies */
const PAPER_AT: [string, string][] = [['kitchen', 'table'], ['kitchen', 'radio'], ['room', 'table'], ['room', 'tv'], ['street', 'window'], ['street', 'crates'], ['street', 'bin']]
export const USUAL = 'life:ritual:usual'

const roomsOf = (c: Chapter): Set<string> => {
  const out = new Set<string>([c.start.room])
  c.cast.forEach(p => out.add(p.room)); c.doors.forEach(d => { out.add(d.room); out.add(d.to) }); c.spots.forEach(s => out.add(s.room)); c.beats.forEach(b => out.add(b.room))
  return out
}
const freeSpot = (c: Chapter, order: [string, string][]): [string, string] | null => {
  const rooms = roomsOf(c), taken = new Set(c.spots.map(s => `${s.room}:${s.spot}`))
  return order.find(([r, s]) => rooms.has(r) && !taken.has(`${r}:${s}`)) ?? null
}
export const goesToGround = (c: Chapter): boolean => !c.id.startsWith('night-') && c.id !== 'finale' && [...roomsOf(c)].some(r => MATCH_ROOMS.has(r))

const join = (xs: string[], he: boolean) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')}${he ? ' ו' : ' and '}${xs[xs.length - 1]}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The meet-up of one matchday chapter, from the ritual as `year` has it. Null when the year has nothing to offer. */
export function meetUp(chapter: Chapter, ritual: MatchdayRitual, year: number | null, locale: Locale = 'en'): Chapter {
  if (!goesToGround(chapter)) return chapter
  const r = ritualIn(ritual, year)
  const he = locale === 'he'
  const x = (en: string, h: string) => he ? h : en
  const child = chapter.age < 13, adult = chapter.age >= 18
  const meet = r.meet.length ? r.meet[chapter.age % r.meet.length] : undefined, things = [...r.food.slice(0, 2), ...r.drink.filter(d => adult || !d.alcohol).slice(0, 1)]
  if (!meet && !things.length && !r.route.length) return chapter
  const at = freeSpot(chapter, MEET_AT)
  if (!at) return chapter
  const [room, spot] = at, id = 'ritual-meet', done = `ritual:meet`
  const words = r.mates ?? []
  const word = words.length ? words[chapter.age % words.length]! : null

  const opening: Line[] = []
  const where = r.home ? x(` in ${r.home.name}`, ` ב${r.home.name === 'Kypseli' ? 'קיפסלי' : r.home.name}`) : ''
  if (meet && child) opening.push(tell(x(`Before {ground} your father stops where everybody stops${where}: ${meet.name}. You hold his sleeve and look at the grown-ups.`, `לפני {ground} אבא שלך עוצר איפה שכולם עוצרים${where}: ${meet.name}. אתה מחזיק לו בשרוול ומסתכל על הגדולים.`)))
  else if (meet) opening.push(tell(x(`Before {ground} the crew meets where it always meets${where}: ${meet.name}.`, `לפני {ground} החבורה נפגשת איפה שהיא תמיד נפגשת${where}: ${meet.name}.`)))
  else opening.push(tell(x('Before {ground} the crew gathers, the way it does on every matchday.', 'לפני {ground} החבורה מתאספת, כמו בכל יום משחק.')))
  const greet = word ? tell(x(`Somebody sees you and shouts it across the pavement: "${word.word}! You came!" — ${word.gloss}.`, `מישהו רואה אותך וצועק את זה מעבר למדרכה: "${word.he}! באת!" — ${word.glossHe}.`)) : null
  // a crew that already knows him: the word without the explanation, and his own usual remembered back
  const greetAgain = word ? say('friend', x(`${word.word}. There you are.`, `${word.he}. הנה אתה.`)) : null
  const goingRound: Line[] = []
  if (things.length) goingRound.push(tell(x(`${cap(join(things.map(t => t.name), false))} — already going round.`, `${join(things.map(t => t.name), true)} — כבר עוברים מיד ליד.`)))
  if (r.mood) goingRound.push(tell(x(r.mood.line, r.mood.he)))
  const first: Line[] = [...opening, ...(greet ? [greet] : []), ...goingRound]
  const again: Line[] = [...opening, ...(greetAgain ? [greetAgain] : []), ...goingRound, say('friend', x('The usual, then?', 'הרגיל, כן?'))]

  // where he goes from here, and what the other lot shout on the way
  const onward: Line[] = [
    ...r.route.map(w => tell(x(w.line, w.he))),
    ...(r.taunt && chapter.age % 2 === 0 ? [tell(x(`Across the road the other lot have their word ready — "${r.taunt.word}", ${r.taunt.gloss}. The crew sings louder.`, `מעבר לכביש לצד השני יש את המילה מוכנה — "${r.taunt.he}", ${r.taunt.glossHe}. החבורה שרה חזק יותר.`))] : []),
  ]
  const after = (lines: Line[]): Line[] => [...lines, ...(onward.length ? onward : [tell(x('Then the walk to {ground}, all of you.', 'ואז ההליכה ל{ground}, כולכם.'))])]
  const choices: Choice[] = [
    ...things.map((t, i): Choice => ({id: `have${i}`, t: x(`${cap(t.name)}, with them`, `${t.name}, איתם`), then: [flag(done), flag(USUAL, `have:${t.name}`), heart(2)], next: `${id}-have${i}`})),
    {id: 'walk', t: x('Just walk with them', 'פשוט ללכת איתם'), then: [flag(done), flag(USUAL, 'walk'), bond('friend', 2)], next: `${id}-walk`},
    {id: 'later', t: x('Not yet', 'עוד לא')},
  ]
  const usualBranches = [...things.map(t => `have:${t.name}`), 'walk'].map(v => ({when: {is: [USUAL, v] as [string, string]}, lines: again, choices}))
  const talks: Talk[] = [
    {id, branches: [...usualBranches, {lines: first, choices}]},
    ...things.map((t, i): Talk => ({id: `${id}-have${i}`, branches: [{lines: after([tell(x(`You have ${t.name} standing up, with them, the way it is done here.`, `אתה לוקח ${t.name} בעמידה, איתם, כמו שעושים את זה פה.`))])}]})),
    {id: `${id}-walk`, branches: [{lines: after([tell(x('You do not need anything in your hands. You need to be in the middle of them.', 'אתה לא צריך כלום בידיים. אתה צריך להיות באמצע שלהם.'))])}]},
  ]
  const label = meet ? x(`The meet-up · ${meet.sign}`, `נקודת המפגש · ${meet.sign}`) : x('The crew', 'החבורה')
  const s: SpotUse = {id, room, spot, when: {not: done}, talk: id, verb: 'look', label}
  return {...chapter, spots: [...chapter.spots, s], talks: [...chapter.talks, ...talks]}
}

/** The morning after an archive night, in the next ordinary chapter: the paper, the night as the archive recorded it. */
export function morningPaper(chapter: Chapter, night: ArchiveRef, n: number, era: 'child' | 'teen' | 'adult', locale: Locale = 'en'): Chapter {
  // the finale too: a night the archive recorded in the last year of a life still reaches the house the morning after
  if (chapter.id.startsWith('night-')) return chapter
  const at = freeSpot(chapter, PAPER_AT)
  if (!at) return chapter
  const he = locale === 'he', x = (en: string, h: string) => he ? h : en
  const [room, spot] = at, id = `ritual-paper-${n}`, card = `paper-${n}`, seen = `ritual:paper:${n}`
  const where = room === 'kitchen' ? x('On the kitchen table, folded open at the right page', 'על שולחן המטבח, מקופל בעמוד הנכון') : room === 'street' ? x('In the kiosk window, pinned up where everybody can see it', 'בחלון הקיוסק, תלוי איפה שכולם רואים') : spot === 'table' ? x('On the living-room table, folded open at the right page', 'על שולחן הסלון, מקופל בעמוד הנכון') : x('On the arm of the sofa, folded open at the right page', 'על ידית הספה, מקופל בעמוד הנכון')
  const family = era === 'child' ? x('Dad has drawn a ring round it in biro and will not let anybody throw it out.', 'אבא עשה סביבו עיגול בעט ולא נותן לאף אחד לזרוק אותו.')
    : era === 'teen' ? x('Your father has already cut out the corner with it and put it in his wallet.', 'אבא שלך כבר גזר את הפינה הזאת ושם אותה בארנק.')
    : x('Your father rang this morning to ask if you had seen it. You had. He wanted to hear you say so.', 'אבא שלך התקשר הבוקר לשאול אם ראית. ראית. הוא רצה לשמוע אותך אומר את זה.')
  // what the family does with a night the club wrote down depends on how it went — the record says how, and nothing more
  const result = night.match?.result
  const kept = result === 'lost' ? [tell(x('Nobody threw it out. You keep the bad ones too; that is the rule in this family.', 'אף אחד לא זרק אותו. שומרים גם את הרעים; זה החוק במשפחה הזאת.'))]
    : result === 'won' ? [tell(x('It goes in the box with the others. Somebody will want to see it in twenty years.', 'הוא נכנס לקופסה עם האחרים. מישהו ירצה לראות אותו בעוד עשרים שנה.'))] : []
  const def: CardDef = {id: card, kicker: x('The paper, the morning after', 'העיתון, בבוקר שאחרי'), title: night.title, body: night.hint, archive: night, ...(night.match ? {stage: 'result' as const} : {})}
  const talk: Talk = {id, branches: [{lines: [tell(`${where}: ${x('the paper from the morning after.', 'העיתון מהבוקר שאחרי.')}`), tell(family), ...kept], then: [flag(seen), {e: 'card', card}]}]}
  const s: SpotUse = {id, room, spot, when: {not: seen}, talk: id, verb: 'look', label: x('The paper from the morning after', 'העיתון מהבוקר שאחרי')}
  return {...chapter, spots: [...chapter.spots, s], talks: [...chapter.talks, talk], cards: [...(chapter.cards ?? []), def]}
}

/** The ritual over a whole life: a meet-up in every matchday chapter, the morning paper after every night. */
export function ritualLife(chapters: Chapter[], ritual: MatchdayRitual | null, birthYear: number | null, locale: Locale = 'en'): Chapter[] {
  const out = chapters.map(c => ritual ? meetUp(c, ritual, birthYear === null ? null : birthYear + c.age, locale) : c)
  chapters.forEach((c, i) => {
    if (!c.id.startsWith('night-') || !c.anchor) return
    const n = Number(c.id.slice(6))
    const era = c.age < 13 ? 'child' : c.age < 20 ? 'teen' : 'adult'
    for (let j = i + 1; j < out.length && j <= i + 6; j++) {
      const next = morningPaper(out[j]!, c.anchor, n, era, locale)
      if (next !== out[j]) { out[j] = next; break }
    }
  })
  return out
}
