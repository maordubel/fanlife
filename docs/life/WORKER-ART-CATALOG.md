# THE WORKER art for LIFE — catalog (24.11.2026)

Source: `maordubel/The-Worker` @ `15229a9`, every file under `public/life`, `public/uss`, `public/kits`, `public/og`, `public/video` (1993 files). Machine-readable: `lib/life/worker-art/catalog.json`. Rule: `docs/rules/life-worker-art.md`. Rebuilt by `scripts/life/worker-art/classify.py`. Game-size copies are written by `scripts/life/worker-art/import.ts` and listed in `lib/life/worker-art/imported.json`.

**Already in FAN LIFE:** `public/life/{art,film,transitions,opening,artefacts,docs,deck,share}` is a byte-identical mirror of THE WORKER, kept by the LIFE upstream import. Hapoel-only art is read from there and needs no copy.

## Counts

| class | files | meaning |
|---|---|---|
| `tlv` | 140 | usable for Tel Aviv and Israeli-city LIFE |
| `universal` | 419 | usable for every city after colour handling |
| `hapoel-only` | 1177 | Hapoel identity or canon: only inside Hapoel's own pack |
| `no` | 257 | not reusable |

| role | tlv | universal | hapoel-only | no |
|---|---|---|---|---|
| backdrop | 77 | 9 | 51 | 0 |
| doc | 6 | 1 | 156 | 9 |
| env-map | 13 | 7 | 6 | 0 |
| facade | 23 | 0 | 0 | 0 |
| film | 36 | 0 | 30 | 0 |
| fx | 0 | 8 | 0 | 0 |
| index | 0 | 0 | 0 | 4 |
| interior | 0 | 32 | 26 | 0 |
| portrait | 1 | 113 | 538 | 4 |
| prop | 14 | 73 | 381 | 7 |
| sfx | 12 | 132 | 2 | 4 |
| texture | 0 | 24 | 0 | 0 |
| title-card | 19 | 1 | 39 | 0 |
| ui | 0 | 29 | 2 | 0 |

**Blockers found** (files): `real-person` 239, `owner-muted-synth` 128, `yellow` 64, `provenance-unknown` 58, `club-red` 58, `real-stadium-shared-by-tlv-clubs` 57, `licence-unverified` 36, `hebrew-text` 28, `provenance-partial` 19, `sponsor-marks` 8, `trademark` 4, `third-party-print` 4, `licence` 4, `burned-filename-text` 1, `red-white-bunting` 1.

What they mean: `real-person` covers players and the cards, which are Hapoel-only. `owner-muted-synth` marks the 63 synthesised sounds, which THE WORKER stopped playing on 6.9.2026. `club-red` is red club décor to recolour to the club skin. `real-stadium-shared-by-tlv-clubs` is Bloomfield, home to more than one Tel Aviv club. `hebrew-text` is burned-in Hebrew signage, fine for Tel Aviv and wrong elsewhere. `sponsor-marks` covers real brands on boards and fridges. `licence-unverified` is the 1989 and 1995 films. `provenance-unknown` means confidence 0 in THE WORKER's asset-provenance, so the file is refused. `yellow` means yellow measured in the source; every imported copy is clean.

## Top picks for Tel Aviv (and Israeli cities)

