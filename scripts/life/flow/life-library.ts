/**
 * LIFE's picture order for Google Flow (owner, 23.11.2026: use Flow wherever it makes LIFE more real — the streets of
 * Athens and Tel Aviv, grounds that recall the originals, the story tied to what is seen). Rule life-flow-art.
 *
 *   node --import tsx scripts/life/flow/life-library.ts            # writes scripts/life/flow/life-library.json
 *   node --import tsx scripts/life/flow/life-library.ts --check    # writes nothing, exits 1 when the file is stale
 *
 * The hourly Flow operator sends this file's `pieces` with its queue request (docs/fanlife/70 §LIFE) and draws the ones
 * not yet stored at library/life/<stem>.png, lowest `priority` first. It is a SEPARATE order from the films' art library
 * (studio/cinema/flow_library.json): other stems, another folder, never recoloured, photoreal rather than comic print.
 *
 * What a prompt may say about a real ground: its well-known architectural character in general terms, and only for a
 * club whose pack names the ground (club-packs/<id>/world.json → ground.name) — the name a description was written for
 * is kept here, never in the prompt, and when the pack no longer names that ground the plate falls back to a neutral
 * city ground (`confidence:'generic'`). No prompt carries a club, a ground, a person or a brand by name.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {STATIC_CLUB_IDS} from '../../../lib/clubs/resolver-ids'
import {castStem, CLUB_TOWN, LIFE_CAST, LIFE_PEOPLE, type LifeCast, type LifeLibrary, type LifePeople, type LifePiece, type LifeTown} from '../../../lib/life/flowArtSpec'

export const OUT = 'scripts/life/flow/life-library.json'
export const VERSION = 1

export const STYLE = 'Photorealistic cinematic environment for a modern open-world game: blue-hour dusk after rain, wet reflective ground wherever ground shows, warm amber-orange street lamps, natural colour, high detail.'
export const NEGATIVES = 'No text, no letters, no numbers, no signs with writing, no logos, no crests, no sponsor marks, no advertising, no flags, no real person\'s likeness, no yellow paint and no yellow clothing.'

const FACADE = 'Strictly front-on orthographic elevation of this ONE building, flat and straight like an architect\'s elevation rendered as a photograph: no perspective, no vanishing point, no side walls, no sky, no street, no pavement, no people, no vehicles, nothing in front of it. The building fills the square frame from edge to edge on all four sides, roof line at the top edge and ground-floor shop fronts with closed roller shutters and blank fascias at the bottom edge, so the picture can be mapped onto a box. Evenly lit at dusk, some windows glowing warm and others dark. Muted natural materials only: off-white, beige, grey, stone, weathered wood, dark metal; no saturated red, green or blue surfaces.'
const STADIUM = 'Exterior establishing view on a match evening from street level about 150 metres away: the ground rises at the end of the street beyond the last buildings, floodlights on and glowing in the haze, wet street in the foreground, a few supporters far off seen only from behind. Seats, cladding and trim in neutral grey and bare concrete unless the description says otherwise. The building carries no name, no scoreboard and no banners.'
const SKYLINE = 'Very wide panoramic backdrop for a sky dome: the horizon sits in the lower third, the bottom of the frame is one continuous band of distant roofs in silhouette and soft haze, the upper two thirds are a dusk sky from deep blue to a last warm band at the horizon with thin broken cloud. The glow of one football ground\'s floodlights rises somewhere among the roofs. No foreground objects and no people; the left and right edges are calm so the picture can wrap.'
const AERIAL = 'Straight-down aerial view, camera pointing vertically at the ground, no horizon and no tilt, of a dense neighbourhood about 600 metres across at dusk: readable street grid, block roofs, one small square, lit streets with warm lamps and shining wet asphalt, and a football ground with its pitch and glowing floodlights in ONE corner of the square frame. Clean and legible like the base art of a game\'s district map, photoreal materials.'
const STORY = 'A quiet story moment of an ordinary supporter\'s childhood, timeless (no phones, no screens). Any person is seen only from behind or far away, never a face. Clothes in plain muted colours; a scarf, where there is one, is plain cream-white wool.'

const say = (subject: string, frame: string) => `${subject} ${frame} ${STYLE} ${NEGATIVES}`

// ── the key people (owner, 28.11.2026) ─────────────────────────────────────────────────────────────────────────────
// A person is not an environment: his portrait has its own light and its own frame. Every one is an invented face;
// the street's lamp is the key light, so he sits in the game's dusk without a wet street behind him.
export const CAST_STYLE = 'Photorealistic cinematic character portrait for a modern open-world game: 85 mm lens, a soft warm amber-orange key light from one side as from a street lamp at dusk and a cool blue fill from the other, natural colour, high detail.'
const CAST = 'Waist-up portrait of ONE invented person who resembles no real individual and no known face, the body turned three-quarters and the eyes just past the lens, alone against a plain flat even mid-grey studio backdrop with nothing else in the frame. An unposed, caught expression, the way a documentary photographer finds people, never a model\'s smile. Real skin with pores and small asymmetries, real hair, real worn fabric with creases. The ordinary clothes of a working neighbourhood in the 1980s: plain and muted, no print, no stripes, no pattern, no badge.'
const PEOPLE: Record<LifePeople, string> = {
  med: 'A person of an eastern-Mediterranean port city: olive to light-brown skin, dark hair, dark eyes.',
  north: 'A person of a northern European industrial city: fair skin that reddens in the cold, light-brown to dark hair, grey or blue eyes.',
  maghreb: 'A person of a North African coastal city: light-brown to brown skin, dark hair, dark eyes.',
}
const CAST_WHO: Record<LifeCast, string> = {
  boy: 'A boy of about eight: short untidy hair, a gap where a milk tooth has gone, wide curious eyes that miss nothing, a plain cream T-shirt a size too big, a scraped elbow.',
  teen: 'A boy of about fifteen: hair grown long and pushed off the forehead, the first shadow on the upper lip, a guarded half-smile, a plain grey zip tracksuit top over a white T-shirt.',
  man: 'A man of about twenty-eight: short hair, two days of stubble, tired kind eyes, broad shoulders a little rounded by work, a plain dark denim jacket over a grey T-shirt.',
  father: 'A working man of about thirty-eight: a thick dark moustache, deep laugh lines, strong forearms, a short-sleeved off-white work shirt open at the collar over a white vest, a plain cream-white wool scarf laid over one shoulder.',
  mother: 'A woman of about thirty-five: dark hair tied back loosely with strands come free, warm steady eyes, small silver earrings, a plain blue-grey house dress under an open knitted cardigan.',
  mate: 'A small wiry boy of about eight: cropped hair, ears that stick out, a wide cheeky grin, a sticking plaster on the chin, a faded plain blue T-shirt.',
  kiosk: 'A kiosk keeper of about sixty: a grey moustache, reading glasses pushed up on the forehead, a pencil behind one ear, a plain brown knitted waistcoat over a pale shirt with the sleeves rolled.',
  neighbour: 'A woman of about seventy: white hair pinned up, a deeply lined face that has smiled a great deal, a dark plain housecoat with a grey cardigan over the shoulders.',
  grandfather: 'A man of about seventy-five: a dark flat cap, white stubble, pale watering eyes, a heavy dark wool jacket over a buttoned shirt, a plain cream-white wool scarf.',
}
const sayCast = (people: LifePeople, who: LifeCast) => `${CAST_WHO[who]} ${PEOPLE[people]} ${CAST} ${CAST_STYLE} ${NEGATIVES}`

// ── a · facades, per town: [key, the building] ─────────────────────────────────────────────────────────────────────
const FACADES: Record<LifeTown, string[]> = {
  ath: [
    'A six-storey Athenian apartment block of the 1960s (a polykatoikia): white-grey rendered concrete, a continuous balcony across every floor with thin metal railings and faded off-white canvas awnings, potted plants, a marble-framed entrance, rooftop aerials and solar boilers along the roof line.',
    'A three-storey interwar Athens town house: tall windows with wooden louvred shutters, small wrought-iron balconies, a moulded cornice with clay antefixes, faded stucco, a coffee-house front with folding metal shutters below.',
    'A four-storey 1950s block of a Greek port district: narrow balconies with plain iron railings, salt-weathered render, a stairwell lit behind frosted glass, wide workshop shutters at street level.',
    'A seven-storey Athenian apartment block of the 1980s: deep balconies with plain beige awnings, a set-back top floor, air-conditioner units, a glazed stair core, laundry racks, rooftop solar boilers.',
    'A low two-storey Athenian neighbourhood house of the 1920s: a clay-tile roof edge, shuttered windows, one small balcony over the door, a taverna front with closed wooden shutters and stacked chairs behind glass.',
  ],
  tlv: [
    'A three-storey white International Style apartment house of 1930s Tel Aviv: smooth white render gone grey with sea air, long horizontal balconies with rounded ends and solid parapets, a tall vertical stair window, flat roof.',
    'A four-storey Israeli public-housing block of the 1950s (a shikun): plain plaster, rows of small balconies closed with slatted plastic shutters, air-conditioner units and loose cables, white solar-boiler tanks along the flat roof.',
    'A two-storey old Jaffa building of pale sandstone: pointed and round-arched windows with wooden shutters, a small iron balcony, heavy metal workshop doors at street level.',
    'A three-storey eclectic 1920s house of south Tel Aviv: peeling render, small balconies with ornamental iron railings, tall narrow windows with shutters, ground-floor shops behind roller shutters.',
    'A five-storey 1970s Tel Aviv apartment block: exposed concrete frame, balconies enclosed with sliding slatted shutters, concrete sun-breakers, an open pillared ground floor closed by shop shutters, solar boilers on the roof.',
  ],
  mos: [
    'A two-storey old Herzegovinian stone house: rough pale limestone walls, a roof edge of heavy stone slabs, small windows with wooden shutters, a projecting timber upper bay, a craftsman\'s shop front with a wooden shutter.',
    'A three-storey Austro-Hungarian town house of a Balkan river town: rendered facade with pilasters and a deep cornice, tall double windows, worn plaster, shop fronts with roller shutters.',
    'A five-storey socialist-era apartment block of a Balkan town: grey concrete panels, recessed loggias with laundry, weathered render, a small grocery front with a closed shutter.',
  ],
  eur: [
    'A four-storey nineteenth-century European town house: rendered front, tall sash windows, a slate roof edge with dormers, a shop front with a closed shutter.',
    'A five-storey post-war European apartment block: plain grey render, recessed loggias, a flat roof edge, a row of small shops with roller shutters.',
    'A two-storey European corner bar building in worn dark brick: frosted windows glowing from inside, a blank fascia, closed cellar doors, a tiled roof edge.',
    'An old European workshop and warehouse front: soot-dark brick, large metal-framed windows, two big sliding metal doors, a hoist beam under the eaves.',
  ],
  gla: [
    'A four-storey Glasgow sandstone tenement: weathered stone, bay windows stacked above each other, a narrow close entrance, chimney stacks along the roof line, shop fronts with roller shutters.',
    'A four-storey Glasgow tenement of pale blond sandstone with a corner-pub front at street level: frosted glass glowing, a blank fascia, tall sash windows above, slate roof edge.',
  ],
  ham: [
    'A five-storey turn-of-the-century Hamburg apartment house: pale stucco front with moulded window surrounds, tall double windows, small balconies with iron railings, a bar front with a closed shutter.',
    'A five-storey Hamburg housing block of the 1920s in dark clinker brick: white window frames in long rows, a rounded stair bay, a flat roof edge, small shop fronts with shutters.',
  ],
  bgo: [
    'A four-storey Lombard town house: warm grey and faded terracotta-pink render, tall windows with grey wooden louvred shutters, a stone-arched arcade at street level with closed shop shutters, a clay-tile roof edge.',
    'A six-storey Italian apartment block of the 1960s: long balconies with thin railings, roller blinds half down, small ceramic-tile cladding in grey, shop fronts with shutters.',
  ],
  cas: [
    'A five-storey white Art Deco apartment block of 1930s Casablanca: rounded balconies, wrought-iron grilles, geometric stucco bands, an arcaded shop level with closed metal shutters.',
    'A three-storey whitewashed Moroccan town house at the edge of an old quarter: carved wooden window screens, a tiled horseshoe-arched doorway, small shop fronts with wooden shutters.',
  ],
  cai: [
    'A five-storey Belle Époque apartment building of downtown Cairo: dusty beige stone and stucco, tall shuttered windows, iron balconies, worn mouldings, shop fronts with roller shutters.',
    'A seven-storey plain Cairo apartment block: sand-coloured concrete frame with brick infill, small balconies with laundry, air-conditioner units, satellite dishes along the roof, workshop shutters below.',
  ],
  hfa: [
    'A three-storey 1930s apartment house of an Israeli port city on a mountain slope: rough-cut pale limestone cladding, deep shaded balconies, a tall stair window, flat roof with solar boilers.',
    'A four-storey Israeli public-housing block of the 1960s: plaster and exposed concrete, balconies closed with slatted shutters, air-conditioner units, solar-boiler tanks on the roof, small shops behind shutters.',
  ],
  ist: [
    'A five-storey Istanbul apartment house of the 1960s on the Asian shore: pastel render, deep balconies with iron railings and striped awnings, bay windows stacked above a corner shop behind a roller shutter, satellite dishes at the roof edge.',
    'A three-storey old wooden Istanbul town house: weathered dark timber boards, a projecting upper bay on wooden brackets, tall narrow windows with shutters, a stone base with a workshop door.',
  ],
  beg: [
    'A four-storey interwar Belgrade apartment house: grey rendered facade with simple modernist lines, rounded corner balconies, tall double windows, a ground-floor bakery front with a closed shutter.',
    'A long socialist-era Belgrade housing block: raw concrete panels, rows of recessed loggias with laundry and added glazing, a flat roof edge with aerials, a kiosk and small shops along the base.',
  ],
  ptk: [
    'A three-storey Israeli housing block of the 1950s in a town of the coastal plain: plain plaster, small balconies with slatted plastic shutters, solar boilers on the flat roof, a grocery front with a roller shutter.',
    'A two-storey old colony house of an Israeli farming town: thick plastered walls, a clay-tile roof edge, wooden shutters, a veranda upstairs, a shop front with a closed wooden shutter.',
  ],
}

// ── a2 · street modules for the towns the owner asked for first (24.11.2026: "the feeling of a real city"): the ground
// floors and pieces the street still lacked, each its own front-on picture the renderer lays over the foot of a building,
// beside it, or as a whole building (look/flowStreet.ts reads the key: shop/cafe over a ground floor; corner and pilotis as
// buildings; kiosk and balcony kept for their own placement). Same frame rules as a facade; the key is a word, not a number.
const MODULE = 'Strictly front-on orthographic elevation, flat and straight like an architect\'s elevation rendered as a photograph: no perspective, no vanishing point, no side walls, no sky, no street, no pavement, no vehicles, nothing in front of it. The subject fills the square frame from edge to edge. Dusk light, warm light from inside where there is an inside. Every fascia, awning and shutter is blank. Muted natural materials only: off-white, beige, grey, stone, weathered wood, dark metal; no saturated red, green or blue surfaces.'
const MODULES: {town: LifeTown; key: string; priority: number; subject: string}[] = [
  {town: 'ath', key: 'shop1', priority: 1, subject: 'The ground floor of an Athenian apartment block, one small neighbourhood shop: a wide glazed front with its grey metal roller shutter pulled half down, warm light from inside on plain shelves of unlabelled goods and a counter, a marble step and a marble-clad pillar on each side, a blank fascia above.'},
  {town: 'ath', key: 'kiosk', priority: 1, subject: 'An Athenian street kiosk seen straight from the front: a small metal booth with a deep overhanging roof, its front window crowded with racks of magazines and newspapers whose covers are blank and colourful, a wall of small cigarette packs without markings, a glass-door drinks fridge glowing beside it, papers pegged along the edges, lit from inside like a lantern.'},
  {town: 'ath', key: 'cafe', priority: 2, subject: 'The ground floor of an old Athenian neighbourhood coffee house: tall glazed doors folded open, warm light inside on small marble tables and wooden chairs, a long counter at the back, an empty pavement edge in front, a plain canvas awning rolled out above.'},
  {town: 'ath', key: 'corner', priority: 1, subject: 'A five-storey Athenian corner apartment block of the 1970s seen straight on its rounded, chamfered corner: continuous balconies wrapping the corner on every floor with thin metal railings and striped canvas awnings let down half way, plants in pots, a shop with a half-down shutter at the foot of the corner.'},
  {town: 'ath', key: 'balcony', priority: 2, subject: 'A strip of three floors of an Athenian apartment block, only the balconies: continuous concrete balcony slabs with thin metal railings, retractable striped canvas awnings in faded off-white and grey-blue pulled out at different lengths, potted plants, a folded chair, laundry on a rack.'},
  {town: 'tlv', key: 'shop1', priority: 1, subject: 'The ground floor of a Tel Aviv apartment house, a small neighbourhood grocery: a narrow glazed front with its metal roller shutter half down, warm light inside on plain shelves of unlabelled goods, crates of fruit on a low stand by the door, a blank fascia above, the plaster stained above the door.'},
  {town: 'tlv', key: 'kiosk', priority: 1, subject: 'A Tel Aviv street kiosk built into the front of an old building, seen straight on: a hatch window under a short metal canopy, glowing fridges of drinks, racks of sweets and newspapers with blank covers, plastic crates stacked to one side, lit from inside.'},
  {town: 'tlv', key: 'cafe', priority: 2, subject: 'The ground floor of a white Tel Aviv apartment house turned into a small café: wide glazed doors opened, warm light inside on small round tables and bentwood chairs, a counter with a coffee machine shape at the back, a plain canvas awning above.'},
  {town: 'tlv', key: 'pilotis', priority: 1, subject: 'A three-storey white International Style apartment house of 1930s Tel Aviv raised on round concrete columns (pilotis): the open ground floor is a shaded space between the columns with a bare bulb, bicycles leaning on a column and the dark floor of the yard behind; above it long horizontal ribbon windows, balconies with rounded ends and solid parapets, slatted shutters half down, a flat roof edge.'},
  {town: 'tlv', key: 'balcony', priority: 2, subject: 'A strip of three floors of a white Bauhaus apartment house in Tel Aviv, only the balconies: long horizontal balconies with rounded ends and solid rendered parapets, slatted plastic roller shutters at different heights behind them, an air-conditioner unit, plants in pots.'},
]

// ── b · the grounds: what each club's own ground recalls. `for` is the pack's ground name the lines were written for.
type Ground = {for: string; plates: string[]}
const GROUNDS: Record<string, Ground> = {
  'olympiacos': {for: 'Karaiskakis Stadium', plates: [
    'A modern all-seater football ground in a Mediterranean port district: a tight rectangular bowl under one continuous roof hung from a ring of tall exposed red-painted steel masts and trusses standing outside the stands like ribs. An elevated urban railway and its station run beside it and the harbour lights are close behind.',
    'A modern football ground seen across a wide wet forecourt from the coast-road side: the ring of tall red-painted steel roof masts catches the floodlight, the roof edge glows, port cranes and the lights of ferries stand on the horizon behind.',
  ]},
  'panathinaikos': {for: 'Leoforos', plates: [
    'An old, compact concrete city football ground squeezed into a dense district of six-storey apartment blocks on a wide avenue: weathered stands rise straight from the pavement with small shop and office fronts built under them, a roof over one side only, tall floodlight masts above the rooftops, a steep wooded hill behind the neighbourhood.',
    'The back wall of an old concrete city football ground seen along the avenue pavement: raw concrete stairs and metal gates closed between the pillars, the underside of the terrace overhead, apartment balconies facing it across the avenue, floodlight masts above.',
  ]},
  'aek-athens': {for: 'Agia Sophia Stadium', plates: [
    'A new, fully enclosed football arena in a low-rise residential suburb beside a wooded park: the outer wall is clad in pale stone-coloured panels with tiers of round-arched openings between buttress-like piers, recalling old Byzantine city walls; light from inside glows through the arches under a flat roof ring.',
    'A narrow residential street of two- and three-storey houses and small trees leading straight to a new football arena: its pale stone-coloured wall of round arches and piers fills the end of the street, glowing from within.',
  ]},
  'hapoel-tel-aviv': {for: 'Bloomfield Stadium', plates: [
    'A renovated rectangular football ground in the low southern quarter of a Mediterranean city, near an old port town: four straight stands close to the pitch under a continuous flat cantilever roof with lights along its edge, pale concrete and perforated metal outer walls, low workshops, garages and three-storey apartment blocks with solar boilers around it, palm trees.',
    'The same ground as a father remembers it decades earlier: open concrete terraces without a roof and four tall lattice floodlight pylons at the corners standing over low workshops and three-storey apartment blocks with solar boilers, old parked cars, a dusty street after rain.',
  ]},
  'celtic': {for: 'Celtic Park', plates: [
    'A very large football ground towering over the sandstone tenement streets of the east end of a northern industrial city: three huge two-tier stands under a pale steel cantilever roof with exposed trusses, and an older, lower main stand with a red-brick front, at the end of a long straight road.',
  ]},
  'st-pauli': {for: 'Millerntor-Stadion', plates: [
    'A compact city-centre football ground of four steep straight stands in dark brick and steel at the edge of a wide open fairground field: a massive windowless wartime concrete bunker tower looms beside it, a ferris wheel turns far off and the lights of an entertainment district glow behind.',
  ]},
  'partizan-belgrade': {for: 'Partizan Stadium', plates: [
    'A large post-war oval football ground with a running track around the pitch: long open concrete terraces sweep round both ends, a single roofed main stand runs along one side, and tall floodlight towers stand over a leafy residential district of a hilly Balkan capital.',
  ]},
  'zrinjski-mostar': {for: 'Stadion pod Bijelim Brijegom', plates: [
    'An open, low mid-century football ground on the west bank of a Balkan river town, lying at the foot of a pale bare rocky hill: plain concrete stands, floodlight masts, stone and rendered houses on the streets around it.',
  ]},
  'hapoel-petah-tikva': {for: 'HaMoshava Stadium', plates: [
    'A small modern football ground at the edge of an Israeli town\'s business district: two roofed stands along the sides and open ends, clean concrete and metal, glass office blocks behind, wide car parks shining after rain.',
  ]},
}
/** A ground the pack does not name gets no claim about its look: a neutral city ground in the town's own streets. */
const STREETS: Record<LifeTown, string> = {
  ath: 'white six-storey apartment blocks with awninged balconies', tlv: 'low white apartment blocks with solar boilers and palm trees',
  mos: 'stone and rendered houses under a bare hill', eur: 'rendered town houses and brick workshops',
  gla: 'sandstone tenements with chimney stacks', ham: 'dark brick housing blocks and stucco apartment houses',
  bgo: 'Lombard town houses with shutters and clay-tile roofs under the foothills', cas: 'white apartment blocks along a palm-lined boulevard',
  cai: 'tall sand-coloured apartment blocks with balconies and satellite dishes', hfa: 'limestone and plaster apartment blocks stepping up a wooded slope',
  ptk: 'three-storey plaster housing blocks with solar boilers',
  ist: 'pastel apartment houses with awninged balconies on a street sloping to the water', beg: 'grey interwar apartment houses and long concrete housing blocks',
}
const GENERIC_VIEW = ['seen along the main road', 'seen from a narrow side street']

