/**
 * הנכסים — the approved concept art, as game assets.
 *
 * Every backdrop and every person in the game is a rectangle of one of Maor's boards,
 * cut by `scripts/life/build-art.py` (paintings, props, portraits) and
 * `scripts/life/slice-sheets.py` (character sheets, sliced automatically on the gaps
 * between figures). This file is the only place the game names a file: a scene asks for
 * a key, so re-cutting an asset — or dropping in a final production painting — is a
 * change to the manifest and to nothing else.
 */

export const ART_ROOT = '/life/art'

/** Painted rooms and places. */
export const BACKDROP = [
  'living',
  'bedroom',
  'kitchen',
  'kiosk',
  'street',
  'pitch',
  'approach',
  'gate7',
  'ground',
  'corridor',
  'reveal',
  'stand',
  'ussExt',
  'ussHall',
  /**
   * ספטמבר 2026 — the purpose-drawn deliveries.
   *
   * Every backdrop above is a RECTANGLE of a concept board. These four arrived as
   * finished frames, drawn to the layout specs in `docs/life/*-spec.png`: an empty
   * street with no painted people in it, the road east with Bloomfield's floodlight
   * pylons over the rooftops, and the ground itself at gate seven. `streetEast` is the
   * same street from further east and is not a location — it is the arrival card the
   * road plays the first time the child leaves his own neighbourhood.
   */
  'streetEast',

  /**
   * ספטמבר 2026, המסירה השנייה — the frames that answered the prompt pack.
   *
   * Eight of the keys above were REPLACED rather than added, and nothing in this list
   * records that, which is correct: a scene asks for `kitchen` and gets whatever
   * `kitchen` currently is. What changed is that `kitchen`, `living`, `kiosk`,
   * `pitch`, `stand`, `ussExt` and `ussHall` stopped being rectangles of a concept board
   * — the kitchen was a 4.3× upscale of a panel and the terrace was an ILLUSTRATED AERIAL
   * of the whole bowl, which is a map and not a place to stand — and `corridor` stopped
   * being a dim interior standing in for a tunnel. All eight are now purpose-drawn frames
   * with an empty floor to walk on.
   *
   * These two are the only genuinely new names. Neither has a scene yet, and that is on
   * purpose (rule 43): the art lands first so the 1983–2000 plan can name a place instead
   * of describing one.
   */
  'undercroft',
  'ussHallPre',

  /**
   * 4.9.2026, המסירה השלישית — the answers to `ART-BRIEF-COMPLETE.md`.
   *
   * `bedroom`, `living` and `reveal` were replaced under their own names (the bedroom
   * had been a 3× upscale of a panel since the first build — the first room of the game
   * and the worst painting in it). The rest are new rooms: the same bedroom and street
   * four years on, and the school the second movement of Stage B opens in.
   */
  'bedroom90',
  'street90',
  'classroom',
  'schoolyard',

  /**
   * אוסישקין — five angles of ONE hall, reconstructed from the weinstocka footage
   * (`USSISHKIN-RECONSTRUCTION-V2`): the red-and-charcoal stand, the cream stand
   * opposite, the end wall with the basket, the high corner, and the floor at a child's
   * eye. The roof, the beams, the window strip and the basket never move between them —
   * that is the rule the package was built on, and it is what makes them one place.
   */
  'ussMain',
  'ussCream',
  'ussEnd',
  'ussHigh',
  'ussLow',

  /**
   * בלומפילד אחרי — the ground the way it was between 2000 and 2016, and the way it was
   * rebuilt in 2019, sixteen frames reconstructed from the four videos in the master
   * package (`BLOOMFIELD-2000-2019-PLUS`). None of them is a place this game's boy has
   * stood in yet: the old set belongs to the decade after the Double, and the new set is
   * the ground the game OPENS on — the frame of 2026, a man in front of the white shell
   * before the film cuts back to 1978. `intro*` are the four cinematic plates: the tunnel
   * mouth, the packed red night, the plaza on the way home, the beacon over Jaffa.
   */
  'bloomOldGates', 'bloomOldCorner', 'bloomOldStand', 'bloomOldEnd', 'bloomOldHigh', 'bloomOldTunnel',
  'bloomNewInside', 'bloomNewPitch', 'bloomNewDay', 'bloomNewPlaza', 'bloomNewSea', 'bloomNewNight',
  'introFirstSight', 'introDerbyNight', 'introReturnHome', 'introBeacon',
  /**
   * 5.9.2026 (evening) — nine rooms Maor painted against `ART-REQUIRED.md`, each on the
   * key the code had already named for it, so the stand-ins went without a coordinate
   * moving: the station, Ramat Gan, the Hatikva, the base, Liron's car, under Gate 5,
   * the kiosk at night, the alley of Stage A, and the terrace of 1983 from a child's height.
   */
  'busStation', 'ramatGan', 'hatikva', 'armyRoom', 'lironCar', 'gate5', 'kioskNight', 'alley', 'cup83',
  // …and from the desktop folder the same night: the match-day street, the hall at night, the 1998 classroom
  'street90Flags', 'ussHallNight', 'classroom98',
  /**
   * 6.9.2026 — the corner of Allenby, told three times.
   *
   * The same elevation in every decade: the record shop with vinyl in the window and
   * wooden chairs at the café; then compact discs, cassettes and red plastic chairs; then
   * a phone shop. The building, the green door at 96, the archway through the block and
   * the awning never move, so twenty years pass on one corner without a caption.
   */
  'allenby', 'allenby90', 'allenby2000',
  /**
   * הטיילת ואלנבי — four wide streets Maor sent on 7.9.2026, cut to the room shape.
   *
   * Each also has a `-wide` file beside it (the uncut 2.63:1 original, treated): the
   * promenade journey south→north is a street you WALK ALONG rather than a room you stand
   * in, and when its geography arrives that is the picture it will move across.
   */
  'promenade', 'promenadeDusk', 'allenbyShops', 'allenbyShopsLate',
  /**
   * 17.9.2026 — שני ציורים, ושניהם עונים על חור שהיה כתוב בקוד לפניהם.
   *
   * `ticketOffice` הוא חדר. עד היום `ticket-office` עמד על `undercroft` — המסדרון מתחת
   * ליציע — ומאור ביקש במפורש את ההפך: *"אני רוצה לייצר משרד כרטיסים בפני עצמו ולא כחלק
   * ממקום קיים, אלא לפתוח מקום חדש."* השלט על הציור אומר **קופת כרטיסים - תל אביב** ויש בו
   * דלת לרחוב, ולכן זה משרד בעיר ולא חלל מתחת לבלומפילד.
   *
   * `ramatGanGates` הוא החוץ של אצטדיון לאומי רמת גן — הקרוסלות, האוהדים על הרחבה,
   * המכוניות של שנות התשעים. הוא **אינו** מחליף את `ramatGan`, שהוא היציע שבו נצפים שני
   * הגמרים: הוא כרטיס ההגעה אליו, בדיוק היחס שיש ל-`ground` מול `bloomfield-outside`.
   */
  'ticketOffice',
  'ramatGanGates',
  /**
   * ...ושלושה ציורים שעדיין אין להם חדר, וזה נאמר כאן ולא מוסתר.
   *
   * `busStopDan` — סככת "דן" של שנות השמונים: עיתונים על מעמד, טלפון ציבורי אדום, אוטובוס
   * ירוק בקצה. `jaffaBoulevard` — שדרה ריקה ביפו לפנות בוקר, קיוסקים וחנויות בתריסים.
   * `jaffaAlleyCafe` — סמטה מרוצפת, בית קפה ג'אפנא, שורשי פיקוס ועגלת יד.
   *
   * Landing a painting before its scene is this file's own practice and it is written
   * down twice already — `undercroft` and `ussHallPre` ("neither has a scene yet, and that
   * is on purpose (rule 43): the art lands first so the 1983–2000 plan can name a place
   * instead of describing one"), and `promenade`/`promenadeDusk`, held for a journey whose
   * geography has not been built. The cost is honest and it is zero at runtime: a scene
   * loads its own backdrop, so a key nothing names is a key nothing downloads.
   *
   * What each one still needs is in `docs/life/ART-REQUIRED.md` — a walk band measured on
   * the painting, a door, and something to do there, because a room with nothing in it is
   * dead content (rule 66) and that is the part a painting cannot supply.
   */
  'busStopDan', 'jaffaBoulevard', 'jaffaAlleyCafe',
  /**
   * **2000–2026 — שבעה-עשר ציורים, 21.9.2026** (`scripts/life/ingest-backgrounds-2026-09-21.py`).
   * מאור שלח אותם לפי `docs/life/ART-PROMPTS-2000-2026.md`. לכל אחד חדר או צבע-מחדש
   * (`repaints`) ב-`world/scenes.ts`, והטבלה שם אומרת איזו סצנה של התסריט יושבת עליו.
   */
  'homeAdult', 'flatAway', 'workshopFix', 'communityRoom', 'storeroom', 'officeOwner',
  'deskNewsroom', 'rehearsal', 'driveIn', 'arenaEuroOut', 'arenaEuroSeats', 'portEurope',
  'pitchSmall', 'bedroom00', 'hallNew', 'bloomOldTerrace', 'bloomNewTerrace',
  /**
   * **בלומפילד מבפנים — שלושה צילומים, 23.9.2026** (`/tmp/in88/stadium`, מאור: לשים אותם
   * כחדרי בלומפילד של העשורים שלהם). השלטים מתארכים אותם: olivetti / בנק הפועלים / טמפו
   * הם שנות השמונים, שיכון עובדים / Hertz — התשעים. היציעים **ריקים**, ולכן הם החדר של יום
   * בלי משחק בלבד (`STAND_80S`/`STAND_90S` ב-`world/rooms2000.ts`); ביום משחק היציע נשאר
   * הציור עם הקהל האפוי (`stand` + `standCrowd`) — יציע ריק באמצע משחק הוא שקר גדול יותר
   * מציור. השלטים הצהובים (נסטלה, בירה מכבי) עברו את ה-de-yellow של `finish-backdrops.py`
   * כמו כל ציור: חריג לכלל 8 נותן רק מאור, על קובץ, אחרי שראה את המדידה.
   */
  'bloom80Goal', 'bloom90Side', 'bloom90Corner',
  /**
   * **27.9.2026 — THE-WORKER-LIFE-BACKGROUNDS-2026-09-27 + the approved folder**
   * (`scripts/life/ingest-backgrounds-2026-09-27.py`). The decade redresses keep the camera of
   * the room they redress (checked by overlay); the stadiums are concept drafts, recorded as
   * such in the manifest (`conceptHe`).
   */
  'kiosk00', 'kiosk10', 'kiosk20', 'street10', 'busStation20', 'menoraSeats', 'schoolyard20',
  'gate7Old', 'allenby20', 'pitchPark00', 'teddy2010', 'salzburg2010', 'lyon2010', 'benfica2010',
  'botevgradOut2026', 'botevgradSeats2026', 'jaffa00', 'gate5Stand', 'ussExtDusk',
] as const
export type BackdropKey = (typeof BACKDROP)[number]

