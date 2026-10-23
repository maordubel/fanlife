/**
 * LIFE — the matchday as each city lives it.
 *
 * The owner (23.10.2026): "I did not feel the per-city adjustments". A club's culture reached LIFE as one closing line on an
 * archive night. This is the data that lets it be LIVED: where the crew meets before the match, what goes round, how you get
 * to the ground, what mates call each other, what the other lot shout. It is used twice — by the story (`content/ritual.ts`
 * writes the meet-up into every chapter that goes to the ground) and by the 3D town (the skin carries `culture`, and
 * `public/life/town/culture.js` hangs the signs and parks the scooters).
 *
 * Nothing here is invented. Every element names its source: a culture line of the club's `world.json` by id (the owner's
 * first-hand lines of 23.10.2026 are recorded there, #292, under the neutral label), or — for a club with no world file —
 * the owner's own words, quoted from `OWNER_SAID` (CLAUDE.md rule 18), never his name. A club with neither gets nothing new.
 *
 * Eras are the sources' own: the French Kiss closed in 2015 (the owner); Tel Aviv's Red Line opened in 2023 (the owner said
 * "about 2020"; the line itself opened on 18 August 2023, which is what the club's sourced world line records too), so the
 * walk along the promenade is the way until then.
 */
import {clubWorld, type ClubWorld} from '@/lib/clubs/world'
import {REGISTRY} from '@/lib/master/registry'

export const OWNER_SOURCE = 'ידע אישי — צוות The Worker, 23.10.2026'
/** The owner's words, verbatim (23.10.2026). An owner-sourced element quotes a piece of this, and the test holds it to that. */
export const OWNER_SAID = "הפועל - עד שנת 2015 ככה, הנקודת מפגש הייתה 'הנשיקה הצרפתית' וליד 'הום סנטר', ליד 'הום סנטר' נשאר לאחר שהנשיקה הצרפתית נסגרה. תזכור שהרכבת הקלה בתל אביב נפתחה באזור 2020 לכן צריך עד אז צריך 'הליכה דרך הטיילת', כינוי לגיטימי בהפועל אחד לשני הוא ' יצור ' או ' יובוב ', צריך לזכור שהפועל תל אביב מזוהה מאוד עם הצד השמאל של הפוליטיקה, וכינוי גנאי נגדם הוא ' שמאלני '. אא\"ק - תעשה את שכונת ' קיפסלי ' כהשכונה שהוא גר בה ורוב הדברים קורים. הפשטידות של 'תיאוס פאניס' ואת צומת פוקון/דקליאס. - זה נכון. יש קטע של נסיעה בקטנועים למשחקים בתוך העיר. לקבוצות היווניות בכללי - אוכלים גירוס וסופלקי. שותים בירה ' אלפא '. זרינסקי - המפגש הוא בבר שמוקם ליד האיצטדיון ובקפה בר ' טאקו ', שותים הרבה בירות, אווירת בלקן אמיתית. אווירה 'קרואטית' מאוד. יש 'דונר' טורקי ליד האיצטדיון, ויש מאפיות רבות."

/** Where an element comes from: a culture line of the club's world.json, or a quoted piece of the owner's words. */
export type RitualSource = {world: string} | {owner: string}
export type MeetKind = 'bar' | 'cafe' | 'shop' | 'corner'
export type RouteMode = 'walk' | 'rail' | 'metro' | 'bus' | 'scooter' | 'train'
/** `fromYear` is the first year it holds; `untilYear` the first year it no longer does. */
type Era = {fromYear?: number; untilYear?: number}
export type RitualMeet = Era & {name: string; kind: MeetKind; /** what a sign over it prints */ sign: string; src: RitualSource}
export type RitualThing = Era & {name: string; local?: string; /** a drink a child is never offered */ alcohol?: true; /** what a sign prints, when the town may letter it */ sign?: string; src: RitualSource}
export type RitualRoute = Era & {mode: RouteMode; line: string; he: string; /** the stop or the way, as a sign at the kerb prints it (from the same source) */ sign?: string; src: RitualSource}
export type RitualWord = {word: string; he: string; gloss: string; glossHe: string; src: RitualSource}
export type MatchdayRitual = {
  clubId: string
  meet: RitualMeet[]
  food: RitualThing[]
  drink: RitualThing[]
  route: RitualRoute[]
  /** what mates call each other */
  mates?: RitualWord[]
  /** what the other lot shout at them — a taunt from across the road, never an argument */
  taunt?: RitualWord
  /** the neighbourhood he grows up in, where most things happen */
  home?: {name: string; local: string; src: RitualSource}
  /** the air of the evening, in one phrase */
  mood?: {line: string; he: string; src: RitualSource}
}