| # | WORKER path | role | why |
|---|---|---|---|
| 1 | `public/life/art/allenbyShopsLate-wide.webp` | facade | Allenby shopfronts at last light, cars, wet asphalt: closest to the dusk target |
| 2 | `public/life/art/approach.webp` | backdrop | street with floodlight masts over the roofs: the approach shot |
| 3 | `public/life/art/bloomNewSea.webp` | backdrop | Bloomfield from the air with Jaffa and the sea: district-map base art |
| 4 | `public/life/art/bloomOldGates.webp` | facade | old Bloomfield gate block, turnstiles: stadium facade texture |
| 5 | `public/life/art/busStation.webp` | backdrop | wet bus station at blue hour: dusk, reflections, the trip to the ground |
| 6 | `public/life/art/busStopDan.webp` | backdrop | Dan bus stop with posters and newsstand |
| 7 | `public/life/art/introBeacon.webp` | title-card | Bloomfield lit at night over the city: title card and end-of-street stadium glow |
| 8 | `public/life/art/introReturnHome.webp` | backdrop | Bloomfield facade at night, reflections on wet plaza: end-of-street stadium |
| 9 | `public/life/art/jaffaAlleyCafe.webp` | backdrop | old stone alley with ficus canopy and newsstand |
| 10 | `public/life/art/kioskNight.webp` | facade | the kiosk on a wet night street: a stop in the hood |
| 11 | `public/life/art/panoBloomWalk3.webp` | env-map | Bloomfield undercroft street in 360: the walk to the ground, red barriers, floodlight mast |
| 12 | `public/life/art/panoCinema.webp` | env-map | Allenby cinema crossroads in 360: a whole Tel Aviv junction as sky/env for the hood |
| 13 | `public/life/art/panoJaffa.webp` | env-map | Jaffa street with tram tracks in 360: southern end of the city |
| 14 | `public/life/art/panoPromenade.webp` | env-map | sea promenade in 360, sepia: the 1980s seafront |
| 15 | `public/life/art/panoTamar.webp` | env-map | Bauhaus corner café block in 360: the city's signature facade line |

## Top picks for every city

| # | WORKER path | role | why |
|---|---|---|---|
| 1 | `public/life/art/classroom.webp` | interior | classroom with blackboard |
| 2 | `public/life/art/faceOldMan-story.webp` | portrait | old man telling a story |
| 3 | `public/life/art/faceTeacher.webp` | portrait | the teacher |
| 4 | `public/life/art/faceUsher.webp` | portrait | the steward |
| 5 | `public/life/art/faceVendor.webp` | portrait | the vendor |
| 6 | `public/life/art/faceWoman.webp` | portrait | a neighbour |
| 7 | `public/life/art/flatAway.webp` | interior | an apartment at night, lamp light: the evening before the match |
| 8 | `public/life/art/fxGrain.webp` | fx | film grain |
| 9 | `public/life/art/introFirstSight.webp` | title-card | the tunnel mouth opening on to the pitch: the universal "first sight" card |
| 10 | `public/life/art/kiosk.webp` | interior | kiosk interior counter, no brands |
| 11 | `public/life/art/kitchen.webp` | interior | kitchen backdrop, era-neutral |
| 12 | `public/life/art/living.webp` | interior | living room with TV and fan |
| 13 | `public/life/art/overlayHaze.webp` | fx | floodlight haze |
| 14 | `public/life/art/overlayMist.webp` | fx | low mist bank |
| 15 | `public/life/art/panoBloom24--tile.webp` | texture | stone paving tile with drain cover |

Imported: 55 picks (17.0 MB WebP) into `public/life/worker/{tlv,universal}/`: the 30 above plus `promenadeDusk-wide.webp`, `street.webp`, `docEggedLira.webp`, `docToto4085.webp`, `panoClassroom.webp`, `panoRoomBed.webp`, `panoRoomGrocery.webp`, `panoRoomKitchen--tile.webp`, `panoRoomKitchen.webp`, `panoRoomLiving--tile.webp`, `panoRoomLiving.webp`, `propAlbum.webp`, `propCassette.webp`, `propKeys.webp`, `propNewspaper.webp`, `propRadio.webp`, `propRedBox.webp`, `propScorePaper.webp`, `propSportsBag.webp`, `propTicketsPair.webp`, `schoolyard.webp`, `shopHanger.webp`, `texTunnelFloor.webp`, `texTunnelWall.webp`, `workshopFix.webp`. The panoramas are wide cylindrical strips (about 2.4:1), not 2:1 equirectangular, so map them on a cylinder or sky band, not a full sphere.

How each role fits the 3D hood: an **env-map** (360° pano) is wrapped on a cylinder or sky band behind a room or street. A **facade** is a texture for a hood block. A **backdrop** is an end-of-street stadium or skyline card. An **interior** sits behind a room. A **title-card** is a chapter card. A **texture** tiles a ground or wall. A **portrait** is a conversation face. **prop** and **doc** are keepsakes and papers. Street art was painted in daylight, so it needs `relight-dusk`: grade it to the dusk target in the shader, or use the night variants already picked.

## Full table by family