/**
 * Painted furniture separated from its room, so the child can walk BEHIND something.
 * A flat painting can only ever be behind the player; one separated object is the whole
 * difference between a backdrop and a room.
 */
/**
 * ...and the AIR. The four overlay plates from the September master package are painted
 * weather rather than painted objects: floodlight haze, coastal mist, red smoke, and
 * paper in the air at the moment a thing is won. They are drawn over a room at a low
 * alpha, they belong to no chapter, and they are the only layers in this list that are
 * not a piece of somebody's furniture.
 */
/**
 * החולצות — the collection, cut off the photographs Maor took of the real shirts
 * (`scripts/life/cut-shirts-2026-09-05.py`). One 1024 canvas each, so twelve of them hang
 * at one scale on a rail without a number tuned per shirt.
 */
export const SHIRT = [
  'shirtTveria85', 'shirtVisa86', 'shirtDiadoraRed', 'shirtDiadoraWhite',
  'shirtKing', 'shirtShikun', 'shirtCrt', 'shirtBasket90',
] as const

export const LAYER = [
  /**
   * היציע — the terrace behind the front rows, composited once out of the crowd sheets
   * rather than drawn as two and a half thousand sprites
   * (`scripts/life/bake-gate7-crowd.py`). It is a LAYER and not a backdrop because it is
   * laid over `stand` at the seam of the walk band, and because a year may want the same
   * terrace empty.
   */
  'standCrowd',
  /**
   * היציע של אוסישקין — the hall's own crowd, drawn by Maor and sent on 6.9.2026 for
   * exactly this: a packed 1980s terrace with the slope, the two staircases and the
   * handrail of the room it belongs to. Keyed off its white ground and trimmed to the
   * crowd itself (1672x453), so a width and a bottom edge are all the placement it needs.
   */
  'ussCrowd',
  // (`livingTable` left 21.9.2026: a table cut from the earlier living-room painting, floating
  // in front of the kitchen door of this one — see the `home` scene)
  'streetFore',
  'streetGround',
  'overlayHaze',
  'overlaySmoke',
  'overlayConfetti',
  'overlayMist',
] as const

