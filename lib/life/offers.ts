import {
  ACTIVITIES,
  ACTIVITY,
  ACTIVITY_CONVERSATIONS,
  activityIn,
  favourFlag,
  isStageA,
  payShekels,
  type ActivityDef,
  type ActivityId,
} from './activities'
import { GIGS, gigActivity, gigChapters, gigFlag, gigId, gigPay, isPaid, kindOf, workDoneFlag, type Gig } from './gigs'
import { isRevealed, placeOfScene } from './map'
import { shopId } from './shirts'
import type { LifeState, LocationId } from './types'
import { SCENE, inEra, sceneIn, titleFor } from './world/scenes'
import { meets, type Condition } from './world/types'

/**
 * מה מציעים היום — "today's offers", read off the world and never declared (delta 90, §22).
 *
 * Owner's decision (25.9.2026): the daily rotation stays, but what it dealt is VISIBLE — in
 * the room, in the host's mouth, in "?" and on the map. So this file does not decide what
 * is on offer; `gigs.ts` (`offeredIn`, the rotation flags), `activities.ts` (the eras and
 * the slots) and `world/scenes.ts` (who stands where, under which `when`) already do. It
 * READS them: an offer is a person or a thing standing in a room of this chapter whose
 * button opens a job, a bet, a game or a favour, and whose `when` holds right now. That is
 * the whole of "discoverable", and it is the same sentence the room itself is built from —
 * so Help can never list a job the street does not have, and the street can never have a
 * job Help does not list.
 *
 * Nothing here pays, flags or opens anything. It is one pure reading for three surfaces:
 *
 *  · Help ("?") — `offersNow` + `offerLineHe`, under "אפשר" (§22.4.3);
 *  · the map — `offerPlaces`: a subtle mark on places this life already knows (§22.4.4 —
 *    never a job revealed across the city in a place the boy has not been);
 *  · dialogue — `offersAt` / `offerNudgeHe`, for the follow-up resolver (agent A owns
 *    `runtime/dialogue.ts`; this is the data it may read, and it is not omniscient: a
 *    host names only work in a place the player knows).
 *
 * The anti-grind rule is the pay cap, stated rather than hidden (§22.5): once the
 * chapter's paid work is taken, the work rows say so (`capHe`) instead of vanishing.
 */

/** the three meanings of §22.3, and the favour slot — named, so no row is ever "just a button" */
export type OfferKind = 'work' | 'wager' | 'play' | 'favour'

export const OFFER_KIND_HE: Record<OfferKind, string> = {
  work: 'עבודה',
  wager: 'התערבות',
  play: 'משחק',
  favour: 'טובה',
}

/** one sentence under the label on the pre-launch card: what this kind of thing IS */
export const OFFER_KIND_NOTE_HE: Record<OfferKind, string> = {
  work: 'מישהו צריך שיעשו משהו. זה לוקח זמן וכוח, ומשלמים על זה.',
  wager: 'לא עבודה ולא שכר — התערבות בין חברים.',
  play: 'בשביל הכיף. לא מרוויחים כסף.',
  favour: 'טובה למישהו. לפעמים יוצא מזה משהו לכיס, ולפעמים רק תודה.',
}

/**
 * open — can be started now; unpaid — can be played, pays nothing this time (the favour or
 * the row was already paid); taken — the chapter's paid work is done, the host will say so;
 * done — done today already.
 */
export type OfferStatus = 'open' | 'unpaid' | 'taken' | 'done'

export type Offer = {
  /** `gig:<id>` or `act:<id>` */
  id: string
  kind: OfferKind
  /** the activity this plays as in this chapter, if any */
  activity: ActivityId | null
  gig: string | null
  titleHe: string
  hostHe: string
  where: LocationId
  placeHe: string
  /** what the button in the room opens — the conversation id */
  act: string
  minutes: number
  energy: number
  /** whole shekels at best, in this decade's money — 0 when it cannot pay */
  payTop: number
  status: OfferStatus
  /** the room is on this life's map (or the player is standing in it) */
  known: boolean
  here: boolean
}

type Source = { gig?: Gig; activity?: ActivityDef }
type Entry = Source & { act: string; where: LocationId; when?: Condition }

const INDEX = new Map<string, Entry[]>()

/** what opens what, in one chapter: every conversation id that starts an offer */
function sourcesIn(chapter: string): Map<string, Source> {
  const out = new Map<string, Source>()
  for (const gig of GIGS) {
    if (!gigChapters(gig).includes(chapter)) continue
    out.set(gigId(gig, chapter), { gig, ...(gigActivity(gig, chapter) ? { activity: gigActivity(gig, chapter) as ActivityDef } : {}) })
  }
  for (const def of ACTIVITIES) {
    if (!activityIn(def, chapter)) continue
    const ask = ACTIVITY_CONVERSATIONS[def.id].ask
    if (ask && !out.has(ask)) out.set(ask, { activity: def })
  }
  // the shop's order is asked at the counter, inside the shop's own conversation (`fanShops`)
  const order = ACTIVITY['shop-order']
  if (activityIn(order, chapter)) {
    const gig = GIGS.find((row) => row.id === order.gig)
    out.set(shopId(chapter), { activity: order, ...(gig ? { gig } : {}) })
  }
  return out
}

