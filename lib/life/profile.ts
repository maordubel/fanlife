import type { CraftOutput } from '../game/craft/types'
import { characterName } from './characters'
import { resolvePureLove, type PureLoveResolution } from './pure-love'
import { CHAPTERS, chapterFor } from './content/chapters'
import { ITEMS, ITEM_ART } from './content/chapter1986'
import { SHIRT, TICKET, decadeOf } from './prices'
import { RARITY_LABEL } from './redbox'
import { ownedShirts, wornIn, type Shirt } from './shirts'
import { LIFE_TRACKS, trackStageOf, type TrackId } from './tracks'
import type { LifeEvent } from './events'
import {
  RED_HEART_IDS,
  SKILL_IDS,
  relationshipOf,
  type CharacterId,
  type ItemId,
  type LifeState,
  type PersonalityId,
  type PresenceMode,
  type RedBoxItem,
  type RedHeartId,
  type SkillId,
  type WellbeingId,
} from './types'

/**
 * הפרופיל — a person, described. Never a row of progress bars.
 *
 * Rule 15 of the brief and §33 of the systems pass agree: the numbers exist, and the
 * player must never be given them. A bar invites optimisation; optimisation is the death
 * of a life simulation, because the moment `courage: 62` is on screen the player stops
 * asking what they would do and starts asking what raises the number.
 *
 * So this module is a translator, and it is the ONLY translator. Every screen that wants
 * to describe the protagonist asks here and gets Hebrew back. Nothing renders a value.
 *
 * The bands are deliberately coarse — four steps, not ten — because a fifth step is a
 * number wearing a word, and a player who can feel the difference between "a bit" and
 * "quite" is a player counting again.
 */

export type Band = 0 | 1 | 2 | 3

export function band(value: number): Band {
  if (value >= 75) return 3
  if (value >= 45) return 2
  if (value >= 20) return 1
  return 0
}

// --- wellbeing --------------------------------------------------------------------
// Written as sentences about a child on a specific afternoon, not as adjectives about a
// personality. "Tired" is a state; "he has been running since noon" is a life.

const WELLBEING_WORDS: Record<WellbeingId, [string, string, string, string]> = {
  happiness: ['שקט מדי', 'בסדר', 'במצב רוח טוב', 'לא מפסיק לחייך'],
  stress: ['רגוע', 'קצת דרוך', 'לחוץ', 'לא מצליח להירגע'],
  loneliness: ['מוקף אנשים', 'לא לבד', 'קצת לבד', 'לבד'],
  belonging: ['זר במקום הזה', 'מתחיל להכיר', 'שייך', 'זה הרחוב שלו'],
  exhaustion: ['רענן', 'התחיל להתעייף', 'עייף', 'גמור'],
  regret: ['בלי חרטות', 'משהו קטן מציק', 'חושב על מה שלא עשה', 'היה עושה את זה אחרת'],
}

export function wellbeingWord(state: LifeState, key: WellbeingId): string {
  return WELLBEING_WORDS[key][band(state.wellbeing[key])]
}

/** The two or three things worth saying about how the child is, right now. */
export function wellbeingReading(state: LifeState): string[] {
  const ranked: WellbeingId[] = ['exhaustion', 'stress', 'belonging', 'loneliness', 'regret', 'happiness']
  return ranked
    .filter((key) => band(state.wellbeing[key]) >= (key === 'happiness' ? 2 : 1))
    .slice(0, 3)
    .map((key) => wellbeingWord(state, key))
}

// --- personality ------------------------------------------------------------------
// One line per axis, and only the axes that have actually moved. A child with nothing
// to say about him yet gets the honest answer: nothing yet.

