import type { LifeState, LocationId } from './types'

/**
 * המפה — תל אביב, and the places in it this life reaches.
 *
 * Maor's ask (5.9.2026): a map that LOOKS like Tel Aviv — the real one, with Bloomfield
 * in Jaffa and Ussishkin on the Yarkon — where a tap on the house, the pitch, the street
 * takes you there; and where a place is not on the map until the life has reached it,
 * so that the first sight of the ground is a moment the map itself plays.
 *
 * Coordinates are real (WGS84) and the projection is a plain plate carrée over one box
 * of the city, which at this latitude is near enough to true that the coast, the river
 * and the stadium sit where a person who lives here expects them. Every place carries a
 * `confidence` because two of them are gone: the hall on Ussishkin street was demolished
 * in 2007 and the boardwalk stands there now, and its pin is placed from that.
 *
 * A place is REVEALED by a flag — a scene entered, or a thing seen (`saw:road`: the
 * floodlight pylons over the rooftops are the first sight of Bloomfield, and that is the
 * moment the ground goes on the map, not the moment the boy stands under it). The reveal
 * is persisted as `life:reveal:<id>`, a person-flag that survives every year, and the
 * runtime plays the moment once. Quiet places (the house, the street) reveal without one.
 */

export type MapPlaceId =
  | 'home'
  | 'street'
  | 'kiosk'
  | 'pitch'
  | 'school'
  | 'route'
  | 'allenby'
  | 'bloomfield'
  | 'ussishkin'
  | 'yad-eliyahu'
  | 'bus-station'
  | 'hatikva'
  | 'ramat-gan'
  | 'base'

export type MapPlaceDef = {
  id: MapPlaceId
  labelHe: string
  /** what the map says under the name — a neighbourhood, a street */
  subHe: string
  lat: number
  lon: number
  /** the scene a tap goes to, and the scenes that count as being here */
  scene: LocationId | null
  scenes: readonly LocationId[]
  /** the flag whose first rise reveals it; `null` = revealed from the first minute */
  revealFlag: string | null
  /** the moment — the line the reveal card says; null for a quiet reveal */
  revealHe: string | null
  /** how sure the pin is: real coordinates, or placed from what stood there */
  confidence: 'exact' | 'placed'
  /** the earliest chapter it can exist in — a pin from 1996 has no business in 1986 */
  fromYear: number
  /** drawn at the edge with an arrow: not in the city */
  offMap?: boolean
}