const owner = (said: string): RitualSource => ({owner: said})
const world = (id: string): RitualSource => ({world: id})
/** gyros, souvlaki and Alfa: the owner's word for every Greek club, read from the club's own line where its world file has one */
const greek = (id: string | null) => ({
  food: [
    {name: 'gyros', local: 'γύρος', sign: 'ΓΥΡΟΣ', src: id ? world(`${id}-food-gyros`) : owner('גירוס')},
    {name: 'souvlaki', local: 'σουβλάκι', sign: 'ΣΟΥΒΛΑΚΙ', src: id ? world(`${id}-food-gyros`) : owner('סופלקי')},
  ],
  drink: [{name: 'a bottle of Alfa', local: 'Άλφα', sign: 'ALFA', alcohol: true as const, src: id ? world(`${id}-food-alfa`) : owner("בירה ' אלפא '")}],
})

/** Each club's matchday, element by element, with its source. Only clubs with a source are here. */
const RITUALS: Record<string, Omit<MatchdayRitual, 'clubId'>> = {
  'hapoel-tel-aviv': {
    meet: [
      {name: 'the French Kiss, by Home Center', kind: 'bar', sign: 'FRENCH KISS', untilYear: 2015, src: world('hapoel-tel-aviv-meetup-french-kiss')},
      {name: 'outside Home Center', kind: 'shop', sign: 'HOME CENTER', fromYear: 2015, src: world('hapoel-tel-aviv-meetup-home-center')},
    ],
    food: [{name: 'sunflower seeds', local: 'garinim', src: world('hapoel-tel-aviv-food-garinim')}],
    drink: [],
    route: [
      {mode: 'walk', untilYear: 2023, sign: 'הטיילת', line: 'Then the walk along the promenade, the sea beside you, the crew getting louder with every bench you pass.', he: 'ואז ההליכה דרך הטיילת, הים לידכם, והחבורה נעשית רועשת יותר עם כל ספסל.', src: world('hapoel-tel-aviv-route-promenade')},
      {mode: 'rail', fromYear: 2023, sign: 'אצטדיון בלומפילד', line: 'Then the Red Line south, and off at the Bloomfield Stadium stop with the whole carriage.', he: 'ואז הקו האדום דרומה, ויורדים בתחנת אצטדיון בלומפילד עם כל הקרון.', src: world('hapoel-tel-aviv-route-red-line')},
    ],
    mates: [
      {word: 'Yetzur', he: 'יצור', gloss: 'yetzur, "creature" — what Hapoel fans call each other', glossHe: 'יצור — ככה אוהדי הפועל קוראים אחד לשני', src: world('hapoel-tel-aviv-humour-creature')},
      {word: 'Yuvuv', he: 'יובוב', gloss: 'yuvuv — what Hapoel fans call each other', glossHe: 'יובוב — ככה אוהדי הפועל קוראים אחד לשני', src: world('hapoel-tel-aviv-humour-creature')},
    ],
    taunt: {word: 'Smolanim!', he: 'שמאלנים!', gloss: '"lefties" — what the other lot shout at Hapoel', glossHe: 'מה שהצד השני צועק על הפועל', src: world('hapoel-tel-aviv-humour-leftie')},
  },
  'hapoel-petah-tikva': {
    meet: [], drink: [], route: [],
    food: [{name: 'sunflower seeds', local: 'garinim', src: world('hapoel-petah-tikva-food-garinim')}],
  },
  'aek-athens': {
    home: {name: 'Kypseli', local: 'ΚΥΨΕΛΗ', src: world('aek-athens-home-kypseli')},
    meet: [{name: 'the junction of Fokon and Dekelias Avenue', kind: 'corner', sign: 'FOKON · DEKELIAS', src: world('aek-athens-meetup-dekelias')}],
    food: [{name: 'pies from Theios Fanis', sign: 'THEIOS FANIS', src: world('aek-athens-food-theios-fanis')}, ...greek('aek-athens').food],
    drink: greek('aek-athens').drink,
    route: [
      {mode: 'scooter', line: 'Then the scooters, two to a seat, across the city in a line that does not stop for lights.', he: 'ואז הקטנועים, שניים על מושב, לרוחב העיר בשיירה שלא עוצרת ברמזורים.', src: world('aek-athens-habit-scooters')},
      {mode: 'metro', sign: 'ΠΕΡΙΣΣΟΣ', line: 'Whoever has no scooter takes Line 1 to Perissos and walks the last stretch.', he: 'מי שאין לו קטנוע לוקח את קו 1 לפריסוס והולך את הקטע האחרון.', src: world('aek-athens-route-perissos')},
    ],
  },
  olympiacos: {
    meet: [], ...greek('olympiacos'),
    route: [{mode: 'metro', sign: 'ΦΑΛΗΡΟ', line: 'Then Line 1 to Faliro, and a few minutes on foot to Karaiskakis.', he: 'ואז קו 1 לפאלירו, וכמה דקות ברגל לקראיסקאקיס.', src: world('olympiacos-route-faliro')}],
  },
  panathinaikos: {
    meet: [], ...greek('panathinaikos'),
    route: [{mode: 'metro', sign: 'ΑΜΠΕΛΟΚΗΠΟΙ', line: 'Then the metro to Ampelokipi, and the streets fill with green the closer you get.', he: 'ואז המטרו לאמבלוקיפי, והרחובות מתמלאים בירוק ככל שמתקרבים.', src: world('panathinaikos-route-ampelokipi')}],
  },
  paok: {meet: [], route: [], ...greek(null)},
  'zrinjski-mostar': {
    meet: [
      {name: 'the bar by the stadium', kind: 'bar', sign: 'BAR', src: world('zrinjski-mostar-meetup-bars')},
      {name: 'café-bar Taco', kind: 'cafe', sign: 'TACO', src: world('zrinjski-mostar-meetup-bars')},
    ],
    food: [
      {name: 'döner from the stand by the ground', sign: 'DÖNER', src: world('zrinjski-mostar-food-doner')},
      {name: 'something warm from one of the bakeries', sign: 'PEKARA', src: world('zrinjski-mostar-food-doner')},
    ],
    drink: [{name: 'a beer, and then another', sign: 'PIVO', alcohol: true, src: world('zrinjski-mostar-habit-beer')}],
    route: [{mode: 'walk', line: 'Then the uphill walk to Bijeli Brijeg, a quarter of an hour, and nobody quiet for any of it.', he: 'ואז העלייה לביילי ברייג, רבע שעה, ואף אחד לא שותק אף רגע.', src: world('zrinjski-mostar-route-uphill-walk')}],
    mood: {line: 'It is a Balkan evening, a Croatian one, and nobody is in a hurry.', he: 'זה ערב בלקני, ערב קרואטי, ואף אחד לא ממהר.', src: world('zrinjski-mostar-habit-beer')},
  },
  celtic: {
    meet: [{name: 'the pubs on the Gallowgate', kind: 'bar', sign: 'GALLOWGATE', src: world('celtic-meetup-gallowgate')}],
    food: [{name: 'a pie from the kiosk', src: world('celtic-food-kiosk-pies')}],
    drink: [],
    route: [{mode: 'train', sign: 'DALMARNOCK', line: 'Then the short train to Dalmarnock, and ten minutes on foot to Paradise.', he: 'ואז הרכבת הקצרה לדלמרנוק, ועשר דקות ברגל לגן העדן.', src: world('celtic-route-dalmarnock')}],
  },
  'st-pauli': {
    meet: [{name: 'the Jolly Roger on Budapester Strasse', kind: 'bar', sign: 'JOLLY ROGER', src: world('st-pauli-meetup-jolly-roger')}],
    food: [{name: 'a Currywurst from the stall', local: 'Currywurst', sign: 'CURRYWURST', src: world('st-pauli-food-wurst')}],
    drink: [{name: 'a beer before the gates', alcohol: true, src: world('st-pauli-food-wurst')}],
    route: [{mode: 'rail', sign: 'U ST. PAULI', line: 'Then the U-Bahn to St. Pauli, and the walk out of the station into the noise.', he: 'ואז האו-באן לסנט פאולי, והיציאה מהתחנה אל תוך הרעש.', src: world('st-pauli-route-ubahn')}],
  },
}