const PERSONALITY_WORDS: Record<PersonalityId, string> = {
  independence: 'הולך לבד',
  courage: 'לא מפחד לשאול',
  responsibility: 'זוכר מה ביקשו ממנו',
  reliability: 'מגיע כשאמר שיגיע',
  empathy: 'שם לב לאנשים',
  streetSmarts: 'מכיר את השכונה',
  curiosity: 'רוצה לדעת',
  impulsiveness: 'לא חושב פעמיים',
  stubbornness: 'לא מוותר',
  sociability: 'מדבר עם כולם',
  riskTolerance: 'לוקח סיכון',
  honesty: 'אומר את האמת',
}

export function personalityReading(state: LifeState): string[] {
  return (Object.keys(PERSONALITY_WORDS) as PersonalityId[])
    .map((key) => ({ key, value: state.personality[key] }))
    .filter((entry) => entry.value >= 35)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
    .map((entry) => PERSONALITY_WORDS[entry.key])
}

// --- the Red Heart ----------------------------------------------------------------

export const RED_HEART_WORDS: Record<RedHeartId, string> = {
  footballLove: 'כדורגל',
  basketballLove: 'כדורסל',
  troubleAffinity: 'צרות',
  professionalFootball: 'לשחק באמת',
  community: 'אנשים',
  terraceCulture: 'היציע',
  travelDrive: 'לנסוע',
  historyMemory: 'לזכור',
  familyTradition: 'הבית',
  loyaltyReturn: 'להחזיר',
}

export type RedHeartReading = { key: RedHeartId; labelHe: string; band: Band }

/**
 * The Red Heart as it should be drawn: an ordered set of named pulls with a coarse
 * weight, so a screen can compose a shape out of them and never a percentage.
 */
export function redHeartReading(state: LifeState): RedHeartReading[] {
  return RED_HEART_IDS.map((key) => ({
    key,
    labelHe: RED_HEART_WORDS[key],
    band: band(state.redHeart[key]),
  })).filter((entry) => entry.band > 0)
}

// --- relationships ----------------------------------------------------------------

export type RelationshipReading = {
  who: CharacterId
  nameHe: string
  /** the one sentence that is true about the two of you right now */
  lineHe: string
  /** for the drawing: how close, and how much friction */
  close: Band
  friction: Band
}

/**
 * Two axes, one sentence. This is where Relationship 2.0 earns its keep: a bond that is
 * high and a trust that is low is a real thing that a single number could not say, and
 * it is exactly the state a child is in after lying to his father.
 */
export function relationshipReading(state: LifeState, who: CharacterId): RelationshipReading {
  const rel = relationshipOf(state, who)
  const lineHe = (() => {
    if (rel.tension >= 45 && rel.bond >= 55) return 'קרוב, וכועס'
    if (rel.trust <= 25 && rel.familiarity >= 50) return 'מכיר אותך טוב מדי כדי להאמין לך'
    if (rel.bond >= 70) return 'שלך'
    if (rel.distance >= 55) return 'רחוק'
    if (rel.bond >= 40) return 'חבר'
    if (rel.familiarity >= 40) return 'מוכר מהרחוב'
    return 'עוד לא ממש מכיר אותך'
  })()
  return {
    who,
    nameHe: characterName(who),
    lineHe,
    close: band(rel.bond),
    friction: band(rel.tension),
  }
}

// --- the whole card ---------------------------------------------------------------

export type LifeProfile = {
  nameHe: string
  age: number
  placeHe: string
  wellbeing: string[]
  personality: string[]
  redHeart: RedHeartReading[]
  relationships: RelationshipReading[]
  pureLove: PureLoveResolution
  memories: number
  redBox: number
}

export function buildProfile(
  state: LifeState,
  events: readonly LifeEvent[],
  cast: readonly CharacterId[],
  placeHe: string,
): LifeProfile {
  return {
    nameHe: state.identity.name,
    age: state.age,
    placeHe,
    wellbeing: wellbeingReading(state),
    personality: personalityReading(state),
    redHeart: redHeartReading(state),
    relationships: cast
      .map((who) => relationshipReading(state, who))
      .filter((entry) => entry.close > 0 || entry.friction > 0),
    pureLove: resolvePureLove(state, events),
    memories: state.memories.length,
    redBox: state.redBox.length,
  }
}