export const MAP_PLACES: readonly MapPlaceDef[] = [
  {
    id: 'home',
    labelHe: 'הבית',
    subHe: 'יפו, ליד סלמה',
    lat: 32.053,
    lon: 34.753,
    scene: 'home',
    scenes: ['bedroom', 'home', 'kitchen'],
    revealFlag: null,
    revealHe: null,
    confidence: 'placed',
    fromYear: 1978,
  },
  {
    id: 'street',
    labelHe: 'הרחוב',
    subHe: 'השכונה',
    lat: 32.0548,
    lon: 34.7552,
    scene: 'street',
    scenes: ['street'],
    revealFlag: null,
    revealHe: null,
    confidence: 'placed',
    fromYear: 1978,
  },
  {
    id: 'kiosk',
    labelHe: 'הקיוסק של רפי',
    subHe: 'בפינה',
    lat: 32.0563,
    lon: 34.7537,
    scene: 'kiosk',
    scenes: ['kiosk'],
    revealFlag: 'life:been:kiosk',
    revealHe: null,
    confidence: 'placed',
    fromYear: 1978,
  },
  {
    id: 'pitch',
    labelHe: 'המגרש',
    subHe: 'מגרש העפר של השכונה',
    lat: 32.0514,
    lon: 34.7554,
    scene: 'pitch',
    scenes: ['pitch'],
    revealFlag: 'life:been:pitch',
    revealHe: null,
    confidence: 'placed',
    fromYear: 1978,
  },
  {
    id: 'school',
    labelHe: 'בית הספר',
    subHe: 'הכיתה והחצר',
    lat: 32.0571,
    lon: 34.7519,
    scene: 'schoolyard',
    scenes: ['classroom', 'schoolyard'],
    /**
     * 1984, not 1990 — a boy who is six in the spring of 1984 goes to school, and the
     * schoolyard is a door off his own street in every chapter. `fromYear: 1984` kept the
     * pin off the map for the whole of Stage A. (Map audit, 6.9.2026.)
     */
    revealFlag: 'life:been:classroom',
    revealHe: 'גם פה יש לך מקום.',
    confidence: 'placed',
    fromYear: 1984,
  },
  {
    id: 'route',
    labelHe: 'דרום תל אביב',
    subHe: 'הדרך מהשכונה',
    lat: 32.0531,
    lon: 34.7569,
    scene: 'route',
    scenes: ['route'],
    revealFlag: 'life:been:route',
    revealHe: null,
    confidence: 'placed',
    fromYear: 1978,
  },
  {
    /**
     * אלנבי פינת קינג ג׳ורג׳ פינת נחלת בנימין — the junction the map turns on.
     *
     * Real coordinates, and it is still there: the corner where Allenby crosses King
     * George and Nahalat Binyamin runs off it. Until 6.9.2026 the hall on Ussishkin street
     * was one door off the child's own pavement, six kilometres away, which made the map a
     * list rather than a city. Now town is in the middle of it, and everything north goes
     * through here — which is how it works if you grew up south of it.
     */
    id: 'allenby',
    labelHe: 'אלנבי',
    subHe: 'פינת קינג ג׳ורג׳ · נחלת בנימין',
    lat: 32.0667,
    lon: 34.771,
    scene: 'allenby',
    scenes: ['allenby'],
    /**
     * Town appears the moment anything north of the neighbourhood does, because everything
     * north goes through it. `any` is not a thing a reveal flag can express, so it hangs on
     * the earliest of them: the autumn afternoon Efi says the word "אלנבי" out loud.
     */
    revealFlag: 'life:knows:hall',
    revealHe: 'מרכז העיר. מכאן ממשיכים לכל מקום.',
    confidence: 'exact',
    fromYear: 1978,
  },
  {
    id: 'bloomfield',
    labelHe: 'בלומפילד',
    subHe: 'יפו · 1962',
    lat: 32.0517,
    lon: 34.7583,
    scene: 'bloomfield-outside',
    scenes: ['bloomfield-outside', 'bloomfield-tunnel', 'bloomfield-inside'],
    // the floodlight pylons over the rooftops — seen before it is reached
    revealFlag: 'saw:road',
    revealHe: 'ראית את עמודי התאורה מעל הגגות. עכשיו אתה יודע את הדרך.',
    confidence: 'exact',
    fromYear: 1978,
  },
  {
    id: 'ussishkin',
    labelHe: 'אולם אוסישקין',
    subHe: 'על הירקון · רחוב אוסישקין',
    lat: 32.0965,
    lon: 34.7885,
    scene: 'ussishkin-outside',
    scenes: ['ussishkin-outside', 'ussishkin-hall', 'ussishkin-end'],
    /**
     * A place goes on the map when somebody TELLS you it exists, not when you have already
     * walked there — a map that only shows where you have been is a diary. Efi names the
     * hall in the autumn of 1984 (`life:knows:hall`), and from that sentence the pin is on
     * the map, which is the difference between "go after the wall, right" and a direction.
     *
     * `fromYear` said 1990 until 6.9.2026, which put the hall out of reach in the one
     * chapter that is ABOUT reaching it: A3 is 1984, so the pin could not exist and the
     * player was told to go somewhere the map denied. It is 1984 now — the year of the
     * chapter that walks there — and the hall itself stood long before that.
     */
    revealFlag: 'life:knows:hall',
    revealHe: 'הבית השני. מהיום הוא על המפה שלך.',
    confidence: 'placed',
    fromYear: 1984,
  },
  {
    id: 'yad-eliyahu',
    labelHe: 'יד אליהו',
    subHe: 'ההיכל',
    lat: 32.0563,
    lon: 34.7873,
    scene: null,
    scenes: [],
    revealFlag: 'life:been:yad-eliyahu',
    revealHe: 'היכל גדול. הפעם זה גמר.',
    confidence: 'exact',
    fromYear: 1993,
  },
  {
    id: 'bus-station',
    labelHe: 'התחנה המרכזית',
    subHe: 'החדשה',
    lat: 32.0556,
    lon: 34.7796,
    scene: null,
    scenes: [],
    revealFlag: 'life:been:bus-station',
    revealHe: null,
    confidence: 'exact',
    fromYear: 1996,
  },
  {
    id: 'hatikva',
    labelHe: 'שכונת התקווה',
    subHe: 'המגרש של בני יהודה',
    lat: 32.0538,
    lon: 34.7942,
    scene: null,
    scenes: [],
    revealFlag: 'life:been:hatikva',
    revealHe: 'לא הבית שלך. היום זה לא משנה.',
    confidence: 'exact',
    fromYear: 2000,
  },
  {
    id: 'ramat-gan',
    labelHe: 'אצטדיון רמת גן',
    subHe: 'הגמר',
    lat: 32.0803,
    lon: 34.8238,
    scene: null,
    scenes: [],
    revealFlag: 'life:been:ramat-gan',
    revealHe: 'האצטדיון הלאומי. גמר גביע.',
    confidence: 'exact',
    fromYear: 1999,
  },
  {
    id: 'base',
    labelHe: 'הבסיס',
    subHe: 'מחוץ לעיר',
    lat: 32.03,
    lon: 34.835,
    scene: null,
    scenes: [],
    revealFlag: 'life:been:base',
    revealHe: null,
    confidence: 'placed',
    fromYear: 1996,
    offMap: true,
  },
]