/** Cut-out people. */
export const FIGURE = [
  /**
   * חבילת ה־Production Clean (5.9.2026) — the four Maor filtered by hand and approved.
   *
   * Rachel's eight poses REPLACE hers under the same keys; Barry, Efi grown up and
   * Michel are new, and they take over from the crowd sheets that were standing in for
   * them in 1996 and after. Every profile in this folder faces RIGHT, which is this game's
   * convention (`WorldScene.ART_FACES = 1`). This comment said "left" for a day, the
   * ingest that read it mirrored `barry96-side` INTO the wrong direction, and the boy
   * walked backwards in every chapter until 5.9.2026. Fifteen files were mirrored back;
   * `scripts/life/facing-check.py` now fails rather than a comment being trusted.
   */
  'efi96', 'efi96-3q', 'efi96-side', 'efi96-back',
  'efi96-speak', 'efi96-listen', 'efi96-concern', 'efi96-laugh',
  // 21.9.2026 — Michel in 1999, standing: the red tracksuit his plate was cut from. In the
  // city's cast since 8.9; in the life from the adult chapters (`CAST_2000`)
  'michel99', 'michel99-3q',
  'rachel-3q', 'rachel-speak', 'rachel-listen', 'rachel-concern', 'rachel-laugh',
  /**
   * פוגי — the protagonist, and the reason this list changed shape.
   *
   * The game shipped with an ILLUSTRATED child standing in painted photographic
   * streets. No grade fixes a mismatch of medium: he read as a sticker on somebody
   * else's photograph, and it was the loudest remaining flaw in the build. Pogi is the
   * same boy the rest of the world is drawn in, at three ages — eight here, then the
   * conscript and the young man, who ship now so the chapters after this one have a
   * face waiting for them rather than a placeholder (rule 43).
   *
   * The walk is TWO frames, not eight. That is what the sheet contains, and two honest
   * side-on strides with a bob read as walking; borrowing the old child's eight-frame
   * cycle would have put a different boy's legs under this boy's shirt.
   */
  /**
   * ארבעה זרים — 5.9.2026, from Maor's own batch, and the reason they are here is his:
   * "עוד דמויות שאתה יכול לשלב כאנשים אקראיים ברחוב כדי ליצור מגוון". Nobody in this
   * group can be talked to (`ambient1986.ts` says why), and none of them is a face the
   * cast uses.
   */
  'manCap',
  'manBack',
  'girlTeen',
  'boySkate',
  'pogi',
  'pogi-3q',
  'pogi-side',
  'pogi-back',
  'pogi-walk',
  'pogi-scarf',
  'pogi-arms',
  'pogi-sit',
  'pogi-cross',
  'pogi-cheer',
  'pogi-kneel',
  'pogi-hold',

  /**
   * השכונה — twenty-eight people who are not the cast.
   *
   * The ambient system had seven `fan*` cut-outs to work with, so a busy street was the
   * same four strangers walking past on a loop — which is the exact opposite of what an
   * ambient system is for. These are fourteen young people and fourteen adults, period
   * dressed, keyed off green: enough that a player never sees the same face twice on
   * one screen, and enough that the road east can fill up without repeating.
   */
  'youngA1', 'youngA2', 'youngA3', 'youngA4', 'youngA5', 'youngA6', 'youngA7',
  'youngB1', 'youngB2', 'youngB3', 'youngB4', 'youngB5', 'youngB6', 'youngB7',
  'adultA1', 'adultA2', 'adultA3', 'adultA4', 'adultA5', 'adultA6', 'adultA7',
  'adultB1', 'adultB2', 'adultB3', 'adultB4', 'adultB5', 'adultB6', 'adultB7',

  'ofir',
  'amit',
  'efi',
  'keren',
  'kobi',
  'kobi-chair',
  // 21.9.2026 — Kobi on a match day in 1985, the scarf on: the first match of Stage A (`a5-first`)
  'kobi-scarf',
  'kobi-cheer',
  'kobi-side',
  'kobi-bag',
  'rachel',
  'rachel-tray',
  'oldMan',

  /**
   * שנות ה-90 — the same three people, fifteen years on.
   *
   * They are on disk alongside their 1980 selves rather than replacing them, because a
   * life simulation that spans decades needs both ages loadable at once: the chapter you
   * are playing and the chapter you are remembering can then sit in the same frame, and
   * the years land on a face instead of in a caption. Nothing in Stage A walks around as
   * one of these yet — the epilogue is where they are first seen.
   */
  'kobi90',
  'kobi90-arms',
  'kobi90-side',
  'kobi90-back',
  'kobi90-stand',
  'kobi90-cheer',
  'kobi90-bag',
  'kobi90-lean',
  'kobi90-sitA',
  // 27.9.2026 — the approved armchair look: the nineties tracksuit, הפועל open on his knee.
  // `kobi-chair` (denim) stays the eighties; Maor: "שיהיה לו כמה לוקים".
  'kobi90-chair',
  'kobi90-point',
  'kobi90-paper',
  'kobi90-sitB',
  'ofir90-arms',
  'ofir90-side',
  'ofir90-back',
  'ofir90-3q',
  'ofir90-walk',
  'ofir90-sitA',
  'amit90',
  'amit90-3q',
  'amit90-side',
  'amit90-back',
  'amit90-turn',
  'amit90-cheer',
  'amit90-walk',
  'amit90-scarf',
  'amit90-cross',
  'amit90-sitA',
  'amit90-sitB',
  'amit90-point',
  'amit90-drum',

  /**
   * הדמות הראשית, בשלושה גילים — the boy the player is, later.
   *
   * `hero80` is him grown out of this chapter, `hero90` is the young man, and `soldier`
   * is the conscript of the early nineties that the script sends to the army. Stage A
   * never walks around as any of them: they exist so the day you just played can be shown
   * as one point on a life instead of the whole of it, and so the chapters after this one
   * have a face waiting for them rather than a placeholder.
   */
  'hero80',
  'hero80-3q',
  'hero80-side',
  'hero80-back',
  'hero80-pack',
  'hero80-walk',
  'hero80-ball',
  'hero80-kick',
  'hero80-scarf',
  'hero80-cheer',
  'hero80-point',
  'hero80-crouch',
  'hero80-tie',
  'hero80-sit',
  'hero80-away',
  'hero80-leave',
  'hero90',
  'hero90-3q',
  'hero90-side',
  'hero90-back',
  'hero90-pack',
  'hero90-walk',
  'hero90-ball',
  'hero90-kick',
  'hero90-scarf',
  'hero90-cheer',
  'hero90-think',
  'hero90-crouch',
  'hero90-tie',
  'hero90-sit',
  'hero90-away',
  'hero90-leave',

  /**
   * השחקנים — four footballers and the supporter who joins the story in the nineties.
   *
   * Every one of them ships in a kit AND in ordinary clothes, because in a life
   * simulation a footballer is not only somebody on a pitch: he is a poster on a wall, a
   * man in a queue, a face on a newspaper page. `-civ*` is the second life, `-bust*` and
   * `face*` are the plates a conversation can use.
   *
   * `gershon-rival-*` is the centre-half in the other club's kit — the story's whole
   * reason for him. Those five files went through the same de-yellow as everything else
   * (rule 8), so they are amber-and-black rather than yellow-and-black. Nothing in this
   * repo is allowed to be yellow, including the enemy.
   */
  'elimelech-back',
  'elimelech-catch',
  'elimelech-civA',
  'elimelech-civB',
  'elimelech-civC',
  'elimelech-civD',
  'elimelech-civE',
  'elimelech-civF',
  'elimelech-civG',
  'elimelech-claim',
  'elimelech-point',
  'elimelech-ready',
  'elimelech-shout',
  'gershon',
  'gershon-back',
  'gershon-bust',
  'gershon-civA',
  'gershon-civB',
  'gershon-civC',
  'gershon-civD',
  'gershon-civE',
  'gershon-head',
  'gershon-rival',
  'gershon-rival-back',
  'gershon-rival-captain',
  'gershon-rival-look',
  'gershon-rival-shout',
  'gershon-run',
  'gershon-side',
  'keren90',
  'keren90-arms',
  'keren90-band',
  'keren90-look',
  'keren90-scarf',
  'keren90-shout',
  'keren90-side',
  'keren90-sit',
  'keren90-smile',

  /**
   * ---------------------------------------------------------------------------------
   * המסירה השנייה — forty-nine figures that were names in `PLANNED_FIGURE` yesterday.
   *
   * `PLANNED_FIGURE` existed because forty-six names in this list resolved to files that
   * were sliced locally and never reached the repository, and a name that 404s in front
   * of a player is worse than a name that is written down as missing. `ART-PROMPTS.md`
   * asked for the sheets they needed. They arrived, and the list below is what came back.
   *
   * Four of those names are NOT here and never will be. `soldier-rifle` and `soldier-aim`
   * were poses nobody drew, because the prompt that asked for this sheet said `no weapons
   * in any frame` — this game is about a child growing up in a neighbourhood, and its own
   * brief forbids offering him anything dangerous. `soldier-salute` and `soldier-sit` are
   * gone for the duller reason: the sheet holds standing-to-attention, sitting on a crate
   * and sitting exhausted, and naming a pose that was not drawn is how a name ends up
   * pointing at a file somebody cut to fill the gap.
   */

  // פוגי, שמונה פריימים של הליכה — indexed by `KID_WALK`, never named by a scene
  'pogi-w1', 'pogi-w2', 'pogi-w3', 'pogi-w4',
  'pogi-w5', 'pogi-w6', 'pogi-w7', 'pogi-w8',

  /**
   * פוגי נער — the same boy at thirteen, and the reason he ships before he is needed.
   *
   * Nothing in Stage A walks around as this. He exists so the chapter after 1986 opens on
   * a face the player already knows rather than on a stranger with the protagonist's
   * name, and so the life-line can put eight and thirteen in the same frame.
   */
  'teen', 'teen-3q', 'teen-side', 'teen-back', 'teen-walk', 'teen-pockets', 'teen-cross',
  'teen-sit', 'teen-lean', 'teen-crouch', 'teen-cheer', 'teen-scarf', 'teen-look', 'teen-away',

  /**
   * משה סיני ושלום תקוה — two footballers, each drawn twice.
   *
   * Sinai gets a kit and a second row in a shirt and slacks, because in a life simulation
   * a footballer is not only somebody on a pitch: he is a poster on a wall, a man in a
   * queue, a face on a newspaper page. Tikva gets home red and away white instead, and
   * the last away frame wears the captain's armband — which is the one detail that makes
   * a second kit worth drawing rather than a recolour.
   */
  'sinai', 'sinai-3q', 'sinai-side', 'sinai-back', 'sinai-ball', 'sinai-kick', 'sinai-cheer',
  'sinai-civA', 'sinai-civB', 'sinai-civC', 'sinai-civD', 'sinai-point', 'sinai-civE', 'sinai-civF',
  'tikva', 'tikva-3q', 'tikva-side', 'tikva-back', 'tikva-ball', 'tikva-kick', 'tikva-cheer',
  'tikva-away', 'tikva-away-smile', 'tikva-away-side', 'tikva-away-back',
  'tikva-away-ball', 'tikva-point', 'tikva-captain',

  // פוגי חייל, 1996 — fourteen poses and not one weapon in any of them
  'soldier', 'soldier-stand', 'soldier-side', 'soldier-back',
  'soldier-march', 'soldier-pack', 'soldier-crate',
  'soldier-tired', 'soldier-shout', 'soldier-tie', 'soldier-away',
  'soldier-lean', 'soldier-look', 'soldier-beret',

  /**
   * אופיר בן העשרים — seven poses that REPLACE six plates of a different-looking man.
   *
   * The six `ofir90-*` files that were already here came off an older concept board. The
   * seven below are one sheet of one person, drawn from the 1986 Ofir with the buzz cut he
   * is not allowed to lose. Keeping both would have put two faces under one name, which is
   * the exact failure the Pogi rewrite was for. `ofir90-smoke`, `-crouch`, `-point`,
   * `-sitB` and `-scarf` are still the older man and are the next thing to redraw.
   */
  'ofir90',

  // ---- 4.9.2026 — the third delivery: the sheets ART-BRIEF-COMPLETE.md asked for -------
  // Keren (1986), Efi and the kiosk owner, redrawn in the photoreal style at last: the
  // three chibi cut-outs that stood beside the painted children are gone from the stage.
  'keren-3q', 'keren-side', 'keren-back', 'keren-sit', 'keren-cross', 'keren-point',
  'keren-w1', 'keren-w2', 'keren-w3', 'keren-w4', 'keren-laugh', 'keren-shout', 'keren-hips',
  'efi-3q', 'efi-side', 'efi-back', 'efi-crouch', 'efi-kick', 'efi-arms',
  'efi-w1', 'efi-w2', 'efi-w3', 'efi-w4', 'efi-dribble', 'efi-cheer', 'efi-sulk',
  'oldMan-3q', 'oldMan-side', 'oldMan-back', 'oldMan-lean', 'oldMan-hand', 'oldMan-paper',
  'oldMan-point', 'oldMan-arms', 'oldMan-laugh', 'oldMan-shrug', 'oldMan-coins', 'oldMan-wipe', 'oldMan-stool',
  // Rachel, four years on — the mother of 12.5.1990 and of the derby night.
  'rachel90', 'rachel90-3q', 'rachel90-side', 'rachel90-back', 'rachel90-arms', 'rachel90-hips', 'rachel90-note',
  'rachel90-apron', 'rachel90-point', 'rachel90-watch', 'rachel90-hug', 'rachel90-sit', 'rachel90-door', 'rachel90-call',
  // The school, March 1991.
  'teacher', 'teacher-3q', 'teacher-side', 'teacher-back', 'teacher-arms', 'teacher-note', 'teacher-look',
  'teacher-point', 'teacher-hand', 'teacher-sit', 'teacher-lean', 'teacher-walk', 'teacher-watch', 'teacher-turn',
  'pupil-back1', 'pupil-back2', 'pupil-back3', 'pupil-back4', 'pupil-sideA', 'pupil-sideB', 'pupil-turn', 'pupil-pass',
  // Ussishkin: nameless players in plain red, an usher, a vendor with a tray.
  'hooperRed-ball', 'hooperRed-dribble', 'hooperRed-shoot', 'hooperRed-stretch', 'hooperRed-away', 'hooperRed-bent',
  'usher', 'usher-block', 'usher-up', 'usher-wave',
  'hallVendor', 'hallVendor-hand', 'hallVendor-change', 'hallVendor-shout',
  // The twelve-year-old's eight-frame walk (the eight-year-old's is `KID_WALK`).
  'hero80-w1', 'hero80-w2', 'hero80-w3', 'hero80-w4', 'hero80-w5', 'hero80-w6', 'hero80-w7', 'hero80-w8',
  /**
   * האוהדים — the Stage B supporters, off the sheet Maor drew on 2.9.2026.
   *
   * `KNOWN-GAPS.md` in the September master package listed twelve supporters with no PNG.
   * The same package carried, under "user references", a green-screen sheet of five of
   * them front and back at a height the game can use, and a pose sheet of seven at a
   * third of that height. `ingest-2026-09e.py` cut both. The five from the tall sheet are
   * finished figures; מלמד and פרדי come off the small sheet upscaled 2.4× and are marked
   * `soft` in the manifest — they stand in a doorway until their own sheet is drawn, and
   * the gaps document says so. The figure the sheet labelled שלום is יוסף (`yosef`) — the
   * bible of 5.9.2026 is explicit: "שלום בתמונות הישנות → יוסף", no supporter named
   * Shalom exists, and שלום תקוה is only ever the footballer. Yosef enters no chapter
   * before 2000.
   */
  'shachor', 'shachor-back', 'soko', 'soko-back', 'asaf', 'asaf-back',
  'yosef', 'yosef-back', 'hermesh',
  'melamed', 'melamed-play', 'melamed-lean', 'melamed-listen',
  'freddy', 'freddy-glass', 'freddy-drink',
  /**
   * שני האנשים בחזית בלומפילד — מחבילת 8.9.2026, ורק השם כאן היה חסר.
   *
   * `bfSteward` (הסדרן) ו-`bfVendor` (מוכר הגרעינים) נחתכו עם החבילה: יש להם קובץ ב-
   * `public/life/art`, שורה ב-`manifest.json` תחת `figures`, וגובה ב-`heights.ts` —
   * 1.78 ו-1.70. הם פשוט מעולם לא נרשמו כאן.
   *
   * לא הרגישו בזה כי הרחוב היחיד שבו הם עומדים היום הוא זה של `city/mission.ts`, שקורא
   * את הגובה מ-`CITY_CAST` ואינו עובר דרך `FIGURE` בכלל. הרגע שבו זה היה נשבר הוא הרגע
   * שבו סצנה ב-`scenes.ts` הייתה קוראת להם בשם — ואז `artUrl` היה מחזיר 404 מול שחקן.
   * שם שיש לו קובץ צריך להיות רשום לפני שמישהו ינסה להשתמש בו, לא אחרי.
   */
  'bfSteward', 'bfVendor',
  /**
   * ------------------------------------------------ 2000–2026, הגיל בגוף (24.9.2026) ----
   *
   * `THE-WORKER-CHARACTERS-2000-2026-55`, שנמסרה ב-22.9 ולא נקלטה עד היום: פוגי בן 32/40/47,
   * קובי בן 62/72, אופיר, עמית וקרן בני 40, אפי בן 44 — חמש תנוחות כל אחד
   * (`scripts/life/ingest-characters-2026-09-24.py`). החזית היא המפתח החשוף, כמו `hero90`.
   * איזה גוף בכל שנה — `castFigures.ts` (`fromYear`) ו-`playerFor` לפוגי עצמו.
   */
  'pogi32', 'pogi32-3q', 'pogi32-side', 'pogi32-back', 'pogi32-walk',
  'pogi40', 'pogi40-3q', 'pogi40-side', 'pogi40-back', 'pogi40-walk',
  'pogi47', 'pogi47-3q', 'pogi47-side', 'pogi47-back', 'pogi47-walk',
  'kobi62', 'kobi62-3q', 'kobi62-side', 'kobi62-back', 'kobi62-walk',
  'kobi72', 'kobi72-3q', 'kobi72-side', 'kobi72-back', 'kobi72-walk',
  'ofir40', 'ofir40-3q', 'ofir40-side', 'ofir40-back', 'ofir40-walk',
  'amit40', 'amit40-3q', 'amit40-side', 'amit40-back', 'amit40-walk',
  'efi44', 'efi44-3q', 'efi44-side', 'efi44-back', 'efi44-walk',
  'keren40', 'keren40-3q', 'keren40-side', 'keren40-back', 'keren40-walk',
  // חרמש הקנוני — האיש הקירח (רפרנס של מאור, 23.9.2026). `hermesh` נדרס באותו שם; ההיפי
  // בשיער הארוך שעמד עליו יצא, וגם הגב שלו (`hermesh-back`, ב-`LEGACY_POSE`). בכדורסל — באולם
  'hermesh-3q', 'hermesh-ball',
  // בארי הקנוני (`barry-3q-green`, מאור 23.9.2026) הוא האיש של `barryToday`: רזה, תיק צד,
  // והטרנזיסטור. `barry96` — גבר אחר לגמרי — יצא מהזירה (`LEGACY_POSE`)
  'barryToday', 'barryToday-3q', 'barryRadio', 'barryRadio-3q',
  // בתיה מהצילום בתיקייה המאושרת (מאור 27.9.2026: "לחתוך אותה מהצילום? כן.") — חזית אחת,
  // עד היום עמדה על `adultB6` (`scripts/life/ingest-batya-2026-09-27.py`)
  'batya',
] as const