// ===================================================================================
// התיק — what he is carrying and what he kept.
// ===================================================================================
//
// Everything above this line describes a PERSON. Everything below it describes his
// possessions, and the two are not the same screen even though they share one sheet:
// `life.profile` is called "התיק שלי", and a bag is not a character sheet. It is the
// pockets, the tin, the wardrobe, the box, and the stubs of the days you were there.
//
// Six fields of `LifeState` carried real content and reached no screen at all before
// this pass — `clothing`, `savings`, `inventory`, `presence`, `memories`, and the
// `rarity` on every Red Box row. They were authored, stored, folded and tested, and a
// player could not see one of them. This section is the translator for all six.
//
// The constraint is rule 46, restated as 63א on 15.9.2026 when Maor kept the numbers on
// `GaugesSheet` and kept them OFF this card: *"הגיליון עונה 'כמה', הכרטיס עונה 'מי
// אתה'"*. So nothing here returns a figure to print. Where the engine has a quantity,
// this module either turns it into a word or hands over a count that exists only to be
// DRAWN as that many objects — which is what a bag actually looks like when you tip it
// out, and is the opposite of a score.

/**
 * מה שבכיס עכשיו — the afternoon's props.
 *
 * `inventory` is cleared by `day.entered`, on purpose and by the owner's decision
 * (rule 68): bottles for deposit and a loaf of bread are an afternoon's props, not
 * possessions. That is exactly why it belongs on a bag and not in the Red Box — the box
 * is what a life KEEPS, this is what a boy is holding at four in the afternoon, and the
 * screen is worth having because the two are different.
 */
export type CarriedReading = {
  item: ItemId
  nameHe: string
  noteHe: string
  /** the art key the chapter draws this thing with, when it has one */
  art: string | null
  /**
   * כמה — the one quantity this module hands over, and it is not for printing.
   *
   * Three bottles are drawn as three bottles. A bag with "3" written on it is a receipt;
   * a bag with three bottles in it is a bag. `MAX_DRAWN` caps the row so a pocket full of
   * deposit glass cannot push the shelf off a 360px phone, and `more` says the cap was
   * hit rather than quietly showing a smaller pocket than he has.
   */
  copies: number
  more: boolean
}

/** Eight objects is already a very full pocket, and it is what fits across a phone. */
const MAX_DRAWN = 8

export function carriedReading(state: LifeState): CarriedReading[] {
  return (Object.keys(state.inventory) as ItemId[])
    .filter((item) => (state.inventory[item] ?? 0) > 0 && Boolean(ITEMS[item]))
    .map((item) => {
      const held = state.inventory[item] ?? 0
      return {
        item,
        nameHe: ITEMS[item].nameHe,
        noteHe: ITEMS[item].noteHe,
        art: ITEM_ART[item] ?? null,
        copies: Math.min(held, MAX_DRAWN),
        more: held > MAX_DRAWN,
      }
    })
}

// --- the two pockets ---------------------------------------------------------------

/**
 * הכיס והפחית — two pockets, and the difference between them is the point.
 *
 * Maor settled the wallet on 16.9.2026, and the sentence is the whole design:
 *
 *   > "כל הקטע בארנק זה שהכסף צריך להישמר ולהמשיך עם הדמות. והוא מחליט מתי ואיפה ועל מה
 *   >  להוציא. הארנק לא מתאפס בסיום משימה אלא ממשיך איתך."
 *
 * `agorot` is the pocket: it is his, it survives a day and a decade now, and it is what
 * he can spend where he is standing. `savings` is the tin under the bed: nothing but a
 * `withdraw` moves it back out, no shop condition can see it, and it is what the shirt
 * in Rafi's window is bought from. The HUD shows the pocket (`life.money` — "בכיס") and
 * has never shown the tin, so until this pass half of a child's money was invisible in
 * the chapter that is NAMED after saving up thirty shekels for a shirt.
 *
 * Neither is a number here, because of rule 46. Each is read against a real period price
 * out of `prices.ts` — the pocket against the turnstile, the tin against the shirt on the
 * rail — so "יש בפחית לחולצה" is a true sentence in the money of that decade and means
 * nothing at all as a quantity. Measuring against the thing the money is FOR is also the
 * only honest way to say it: thirty shekels is a shirt in 1985 and a bus fare in 2010.
 */