export const MAP_PLACE: Record<string, MapPlaceDef> = Object.fromEntries(MAP_PLACES.map((p) => [p.id, p]))

/** the box of the city the map draws — lon west/east, lat south/north */
export const MAP_BOX = { west: 34.735, east: 34.835, south: 32.03, north: 32.115 }
/** the drawing's own size; one unit of lon is stretched by cos(32°) so a block is square */
export const MAP_SIZE = { w: 1000, h: 1000 }

/** WGS84 → map units. Plate carrée over the box, latitude-corrected. */
export function project(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - MAP_BOX.west) / (MAP_BOX.east - MAP_BOX.west)) * MAP_SIZE.w
  const y = ((MAP_BOX.north - lat) / (MAP_BOX.north - MAP_BOX.south)) * MAP_SIZE.h
  return { x, y }
}

export const revealFlagOf = (id: MapPlaceId) => `life:reveal:${id}`

/** Is this place on the player's map — revealed, and of this life's time. */
export function isRevealed(state: LifeState, place: MapPlaceDef): boolean {
  if (state.year < place.fromYear) return false
  if (place.revealFlag === null) return true
  return Boolean(state.flags[revealFlagOf(place.id)])
}

/** The place a scene belongs to, or null for a scene that is nowhere on the city map. */
export function placeOfScene(scene: LocationId): MapPlaceDef | null {
  return MAP_PLACES.find((p) => p.scenes.includes(scene)) ?? null
}

/**
 * מה נחשף עכשיו — the places whose reveal flag rose between two states and that are not
 * yet on the map. The runtime calls this on every dispatch, writes the persisted reveal,
 * and plays the moment for the ones that have a line.
 */
export function newlyRevealed(before: LifeState, after: LifeState): MapPlaceDef[] {
  const out: MapPlaceDef[] = []
  for (const place of MAP_PLACES) {
    if (!place.revealFlag) continue
    if (after.year < place.fromYear) continue
    if (after.flags[revealFlagOf(place.id)]) continue
    const was = Boolean(before.flags[place.revealFlag])
    const now = Boolean(after.flags[place.revealFlag])
    if (!was && now) out.push(place)
  }
  return out
}