/** every place in this chapter's world where an offer stands — cached per chapter, conditions unevaluated */
export function offerEntries(chapter: string): readonly Entry[] {
  const hit = INDEX.get(chapter)
  if (hit) return hit
  const sources = sourcesIn(chapter)
  const entries: Entry[] = []
  const seen = new Set<string>()
  for (const base of Object.values(SCENE)) {
    const room = sceneIn(base, chapter)
    const things: { act: string; when?: Condition }[] = [
      ...room.actors.filter((actor) => actor.talk && inEra(actor, chapter)).map((actor) => ({ act: actor.talk as string, when: actor.when })),
      ...room.hotspots.filter((spot) => inEra(spot, chapter)).map((spot) => ({ act: spot.act, when: spot.when })),
    ]
    for (const thing of things) {
      const source = sources.get(thing.act)
      if (!source) continue
      // the same offer can stand at two spots of one room (a shop counter and its door) — one row
      const key = `${base.id}|${thing.act}|${JSON.stringify(thing.when ?? null)}`
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({ ...source, act: thing.act, where: base.id as LocationId, ...(thing.when ? { when: thing.when } : {}) })
    }
  }
  INDEX.set(chapter, entries)
  return entries
}

function kindFor(source: Source): OfferKind {
  if (source.gig) return kindOf(source.gig)
  const def = source.activity
  if (!def || def.slot === 'none') return 'play'
  // a favour that pays nothing is still a favour (delta 91: painting Asaf's letters is not "משחק")
  if (def.slot === 'favour') return 'favour'
  return def.pay ? 'work' : 'play'
}

function statusFor(state: LifeState, source: Source, kind: OfferKind, payTop: number): OfferStatus {
  const chapter = state.chapter
  if (source.gig) {
    if (state.flags[gigFlag(source.gig)]) return 'done'
    if (isPaid(source.gig) && state.flags[workDoneFlag(chapter)]) return 'taken'
    return payTop > 0 || kind === 'play' ? 'open' : 'unpaid'
  }
  // a favour that never paid cannot be "unpaid this time"
  if (kind === 'favour' && payTop > 0 && (isStageA(chapter) || state.flags[favourFlag(chapter)])) return 'unpaid'
  return 'open'
}

function offerOf(state: LifeState, entry: Entry): Offer {
  const chapter = state.chapter
  const kind = kindFor(entry)
  const def = entry.activity ?? null
  const gig = entry.gig ?? null
  const payTop = kind === 'play' ? 0 : def ? payShekels(def, chapter, 1) : gig ? gigPay(gig, chapter) : 0
  const base = SCENE[entry.where as keyof typeof SCENE]
  const place = placeOfScene(entry.where)
  const here = state.location === entry.where
  const status = statusFor(state, entry, kind, payTop)
  return {
    id: def ? `act:${def.id}` : `gig:${gig?.id ?? entry.act}`,
    kind,
    activity: def?.id ?? null,
    gig: gig?.id ?? null,
    titleHe: def?.titleHe ?? gig?.labelHe ?? '',
    hostHe: def?.hostHe ?? gig?.nameHe ?? '',
    where: entry.where,
    placeHe: base ? titleFor(base, chapter) : '',
    act: entry.act,
    minutes: def?.minutes ?? gig?.minutes ?? 0,
    energy: def?.energy ?? gig?.energy ?? 0,
    payTop: status === 'open' || status === 'taken' ? payTop : 0,
    status,
    // a room on the city map is known when its place is; a room that is on no map (a hatch, a
    // gate) is known once this life has stood in it — never a job revealed from nowhere
    known: here || (place ? isRevealed(state, place) : Boolean(state.flags[`life:been:${entry.where}`])),
    here,
  }
}

/**
 * Every offer standing in this chapter's world right now, known to this life — one row
 * per offer (an offer that stands in two rooms is listed where the player is, or first).
 * `done` and `taken` rows are included so a caller can say so; Help filters them.
 */
export function offersNow(state: LifeState): Offer[] {
  const rows: Offer[] = []
  for (const entry of offerEntries(state.chapter)) {
    // the boy's own bag is a thing he owns, not something the day offers him — never "משחק" in "?"
    if (entry.activity?.kind === 'myBag') continue
    if (!meets(state, entry.when)) continue
    const offer = offerOf(state, entry)
    if (!offer.known) continue
    const twin = rows.findIndex((row) => row.id === offer.id)
    if (twin >= 0) {
      if (offer.here && !rows[twin]?.here) rows[twin] = offer
      continue
    }
    rows.push(offer)
  }
  const order: Record<OfferKind, number> = { work: 0, favour: 1, wager: 2, play: 3 }
  return rows.sort((a, b) => Number(b.here) - Number(a.here) || order[a.kind] - order[b.kind])
}