export type PurseId = 'pocket' | 'tin'

export type PurseReading = {
  purse: PurseId
  /** 0 empty · 1 a start · 2 most of the way · 3 enough for the thing it is for */
  band: Band
  readingHe: string
}

const PURSE_WORDS: Record<PurseId, [string, string, string, string]> = {
  pocket: ['ריק', 'כמה מטבעות', 'כמעט מספיק לכרטיס', 'יש לכרטיס'],
  tin: ['ריקה', 'התחלה', 'חצי הדרך לחולצה', 'יש לחולצה'],
}

/** what each pocket is measured against, in whole shekels of the chapter's own decade */
function targetFor(purse: PurseId, chapter: string): number {
  const decade = decadeOf(chapter)
  return (purse === 'pocket' ? TICKET[decade] : SHIRT[decade]) * 100
}

function purseBand(agorot: number, target: number): Band {
  if (agorot <= 0) return 0
  if (agorot >= target) return 3
  return agorot >= target / 2 ? 2 : 1
}

export function purseReading(state: LifeState): PurseReading[] {
  return (['pocket', 'tin'] as PurseId[]).map((purse) => {
    const band = purseBand(purse === 'pocket' ? state.agorot : state.savings, targetFor(purse, state.chapter))
    return { purse, band, readingHe: PURSE_WORDS[purse][band] }
  })
}

// --- the wardrobe ------------------------------------------------------------------

/**
 * הארון — the shirts, and the only object in this game that measures the whole life.
 *
 * `clothing` survives every day and every year by design (rule 68), and before this pass
 * it was visible in exactly one place: the shop that sold it. A boy who counted thirty
 * shekels onto Rafi's counter in 1985 could not look at the shirt again, ever, in any of
 * the fourteen years the game plays after it.
 *
 * **The same purchase writes two surfaces**, and this is where they are put back together.
 * A4's `buy` choice dispatches BOTH `{ e: 'own', item: 'shirt85' }` — which becomes a
 * `clothing` row and an `own:` flag — and `{ e: 'shirt', id: 'tveria85' }`, which raises
 * `own:shirt:tveria85` and is the row the archive actually knows about (sponsor, season,
 * the note read off Maor's photograph). One shirt, one counter, two records. The rich one
 * is what a wardrobe should show; `CLOTHING_IS_SHIRT` is what stops the plain one from
 * hanging beside it as a second, poorer copy of the same garment.
 *
 * An `own:` item that is neither in that table nor a shirt is a content bug, not a thing
 * to print in Latin on a Hebrew screen — `tests/life-bag.test.ts` fails on one rather
 * than letting the wardrobe quietly drop it.
 */
const CLOTHING_IS_SHIRT: Record<string, string> = { shirt85: 'tveria85' }

export type WardrobeReading = {
  id: string
  nameHe: string
  sponsorHe: string
  yearsHe: string
  noteHe: string
  /** photographed — an art key. Empty when the shirt is DRAWN from the archive's spec. */
  art: string
  spec: Shirt['spec']
  /**
   * איפה היית איתה — every day he actually wore it, dated off the chapter registry.
   *
   * "A collection of forty shirts is a list. A shirt that says you wore this one on
   * 19.5.1999 is a life" (`shirts.ts`). The shop says this on a card you have to open;
   * the bag says it on the shelf, because that is the reason the shirt is in the bag.
   */
  wornHe: { id: string; dateHe: string; titleHe: string }[]
  /** delta 91 — a shirt he MADE (`state.outputs['pugi:fan-shirt']`): drawn from its marks, never a photograph or a spec */
  craft?: CraftOutput
  /** what the shelf says about a crafted one — on him, or drying on the chair */
  craftedHe?: string
}