// ---------------------------------------------------------------------------------
// THE CITY — the lines, the areas and the names the map is drawn from.
//
// Maor, 16.9.2026: "תשפר גם את המפה, אשמח למפה אינטרקטיבית, שאפשר להזיז אותה, שיהיה כיף,
// ממש אווירת תל אביבית." The first half of that is `CityMap`'s camera. This half is the
// second: a city you recognise before you have read a single name on it — the sea and the
// beach down the whole western edge, the Jaffa promontory with the port inside its hook,
// the Yarkon coming out at the port, the Ayalon down the eastern side, and between them
// the streets a boy from south Tel Aviv gives directions by.
//
// **Rule 11 applies to geography exactly as it applies to a scoreline.** Every line and
// every area here is a claim about a real place, so the same standard holds: a street I
// could not place is not drawn, and where a shape is a convention rather than a survey
// (the beach band, the quarter tints) it says so in its own comment. Three lines that
// were here before this pass are gone for that reason and the report says which:
// a "דרך יפו" that Tel Aviv-Yafo does not have under that name, a `salame` whose
// direction east could not be settled, and a `lahagana` drawn running north-east when
// דרך ההגנה runs north–south beside the Ayalon.
//
// The projection is `project()` above: plate carrée over `MAP_BOX`, 1000×1000. The box is
// 0.1° of longitude by 0.085° of latitude, which at 32°N is 9.44 km by 9.40 km — so the
// drawing is square in metres too, and **one kilometre is 106 map units**. That is what
// lets the map carry an honest scale bar.
// ---------------------------------------------------------------------------------

/** one kilometre, in map units — see the box arithmetic above */
export const KM = 105.9

export type MapLine = {
  id: string
  /**
   * what it is, which is also how it is drawn:
   * `coast` the waterline · `river` the Yarkon · `highway` the Ayalon ·
   * `road` a named artery · `street` a smaller named street · `walk` the promenade ·
   * `mole` the built arm of a harbour
   */
  kind: 'coast' | 'river' | 'highway' | 'road' | 'street' | 'walk' | 'mole'
  points: readonly [number, number][]
  labelHe?: string
}

/**
 * החוף — from the northern edge of the box down to Bat Yam, and the whole shape of the
 * map hangs off it: `CityMap` closes this line against the western edge to fill the sea,
 * so the first point must sit on the north edge and the last on the south edge.
 *
 * The hook at 32.052 is the Jaffa promontory — the one place on this coast that juts west
 * — with the port inside it. The Yarkon's mouth is the notch at 32.0995.
 */
const COAST: readonly [number, number][] = [
  [32.115, 34.7835],
  [32.1105, 34.7805],
  [32.1055, 34.7785],
  [32.1015, 34.7765],
  [32.0995, 34.7745], // the Yarkon's mouth, and the port beside it
  [32.096, 34.7725],
  [32.0905, 34.77],
  [32.0855, 34.768],
  [32.081, 34.766],
  [32.077, 34.7645],
  [32.0725, 34.7635], // the beach at the end of Allenby
  [32.068, 34.7625],
  [32.064, 34.7605],
  [32.06, 34.757],
  [32.0565, 34.754], // under the clock tower
  [32.054, 34.7512],
  [32.0525, 34.7498], // יפו — the rock the old city stands on
  [32.0505, 34.7502],
  [32.048, 34.7492],
  [32.044, 34.7475],
  [32.04, 34.746],
  [32.034, 34.743],
  [32.03, 34.7415],
]