/** Every element of a ritual with its source — what the test walks. */
export function ritualSources(r: MatchdayRitual): {what: string; src: RitualSource}[] {
  return [
    ...r.meet.map(m => ({what: m.name, src: m.src})), ...r.food.map(f => ({what: f.name, src: f.src})), ...r.drink.map(d => ({what: d.name, src: d.src})),
    ...r.route.map(x => ({what: x.line, src: x.src})), ...(r.mates ?? []).map(w => ({what: w.word, src: w.src})),
    ...(r.taunt ? [{what: r.taunt.word, src: r.taunt.src}] : []), ...(r.home ? [{what: r.home.name, src: r.home.src}] : []), ...(r.mood ? [{what: r.mood.line, src: r.mood.src}] : []),
  ]
}

/** A source holds when its world line is in the club's validated world file, or its quote is in the owner's words. */
export function sourceHolds(src: RitualSource, w: ClubWorld | null): boolean {
  if ('owner' in src) return src.owner.trim().length > 2 && OWNER_SAID.includes(src.owner)
  return !!w?.culture?.some(c => c.id === src.world)
}

/** The club's ritual, keeping only what its sources hold; null when nothing is left. */
export function ritualFor(clubId: string, w: ClubWorld | null = clubWorld(clubId)): MatchdayRitual | null {
  const r = Object.hasOwn(RITUALS, clubId) ? RITUALS[clubId]! : null
  if (!r || !REGISTRY.some(c => c.id === clubId)) return null
  const ok = <T extends {src: RitualSource}>(xs: readonly T[] | undefined): T[] => (xs ?? []).filter(x => sourceHolds(x.src, w))
  const out: MatchdayRitual = {
    clubId, meet: ok(r.meet), food: ok(r.food), drink: ok(r.drink), route: ok(r.route),
    ...(ok(r.mates).length ? {mates: ok(r.mates)} : {}),
    ...(r.taunt && sourceHolds(r.taunt.src, w) ? {taunt: r.taunt} : {}),
    ...(r.home && sourceHolds(r.home.src, w) ? {home: r.home} : {}),
    ...(r.mood && sourceHolds(r.mood.src, w) ? {mood: r.mood} : {}),
  }
  return out.meet.length || out.food.length || out.drink.length || out.route.length || out.mates || out.home ? out : null
}