/** true when this `clothing` id is already represented by a shirt row in the wardrobe */
export function clothingIsShirt(item: string): string | null {
  return CLOTHING_IS_SHIRT[item] ?? null
}

/**
 * (delta 93, brief §33) the first shirt, in his own words — only for the life in which his
 * father bought it at the counter. A save that bought it itself keeps the archive's note.
 */
export const FIRST_SHIRT_GIFT_NOTE_HE = 'החולצה הראשונה שלי. אבא קנה לי אותה במתנה ב־1985. את הכסף חסכתי בעצמי. בסוף הוא לא נתן לי לשלם.'

export function wardrobeReading(state: LifeState): WardrobeReading[] {
  return ownedShirts(state).map((shirt) => ({
    id: shirt.id,
    nameHe: shirt.nameHe,
    sponsorHe: shirt.sponsorHe,
    yearsHe: shirt.yearsHe,
    noteHe: shirt.id === 'visa86' && (state.flags['life:first-shirt:gift'] || state.flags['a4:kobi-gifted-shirt']) ? FIRST_SHIRT_GIFT_NOTE_HE : shirt.noteHe,
    art: shirt.art,
    spec: shirt.spec,
    wornHe: wornIn(state, shirt.id)
      .map((chapter) => chapterFor(chapter))
      .filter((row): row is NonNullable<ReturnType<typeof chapterFor>> => Boolean(row))
      .sort((a, b) => a.year - b.year)
      .map((row) => ({ id: row.id, dateHe: row.dateHe, titleHe: row.titleHe })),
  }))
}

// --- the Red Box, with the word it has always carried and never shown ---------------

/**
 * הנדירוּת — five words that were authored, stored, weighted and never once printed.
 *
 * `RedBoxItem.rarity` has shipped since the systems pass. `RARITY_LABEL` in `redbox.ts`
 * translates all five. Nothing rendered either, so a scarf somebody put round your neck
 * and a piece of paper you picked off the pavement looked identical on the shelf.
 *
 * It is NOT a tier and it must never read as one. `unique_memory` is "רק שלך" — a
 * statement about provenance, not about worth — and `common` is deliberately not drawn
 * differently from the shelf around it. `standout` is what earns the red plate, and the
 * only reason it exists is that a scarf should look like a scarf and a receipt should
 * not. Objects have provenance, not scores.
 */
export type KeepsakeReading = {
  id: string
  titleHe: string
  noteHe: string | null
  year: number
  item: ItemId
  art: string | null
  rarityHe: string
  standout: boolean
  /** the raw row, because the share button hands it straight to `cardForMemory` */
  source: RedBoxItem
}

export function redBoxReading(state: LifeState): KeepsakeReading[] {
  return state.redBox.map((item) => ({
    id: item.id,
    titleHe: item.titleHe,
    noteHe: item.noteHe ?? null,
    year: item.year,
    item: item.item,
    art: ITEM_ART[item.item] ?? null,
    rarityHe: RARITY_LABEL[item.rarity],
    standout: item.rarity !== 'common',
    source: item,
  }))
}

// --- how he was there --------------------------------------------------------------

/**
 * איך הייתי שם — the natural companion to a ticket stub, and the other half of one.
 *
 * `presence` answers a question `attendedAnchors` cannot: Stage B's own brief says
 * "missed is a ROUTE, not empty content". Inside, late, on somebody's radio, on a coach
 * north, in the army — those are five different biographies of the same afternoon, they
 * are all recorded, and none of them reached a screen.
 *
 * `memories` is the parallel keepsake structure: a `Memory` carries the `anchorId` of the
 * day it came from, which is precisely the join that lets a stub sit beside the way you
 * were present for the match it was torn at. Before this it was read by the debug panel
 * and by nothing else.
 *
 * The date and the name come from the chapter registry, never from the anchor: an anchor
 * holds canonical history and this row is about the player. `anchorId` is a save key and
 * several chapters can share one, so the chapter whose own id IS the key wins and the
 * last one to carry it is the fallback — the 1986 anchor belongs to the Saturday, not to
 * the alley two years before it.
 */