export const CITY_LINES: readonly MapLine[] = [
  { id: 'coast', kind: 'coast', points: COAST },

  /**
   * הירקון — out at the port and east through the park, under Ibn Gvirol and Rokach, on
   * towards Bnei Brak. The first point is the coast's own mouth point, so the river meets
   * the sea instead of stopping near it.
   */
  {
    id: 'yarkon',
    kind: 'river',
    labelHe: 'הירקון',
    points: [
      [32.0995, 34.7745],
      [32.0985, 34.7775],
      [32.099, 34.7815],
      [32.1005, 34.7855],
      [32.102, 34.7905],
      [32.103, 34.7955],
      [32.104, 34.801],
      [32.1035, 34.808],
      [32.102, 34.815],
      [32.101, 34.825],
      [32.1005, 34.835],
    ],
  },

  /** נתיבי איילון — the eastern wall of the city, north to south down the stream bed */
  {
    id: 'ayalon',
    kind: 'highway',
    labelHe: 'איילון',
    points: [
      [32.115, 34.808],
      [32.1, 34.802],
      [32.09, 34.797],
      [32.075, 34.793],
      [32.06, 34.79],
      [32.048, 34.787],
      [32.036, 34.784],
      [32.03, 34.782],
    ],
  },

  // --- the sea front, north to south -------------------------------------------------
  { id: 'promenade', kind: 'walk', labelHe: 'הטיילת', points: [[32.0855, 34.769], [32.081, 34.767], [32.0765, 34.7652], [32.0722, 34.7642], [32.0665, 34.7618], [32.0625, 34.7598]] },
  { id: 'hayarkon', kind: 'street', labelHe: 'הירקון', points: [[32.0952, 34.7728], [32.088, 34.7705], [32.08, 34.7685], [32.0725, 34.7665], [32.0665, 34.7645]] },
  { id: 'benyehuda', kind: 'street', labelHe: 'בן יהודה', points: [[32.096, 34.7748], [32.088, 34.7722], [32.08, 34.7702], [32.0742, 34.7688]] },

  // --- the north–south arteries -------------------------------------------------------
  { id: 'dizengoff', kind: 'road', labelHe: 'דיזנגוף', points: [[32.0965, 34.78], [32.088, 34.776], [32.0797, 34.7742], [32.0752, 34.7744], [32.0734, 34.7736]] },
  { id: 'ibngvirol', kind: 'road', labelHe: 'אבן גבירול', points: [[32.0995, 34.784], [32.09, 34.7818], [32.0805, 34.7808], [32.075, 34.7818]] },
  { id: 'kingeorge', kind: 'road', labelHe: 'קינג ג׳ורג׳', points: [[32.0666, 34.7712], [32.07, 34.7723], [32.073, 34.7735], [32.0748, 34.7742]] },

  /**
   * אלנבי — the sea at one end, the junction in the middle, and south-east out of town.
   * The point at 32.0666/34.7712 is כיכר מגן דוד, where אלנבי, קינג ג׳ורג׳, נחלת בנימין,
   * שינקין and הכרמל all meet; it is the same coordinate the `allenby` place is pinned at,
   * on purpose — the junction this game turns on is one point, not two near each other.
   */
  { id: 'allenby', kind: 'road', labelHe: 'אלנבי', points: [[32.0715, 34.7655], [32.0695, 34.768], [32.0666, 34.7712], [32.064, 34.7745], [32.0615, 34.7775], [32.0602, 34.779]] },
  { id: 'nahalat', kind: 'street', labelHe: 'נחלת בנימין', points: [[32.0664, 34.7708], [32.065, 34.7714], [32.0636, 34.7719]] },
  { id: 'sheinkin', kind: 'street', labelHe: 'שינקין', points: [[32.0662, 34.7718], [32.0667, 34.7748], [32.067, 34.7768]] },
  { id: 'hacarmel', kind: 'street', labelHe: 'הכרמל', points: [[32.0662, 34.7702], [32.0651, 34.769], [32.0639, 34.7678]] },
  { id: 'rothschild', kind: 'road', labelHe: 'רוטשילד', points: [[32.0632, 34.7702], [32.0668, 34.7742], [32.07, 34.7768], [32.0735, 34.779]] },

  // --- south Tel Aviv, the boy's own half ---------------------------------------------
  { id: 'herzl', kind: 'street', labelHe: 'הרצל', points: [[32.0632, 34.7698], [32.0598, 34.772], [32.0568, 34.7738]] },
  { id: 'levinsky', kind: 'street', labelHe: 'לוינסקי', points: [[32.0588, 34.7715], [32.058, 34.7765], [32.0574, 34.7802]] },
  { id: 'kibbutz', kind: 'road', labelHe: 'קיבוץ גלויות', points: [[32.0525, 34.758], [32.0505, 34.77], [32.0488, 34.78], [32.0478, 34.786]] },
  { id: 'hahagana', kind: 'road', labelHe: 'ההגנה', points: [[32.062, 34.7885], [32.054, 34.7895], [32.0487, 34.7912], [32.0425, 34.7918]] },

  // --- Jaffa ---------------------------------------------------------------------------
  { id: 'yerushalayim', kind: 'road', labelHe: 'שדרות ירושלים', points: [[32.0545, 34.7548], [32.052, 34.7573], [32.0497, 34.7598], [32.0472, 34.7622]] },
  { id: 'yefet', kind: 'road', labelHe: 'יפת', points: [[32.0545, 34.753], [32.05, 34.7525], [32.0455, 34.753], [32.04, 34.7545]] },
  /** the arm the boats sit behind — the harbour is the water inside it */
  { id: 'jaffa-mole', kind: 'mole', points: [[32.0537, 34.7508], [32.0528, 34.7484], [32.0512, 34.7482]] },

  // --- east, out of the city ------------------------------------------------------------
  { id: 'rokach', kind: 'road', labelHe: 'רוקח', points: [[32.0975, 34.7805], [32.0965, 34.7905], [32.096, 34.802], [32.0955, 34.813]] },
  { id: 'jabotinsky', kind: 'road', labelHe: 'ז׳בוטינסקי', points: [[32.084, 34.792], [32.084, 34.805], [32.083, 34.82]] },
  /**
   * דרך פתח תקווה, not דרך בגין: the road was renamed in the nineties and this map is read
   * by a boy who is eight in 1986. Naming it for a man who was still alive would be the
   * same class of error as putting a date on a caption (rule 43).
   */
  { id: 'petahtikva', kind: 'road', labelHe: 'דרך פתח תקווה', points: [[32.0705, 34.7885], [32.078, 34.795], [32.086, 34.8]] },
]