/**
 * מה שעוד לא הועלה — figures the project has drawn and the repository does not have.
 *
 * **It is empty, and that was always the plan.**
 *
 * `FIGURE` is a promise: every key in it resolves to a real file in `public/life/art`, and
 * `tests/life.test.ts` holds the runtime to it. Forty-six names were failing that promise
 * — the whole soldier set, Sinai, Tikva and one Ofir plate — because the sheets were
 * sliced locally and the delta that carried them never reached GitHub. Deleting the names
 * would have lost the record of what exists; leaving them in `FIGURE` would have let a
 * scene ask for a file that 404s in front of a player. So they lived here, still written
 * down, still ordered, and unreachable by `artUrl`.
 *
 * The note ended `The list is expected to shrink to nothing. It is not a design.` On
 * 3.9.2026 it shrank to nothing: the sheets were drawn to `docs/life/ART-PROMPTS.md`, cut
 * by `scripts/life/ingest-2026-09b.py`, and thirty of the names moved up into `FIGURE`.
 * The other sixteen were deleted rather than moved, for the reasons written beside them
 * there — two of them because the pose is a weapon and this game does not draw one.
 *
 * The export stays, and stays empty, because the next delivery will want it again: a name
 * that is written down as missing is a name somebody supplies.
 */
export const PLANNED_FIGURE = [] as const

/**
 * RETIRED — 5.9.2026 asset audit (docs/life/ART-REQUIRED.md). The concept-board fans
 * (pixel sprites with a white halo) were replaced in every room by the September adults
 * in delta 20; the files stay in `public/life/art` for the manifest's sake and nothing
 * loads them. A retired key is not a figure: naming one in a scene fails `tests/life.test.ts`.
 */
/**
 * ...and `kid` (21.9.2026): the cartoon child of the first concept board — big head,
 * drawn line — who kept playing the two-a-side as Pogi after the photographed boy took
 * over the world. Maor: *"אתה מציג את פוגי כילד כציור — זו טעות."*
 */

/**
 * ------------------------------------------------ אדם אחר תחת אותו שם (24.9.2026) ----
 *
 * קבצים שעל הדיסק ושאסור לאף **אדם** לעמוד עליהם, כי הם מישהו אחר מהאדם שהשם שלו עליהם —
 * ולכן הם מחוץ ל-`FIGURE` ובתוך `RETIRED_FIGURE`. `life:identity` ו-
 * `tests/life-identity.test.ts` נופלים על כל שחקן, שורת `CAST_2000` או `row.figure` שמצביעים
 * לכאן.
 *
 *   · `ofir90-smoke/-crouch/-point/-sitB/-scarf` — ההערה ב-`FIGURE` אומרת את זה מ-4.9: "still
 *     the older man and are the next thing to redraw". לא צוירו מחדש; אז הם לא עומדים.
 *   · `michel96-walk*` — איש אחר, מצויר, בז'קט בורדו (מאור 23.9: הטרנינג האדום-לבן הוא מישל).
 *   · `barry96*` — גבר כבד ומתולתל; בארי של מאור הוא `barryToday`/`barryRadio`.
 *   · `hermesh-back` — הגב של ההיפי ששם לא עומד עוד.
 */
export const LEGACY_POSE = [
  'ofir90-smoke', 'ofir90-crouch', 'ofir90-point', 'ofir90-sitB', 'ofir90-scarf',
  'michel96-walk1', 'michel96-walk3', 'michel96-walk5',
  'barry96', 'barry96-3q', 'barry96-side', 'barry96-back', 'barry96-speak', 'barry96-listen', 'barry96-concern', 'barry96-laugh',
  'hermesh-back',
] as const

/**
 * ...and 24.9.2026: `LEGACY_POSE` joins them. They left `FIGURE` the same day — the two ending
 * cards that named `ofir90-smoke` point at Ofir himself now, and the cast card of Barry at
 * the canonical Barry — so no key in either list can reach `artUrl` through a scene.
 */
export const RETIRED_FIGURE = ['fanA', 'fanB', 'fanC', 'fanD', 'fanE', 'fanF', 'fanG', 'kid', ...LEGACY_POSE] as const

export type FigureKey = (typeof FIGURE)[number]

/**
 * The child's own frames — a turnaround and an eight-frame walk, from the green-screen
 * sheet. Everybody else has one pose; the player has an animation, because the player is
 * the thing you look at for fifteen minutes.
 */
export const KID_POSE = {
  down: 'pogi',
  downSide: 'pogi-3q',
  side: 'pogi-side',
  up: 'pogi-back',
} as const

/**
 * שמונה פריימים — the walk, at last.
 *
 * This list held TWO frames for three passes, and the comment that used to sit here was
 * an apology for it: the sheet held two side-on strides, two honest strides read as
 * walking, and borrowing the previous child's eight-frame cycle would have put a
 * different boy's legs under this boy's shirt. It ended by promising that when a proper
 * Pogi walk sheet was drawn this list would grow and nothing else would change.
 *
 * `docs/life/ART-PROMPTS.md` §2.1 asked for the sheet — contact, down, pass, up, twice,
 * arms opposite the legs, a child's walk rather than a march — and it arrived on
 * 3.9.2026. So the list grew, and nothing else changed. `WorldScene` indexes it modulo
 * its own length and was always right; the bob it adds on top is now decoration on a real
 * cycle rather than half the animation.
 */
/**
 * …and then it was looked at in motion, on 3.9.2026, and rolled back the same day.
 *
 * `pogi-w1…w8` is a clean eight-frame walk — of a DIFFERENT BOY. Shorts, white socks, no
 * badge on the shirt, a rounder head: put beside `pogi` and `pogi-side` (jeans, the club
 * badge, the older face) he is visibly not the same child, and the game swapped between
 * the two every time the player started or stopped walking. That is worse than the
 * two-frame stride it replaced, because a walk with two frames looks like a cheap walk,
 * and a walk that changes the boy looks like a bug. So the list is back to the frames
 * that are HIM — standing side-on and mid-stride — until a sheet arrives that matches
 * the turnaround (ART-PROMPTS §2.1 now says so in those words). The eight frames stay
 * sliced and on disk; the day the right sheet lands, this list grows again.
 */
/**
 * 4.9.2026: the eight frames that ARE him. The third delivery drew the walk from
 * `pogi.png` / `pogi-side.png` — dark curls, the badge, long jeans — and the two-frame
 * stand-in retires. The sheet was drawn walking left and was mirrored on ingest, so
 * every side-on frame in the folder faces right and `setFlipX` does the rest.
 */