// ── c · skyline and district, per town ─────────────────────────────────────────────────────────────────────────────
const TOWNS: {town: LifeTown; skyline: string; district: string}[] = [
  {town: 'ath', skyline: 'Athens at dusk: a sea of white flat-roofed apartment blocks with rooftop aerials and solar boilers, a rocky hill crowned by a pale ancient colonnade far off, a second steep wooded hill with a tiny chapel on top, bare mountains behind.', district: 'An Athenian neighbourhood: tight blocks of flat-roofed apartment buildings with roof terraces and solar boilers, narrow one-way streets lined with small trees, a wide avenue along one side.'},
  {town: 'tlv', skyline: 'Tel Aviv and Jaffa at dusk: low white flat roofs with solar boilers and water tanks, a cluster of glass towers far off, an old port town on a low headland with a stone bell tower, the sea horizon to one side, palm tops.', district: 'A south Tel Aviv and Jaffa neighbourhood: low flat-roofed blocks with solar boilers, workshop yards and garages, a small square with palm trees, a wide boulevard along one side.'},
  {town: 'mos', skyline: 'Mostar at dusk: stone houses with slab roofs on both banks of a river gorge, one high single-arched old stone bridge, slender tower silhouettes, a pale bare rocky hill and mountains behind.', district: 'A Mostar neighbourhood on the west bank: stone-roofed old houses and socialist-era blocks, a tree-lined avenue, the river gorge cutting one edge of the frame.'},
  {town: 'gla', skyline: 'Glasgow at dusk: rows of tenement roofs with chimney stacks, church spires, tall shipyard cranes by a river far off, low hills under heavy cloud.', district: 'An east-end Glasgow neighbourhood: long straight streets of tenement blocks with back courts, a railway line, a small park.'},
  {town: 'ham', skyline: 'Hamburg at dusk: harbour cranes along a wide river, slender church spires, brick warehouse roofs, a tall telecom tower, a ferris wheel.', district: 'A Hamburg harbour-side neighbourhood: perimeter blocks with inner courtyards, a wide entertainment street, a big open fairground field.'},
  {town: 'bgo', skyline: 'Bergamo at dusk: a walled old upper town on a hill with domes and bell towers, the clay-tile roofs of the lower town below it, the first Alpine foothills behind.', district: 'A lower-town Bergamo neighbourhood: clay-tile roofs around courtyards, tree-lined avenues, a small piazza.'},
  {town: 'cas', skyline: 'Casablanca at dusk: white flat-roofed blocks and Art Deco towers, a very tall square minaret by the ocean, palm tops, Atlantic haze.', district: 'A central Casablanca neighbourhood: white Art Deco blocks on a radial street plan, palm-lined boulevards, a small market square.'},
  {town: 'cai', skyline: 'Cairo at dusk: dense sand-coloured blocks to the horizon, many minarets and domes, a wide river with bridges, a slender lattice tower, desert haze.', district: 'A Cairo neighbourhood: tall close-packed apartment blocks, a wide avenue with a central reservation, narrow lanes, a small garden square.'},
  {town: 'hfa', skyline: 'Haifa at dusk: a city stepping down a wooded mountain ridge to a wide bay, port cranes, a domed shrine above terraced gardens on the slope, industrial chimneys far around the bay.', district: 'A Haifa neighbourhood on the slope: winding contour streets, stepped lanes between limestone and plaster blocks, pine trees.'},
  {town: 'ist', skyline: 'Istanbul seen from its Asian shore at dusk: apartment blocks stepping down to a wide strait, ferries crossing, a low headland opposite with domes and slender minarets in silhouette, gulls, a long suspension bridge far off.', district: 'A neighbourhood on Istanbul\'s Asian shore: tight blocks of apartment houses on sloping streets, a busy market lane, a ferry pier and a tree-lined seafront along one edge.'},
  {town: 'beg', skyline: 'Belgrade at dusk: a city on a ridge above the meeting of two wide rivers, an old stone fortress on the bluff, a large domed church, long concrete housing blocks on the far bank, bridges.', district: 'A Belgrade neighbourhood on a wooded hill: villas and apartment houses on winding streets, a wide boulevard, a park, long housing blocks at the foot of the slope.'},
  {town: 'ptk', skyline: 'An Israeli town of the coastal plain at dusk: low plaster apartment blocks with solar boilers, a few glass office towers, an old water tower, dark lines of citrus groves at the edge.', district: 'A neighbourhood of an Israeli town of the coastal plain: rows of long housing blocks with gardens between, a main shopping street, a small park.'},
]