/**
 * שטחים — the tinted shapes under the lines: parks, quarters, the old city.
 *
 * Each one is an ELLIPSE, not a boundary, and that is a claim about honesty rather than a
 * shortcut. A printed neighbourhood boundary is a survey; what this map actually knows is
 * "the place people call פלורנטין is centred about here and is roughly this big", and an
 * ellipse says exactly that and no more. Parks are the exception in spirit — their edges
 * are real — but they are drawn the same way so that one rule covers the whole layer.
 */
export type MapArea = {
  id: string
  kind: 'park' | 'quarter' | 'oldcity'
  lat: number
  lon: number
  /** half-extents, in degrees, so they live in the same units as everything else here */
  dLat: number
  dLon: number
}

export const CITY_AREAS: readonly MapArea[] = [
  // parks
  { id: 'gani-yehoshua', kind: 'park', lat: 32.0988, lon: 34.7995, dLat: 0.0032, dLon: 0.0155 },
  { id: 'independence', kind: 'park', lat: 32.0908, lon: 34.7712, dLat: 0.0022, dLon: 0.0011 },
  { id: 'charles-clore', kind: 'park', lat: 32.0628, lon: 34.7588, dLat: 0.0028, dLon: 0.0013 },
  { id: 'gan-meir', kind: 'park', lat: 32.0745, lon: 34.7722, dLat: 0.0009, dLon: 0.0007 },
  // the old city on its rock, inside the hook of the coast
  { id: 'old-jaffa', kind: 'oldcity', lat: 32.0532, lon: 34.752, dLat: 0.0017, dLon: 0.0013 },
  // quarters — centres and rough sizes, never boundaries
  { id: 'q-ajami', kind: 'quarter', lat: 32.048, lon: 34.7535, dLat: 0.0032, dLon: 0.0022 },
  { id: 'q-neve-tzedek', kind: 'quarter', lat: 32.063, lon: 34.7658, dLat: 0.0018, dLon: 0.0016 },
  { id: 'q-kerem', kind: 'quarter', lat: 32.0656, lon: 34.7678, dLat: 0.0013, dLon: 0.0013 },
  { id: 'q-florentin', kind: 'quarter', lat: 32.0578, lon: 34.7705, dLat: 0.0022, dLon: 0.0025 },
  { id: 'q-shapira', kind: 'quarter', lat: 32.0525, lon: 34.7765, dLat: 0.0022, dLon: 0.0026 },
  { id: 'q-neve-shaanan', kind: 'quarter', lat: 32.0558, lon: 34.7795, dLat: 0.0016, dLon: 0.002 },
  { id: 'q-hatikva', kind: 'quarter', lat: 32.0505, lon: 34.793, dLat: 0.003, dLon: 0.0034 },
  { id: 'q-yad-eliyahu', kind: 'quarter', lat: 32.058, lon: 34.788, dLat: 0.0025, dLon: 0.003 },
  { id: 'q-old-north', kind: 'quarter', lat: 32.09, lon: 34.776, dLat: 0.0055, dLon: 0.0035 },
  { id: 'q-lev-hair', kind: 'quarter', lat: 32.0705, lon: 34.7738, dLat: 0.0035, dLon: 0.003 },
  { id: 'q-ramat-aviv', kind: 'quarter', lat: 32.1125, lon: 34.793, dLat: 0.0025, dLon: 0.0035 },
]