export type AnchorPresenceReading = {
  anchorId: string
  dateHe: string
  titleHe: string
  /** how he was there; null when the life recorded that he was, or was not, and no more */
  mode: PresenceMode | null
  modeHe: string | null
  wasThere: boolean
  /** what the day left in his pocket — a `Memory`, drawn as the object it is made of */
  keepsake: { nameHe: string; art: string | null } | null
}

const PRESENCE_WORDS: Record<PresenceMode, string> = {
  inside: 'בפנים',
  late: 'הגעת באיחור',
  outside: 'בחוץ, ליד השער',
  radio: 'ליד הרדיו',
  television: 'מול הטלוויזיה',
  army: 'בצבא',
  working: 'בעבודה',
  'heard-from-friend': 'שמעת ממישהו',
  travelling: 'בדרך',
  'archive-later': 'קראת על זה אחר כך',
}

function chapterForAnchor(anchorId: string) {
  const rows = CHAPTERS.filter((chapter) => chapter.anchorKey === anchorId)
  return rows.find((chapter) => chapter.id === anchorId) ?? rows[rows.length - 1] ?? null
}

export function presenceReading(state: LifeState): AnchorPresenceReading[] {
  const ids = [...new Set([...Object.keys(state.presence), ...state.attendedAnchors, ...state.missedAnchors])]
  return ids
    .map((anchorId) => {
      const chapter = chapterForAnchor(anchorId)
      if (!chapter) return null
      const mode = state.presence[anchorId] ?? null
      const memory = state.memories.find((row) => row.anchorId === anchorId) ?? null
      return {
        anchorId,
        dateHe: chapter.dateHe,
        titleHe: chapter.titleHe,
        mode,
        modeHe: mode ? PRESENCE_WORDS[mode] : null,
        wasThere: state.attendedAnchors.includes(anchorId),
        keepsake: memory
          ? { nameHe: ITEMS[memory.item]?.nameHe ?? '', art: ITEM_ART[memory.item] ?? null }
          : null,
        year: chapter.year,
      }
    })
    .filter((row): row is AnchorPresenceReading & { year: number } => row !== null)
    .sort((a, b) => a.year - b.year)
    .map(({ year: _year, ...row }) => row)
}

// --- the slot the lead fills --------------------------------------------------------

/**
 * המנוי — the season subscription, and the one section on this screen this pass does not
 * own.
 *
 * The lead is building it in the same session as this file: a yearly purchase at
 * period-correct prices, and a streak of how many consecutive seasons he held one. It
 * belongs on the bag — a season card is the most literal possible answer to "what are you
 * carrying" — so the shelf is built, named and wired, and it renders NOTHING until the
 * data arrives. This type is a rendering contract, not a data model: the model is the
 * lead's, and the deliberate choice here is that no field of `LifeState` is invented to
 * meet it.
 *
 * `streak` is the one number in this contract and it is drawn as that many marks, never
 * printed — the same treatment `copies` gets above, for the same reason. A subscription
 * streak printed as a figure is a score, and a score is what rule 46 exists against.
 */
export type SubscriptionReading = {
  /** the seasons he held a card for, oldest first, labelled the way the club prints them */
  seasonsHe: readonly string[]
  /** the season on the card in his hand right now; null when he holds none */
  currentHe: string | null
  /** consecutive seasons held — DRAWN as marks, never printed as a figure */
  streak: number
}

// --- מה אני יודע לעשות, ולאן החיים הלכו --------------------------------------------