/**
 * …and on 16.9.2026 somebody LOOKED at the eight frames, which is the whole of this note.
 *
 * They are the right boy — same curls, same jeans, same shoes as `pogi-back` — and they
 * are a real eight-frame cycle. They are also, every one of them, a **back view**: no
 * face, no badge, the shirt plain across the shoulders. `WorldScene` played them on
 * `lastDir === 'side'` and nothing else, so walking along the street — the commonest
 * movement in the game — turned the child's back to the camera and slid him sideways.
 * The comment above the branch said "it only exists side-on", and the files said no.
 *
 * So the two lists below are what the frames actually show, and the direction each one
 * is for is now in its own name:
 *
 *   - **`KID_WALK` — side-on**, the pair that IS in profile. `pogi-side` is mid-step and
 *     `pogi-walk` is the opposite stride; both wear the badge, both face right, and the
 *     scene's bob (rule 50) carries the rest. This is what the list held for the week
 *     before the eight frames were mis-promoted into it, and the walk did not fake it.
 *   - **`KID_WALK_AWAY` — walking INTO the picture**, which is the one heading a back
 *     view is right for, and the heading that had no animation at all.
 *
 * `KID_WALK_SHELVED` is gone rather than renamed: it held exactly this pair, and two
 * exported names for one pair is how the next pass picks the wrong one (rule 59).
 */
export const KID_WALK = ['pogi-side', 'pogi-walk'] as const

export const KID_WALK_AWAY = [
  'pogi-w1', 'pogi-w2', 'pogi-w3', 'pogi-w4',
  'pogi-w5', 'pogi-w6', 'pogi-w7', 'pogi-w8',
] as const

/**
 * מי הולך אל תוך התמונה — the away cycle, found by the era's OWN `up` pose.
 *
 * An `Era` names its player's four poses and one walk (`content/era.ts`), and it is the
 * chapter's file rather than the runtime's, so the away sheet cannot be a sixth field
 * without every era record learning about it. The key is therefore the thing the era
 * already declares: the standing back pose. An era whose back pose is not in this table
 * has no away sheet drawn yet and keeps what it has always had — the standing pose plus
 * the bob. Only 1986 has one; `hero80` walks side-on and faces the camera, and until a
 * back cycle is drawn for the twelve-year-old that is the honest state.
 */
export const WALK_AWAY: Readonly<Record<string, readonly string[]>> = {
  'pogi-back': KID_WALK_AWAY,
}

export const HERO80_WALK = [
  'hero80-w1', 'hero80-w2', 'hero80-w3', 'hero80-w4',
  'hero80-w5', 'hero80-w6', 'hero80-w7', 'hero80-w8',
] as const

export const PROP = [
  /**
   * שבעה שמות שאינם כאן — the seven props this game shipped with, and why they are gone.
   *
   * `propNewspaper`, `propRadio`, `propScarf`, `propHat`, `propTicket`, `propCoffee` and
   * `propBall` were rectangles of a concept board, and every one of them was cut a little
   * wrong: each arrived with a fragment of the neighbouring drawing still in the frame —
   * half a person beside the radio, a red sleeve beside the scarf, a coin where the ticket
   * should be. The worst of them was `propBall`, which was not a ball at all but a
   * 126×100 mis-cut of a CHILD with his arm raised, and it had been standing on the dirt
   * pitch at seven percent of the frame since the scene was written. Nobody had looked at
   * the file; the game only ever drew it 40 pixels tall.
   *
   * The September sheets drew the objects themselves, which is why the ten below replace
   * them one for one where a use existed: `propBallReal` on the pitch and in the minigame,
   * `propScarfRed` in the red box, `propPapers` and `propCoins` and `propSticker` already
   * in `ITEM_ART`. The ticket went further and became the real thing — `docTicket`, the
   * scan of the ticket a person kept for forty years.
   *
   * **And on 16.9.2026 five of them were, at last, actually deleted.** This paragraph said
   * for eleven days that the files "can be deleted" and the files stayed — which is the
   * shape rule 48 warns about: the comment was written, the bytes were not removed, and an
   * audit found them again as orphans. Gone from the folder now, with their `manifest.json`
   * rows and their `asset-provenance.json` patterns in the same move, because a row without
   * a file fails `tests/life.test.ts` and a provenance pattern that matches nothing fails
   * `npm run assets:provenance`:
   *
   *   propNewspaper.webp · propScarf.webp · propHat.webp · propCoffee.webp · propTicket.webp
   *
   * `propRadio` is NOT among them and never was — it is registered below and placed on the
   * table in four eras. `propBall` is still on disk: it is the same mis-cut and the same
   * case, and it is left as a stated recommendation rather than a sixth deletion, because
   * every removal here is a manual step somebody performs by hand in a browser (rules
   * 26/51) and a list he did not ask for is a list he pays for.
   */
  /**
   * הדברים עצמם — supporter goods and street furniture, cut from the September sheets.
   *
   * The red box used to be a list of Hebrew nouns on a card. These are the objects: a
   * striped scarf somebody put round a child's neck, a pennant, a sticker, a matchbox,
   * a stack of newspapers. An object you can look at is a memory; a noun is a receipt.
   */
  'propScarfRed',
  'propPennant',
  /**
   * הזכוכית — 5.9.2026. A deposit bottle and a full one, both cut from the same photograph
   * and both turned to bottle green: rule 8 does not let an amber bottle ship, and the
   * bottles a child picked off a Tel Aviv pavement in 1985 were green anyway. The empty
   * one is what the bottle job is made of; the full one stands on the kiosk floor beside
   * it, so the two states of the same object are both in the room.
   */
  'propBottle',
  'propBottleFull',
  /** ארגז בקבוקים אדום — his, 6.9.2026: the deposit, the carry, the thing you sit on */
  'propCrate',
  /** the newspaper stand by the kiosk door, from the nineties on */
  /** a wooden hand cart against the wall — the eighties, and only the eighties */
  'propCart',
  /**
   * …and one of the seven came back, re-cut. Stage B is a chapter about a transistor
   * radio, and the board's boombox is the only radio drawn in this project. On 3.9.2026
   * it was cropped at the first empty column past the body, which is where the neighbour
   * began, and it now ends where the radio ends.
   */
  'propRadio',
  /**
   * הקופסה האדומה — 21.9.2026. *"שמת את זה בקופסה האדומה"* נאמר בסוף כל פרק, ובחדר עמד
   * צעיף. תחליף עד שהציור יגיע: ארגז הפח של `props-ground`, בגוון פח אדום
   * (`scripts/life/cut-objects-2026-09-21.py`).
   */
  'propRedBox',
  'propFlag',
  'propSticker',
  'propBadges',
  'propMatchbox',
  /**
   * ריהוט הרחוב — the things a street holds rather than the things a hand holds.
   *
   * A backdrop is a photograph of a place with nobody in it. These are the objects that
   * make it somewhere people were this morning: a car left at the kerb, a bin by the
   * kiosk, a coach parked on the road to the ground, pennants strung over the road on
   * the one day of the year they go up. They are placed as scene DRESSING (`LayerDef`),
   * at fractions of the backdrop, so they hold their spot at any framing, and several of
   * them are conditional — the street a player crosses at four o'clock is not the street
   * they crossed at noon, and it should not look like it either.
   */
  'propBanner',
  'propSign',
  /**
   * 21.9.2026 — twelve props left this list: `propColumn`, `propBallReal`, `propPapers`,
   * `propCoins`, `propCar`, `propBus`, `propBin`, `propPlanter`, `propBunting`,
   * `propBarrier`, `propBarriers`, `propPosters`. They are pen-and-ink ENGRAVINGS from the
   * September props sheet — hatched, grey, drawn — standing in photographed rooms, and
   * the ball the boys kicked was one of them. Maor: *"תסיר מה שלא עומד בסטנדרטים."* The
   * ball is `propBall90`, the coins are the half-shekel photographed for the coin card
   * (`coinPali`), the papers are the clipping and the note; the street furniture is gone
   * rather than replaced, because the paintings already hold their own.
   */
  'coinPali',
  'propBall90',
  /**
   * 21.9.2026 — the objects Maor drew on 20.9 (`ingest-objects-2026-09-21.py`), each one
   * placed where the script names it: the suitcase of X01, the passport of E03, the remote
   * of A01, the diary on the fridge of L04, the key of U04, the phone and the laptop of the
   * flat abroad, the tickets of F01, the two bags of F02. `propRedBox` and `propRadio` were
   * rewritten in place — the tin box and the transistor, where a tinted crate and a
   * 78-pixel boombox had stood.
   */
  'propScarfKnit', 'propAlbum', 'propPaperFolded',
  'propSuitcase', 'propPassport', 'propTicketsPair', 'propKeys', 'propBackpack',
  'propHeadphones', 'propMug', 'propPlanner', 'propCable',
  'propDrum', 'propDarbuka', 'propFootball', 'propSportsBag', 'propBannerBlank', 'propBib',
  'propPhone2010', 'propPhone2020', 'propRemote', 'propLaptop', 'propRecorder', 'propNewspaper',
  // 4.9.2026 — the objects of the second movement, and two more for the box.
  'propNote', 'propNoteOpen', 'propBasketball', 'propTicket91', 'propScorePaper',
  'propWrapper', 'propClipping90', 'propCassette', 'propChalk', 'propBagStrap90',
] as const
export type PropKey = (typeof PROP)[number]

/**
 * הנייר האמיתי — the documents, which are not art at all.
 *
 * Everything else in this file was DRAWN for the game. These five were printed in 1986:
 * a child's ticket to משחק 15 — הפועל תל-אביב / מכבי חיפה, seven shekels, number 053 —
 * and four pages of מעריב ספורט from the two days either side of it. They are separated
 * from `PROP` because they obey a different rule. A prop can be redrawn; a document
 * cannot, and nothing in this game may put a word in one of them.
 *
 * They exist because rule 11 says the game may not invent a fact, and because the honest
 * way to end Stage A is not to describe what winning felt like. It is to hand the player
 * the front page and let 1986 say it: אדומים.
 */