/**
 * השמות — every name the city itself carries, in four tiers.
 *
 * The tier is a ZOOM, not a font size: `town` and `sea` are always printed, `hood` arrives
 * when the camera is inside about three quarters of the city, `spot` only when it is
 * close. That is how a paper map behaves when you lean over it, and it is the whole reason
 * the wide view is readable at all — the version before this pass printed all nine names
 * at every zoom and they sat on top of each other in the south-west.
 */
export const CITY_LABELS: readonly { labelHe: string; lat: number; lon: number; size: 'town' | 'sea' | 'hood' | 'spot' }[] = [
  { labelHe: 'הים', lat: 32.082, lon: 34.7465, size: 'sea' },
  { labelHe: 'תל אביב', lat: 32.079, lon: 34.7775, size: 'town' },
  { labelHe: 'יפו', lat: 32.0478, lon: 34.7568, size: 'town' },
  { labelHe: 'רמת גן', lat: 32.082, lon: 34.8165, size: 'town' },
  { labelHe: 'גבעתיים', lat: 32.072, lon: 34.812, size: 'town' },
  { labelHe: 'בת ים', lat: 32.0332, lon: 34.7485, size: 'town' },
  { labelHe: 'חולון', lat: 32.034, lon: 34.778, size: 'town' },

  { labelHe: 'הצפון הישן', lat: 32.0905, lon: 34.7765, size: 'hood' },
  { labelHe: 'לב העיר', lat: 32.0708, lon: 34.774, size: 'hood' },
  { labelHe: 'נווה צדק', lat: 32.0632, lon: 34.766, size: 'hood' },
  { labelHe: 'כרם התימנים', lat: 32.0658, lon: 34.768, size: 'hood' },
  { labelHe: 'פלורנטין', lat: 32.058, lon: 34.7707, size: 'hood' },
  { labelHe: 'שכונת שפירא', lat: 32.0525, lon: 34.7767, size: 'hood' },
  { labelHe: 'נווה שאנן', lat: 32.0558, lon: 34.7797, size: 'hood' },
  { labelHe: 'שכונת התקווה', lat: 32.0505, lon: 34.7932, size: 'hood' },
  { labelHe: 'יד אליהו', lat: 32.058, lon: 34.7882, size: 'hood' },
  { labelHe: 'עג׳מי', lat: 32.048, lon: 34.7537, size: 'hood' },
  { labelHe: 'רמת אביב', lat: 32.1125, lon: 34.7932, size: 'hood' },

  { labelHe: 'נמל תל אביב', lat: 32.0985, lon: 34.7752, size: 'spot' },
  { labelHe: 'גני יהושע', lat: 32.0988, lon: 34.7998, size: 'spot' },
  { labelHe: 'גן העצמאות', lat: 32.0908, lon: 34.7714, size: 'spot' },
  { labelHe: 'כיכר דיזנגוף', lat: 32.0797, lon: 34.7744, size: 'spot' },
  { labelHe: 'גן מאיר', lat: 32.0745, lon: 34.7724, size: 'spot' },
  { labelHe: 'כיכר מגן דוד', lat: 32.0666, lon: 34.7712, size: 'spot' },
  { labelHe: 'מגדל שלום', lat: 32.0592, lon: 34.7699, size: 'spot' },
  { labelHe: 'פארק צ׳ארלס קלור', lat: 32.0628, lon: 34.759, size: 'spot' },
  { labelHe: 'יפו העתיקה', lat: 32.0532, lon: 34.7521, size: 'spot' },
  { labelHe: 'נמל יפו', lat: 32.0523, lon: 34.7497, size: 'spot' },
]