// ── d · the childhood chapters (docs/life/LIFE-STORY-FLOW-2026-11-23.md §6; lib/life/hood/story/childhood.ts) ───────
const STORIES: {key: string; chapter: string; priority: number; scene: string}[] = [
  {key: 'first-walk', chapter: 'the-way-in', priority: 1, scene: 'The first walk to the ground: a father and a small child seen from behind, hand in hand in the middle of a wet street, walking with a thin crowd towards a football ground whose floodlights blaze in the haze at the end of the street.'},
  {key: 'kitchen-radio', chapter: 'first-noise', priority: 1, scene: 'A small family kitchen at night: an old transistor radio with a glowing dial on an oilcloth-covered table, two empty chairs pulled close to it, a glass of tea, and through the window the floodlight glow of a football ground far over the roofs. Nobody in the room.'},
  {key: 'kiosk-night', chapter: 'six-short', priority: 2, scene: 'A street-corner kiosk at night, lit from inside like a lantern: racks of newspapers and sweets with blank covers, stacked bottle crates beside it, a child seen from behind counting coins on the counter ledge.'},
  {key: 'the-box', chapter: 'the-box', priority: 2, scene: 'A worn cardboard box of keepsakes open on a bed under a lamp: a folded plain scarf, a faded football shirt without any marking, half a torn blank ticket, a sticker album with a blank cover, a strip of painted cloth, a short piece of wire fence. Nobody in the room.'},
  {key: 'crossing', chapter: 'first-noise', priority: 3, scene: 'A jammed street crossing on a match evening seen from a child\'s height: the backs of a crowd pressing forward between stopped cars, floodlight glow over the roofs ahead, breath and drizzle in the lamp light.'},
  {key: 'school-gate', chapter: 'missing-square', priority: 3, scene: 'A school gate after the bell: iron railings, a wet yard, and far off a huddle of children seen from behind swapping football stickers from their open hands.'},
  {key: 'the-fence', chapter: 'no-ticket', priority: 3, scene: 'The back of a football ground at night: a tall wire fence with one bent gap at the bottom, weeds and a puddle, the underside of a concrete terrace beyond it and floodlight pouring over the top.'},
  {key: 'empty-seat', chapter: 'her-seat', priority: 3, scene: 'Inside a football stand before the crowd arrives: one empty seat in a long row with a folded plain scarf laid on it, the wet pitch and the floodlights soft beyond.'},
  {key: 'banner-yard', chapter: 'the-banner', priority: 3, scene: 'A dusty neighbourhood kickabout pitch at dusk: a long plain cloth banner spread on the ground with paint pots and brushes beside it, painted only in broad plain stripes, and two children far off seen from behind holding its ends.'},
]