| family | files | class | town | roles | blockers | processing |
|---|---|---|---|---|---|---|
| `art/*--far` | 3 | tlv 2, hapoel-only 1 | tlv | backdrop, facade 2 |  | relight-dusk 2, webp 2 |
| `art/*--ground` | 105 | no | * |  | real-stadium-shared-by-tlv-clubs 19 |  |
| `art/*--mid` | 3 | tlv 2, hapoel-only 1 | tlv | backdrop, facade 2 |  | relight-dusk 2, webp 2 |
| `art/*--near` | 3 | tlv 2, hapoel-only 1 | tlv | backdrop, facade 2 |  | relight-dusk 2, webp 2 |
| `art/*--net` | 1 | universal | * | prop | club-red | webp |
| `art/*--sky` | 105 | no | * |  | real-stadium-shared-by-tlv-clubs 19 |  |
| `art/*--tile` | 18 | universal | * | texture | club-red 9 | tile, webp |
| `art/*--wet` | 1 | universal | * | prop |  | webp |
| `art/adult*` | 14 | universal | * | portrait |  | webp |
| `art/allenby*` | 8 | tlv | tlv | backdrop, facade 1 | hebrew-text, provenance-unknown 1 | relight-dusk, webp |
| `art/alley*` | 1 | tlv | tlv | backdrop |  | relight-dusk, webp |
| `art/amit*` | 32 | hapoel-only | tlv | portrait |  |  |
| `art/approach*` | 1 | tlv | tlv | backdrop |  | relight-dusk, webp |
| `art/arena*` | 2 | universal | * | backdrop 1, interior 1 |  | relight-dusk, webp |
| `art/army*` | 1 | tlv | tlv | backdrop |  | relight-dusk, webp |
| `art/asaf*` | 2 | hapoel-only | tlv | portrait |  |  |
| `art/barry*` | 12 | hapoel-only | tlv | portrait |  |  |
| `art/batya*` | 1 | hapoel-only | tlv | portrait | provenance-unknown |  |
| `art/bedroom*` | 3 | universal | * | interior | club-red | relight-dusk, webp |
| `art/benfica*` | 1 | hapoel-only | tlv | backdrop, title-card | provenance-unknown |  |
| `art/bf*` | 4 | universal 2, tlv 1, hapoel-only 1 | tlv 2, * 2 | prop 2, portrait 2 | club-red 1 | webp 3 |
| `art/bloom80*` | 1 | tlv | tlv | backdrop | hebrew-text, provenance-partial, real-stadium-shared-by-tlv-clubs, sponsor-marks | relight-dusk, webp |
| `art/bloom90*` | 2 | tlv | tlv | backdrop | hebrew-text, provenance-partial, real-stadium-shared-by-tlv-clubs, sponsor-marks | relight-dusk, webp |
| `art/bloomNew*` | 7 | tlv | tlv | backdrop | real-stadium-shared-by-tlv-clubs | relight-dusk, webp |
| `art/bloomOld*` | 7 | tlv | tlv | backdrop, facade 1 | real-stadium-shared-by-tlv-clubs | relight-dusk, webp |
| `art/botevgrad*` | 2 | hapoel-only | tlv | backdrop, title-card | provenance-unknown |  |
| `art/boy*` | 1 | no | * | portrait | provenance-unknown |  |
| `art/bus*` | 3 | tlv | tlv | backdrop | provenance-unknown 1, hebrew-text 1 | relight-dusk, webp |
| `art/classroom*` | 2 | universal | * | interior |  | relight-dusk, webp |
| `art/coin*` | 2 | no | * | prop | provenance-unknown |  |
| `art/community*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/corridor*` | 1 | universal | * | interior | club-red | relight-dusk, webp |
| `art/cu*` | 7 | hapoel-only 5, universal 2 | tlv 5, * 2 | portrait |  | webp 2 |
| `art/cup*` | 1 | hapoel-only | tlv | backdrop, title-card |  |  |
| `art/desk*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/doc*` | 11 | hapoel-only 10, no 1 | tlv 10, * 1 | doc | provenance-unknown 2 |  |
| `art/drive*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/efi*` | 27 | hapoel-only | tlv | portrait |  |  |
| `art/elimelech*` | 13 | hapoel-only | tlv | portrait | real-person |  |
| `art/em*` | 12 | universal | * | ui | club-red 1 | recolour-club, webp |
| `art/face*` | 123 | hapoel-only 91, universal 31, tlv 1 | tlv 92, * 31 | portrait | real-person 15, provenance-unknown 1 | webp 32 |
| `art/fan*` | 7 | hapoel-only | tlv | portrait |  |  |
| `art/flat*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/freddy*` | 3 | hapoel-only | tlv | portrait |  |  |
| `art/fx*` | 4 | universal | * | fx |  | webp |
| `art/gate*` | 4 | hapoel-only | tlv | backdrop, title-card | provenance-unknown 2 |  |
| `art/gershon*` | 16 | hapoel-only | tlv | portrait | real-person |  |
| `art/girl*` | 1 | no | * | portrait | provenance-unknown |  |
| `art/ground*` | 1 | tlv | tlv | backdrop |  | relight-dusk, webp |
| `art/hall*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/hallVendor*` | 4 | universal | * | portrait |  | webp |
| `art/hatikva*` | 1 | tlv | tlv | backdrop |  | relight-dusk, webp |
| `art/hermesh*` | 4 | hapoel-only | tlv | portrait |  |  |
| `art/hero*` | 40 | hapoel-only | tlv | portrait |  |  |
| `art/home*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/hoop-*` | 5 | universal | * | prop | club-red 1 | recolour-club, webp |
| `art/hooper*` | 6 | universal | * | portrait | club-red | recolour-club, webp |
| `art/icon*` | 12 | universal | * | ui | club-red 1 | recolour-club, webp |
| `art/intro*` | 4 | tlv 3, universal 1 | tlv 3, * 1 | backdrop, title-card 2 | real-stadium-shared-by-tlv-clubs 2 | relight-dusk, webp |
| `art/jaffa*` | 3 | tlv | tlv | backdrop | provenance-unknown 1, hebrew-text 1 | relight-dusk, webp |
| `art/keren*` | 28 | hapoel-only | tlv | portrait |  |  |
| `art/kid*` | 14 | hapoel-only | tlv | portrait |  |  |
| `art/kiosk*` | 5 | universal 4, tlv 1 | * 4, tlv 1 | interior 4, backdrop 1, facade 1 | sponsor-marks 4, provenance-unknown 3 | relight-dusk, webp |
| `art/kitchen*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/kobi*` | 34 | hapoel-only | tlv | portrait | provenance-unknown 1 |  |
| `art/layer*` | 1 | no | * | prop | provenance-unknown |  |
| `art/life*` | 2 | universal | * | backdrop |  | relight-dusk, webp |
| `art/liron*` | 1 | tlv | tlv | backdrop |  | relight-dusk, webp |
| `art/living*` | 2 | universal | * | interior 1, prop 1 |  | webp, relight-dusk 1 |
| `art/lyon*` | 1 | hapoel-only | tlv | backdrop, title-card | provenance-unknown |  |
| `art/man*` | 2 | no | * | portrait | provenance-unknown |  |
| `art/manifest*` | 1 | no | * | index |  |  |
| `art/melamed*` | 4 | hapoel-only | tlv | portrait |  |  |
| `art/menora*` | 1 | tlv | tlv | backdrop | provenance-unknown | relight-dusk, webp |
| `art/michel*` | 5 | hapoel-only | tlv | portrait | real-person |  |
| `art/office*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/ofir*` | 30 | hapoel-only | tlv | portrait |  |  |
| `art/oldMan*` | 14 | universal | * | portrait |  | webp |
| `art/overlay*` | 4 | universal | * | fx | club-red 2 | webp, recolour-club 2 |
| `art/pano*` | 10 | tlv 4, universal 3, hapoel-only 3 | tlv 7, * 3 | env-map, backdrop 7, facade 4, interior 3 | hebrew-text 5 | equirect-to-cubemap 7, webp 7, relight-dusk 4 |
| `art/panoBloom*` | 9 | tlv | tlv | env-map, backdrop, facade | club-red | equirect-to-cubemap, relight-dusk, webp |
| `art/panoRoom*` | 4 | universal | * | env-map, interior | sponsor-marks 1 | equirect-to-cubemap, webp |
| `art/panoUss*` | 3 | hapoel-only | tlv | backdrop, env-map |  |  |
| `art/paper*` | 4 | no | * | doc | provenance-unknown |  |
| `art/pen-*` | 9 | universal | * | prop | club-red 5, burned-filename-text 1 | recolour-club, webp |
| `art/pitch*` | 3 | universal | * | backdrop | provenance-unknown 1 | relight-dusk, webp |
| `art/plate*` | 17 | hapoel-only | tlv | title-card |  |  |
| `art/pogi*` | 68 | hapoel-only | tlv | portrait |  |  |
| `art/port*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/promenade*` | 4 | tlv | tlv | backdrop | hebrew-text | relight-dusk, webp |
| `art/prop*` | 69 | universal 46, hapoel-only 16, no 4, tlv 3 | * 50, tlv 19 | prop, doc 1 | club-red 8, provenance-unknown 4, hebrew-text 3 | webp 49 |
| `art/pupil*` | 8 | universal | * | portrait |  | webp |
| `art/rachel*` | 24 | hapoel-only | tlv | portrait |  |  |
| `art/ramat*` | 2 | tlv | tlv | backdrop | hebrew-text 1 | relight-dusk, webp |
| `art/rehearsal*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/reveal*` | 1 | hapoel-only | tlv | backdrop, title-card |  |  |
| `art/salzburg*` | 1 | hapoel-only | tlv | backdrop, title-card | provenance-unknown |  |
| `art/schoolyard*` | 2 | universal | * | backdrop | provenance-unknown 1 | relight-dusk, webp |
| `art/shachor*` | 2 | hapoel-only | tlv | portrait |  |  |
| `art/sheets*` | 1 | no | * | index |  |  |
| `art/shirt*` | 10 | hapoel-only | tlv | prop |  |  |
| `art/shop*` | 1 | universal | * | interior, ui | club-red | relight-dusk, webp |
| `art/sinai*` | 17 | hapoel-only | tlv | portrait | real-person |  |
| `art/soko*` | 2 | hapoel-only | tlv | portrait |  |  |
| `art/soldier*` | 18 | hapoel-only | tlv | portrait |  |  |
| `art/soldierKit*` | 4 | tlv | tlv | prop |  | webp |
| `art/stand*` | 2 | hapoel-only | tlv | backdrop, title-card |  |  |
| `art/storeroom*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/street*` | 7 | tlv | tlv | backdrop, facade 1 | provenance-unknown 1, club-red 1, red-white-bunting 1 | relight-dusk, webp |
| `art/teacher*` | 14 | universal | * | portrait |  | webp |
| `art/teddy*` | 1 | tlv | tlv | backdrop | provenance-unknown | relight-dusk, webp |
| `art/teen*` | 14 | hapoel-only | tlv | portrait |  |  |
| `art/tex*` | 6 | universal | * | texture | club-red 4 | recolour-club, tile, webp |
| `art/ticket*` | 1 | tlv | tlv | backdrop | hebrew-text | relight-dusk, webp |
| `art/tikva*` | 23 | hapoel-only | tlv | portrait | real-person |  |
| `art/title*` | 1 | hapoel-only | tlv | backdrop, title-card |  |  |
| `art/tunnel*` | 1 | hapoel-only | tlv | backdrop, title-card |  |  |
| `art/undercroft*` | 1 | tlv | tlv | backdrop |  | relight-dusk, webp |
| `art/usher*` | 4 | universal | * | portrait | club-red | webp |
| `art/uss*` | 11 | hapoel-only | tlv | backdrop, interior 10, title-card 1 | provenance-unknown 1 |  |
| `art/workshop*` | 1 | universal | * | interior |  | relight-dusk, webp |
| `art/yosef*` | 2 | hapoel-only | tlv | portrait |  |  |
| `art/young*` | 14 | universal | * | portrait |  | webp |
| `artefacts/` | 10 | tlv 6, no 4 | tlv 6, * 4 | doc, prop 6 | yellow 5, real-person 4, third-party-print 4 | webp 6, de-yellow 1 |
| `deck/` | 4 | universal | * | ui |  | webp |
| `docs/ace*` | 5 | hapoel-only | tlv | doc | real-person |  |
| `docs/book*` | 24 | hapoel-only | tlv | doc | real-person, yellow 2 |  |
| `docs/hand*` | 8 | hapoel-only | tlv | doc | real-person, provenance-unknown 3 |  |
| `docs/kt*` | 4 | hapoel-only | tlv | doc | real-person |  |
| `docs/sg*` | 91 | hapoel-only | tlv | doc | real-person, provenance-unknown 16, yellow 3 |  |
| `docs/sgcup*` | 14 | hapoel-only | tlv | doc | real-person |  |
| `film/` | 39 | tlv 36, hapoel-only 2, no 1 | tlv 38, * 1 | film 38, title-card 18, index 1 | licence-unverified 36, yellow 2 | grade-dusk 36 |
| `kits/assembly` | 18 | hapoel-only | tlv | prop |  |  |
| `kits/fka-*` | 54 | hapoel-only | tlv | prop | yellow 2 |  |
| `kits/marks` | 4 | no | * |  | trademark |  |
| `kits/og` | 168 | hapoel-only | tlv | prop | yellow 23 |  |
| `kits/templates` | 10 | universal | * | prop |  |  |
| `kits/vp-*` | 114 | hapoel-only | tlv | prop | yellow 25 |  |
| `og` | 15 | no | * |  |  |  |
| `opening/` | 10 | hapoel-only | tlv | film, title-card 6 |  |  |
| `sfx/amb-base*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-bus*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-classroom*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-hall*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-kitchen*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-park*` | 2 | universal | * | sfx |  |  |
| `sfx/amb-radio*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-room*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-stadium*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-station*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-street*` | 4 | universal | * | sfx | owner-muted-synth |  |
| `sfx/amb-theme*` | 2 | no | * | sfx | licence |  |
| `sfx/amb-tunnel*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/ball-bounce*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/ball-kick*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/bell-school*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/bell-shop*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/box-item*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/bus-door*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/buzzer*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/car-door*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/car-pass*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/chant-derby*` | 2 | hapoel-only | tlv | sfx |  |  |
| `sfx/choice*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/coins*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/crowd-bed*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/crowd-claps*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/crowd-goal*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/crowd-groan*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/crowd-hush*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/crowd-real*` | 12 | tlv | tlv | sfx |  |  |
| `sfx/crowd-swell*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/darbuka-dum*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/darbuka-ka*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/darbuka-tek*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/darbuka-three*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/door*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/ending*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/finale-hit*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/gauge-down*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/gauge-up*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/heart*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/manifest*` | 1 | no | * | index |  |  |
| `sfx/page*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/park-wave*` | 2 | universal | * | sfx |  |  |
| `sfx/radio-open*` | 2 | no | * | sfx | licence |  |
| `sfx/radio-tune*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/reveal*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/stage-sting*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/stamp*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/step-floor*` | 6 | universal | * | sfx | owner-muted-synth |  |
| `sfx/step-stairs*` | 6 | universal | * | sfx | owner-muted-synth |  |
| `sfx/step-street*` | 6 | universal | * | sfx | owner-muted-synth |  |
| `sfx/step-terrace*` | 6 | universal | * | sfx | owner-muted-synth |  |
| `sfx/tick*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/ui-click*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/ui-close*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/ui-open*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `sfx/whistle*` | 6 | universal | * | sfx | owner-muted-synth |  |
| `sfx/year-turn*` | 2 | universal | * | sfx | owner-muted-synth |  |
| `share/` | 2 | hapoel-only | tlv | ui |  |  |
| `transitions/` | 16 | hapoel-only | tlv | film | provenance-partial |  |
| `uss` | 16 | hapoel-only | tlv | backdrop, interior |  |  |
| `video` | 2 | hapoel-only | tlv | film | yellow |  |

Contact sheets used for the classification: `/tmp/wart/*.jpg` (session scratch, not committed). One sheet per family; all were viewed for backdrops, panoramas, cast, figures, faces, props, fx/ui, film, opening, transitions (frames), uss, og and deck/share, and sample sheets for the homogeneous families (kits, cards, sky/ground strips).