/**
 * חפצים שצולמו — the ten scans of 17.9.2026, and the only keys in this file that do NOT
 * live in `public/life/art`.
 *
 * They are documents in the sense `DOC` means it and they are spliced into that list
 * below, so `{ e: 'doc' }` can name one and cannot name anything else (rule 49). What
 * makes them their own list is the FOLDER, and the folder is the point:
 *
 *   `public/life/art` is proved to hold not one yellow pixel. These carry 21.185% at the
 *   worst — the masthead of פנדל, a gold X somebody punched through a bus card, forty
 *   years of paper ageing. Nobody chose that yellow; cleaning it falsifies the scan.
 *   Maor granted it on 17.9.2026 in the general form — *"בתמונות מקור ושל דברים אותנטים
 *   הצהוב מאושר להישאר"* — and `lib/brand/yellowExemptions.ts` records it as a folder
 *   with a per-file measurement `tests/brand.test.ts` re-derives.
 *
 * Mixing them into the art folder would have made that proof impossible to state, which
 * is why `artUrl` asks the KEY which folder it belongs to rather than asking the caller.
 *
 * **They are declared before they are placed, and that is the same call `undercroft` and
 * `ussHallPre` got** (rule 43): the paper lands first so the chapter that holds one up
 * can name it instead of describing it. Nothing in the game reaches them yet.
 */
export const ARTEFACT = [
  // ארבעה שערים של פנדל — השבועון לספורטאי הצעיר. כל אחד נושא את מספר הגיליון ואת מחירו.
  'docPendel26', 'docPendel34', 'docPendel38', 'docPendel180',
  // טוטו — טופס מלא של מחזור 40/85 (8.6.85) וחבילת טפסים ריקים
  'docToto4085', 'docTotoForms',
  // כרטיס קולנוע "אלנבי" תל אביב, 40 מיל
  'docCinemaAllenby',
  // שלושה דורות של נסיעה: לירות, שקלים, וכרטיסייה מנוקבת
  'docEggedLira', 'docNoarCard', 'docPunchCards',
] as const
export type ArtefactKey = (typeof ARTEFACT)[number]

/** where a scanned object lives — never `ART_ROOT`, because that folder proves zero yellow */
export const ARTEFACT_ROOT = '/life/artefacts'

const ARTEFACT_KEYS: ReadonlySet<string> = new Set<string>(ARTEFACT)

/** Is this key one of the scanned objects rather than something drawn for the game? */
/**
 * הגופים שמסתכלים שמאלה (21.9.2026).
 *
 * המוסכמה של התיקייה היא שכל פרופיל מסתכל ימינה (`WorldScene.ART_FACES = 1`), והיא נכונה
 * לכל מה שצויר בשבילנו. היא לא נכונה לגיליונות הקהל של ספטמבר: `adultA1` ו-`adultB1`
 * הולכים שמאלה, ו-`adultB3`/`adultB5`/`adultB6` עומדים בשלושה-רבעים שמאלה. מ-2000 הם
 * תחליפים לאנשים שמדברים — ומי שעמד מימין לפוגי ו"הסתובב אליו" הסתובב בדיוק ממנו.
 * כל מי שמחליט לאן גוף מסתכל שואל כאן.
 */
export const FACES_LEFT: ReadonlySet<string> = new Set([
  'adultA1', 'adultB1', 'adultB3', 'adultB5', 'adultB6',
  // the boys of the same sheets: three walk left, two stand three-quarters left
  'youngA1', 'youngA7', 'youngB1', 'youngA6', 'youngB4',
])

/** does this figure, unflipped, look to the left of the screen */
export function facesLeft(figure: string): boolean {
  return FACES_LEFT.has(figure)
}

export function isArtefact(key: string): boolean {
  return ARTEFACT_KEYS.has(key)
}

export const DOC = [
  // 1986 — the ticket somebody kept for forty years, and the four pages either side of it
  'docTicket', 'paperBefore', 'paperAdumim', 'paperFive', 'paperCollector',
  /**
   * 1999 ו-2000 — nine more, scanned by Maor on 16.9.2026, and every one of them says
   * what it is ON ITSELF.
   *
   * That was the test for getting in. Sixteen scans arrived and seven are not here,
   * including three photographs that are better pictures than some of these: a squad
   * lifting a cup, a man in a scarf lifting a cup, a tackle in front of a yellow terrace.
   * None of the three carries a masthead, a date or a printed caption, so putting one on
   * a chapter's card would make the card assert a year that nothing on the paper states.
   * A document is allowed on this screen when the document itself is the citation.
   *
   * `days.ts` holds each one's transcription — the plaque, the ticket's own fixtures and
   * price, the two front pages' lead paragraphs — and the card prints that rather than a
   * caption in the game's voice, because rule 49 forbids writing on one of these and a
   * gloss beside one is most of the way to writing on it.
   */
  'docCup99', 'docPage99', 'docTikva99', 'docSeason9899',
  'docSeason9900',
  'docTicket2000', 'docProgramme2000', 'docRedBall2000', 'docDouble2000',
  // 27.9.2026 — the poster Maor approved for the boy's wall ("לתלייה בחדר של פוגי בשנות 80 90").
  // The paper says what it is on itself: the cup holders, and the words פוסטר למזכרת.
  'docPosterCup',
  // 17.9.2026 — the scanned objects. Spread rather than re-typed, so the two lists cannot
  // disagree about which keys a `{ e: 'doc' }` effect accepts.
  ...ARTEFACT,
] as const
export type DocKey = (typeof DOC)[number]

/** Printed portrait plates for the dialogue box — cream ground kept, not cut out. */
export const PORTRAIT_ART = [
  /**
   * פוגי — five plates painted as portraits, not cropped out of a body.
   *
   * Every other name in this list is a bust lifted off a figure sheet, which is why they
   * are soft: the top 30% of a 400-pixel man is a 120-pixel head. `docs/life/ART-PROMPTS.md`
   * §2.3 asked for the protagonist's face to be drawn at portrait size instead, six
   * expressions on a warm cream ground, and five of the six came back usable — the sixth
   * ran off the right edge of the delivered frame and is not faked from a crop.
   *
   * They are also the only files in this project written without a colour table. A plate
   * is 60% flat cream and 15% face; both quantisers spend their budget on the cream and
   * map the lit side of a cheek onto it, which is five portraits with holes punched in
   * them. `scripts/life/ingest-2026-09.py` carries the arithmetic.
   */
  'facePogi',
  'facePogi-smile',
  'facePogi-wide',
  'facePogi-shout',
  'facePogi-down',

  'faceKid',
  'faceOfir',
  'faceAmit',
  'faceEfi',
  'faceKeren',
  'faceKobi',
  'faceRachel',
  'faceFan',
  'faceOldMan',
  // the player, later — used by the life-line, never by a speaker plate in this chapter
  'faceHero80',
  'faceHero90',
  'faceSoldier',
  'faceElimelech',
  'faceElimelech-ball',
  'faceElimelech-calm',
  'faceElimelech-look',
  'faceElimelech-shout',
  'faceElimelech-side',
  'faceElimelech-smile',
  'faceKeren90',
  'faceKeren90-b',
  'faceKeren90-profile',
  'faceKeren90-side',
  'faceKeren90-smile',
  'faceSinai',
  'faceSinai-b',
  'faceSinai-kit',
  'faceSinai-look',
  'faceSinai-point',
  'faceSinai-shout',
  'faceSinai-side',
  // 4.9.2026
  'faceRachel90', 'faceRachel90-smile', 'faceRachel90-worried', 'faceRachel90-nu', 'faceRachel90-angry', 'faceRachel90-side',
  'faceTeacher', 'faceTeacher-glasses', 'faceTeacher-share', 'faceTeacher-tired', 'faceTeacher-smile', 'faceTeacher-angry',
  'faceOldMan-smile', 'faceOldMan-what', 'faceOldMan-story', 'faceOldMan-over', 'faceOldMan-laugh',
  /**
   * 5.9.2026 — a face for everybody who spoke through `faceFan`, cut from their own
   * figure by `scripts/life/make-faces.py`. Freddy and Melamed borrow a clean adult until
   * their sheets are drawn (GRAPHICS-REQUESTS §6).
   */
  'faceShachor',
  'faceSoko',
  'faceAsaf',
  'faceFreddy',
  'faceMelamed',
  'faceHermesh',
  'faceBatya',
  'faceYosef',
  'faceUsher',
  'faceVendor',
  'faceLiron',
  'faceMichel',
  'faceLimor',
  'faceDudu',
  'faceBarry',
  'faceAliza',
  'faceYaron',
  'faceCommander',
  'faceBoss',
  'faceDriver',
  'faceSupporter',
  'faceSupporterB',
  'faceWoman',
  'faceYoung',
  'faceOfir90',
  'faceAmit90',
  /**
   * 21.9.2026 — one plate per stand-in BODY of the adult life, cut from that body by
   * `scripts/life/cast-faces-2026-09-21.py`, so the face in the box is the person on the
   * floor (`FACES_2000` in `world/castFigures.ts`, rule 67).
   */
  'faceStandA1', 'faceStandA2', 'faceStandA4', 'faceStandA6',
  'faceStandB1', 'faceStandB2', 'faceStandB3', 'faceStandB4', 'faceStandB5', 'faceStandB6', 'faceStandB7',
  // the grown Efi and Kobi, from their own 1996/1990 bodies
  'faceEfi96', 'faceKobi90',
  // 24.9.2026 — the ages of the adult life, each cut from its own body
  // (`ingest-characters-2026-09-24.py`); Rachel at sixty is a portrait with no body (README)
  'facePogi32', 'facePogi40', 'facePogi47', 'faceKobi62', 'faceKobi72',
  'faceOfir40', 'faceAmit40', 'faceEfi44', 'faceKeren40', 'faceRachel60',
] as const