const ATHENS_AND_TEL_AVIV: LifeTown[] = ['ath', 'tlv']
const FOUR = ['hapoel-tel-aviv', 'olympiacos', 'panathinaikos', 'aek-athens']
const NEXT_GROUNDS = ['zrinjski-mostar', 'celtic', 'st-pauli', 'atalanta']
const two = (n: number) => String(n).padStart(2, '0')
const groundName = (root: string, club: string): string | null => {
  const f = join(root, 'club-packs', club, 'world.json')
  if (!existsSync(f)) return null
  const name = (JSON.parse(readFileSync(f, 'utf8')) as {ground?: {name?: unknown}}).ground?.name
  return typeof name === 'string' ? name : null
}

export function buildLifeLibrary(root = process.cwd()): LifeLibrary {
  const pieces: LifePiece[] = []
  // a · facades
  for (const [town, list] of Object.entries(FACADES) as [LifeTown, string[]][]) list.forEach((building, i) => {
    const main = ATHENS_AND_TEL_AVIV.includes(town)
    pieces.push({stem: `life-facade-${town}-${two(i + 1)}-fl1`, aspect: '1:1', use: 'facade', town, priority: main ? (i < 3 ? 1 : 2) : town === 'mos' || town === 'eur' ? 2 : 4, prompt: say(building, FACADE)})
  })
  // a2 · street modules
  for (const m of MODULES) pieces.push({stem: `life-facade-${m.town}-${m.key}-fl1`, aspect: '1:1', use: 'facade', town: m.town, priority: m.priority, prompt: say(m.subject, MODULE)})
  // b · one ground per core club, two for the four
  const generic = new Map<LifeTown, number>()
  for (const club of STATIC_CLUB_IDS) {
    const town = CLUB_TOWN[club]
    if (!town) throw new Error(`life-library: ${club} has no town in lib/life/flowArtSpec.ts → CLUB_TOWN`)
    const g = GROUNDS[club], known = !!g && groundName(root, club) === g.for, four = FOUR.includes(club)
    if (known) g.plates.slice(0, four ? 2 : 1).forEach((plate, i) => pieces.push({stem: `life-stadium-${club}-${'ab'[i]}-fl1`, aspect: '16:9', use: 'stadium', club, town, confidence: 'specific', priority: four ? i + 1 : NEXT_GROUNDS.includes(club) ? 2 : 3, prompt: say(plate, STADIUM)}))
    else for (let i = 0; i < (four ? 2 : 1); i++) {
      const n = generic.get(town) ?? 0
      generic.set(town, n + 1)
      pieces.push({stem: `life-stadium-${club}-${'ab'[i]}-fl1`, aspect: '16:9', use: 'stadium', club, town, confidence: 'generic', priority: four ? i + 1 : NEXT_GROUNDS.includes(club) ? 2 : 3, prompt: say(`A city football ground with tall floodlights and plain concrete stands, ${GENERIC_VIEW[n % GENERIC_VIEW.length]} among ${STREETS[town]}.`, STADIUM)})
    }
  }
  // c · skyline and district aerial, per town
  for (const t of TOWNS) {
    const main = ATHENS_AND_TEL_AVIV.includes(t.town)
    pieces.push({stem: `life-skyline-${t.town}-fl1`, aspect: '16:9', use: 'skyline', town: t.town, priority: main ? 1 : t.town === 'mos' ? 2 : 4, prompt: say(t.skyline, SKYLINE)})
    pieces.push({stem: `life-aerial-${t.town}-fl1`, aspect: '1:1', use: 'aerial', town: t.town, priority: main ? 2 : t.town === 'mos' ? 3 : 5, prompt: say(t.district, AERIAL)})
  }
  // d · story plates
  // the key people: the first clubs' part of the world first, the family before the street
  LIFE_PEOPLE.forEach((people, pi) => LIFE_CAST.forEach((who, wi) => pieces.push({stem: castStem(people, who), aspect: '1:1', use: 'cast', people, who, priority: pi === 0 ? (wi < 6 ? 1 : 2) : pi + 1, prompt: sayCast(people, who)})))
  for (const s of STORIES) pieces.push({stem: `life-story-${s.key}-fl1`, aspect: '16:9', use: 'story', chapter: s.chapter, priority: s.priority, prompt: say(s.scene, STORY)})
  // the operator draws the most valuable first; inside one priority the order above holds
  const ordered = pieces.map((p, i) => ({p, i})).sort((a, b) => a.p.priority - b.p.priority || a.i - b.i).map(x => x.p)
  return {version: VERSION, style: STYLE, negatives: NEGATIVES, pieces: ordered}
}

export const serialise = (lib: LifeLibrary) => JSON.stringify(lib, null, 1) + '\n'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = serialise(buildLifeLibrary()), check = process.argv.includes('--check')
  if (check) {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== text) { console.error(`${OUT} is stale: run node --import tsx scripts/life/flow/life-library.ts`); process.exit(1) }
    console.log(`${OUT} is current`)
  } else {
    writeFileSync(OUT, text)
    const n = buildLifeLibrary().pieces
    console.log(`${n.length} pieces → ${OUT}`)
  }
}