/**
 * שני קריאות שנוספו ב-21.9.2026, ושתיהן על אותו חוסר: **מערכת שנבנתה ואיש לא רואה**.
 *
 * `skills` נכתב, מקופל, נבדק, ונקרא על ידי כל שער כניסה של מסלול — ולא הודפס בשום מקום
 * חוץ מפאנל הדיבאג. `LIFE_TRACKS` גרוע מזה: שלושה מסלולי חיים עם תשעה שלבים, דגלי
 * `own:track:` ששורדים כל מעבר שנה, `trackAtLeast` שתנאים קוראים לו — ו**אפס קומפוננטות**
 * שמזכירות אותו. זו בדיוק המשפחה של כלל 71 ושל `reach.ts` בכלל 75: מודול שלם בלי קורא.
 *
 * שתיהן מחזירות **מילים**, כי הן נועדו לכרטיס. כלל 46 כפי שמאור חידד אותו ב-63א:
 * *"הגיליון עונה 'כמה', הכרטיס עונה 'מי אתה'."* כישור על 42 הוא "יודע קצת"; מסלול הוא
 * שם השלב שנלקח, ולא שלוש נקודות מתוך שלוש.
 */
export type SkillReading = { id: SkillId; band: Band; nameHe: string; readingHe: string }

/**
 * השם של הכישור נוסע **עם הקריאה**, ולא בטבלה שנייה בקומפוננטה.
 *
 * הניסיון הראשון היה `SKILL_NAME_HE` בתוך `ProfileCard.tsx`, ו-`tests/brand.test.ts`
 * הפיל אותו מיד — כלל 10, אין מחרוזת שפונה למשתמש בקוד של קומפוננטה. זה היה גם
 * העתק שני של הטבלה שכבר יושבת כאן (כלל 59). הפתרון הוא לא לפצל: הקריאה מחזירה גם
 * את השם, בדיוק כמו ש-`purseReading` מחזירה `readingHe`.
 */
const SKILL_HE: Record<SkillId, string> = {
  knowledge: 'ידע',
  communication: 'לדבר עם אנשים',
  organization: 'לארגן',
  business: 'עסקים',
  creativity: 'יצירה',
}

/**
 * ארבע מדרגות, והספים הם היכן שהמשחק עצמו נעצר.
 *
 * שערי הכניסה של המסלולים ב-`lib/life/routes.ts` מבקשים כישורים בסדר גודל של 20–45,
 * ולכן המילה משתנה בערך היכן שמשתנה מה שנפתח. `0` אינו "גרוע" אלא **לא התחיל**, וזו
 * הסיבה שהוא מסונן החוצה ולא מודפס כ"אפס": רשימה של חמישה אפסים היא ציון, וזה בדיוק
 * מה שהכרטיס הזה לא עושה.
 */
const SKILL_WORDS: readonly string[] = ['נגעת בזה', 'יודע קצת', 'יודע', 'זה כבר המקצוע שלך']

export function skillsReading(state: LifeState): SkillReading[] {
  const out: SkillReading[] = []
  for (const id of SKILL_IDS) {
    const value = state.skills[id] ?? 0
    if (value <= 0) continue
    const band: Band = value >= 60 ? 3 : value >= 35 ? 2 : value >= 15 ? 1 : 0
    out.push({ id, band, nameHe: SKILL_HE[id], readingHe: SKILL_WORDS[band]! })
  }
  return out
}

export type TrackReading = { id: TrackId; titleHe: string; stageHe: string }

/** רק מסלולים שהוא **עליהם**. מסלול שלא התחיל אינו שורה ריקה — הוא פשוט לא שם. */
export function tracksReading(state: LifeState): TrackReading[] {
  const out: TrackReading[] = []
  for (const track of LIFE_TRACKS) {
    const stage = trackStageOf(state, track.id)
    if (!stage) continue
    out.push({ id: track.id, titleHe: track.titleHe, stageHe: stage.titleHe })
  }
  return out
}