/**
 * עומק — the three planes a purpose-drawn exterior was split into (4.9.2026), aligned
 * pixel-for-pixel to the flat painting under the same key. FAR is opaque; MID and NEAR
 * carry alpha. A room without planes is drawn flat, as before; a room with them scrolls
 * its sky slower than its wall and its lamp post faster, which is the whole of depth.
 */
// 5.9.2026 — `stand` left this list when the terrace was repainted from the pitch. Its
// three planes were cut from the OLD painting and aligned to it pixel for pixel, so they
// were wrong the moment the picture changed; and a stand seen head-on has nothing to
// parallax — the camera pans along one flat wall of concrete. The crowd that used to be
// the mid plane is `standCrowd`, a layer, which can be turned off in a year when the
// ground is empty.
export const PARALLAX = ['street', 'approach', 'gate7'] as const

/**
 * קלוז-אפ — a face filling the glass for one line (`Say.closeUp`). 1080×1350, the
 * place blurred behind the person, painted in the moment's own light. Until the
 * cinematic plates land, each key falls back to the speaker's portrait plate
 * (`CLOSE_UP_FALLBACK`), drawn large — a stand-in, and an honest one.
 */
export const CLOSE_UP = [
  'cuKobiWhere', 'cuKobiTable', 'cuRachelNu', 'cuRachelWatch',
  'cuPogiReveal', 'cuOfir90', 'cuTeacherShare', 'cuUsherNight',
] as const
/**
 * הפלייטים שכבר צוירו — the close-ups that exist as their own 788×1400 painting.
 *
 * Seven of the eight landed on 16.9.2026, from the brief in
 * `docs/life/ART-PROMPTS-2026-09-16.md`, and were ingested by
 * `scripts/life/ingest-art-2026-09-16.py`: de-yellowed after sizing (rule 44), written
 * as lossless WebP, and counted back off the decoded bytes with alpha respected (rule
 * 61) — 454, 1748 and 991 yellow pixels in three of them before the treatment, zero in
 * all seven after it.
 *
 * `cuPogiReveal` is deliberately NOT here. The delivery's own README says that file is a
 * PNG export of `tunnelReveal.webp` with the same decoded pixels, so ingesting it would
 * put one picture on disk under two names and let the copies drift. Its fallback already
 * points at `tunnelReveal`, which is the same image — so the player sees the intended
 * art either way, and the registry does not claim a painting that is really a pointer.
 */
export const CLOSE_UP_PAINTED: readonly string[] = [
  'cuKobiWhere', 'cuKobiTable', 'cuRachelNu', 'cuRachelWatch',
  'cuOfir90', 'cuTeacherShare', 'cuUsherNight',
]
/**
 * הפלייט שעומד במקום הקלוז-אפ — and on 16.9.2026 five of the eight named the wrong person.
 *
 * The fallback is not a placeholder colour; it is the face a player actually sees on the
 * game's eight most dramatic lines until the painted plates land. Three were plainly
 * miscast — `cuOfir90` showed the 1986 child for a line Ofir says at fourteen, `cuUsherNight`
 * showed `faceFan` (a man in Hapoel red, cut from the Bloomfield crowd) for the usher at
 * Ussishkin while `faceUsher` sat on disk, and `cuKobiWhere` showed Kobi for a line פוגי
 * SHOUTS AT HIM. Two more (`cuTeacherShare`) had a plate cut for that exact beat and
 * pointed past it.
 *
 * And the Rachel pair stayed on the neutral `faceRachel90` ON PURPOSE while the named
 * plates were two half-Rachels cut across the gutter of an expression sheet. That was
 * fixed at source on 16.9.2026: the five Rachel plates and the two teacher plates were
 * re-cut one whole column at a time and all seven now arrive at a uniform 130×260, which
 * is what a cut that respects the gutter looks like — the widths they replaced ran from
 * 102 to 202 and that spread WAS the bug.
 *
 * Since the same delivery brought seven real close-up paintings, every entry below is now
 * a second line of defence rather than what a player sees: `CLOSE_UP_PAINTED` wins, and
 * the fallback is only reached for `cuPogiReveal` (which points at the identical picture)
 * or if a `.webp` goes missing from disk.
 */
export const CLOSE_UP_FALLBACK: Record<(typeof CLOSE_UP)[number], string> = {
  // פוגי shouts this one at his father; the face on the glass is the boy's
  cuKobiWhere: 'facePogi-shout',
  cuKobiTable: 'faceKobi',
  cuRachelNu: 'faceRachel90',
  cuRachelWatch: 'faceRachel90',
  cuPogiReveal: 'tunnelReveal',
  cuOfir90: 'faceOfir90',
  cuTeacherShare: 'faceTeacher-share',
  cuUsherNight: 'faceUsher',
}

/**
 * פנורמות — 360° cylindrical, 4096×1024, horizon at 48%. The moments the game turns
 * into the boy's own eyes. Until the painted panoramas land, `make-panoramas.py`
 * builds a stand-in for each from the room's flat painting (mirrored to wrap).
 */
export const PANORAMA = [
  'panoReveal', 'panoTerrace1986', 'panoUssHall', 'panoUssDerby',
  'panoKitchen90', 'panoBedroomMorning90', 'panoGate7', 'panoClassroom',
] as const

/**
 * סמלי האינטראקציה — שנים־עשר, ומחלקה משלהם מאותה סיבה ש-`DOC` היא מחלקה משלה.
 *
 * מאור מסר אותם ב-20.9.2026 כגיליון אחד על ירוק, עם שורה אחת שהיא כל ההנחיה: *"כדאי
 * להצמיד לכל סמל תווית עברית קצרה, כדי שהפעולה תהיה ברורה מיד."* שתי מסקנות מהמשפט
 * הזה, ושתיהן כללים ולא סגנון:
 *
 * · **סמל לעולם אינו לבדו.** הוא תמיד עם המילה, כי דיסקית עם זכוכית מגדלת יכולה להיות
 *   "תסתכל", "תחפש" או "תגדיל", והמשחק הזה אומר *"תסתכל על הכתובת על הקיר"*. הסמל הוא
 *   מה שעוזר לזהות את השורה במבט; הוא אינו השורה.
 * · **הוא לא מחליף את הפועל.** `life.verb.*` נשאר מקור האמת למה הלחיצה תעשה (כלל 41),
 *   והסמל נבחר ממנו — `ICON_OF_VERB` למטה — כך שפועל חדש בלי סמל לא מקבל תמונה שגויה,
 *   הוא פשוט מקבל מילה בלבד.
 *
 * ארבעת הראשונים הם פעולות בעולם; ארבעת האמצעיים הם מה שפותחים מ-☰; ארבעת האחרונים
 * הם המערכת עצמה. `scripts/life/ingest-icons-2026-09-20.py` חותך אותם, מודד את הרשת
 * במקום להקליד אותה, ומאמת אפס צהוב על הבייטים ששמורים.
 */
export const ICON = [
  'iconTalk', 'iconLook', 'iconTake', 'iconWalk',
  'iconMap', 'iconTasks', 'iconBag', 'iconPhone',
  'iconTime', 'iconCheckpoint', 'iconSaved', 'iconSettings',
] as const

export type IconKey = (typeof ICON)[number]

/**
 * הפועל בוחר את הסמל, ולא להפך.
 *
 * `Verb` ב-`world/scenes.ts` הוא מה שהמשחק כבר מבטיח שהלחיצה תעשה. חמישה מהעשרה
 * מצביעים על אותה דיסקית בכוונה: `look`, `watch` ו-`gaze` הם כולם להסתכל, ו-`enter`
 * ו-`exit` הם כולם לעבור דלת — להמציא שלושה סמלים לשלוש מילים שמתארות פעולה אחת היה
 * מלמד את השחקן הבדל שאינו קיים.
 *
 * `buy`, `play` ו-`sit` אינם כאן **בכוונה**: אין להם דיסקית בחבילה, והשורה שלהם תמשיך
 * להיות מילה בלבד. סמל שאינו קיים עדיף על סמל שאומר משהו אחר.
 */
export const ICON_OF_VERB: Readonly<Partial<Record<string, IconKey>>> = {
  talk: 'iconTalk',
  look: 'iconLook',
  watch: 'iconLook',
  gaze: 'iconLook',
  take: 'iconTake',
  enter: 'iconWalk',
  exit: 'iconWalk',
}

/**
 * שנים־עשר סמלי **מצב** — ומה שההפרדה מ-`ICON` שומרת עליה (21.9.2026).
 *
 * מאור מסר גיליון שני. הראשון (20.9) הוא פעולות — דבר, הסתכל, קח — והוא יושב על כפתור:
 * `ICON_OF_VERB` עונה על *"מה יקרה אם אלחץ"*. השני הוא **מה שהמשחק סופר**: ארנק, ברק,
 * מסכה, לב עם צלב, מגן עם צעיף, לחיצת יד, שני לבבות, הורה וילד, ספר, מגפון, גלובוס,
 * תיק עבודה. אלה לא נלחצים.
 *
 * שתי מחלקות ולא אחת מורחבת, כי שם אחד לשני מושגים הוא פגם (כלל 59, בכיוון ההפוך):
 * מפתח שעונה גם על "אפשר ללחוץ" וגם על "יש לי" ייקרא מחר בשתי המשמעויות, ומישהו ישים
 * מגפון על כפתור.
 *
 * **השם הוא מה שהסמל מצייר, לא מה שהוא מודד.** `emBook` ולא `emKnowledge` — ביום שבו
 * הספר יעמוד גם ליד ההיסטוריה של המועדון, שם שנקרא על שם המדד יתחיל לשקר (כלל 45,
 * בצורתו לנכסים). החיבור בין ציור למדד יושב בטבלאות למטה, והוא מה שמותר לשנות.
 */