/** what can actually be started — open, or playable for nothing */
export const startable = (offer: Offer) => offer.status === 'open' || offer.status === 'unpaid'

/** the offers in one room — what a host standing there can mention */
export function offersAt(state: LifeState, where: LocationId = state.location): Offer[] {
  return offersNow(state).filter((offer) => offer.where === where && startable(offer))
}

/** the rooms that hold a known offer right now, for a subtle mark on the map (§22.4.4) */
export function offerPlaces(state: LifeState): Map<LocationId, OfferKind> {
  const out = new Map<LocationId, OfferKind>()
  for (const offer of offersNow(state)) {
    if (!startable(offer)) continue
    const had = out.get(offer.where)
    // work outranks the rest on one pin: it is the one the player may be looking for
    if (!had || (offer.kind === 'work' && had !== 'work')) out.set(offer.where, offer.kind)
  }
  return out
}

/** `עבודה — משמרת בקפה · אלנבי · כ־40 דק׳ · עד 14 ₪` (§22.4.3) */
export function offerLineHe(offer: Offer, { kind = true }: { kind?: boolean } = {}): string {
  // `kind: false` when the kind is already printed beside the line (the chip in "?")
  const parts = [kind ? `${OFFER_KIND_HE[offer.kind]} — ${offer.titleHe}` : offer.titleHe]
  if (offer.placeHe) parts.push(offer.here ? 'כאן' : offer.placeHe)
  if (offer.minutes > 0) parts.push(`כ־${offer.minutes} דק׳`)
  if (offer.status === 'open' && offer.payTop > 0) parts.push(`עד ${offer.payTop} ₪`)
  if (offer.status === 'unpaid' && offer.kind !== 'play') parts.push('הפעם בלי שכר')
  return parts.join(' · ')
}

/** the pay cap, said out loud once it bites — "you can find the work; you cannot be paid forever" */
export function capHe(state: LifeState): string | null {
  if (!state.flags[workDoneFlag(state.chapter)]) return null
  return 'עבודה בתשלום כבר עשית בפרק הזה. משחק ועזרה — תמיד אפשר.'
}

/**
 * For a host's line (Workstream A): the first open paid job in a place this life knows,
 * away from where he stands — or null. `אם אתה מחפש כמה שקלים — המלצר באלנבי צריך ידיים.`
 * Never names a job in an unknown place and never one that would be refused.
 */
export function offerNudge(state: LifeState, speakerHe: string | null = null): { id: string; textHe: string } | null {
  // a host does not recommend himself in the third person
  const job = offersNow(state).find(
    (offer) => offer.kind === 'work' && offer.status === 'open' && !offer.here && (!speakerHe || !offer.hostHe.includes(speakerHe)),
  )
  if (!job) return null
  return { id: job.id, textHe: `אם אתה מחפש כמה שקלים — ${job.hostHe} ב${job.placeHe} צריך ידיים.` }
}

export const offerNudgeHe = (state: LifeState): string | null => offerNudge(state)?.textHe ?? null

/** the pre-launch card (§22.6), as data — built for a request the shell is about to open */
export type ActivityQuote = {
  kind: OfferKind
  kindHe: string
  noteHe: string
  minutes: number
  energyHe: string
  /** `עד 14 ₪`, `הפעם בלי שכר`, `לא מרוויחים כסף` */
  payHe: string
}

const energyHe = (energy: number) => (energy <= 4 ? 'נמוכה' : energy <= 10 ? 'בינונית' : 'גבוהה')

export function activityQuote(state: LifeState, id: ActivityId): ActivityQuote {
  const def = ACTIVITY[id]
  const gig = def.gig ? GIGS.find((row) => row.id === def.gig) : undefined
  const source: Source = { activity: def, ...(gig ? { gig } : {}) }
  const kind = kindFor(source)
  const top = kind === 'play' ? 0 : payShekels(def, state.chapter, 1)
  const status = statusFor(state, source, kind, top)
  const payHe =
    kind === 'play' || !def.pay
      ? 'לא מרוויחים כסף'
      : status === 'open' && top > 0
        ? kind === 'wager'
          ? `אפשר לזכות עד ${top} ₪`
          : `עד ${top} ₪, לפי איך שזה הולך`
        : 'הפעם בלי שכר'
  return {
    kind,
    kindHe: OFFER_KIND_HE[kind],
    noteHe: OFFER_KIND_NOTE_HE[kind],
    minutes: def.minutes,
    energyHe: energyHe(def.energy),
    payHe,
  }
}
