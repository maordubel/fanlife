/**
 * LIFE · the hood — THE WORKER's painted pictures in the story, for every club (catalogue: `lib/life/worker-art/catalog.json`,
 * files: `public/life/worker/{universal,tlv}/`, imported and de-yellowed from The-Worker; docs/life/WORKER-ART-CATALOG.md).
 *
 * Only two classes are used: `universal` (any city, any club) and `tlv` (only when the club's own city is Tel Aviv).
 * Nothing marked `hapoel-only` or `no` is ever named here (tests/life-hood-story.test.ts reads the catalogue to hold it).
 * A painted Flow plate, when the Flow bake has one, comes first; these are the fallback that always exists.
 */
const U = '/life/worker/universal', T = '/life/worker/tlv'

/** the club's city is Tel Aviv: the Tel Aviv pictures may be used (never on any other club) */
export const isTelAviv = (town: string | null | undefined): boolean => !!town && /tel[\s-]?aviv/i.test(town)

/** a chapter's title card and its aftermath: a room or a street that fits the chapter */
const PLATES: Readonly<Record<string, string>> = {
  'first-noise': `${U}/panoRoomKitchen.webp`, 'six-short': `${U}/kiosk.webp`, 'the-way-in': `${U}/introFirstSight.webp`,
  'monday-colours': `${U}/schoolyard.webp`, 'the-window': `${U}/living.webp`, 'missing-square': `${U}/panoClassroom.webp`,
  'her-seat': `${U}/flatAway.webp`, 'lead-the-way': `${U}/introFirstSight.webp`, 'the-banner': `${U}/classroom.webp`,
  'no-ticket': `${U}/panoRoomBed.webp`, 'the-box': `${U}/panoRoomBed.webp`,
  'old-photo': `${U}/panoRoomLiving.webp`, 'lost-ball': `${U}/schoolyard.webp`, 'pay-back': `${U}/panoRoomGrocery.webp`, 'radio-aerial': `${U}/living.webp`,
  'papers': `${U}/kiosk.webp`, 'kickabout': `${U}/schoolyard.webp`, 'radio-check': `${U}/kitchen.webp`,
}
/** in Tel Aviv the street itself: the beacon over the first card, the approach to the ground, the bus station, an alley in Jaffa */
const TLV_PLATES: Readonly<Record<string, string>> = {
  'first-noise': `${T}/introBeacon.webp`, 'lead-the-way': `${T}/approach.webp`, 'no-ticket': `${T}/busStation.webp`, 'her-seat': `${T}/jaffaAlleyCafe.webp`,
}

export function workerPlate(mission: string | null, town: string | null | undefined): string | null {
  if (!mission) return null
  return (isTelAviv(town) ? TLV_PLATES[mission] : undefined) ?? PLATES[mission] ?? null
}

/** the portrait slot of a person the story keeps generic (Dad and the mate keep their drawn initial) */
const FACES: Readonly<Record<string, string>> = {kiosk: `${U}/faceVendor.webp`, neighbour: `${U}/faceWoman.webp`}
export const workerFace = (who: string): string | null => FACES[who] ?? null

/** the art of a thing in the Kit bag, the Box or the aftermath (by bag id, `keep:<id>` or `carry:<kind>`) */
const PROPS: Readonly<Record<string, string>> = {
  bag: `${U}/propSportsBag.webp`, 'keep:box': `${U}/propRedBox.webp`, 'keep:album': `${U}/propAlbum.webp`, 'keep:ticket': `${U}/propTicketsPair.webp`, ticket: `${U}/propTicketsPair.webp`,
  'carry:battery': `${U}/propRadio.webp`, 'carry:paper': `${U}/propNewspaper.webp`, 'carry:ticket': `${U}/propTicketsPair.webp`, 'carry:sticker': `${U}/propAlbum.webp`,
}
export const workerProp = (id: string): string | null => PROPS[id] ?? null
/** the paper the archive's line is printed on, and the score sheet beside it */
export const WORKER_PAPER = `${U}/propNewspaper.webp`, WORKER_SCORE = `${U}/propScorePaper.webp`
/** Tel Aviv only: the bus ticket of the way to the ground, the pools coupon of the week's papers */
export function workerDoc(mission: string, town: string | null | undefined): string | null {
  if (!isTelAviv(town)) return null
  return mission === 'lead-the-way' || mission === 'the-way-in' ? `${T}/docEggedLira.webp` : mission === 'papers' ? `${T}/docToto4085.webp` : null
}

/** every file this module names (for the test that holds them to the catalogue) */
export const WORKER_ART_USED: readonly string[] = [...new Set([...Object.values(PLATES), ...Object.values(TLV_PLATES), ...Object.values(FACES), ...Object.values(PROPS), WORKER_PAPER, WORKER_SCORE, `${T}/docEggedLira.webp`, `${T}/docToto4085.webp`])]