export const EMBLEM = [
  'emWallet', 'emEnergy', 'emMask', 'emHealth',
  'emScarf', 'emHands', 'emHearts', 'emChild',
  'emBook', 'emMegaphone', 'emGlobe', 'emCase',
] as const

export type EmblemKey = (typeof EMBLEM)[number]

/**
 * חמש הטבלאות שמחברות ציור למדד, וכל אחת **חלקית בכוונה**.
 *
 * `Partial` כאן אינו רישול — הוא אותה הכרעה של `ICON_OF_VERB`: *"סמל שאינו קיים עדיף
 * על סמל שאומר משהו אחר"*. ארבעה מקומות נשארים ריקים ושווה לדעת מי הם:
 *
 * · **`organization`** — אין בחבילה סמל לארגון. לא לוח, לא שעון, לא רשימה. הוא יישאר
 *   מילה עד שיצויר, ולשים עליו את התיק (שהוא `business`) היה מלמד שהם אותו כישור.
 * · **`person`** ו-**`decade`** בגיליון המדדים — אישיות ומדדי עשור אינם דבר אחד שאפשר
 *   לצייר; המסכה היא **יצירתיות**, לא "מי אתה".
 * · **חמישה מתוך שישה קהלים** — הגלובוס הוא `international` ודי. לשער 7 ולשער 5 יש
 *   מספרים ושמות שהמשחק כבר מכיר, ודיסקית גנרית עליהם אומרת פחות מהמילה.
 *
 * המפתחות הם מחרוזות ולא טיפוסי-איחוד, כדי ש-`runtime/art.ts` יישאר בלי תלות בשאר
 * המנוע (בדיוק כמו `ICON_OF_VERB`). `tests/life.test.ts` מוודא שכל מפתח בכל טבלה הוא
 * מזהה אמיתי — שומר במקום טיפוס, בלי מעגל ייבוא.
 */
export const EMBLEM_OF_SKILL: Readonly<Partial<Record<string, EmblemKey>>> = {
  knowledge: 'emBook',
  communication: 'emMegaphone',
  business: 'emCase',
  creativity: 'emMask',
  // organization — אין לו סמל, ראה למעלה
}

/** משאב שהשחקן מוציא: הכיס והכוח. שניהם עלויות בכל בחירה, ורק אחד מהם היה על הזכוכית. */
export const EMBLEM_OF_RESOURCE: Readonly<Partial<Record<string, EmblemKey>>> = {
  money: 'emWallet',
  energy: 'emEnergy',
}

/** קבוצות בגיליון המדדים. `person` ו-`decade` בחוץ בכוונה. */
export const EMBLEM_OF_GAUGE_GROUP: Readonly<Partial<Record<string, EmblemKey>>> = {
  heart: 'emScarf',
  wellbeing: 'emHealth',
  people: 'emHands',
}

/** מסלולי חיים. `WORK` חולק את התיק עם הכישור העסקי, וזה נכון: זו אותה עבודה. */
export const EMBLEM_OF_TRACK: Readonly<Partial<Record<string, EmblemKey>>> = {
  PARTNERSHIP: 'emHearts',
  PARENTHOOD: 'emChild',
  WORK: 'emCase',
}

/**
 * ששת המסלולים — וזה השימוש שהגלובוס נולד בשבילו.
 *
 * הניסיון הראשון היה `EMBLEM_OF_AUDIENCE`, וגלובוס על הקהל הבינלאומי הוא נכון וכמעט
 * חסר תועלת: הקהל מופיע **בתוך משפט** על כרטיס המסלול, ודיסקית באמצע שורה אינה נקראת.
 * המסלול עצמו הוא שורה עם כותרת, ושם סמל עובד — ולכן הטבלה היא לפי מסלול.
 *
 * ההתאמות נקראו מהמסלול ולא מהכישור שלו: `ULTRAS` הוא `organization` שאין לו סמל, אבל
 * מוביל יציע **הוא** המגפון; `USSISHKIN_FOUNDER` הוא אותו כישור בדיוק, והוא המגן עם
 * הצעיף, כי מה שהוא מקים הוא מועדון. שני מסלולים, אותו כישור, שני סמלים — וזה בדיוק
 * למה הטבלה היא לפי מסלול ולא נגזרת מ-`EMBLEM_OF_SKILL`.
 */
export const EMBLEM_OF_ROUTE: Readonly<Partial<Record<string, EmblemKey>>> = {
  ULTRAS: 'emMegaphone',
  JOURNALIST: 'emBook',
  OWNER: 'emCase',
  CREATOR: 'emMask',
  USSISHKIN_FOUNDER: 'emScarf',
  TRAVELLER: 'emGlobe',
}

/** the tunnel, first person: six tiling textures and two sprites */
export const TUNNEL_TEXTURE = [
  'texTunnelWall', 'texTunnelWallPoster', 'texTunnelFloor', 'texTunnelCeiling', 'texTunnelSteps', 'texTunnelDoor',
] as const
export function parallaxKeys(art: string): { far: string; mid: string; near: string } {
  return { far: `${art}--far`, mid: `${art}--mid`, near: `${art}--near` }
}

/** how much nearer NEAR is than the wall — its size AND its scroll factor, one number */
export const NEAR_PLANE = 1.16
/**
 * …and how far left it is pulled, so the object painted at the left edge sits mostly off
 * the glass when the boy starts by the front door: a foreground that covers the first
 * door of the game is a wall, not depth.
 */
export const NEAR_PLANE_SHIFT = 0.075

export type ParallaxPlane = 'far' | 'mid' | 'near'

/** where a plane stands in the world, in the world's own numbers */
export interface PlaneBox {
  /** world x of the left edge, before the plane's own scroll factor is applied */
  x: number
  /** world y of the top edge */
  y: number
  width: number
  height: number
  /** how fast it tracks the camera on X. Vertical never parallaxes. */
  scroll: number
}

/**
 * מישור — a plane is sized from the WORLD and never from its own file (16.9.2026).
 *
 * This is arithmetic, so it lives here, out of Phaser's reach, for the same reason
 * `walk.ts` does: the bug it exists because of is a sizing bug, and a sizing bug is
 * cheaper to hold to `tests/life-parallax.test.ts` than to a screenshot.
 *
 * `add.image` draws a texture at its own pixel size, and the planes are NOT delivered at
 * their backdrop's size: `gate7.webp` is 2728×1536 and all three of its planes are
 * 1600×900 — the same picture at 0.586. So MID, the wall every door and every actor in
 * `scenes.ts` is measured against, covered the top-left 58% of gate seven (41% of the
 * street, 35% of the route) and the rest of the world was the camera's background
 * colour. On a phone that is the painting in the top half of the glass and the whole
 * cast standing below it on black — `bloomfield-outside`, the terrace, reported twice.
 * The street hid it for two weeks because `streetGround` and `streetFore` are full-world
 * layers that paint the bottom back in, which is why only gate seven was ever reported.
 *
 * Nothing here distorts the art: every plane is its backdrop's aspect to within a tenth
 * of a per cent, and that RELATIONSHIP is what the test asserts rather than either
 * number — so the day a plane is redelivered at 2728×1536, nothing changes.
 */
export function parallaxPlane(plane: ParallaxPlane, W: number, H: number): PlaneBox {
  if (plane === 'near') {
    return {
      x: -NEAR_PLANE_SHIFT * W,
      // anchored by its FOOT on the painting's bottom edge, the way it was drawn: a
      // foreground that grows upward out of the floor, not downward out of the sky
      y: H - NEAR_PLANE * H,
      width: NEAR_PLANE * W,
      height: NEAR_PLANE * H,
      scroll: NEAR_PLANE,
    }
  }
  // FAR slides slower than the wall; MID is the wall, pixel-aligned with the flat
  // painting, so nothing the player touches has moved.
  return { x: 0, y: 0, width: W, height: H, scroll: plane === 'far' ? 0.86 : 1 }
}

/**
 * **התיקייה נגזרת מהמפתח, לא מהקורא.**
 *
 * `OpeningSequence` had to learn the same lesson on 13.9.2026 and chose its extension by
 * the FOLDER a beat names rather than by the file (rule 61). This is the same shape one
 * step further along: everything this game draws lives in `public/life/art`, which proves
 * zero yellow, and the ten scanned objects live in `public/life/artefacts`, which is
 * allowed to carry the yellow that is printed on them. A caller that had to remember
 * which was which would get it wrong exactly once, silently, as a 404 in front of a
 * player.
 */
export function artUrl(key: string): string {
  return isArtefact(key) ? `${ARTEFACT_ROOT}/${key}.webp` : `${ART_ROOT}/${key}.webp`
}

/**
 * ההמשך של הציור — the two strips `scripts/life/finish-backdrops.py` writes for every
 * backdrop: the sky continued above it and the ground continued below it.
 *
 * They exist for one reason. A phone held upright is much taller than any room we own,
 * and the only ways to fill it were to crop the room to a slot or to leave black bands.
 * With the strips, the camera can frame a tall slice of the WORLD — sky, room, pavement —
 * and the room itself keeps every coordinate it had: the strips hang off the painting at
 * y < 0 and y > H and nothing in a scene file knows they are there.
 */
export function extensionKeys(art: string): { sky: string; ground: string } {
  return { sky: `${art}--sky`, ground: `${art}--ground` }
}

/**
 * Loading is per scene. Boot warms only what the child is made of.
 *
 * The away cycle is in here too, and it has to be: it is played the first time the child
 * walks towards the back of a room, and a texture that arrives during a walk is a frame
 * of nothing under a moving sprite. Deduplicated because `pogi-side` is both a pose and
 * half the side-on walk, and asking Phaser to load one key twice logs a warning per room.
 */
export const BOOT_FIGURES: string[] = [
  ...new Set<string>([...Object.values(KID_POSE), ...KID_WALK, ...KID_WALK_AWAY]),
]