/** Holds in `year` (an unknown year holds only for elements with no era). */
export const inYear = (x: Era, year: number | null): boolean =>
  year === null ? x.fromYear === undefined && x.untilYear === undefined : (x.fromYear === undefined || year >= x.fromYear) && (x.untilYear === undefined || year < x.untilYear)

/** The ritual as one year has it: only the meet-ups, foods and ways to the ground that held that year. */
export function ritualIn(r: MatchdayRitual, year: number | null): MatchdayRitual {
  return {...r, meet: r.meet.filter(m => inYear(m, year)), food: r.food.filter(f => inYear(f, year)), drink: r.drink.filter(d => inYear(d, year)), route: r.route.filter(x => inYear(x, year))}
}

/** What the 3D town needs, as data: no sentence, no source — names, kinds, signs and eras. */
export type TownCulture = {
  meet: (Era & {name: string; kind: MeetKind; sign: string})[]
  food: (Era & {name: string; sign?: string})[]
  drink: (Era & {name: string; sign?: string})[]
  route: (Era & {mode: RouteMode; sign?: string})[]
  home?: {name: string; local: string}
}
export function townCulture(r: MatchdayRitual | null): TownCulture | null {
  if (!r) return null
  const era = (x: Era) => ({...(x.fromYear !== undefined ? {fromYear: x.fromYear} : {}), ...(x.untilYear !== undefined ? {untilYear: x.untilYear} : {})})
  return {
    meet: r.meet.map(m => ({name: m.name, kind: m.kind, sign: m.sign, ...era(m)})),
    food: r.food.map(f => ({name: f.name, ...(f.sign ? {sign: f.sign} : {}), ...era(f)})),
    drink: r.drink.map(d => ({name: d.name, ...(d.sign ? {sign: d.sign} : {}), ...era(d)})),
    route: r.route.map(x => ({mode: x.mode, ...(x.sign ? {sign: x.sign} : {}), ...era(x)})),
    ...(r.home ? {home: {name: r.home.name, local: r.home.local}} : {}),
  }
}
export const RITUAL_CLUBS = Object.keys(RITUALS)
/** the table as written, before any source check — for the test that holds every element to its source */
export const RAW_RITUALS: Readonly<Record<string, Omit<MatchdayRitual, 'clubId'>>> = RITUALS
