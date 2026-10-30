/**
 * LIFE · RUSH — the mission templates. Written once, played by every club.
 *
 * Each template is data: a verb, a camera, a route, a clock, what can go wrong, and what it needs
 * from a club's archive. `fit.ts` decides per club whether it is READY (bound to an approved night),
 * NEUTRAL (played without a date or a name), HELD (research must find something first) or
 * IRRELEVANT (not part of this club's story).
 *
 * Text is English source with tokens: `{club}`, `{city}`, `{rival}`, `{ground}`, `{date}`.
 * A neutral title or brief never carries `{date}`, `{rival}` or `{ground}` (validated).
 */
import type {MissionTemplate} from './spec'

export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  {
    id: 'kickoff-run', verb: 'run', camera: 'chase', route: 'main', ages: [6, 70], clock: 240,
    hazards: ['clock', 'traffic', 'crowd'],
    needs: [
      {of: {anchor: ['home']}, grade: 'enriching', day: true, why: 'A home match on a known day sets the kickoff the run is racing.'},
      {of: {club: 'ground'}, grade: 'decor', why: 'The gates he runs to carry the ground\'s name.'},
    ],
    title: 'Kickoff run · {date}', brief: 'The whistle at {ground} will not wait. Through {city}, to the gate, before kickoff.',
    neutralTitle: 'Kickoff run', neutralBrief: 'The whistle will not wait. Through {city}, to the gate, before kickoff.',
    weight: {home: 1, match: 0.5},
  },
  {
    id: 'sneak-in', verb: 'sneak', camera: 'eyes', route: 'main', ages: [11, 17], clock: 200,
    hazards: ['clock', 'steward', 'crowd'],
    needs: [
      {of: {anchor: ['home', 'derby', 'final']}, grade: 'enriching', day: true, why: 'A big night at home is the night a kid without a ticket tries the fence.'},
    ],
    title: 'No ticket · {date}', brief: 'No ticket, no money, one gap in the fence. Get in before the stewards look your way.',
    neutralTitle: 'No ticket', neutralBrief: 'No ticket, no money, one gap in the fence. Get in before the stewards look your way.',
    weight: {derby: 1, final: 1, home: 0.5},
  },
  {
    id: 'away-day', verb: 'drive', camera: 'chase', route: 'main', ages: [17, 70], clock: 420,
    hazards: ['clock', 'traffic', 'weather', 'police'],
    needs: [
      {of: {anchor: ['away']}, grade: 'critical', day: true, why: 'An away day is a real away match on a known day — the road and the kickoff come from it.'},
    ],
    title: 'Away day · {date}', brief: 'A long road from {city}, a full car, one kickoff. Make it.',
    neutralTitle: 'Away day', neutralBrief: 'A long road from {city}, a full car, one kickoff. Make it.',
    weight: {away: 1, europe: 0.5},
  },
  {
    id: 'cup-final-trip', verb: 'drive', camera: 'chase', route: 'main', ages: [12, 70], clock: 480,
    hazards: ['clock', 'traffic', 'crowd', 'police'],
    needs: [
      {of: {anchor: ['final']}, grade: 'critical', day: true, why: 'A cup-final trip stands on a final the archive dates to the day.'},
    ],
    title: 'The final · {date}', brief: 'The whole city is on the road to the final. So is every car in front of you.',
    neutralTitle: 'The final', neutralBrief: 'The whole city is on the road to the final. So is every car in front of you.',
    weight: {final: 3},
  },
  {
    id: 'europe-night', verb: 'find', camera: 'eyes', route: 'main', ages: [16, 70], clock: 300,
    hazards: ['clock', 'crowd', 'police', 'weather'],
    needs: [
      {of: {anchor: ['europe']}, grade: 'critical', day: true, why: 'A European night abroad stands on a European match dated to the day.'},
    ],
    title: 'A night in Europe · {date}', brief: 'A foreign city, a dead phone, and your friend’s ticket in your pocket. Find him before the gates shut.',
    neutralTitle: 'A night in Europe', neutralBrief: 'A foreign city, a dead phone, and your friend’s ticket in your pocket. Find him before the gates shut.',
    weight: {europe: 3},
  },
  {
    id: 'title-night', verb: 'find', camera: 'eyes', route: 'main', ages: [6, 70], clock: 240,
    hazards: ['clock', 'crowd'],
    needs: [
      {of: {anchor: ['title']}, grade: 'critical', why: 'A title night stands on a title the archive records.'},
      {of: {anchor: ['title']}, grade: 'enriching', day: true, why: 'The night itself needs the day the title was won, not only the year.'},
    ],
    title: 'Champions · {date}', brief: 'The whistle went and nobody went home. Your father was on the terrace; now he is somewhere on the grass. Find him.',
    neutralTitle: 'Champions', neutralBrief: 'The whistle went and nobody went home. Your father was on the terrace; now he is somewhere on the grass. Find him.',
    weight: {title: 3},
  },
  {
    id: 'where-you-stood', verb: 'find', camera: 'eyes', route: 'main', ages: [14, 70], clock: 180,
    hazards: ['clock', 'crowd', 'weather'],
    needs: [
      {of: {anchor: ['relegation']}, grade: 'critical', why: 'The night the club went down is a recorded relegation, never assumed.'},
    ],
    title: 'Where you stood · {date}', brief: 'Everyone is leaving. Go back up the steps to where you always stood, one last time this season.',
    neutralTitle: 'Where you stood', neutralBrief: 'Everyone is leaving. Go back up the steps to where you always stood, one last time this season.',
    weight: {relegation: 3, promotion: 1},
  },
  {
    id: 'new-ground', verb: 'run', camera: 'chase', route: 'main', ages: [6, 70], clock: 240,
    hazards: ['clock', 'crowd', 'traffic'],
    needs: [
      {of: {anchor: ['ground']}, grade: 'critical', why: 'The first day at a ground stands on a recorded opening or move.'},
      {of: {club: 'ground'}, grade: 'enriching', why: 'The ground\'s name goes on every sign of the way in.'},
    ],
    title: 'The first day · {date}', brief: 'Nobody knows the way in yet. Find the gate at {ground} before the first whistle there.',
    neutralTitle: 'The first day', neutralBrief: 'Nobody knows the way in yet. Find the new gate before the first whistle there.',
    weight: {ground: 2, founding: 0.5},
  },
  {
    id: 'derby-banner-raid', verb: 'sneak', camera: 'eyes', route: 'ultras', ages: [16, 40], clock: 300,
    hazards: ['clock', 'steward', 'police', 'steal', 'shove'],
    needs: [
      {of: {club: 'rival'}, grade: 'critical', absentMeans: 'irrelevant', why: 'A banner raid needs the club\'s approved primary rival.'},
      {of: {anchor: ['derby']}, grade: 'enriching', day: true, why: 'The raid happens on a recorded derby day.'},
    ],
    title: 'Their banner · {date}', brief: 'Their banner hangs in a storeroom by the {rival} end. Bring it back before the derby — nobody gets hurt.',
    neutralTitle: 'Their banner', neutralBrief: 'The other lot\'s banner hangs in a storeroom by their end. Bring it back before the derby — nobody gets hurt.',
    weight: {derby: 3},
  },
  {
    id: 'tifo-carry', verb: 'carry', camera: 'chase', route: 'ultras', ages: [15, 45], clock: 360,
    hazards: ['clock', 'crowd', 'police', 'strike'],
    needs: [
      {of: {club: 'rival'}, grade: 'critical', absentMeans: 'irrelevant', why: 'The choreography is made for the derby against the approved rival.'},
      {of: {anchor: ['derby']}, grade: 'enriching', day: true, why: 'The carry happens on a recorded derby day.'},
    ],
    title: 'The choreography · {date}', brief: 'Two bundles of paper for the whole choreography, and their lot throwing whatever they hold. Get both to the stand whole.',
    neutralTitle: 'The choreography', neutralBrief: 'Two bundles of paper for the whole choreography, and the other lot throwing whatever they hold. Get both to the stand whole.',
    weight: {derby: 2},
  },
  {
    id: 'bottle-run', verb: 'run', camera: 'chase', route: 'main', ages: [6, 14], clock: 300,
    hazards: ['clock', 'traffic', 'crowd'],
    needs: [],
    title: 'Six short', brief: 'Six short for the shirt. Every empty bottle on these streets is worth something — and the kiosk by the gate shuts at kickoff.',
    neutralTitle: 'Six short', neutralBrief: 'Six short for the shirt. Every empty bottle on these streets is worth something — and the kiosk by the gate shuts at kickoff.',
    weight: {home: 0.3},
  },
  {
    id: 'lead-the-way', verb: 'run', camera: 'chase', route: 'main', ages: [8, 70], clock: 300,
    hazards: ['clock', 'traffic', 'crowd'],
    needs: [{of: {club: 'ground'}, grade: 'decor', why: 'The gate you lead them to carries the ground\'s name.'}],
    title: 'Lead the way', brief: 'Today you are the one who knows the way. Bring them through {city} to the gate — together, and in time.',
    neutralTitle: 'Lead the way', neutralBrief: 'Today you are the one who knows the way. Bring them through {city} to the gate — together, and in time.',
    weight: {home: 0.5},
  },
  {
    id: 'errands', verb: 'run', camera: 'chase', route: 'main', ages: [18, 70], clock: 320,
    hazards: ['clock', 'traffic', 'crowd'],
    needs: [],
    title: 'What is missing', brief: 'Paint, cloth, tape, paper — scattered over half of {city}. Gather it and get it to the club room before they open the gates.',
    neutralTitle: 'What is missing', neutralBrief: 'Paint, cloth, tape, paper — scattered over half of {city}. Gather it and get it to the club room before they open the gates.',
    weight: {},
  },
  {
    id: 'banner-march', verb: 'carry', camera: 'chase', route: 'main', ages: [16, 70], clock: 360,
    hazards: ['clock', 'traffic', 'crowd'],
    needs: [{of: {anchor: ['home']}, grade: 'enriching', day: true, why: 'A march to a home match on a known day sets the kickoff it is racing.'}],
    title: 'The march · {date}', brief: 'The big banner, at the front. Every corner on the way to {ground} has people waiting to fall in behind it.',
    neutralTitle: 'The march', neutralBrief: 'The big banner, at the front. Every corner on the way has people waiting to fall in behind it.',
    weight: {home: 1, derby: 0.5},
  },
  {
    id: 'flat-run', verb: 'run', camera: 'chase', route: 'main', ages: [4, 12], clock: 75,
    hazards: ['clock'],
    needs: [],
    title: 'Before kick-off', brief: 'The scarf is in the box on top of the wardrobe. One battery is in a drawer somewhere, one rolled under the kitchen table. Dad is on the sofa with a dead radio, and the whistle will not wait.',
    neutralTitle: 'Before kick-off', neutralBrief: 'The scarf is in the box on top of the wardrobe. One battery is in a drawer somewhere, one rolled under the kitchen table. Dad is on the sofa with a dead radio, and the whistle will not wait.',
    weight: {},
  },
  {
    id: 'sticker-swap', verb: 'find', camera: 'eyes', route: 'main', ages: [8, 14], clock: 200,
    hazards: ['clock', 'crowd'],
    needs: [],
    title: 'The missing square', brief: 'One square left empty in the album, and somebody in this playground has it twice. Ask around. Find them before the bell.',
    neutralTitle: 'The missing square', neutralBrief: 'One square left empty in the album, and somebody in this playground has it twice. Ask around. Find them before the bell.',
    weight: {},
  },
  {
    id: 'tin-hunt', verb: 'find', camera: 'chase', route: 'main', ages: [6, 14], clock: 90,
    hazards: ['clock'],
    needs: [],
    title: 'Where is the tin?', brief: 'Mum tidied his room, and the savings tin is not where he left it. Under the bed, in the wardrobe, somewhere. The kiosk shuts at six.',
    neutralTitle: 'Where is the tin?', neutralBrief: 'Mum tidied his room, and the savings tin is not where he left it. Under the bed, in the wardrobe, somewhere. The kiosk shuts at six.',
    weight: {},
  },
  {
    id: 'ticket-hunt', verb: 'find', camera: 'chase', route: 'main', ages: [5, 14], clock: 90,
    hazards: ['clock'],
    needs: [],
    title: 'The tickets', brief: 'Dad has checked the tickets eleven times. Now he cannot find them. Somewhere in this flat is an envelope, and the bus will not wait.',
    neutralTitle: 'The tickets', neutralBrief: 'Dad has checked the tickets eleven times. Now he cannot find them. Somewhere in this flat is an envelope, and the bus will not wait.',
    weight: {},
  },
  {
    id: 'night-window', verb: 'sneak', camera: 'chase', route: 'main', ages: [10, 17], clock: 150,
    hazards: ['clock'],
    needs: [],
    title: 'Grounded', brief: 'Dad is at the match. Mum is on the sofa with the television and the door open. Your shoes are by the front door, and your window is the only way out.',
    neutralTitle: 'Grounded', neutralBrief: 'Dad is at the match. Mum is on the sofa with the television and the door open. Your shoes are by the front door, and your window is the only way out.',
    weight: {},
  },
  {
    id: 'pack-bag', verb: 'find', camera: 'chase', route: 'main', ages: [12, 20], clock: 110,
    hazards: ['clock'],
    needs: [],
    title: 'The away bag', brief: 'Scarf, money, the sandwiches, the phonecard for the call you promised. All of it somewhere in this flat, and Mum has conditions.',
    neutralTitle: 'The away bag', neutralBrief: 'Scarf, money, the sandwiches, the phonecard for the call you promised. All of it somewhere in this flat, and Mum has conditions.',
    weight: {},
  },
  // the zoom missions: close up, on the archive's own night — the night is printed as recorded, and nothing else is
  {
    id: 'clipping-hunt', verb: 'find', camera: 'chase', route: 'main', ages: [8, 14], clock: 95,
    hazards: ['clock'],
    needs: [
      {of: {anchor: ['match']}, grade: 'enriching', day: true, why: 'The clipping is the paper of a recorded night dated to the day: the album keeps that row as it was printed.'},
    ],
    title: 'The clipping · {date}', brief: 'This morning’s paper has the night of {date} on its back page, and Dad takes the paper to work. Find it, the scissors and the glue, and get it into the album before the school bus.',
    neutralTitle: 'The clipping', neutralBrief: 'This morning’s paper has last night on its back page, and Dad takes the paper to work. Find it, the scissors and the glue, and get it into the album before the school bus.',
    weight: {match: 0.3},
  },
  {
    id: 'first-step', verb: 'find', camera: 'eyes', route: 'main', ages: [5, 10], clock: 210,
    hazards: ['clock', 'crowd'],
    needs: [
      {of: {anchor: ['home']}, grade: 'enriching', day: true, why: 'The first time on the terrace is a home night on a known day; the half-ticket he keeps is from it.'},
      {of: {club: 'ground'}, grade: 'decor', why: 'The terrace he loses his father on carries the ground\'s name.'},
    ],
    title: 'Third from the fence · {date}', brief: 'The turnstile took half your ticket and the crowd took the other half out of your hand. Get it back, then find Dad: he is keeping a step at {ground} with his elbows.',
    neutralTitle: 'Third from the fence', neutralBrief: 'The turnstile took half your ticket and the crowd took the other half out of your hand. Get it back, then find Dad: he is keeping a step with his elbows.',
    weight: {home: 1, title: 1, final: 0.5},
  },
  {
    id: 'lost-scarf', verb: 'find', camera: 'eyes', route: 'main', ages: [9, 15], clock: 200,
    hazards: ['clock', 'crowd'],
    needs: [
      {of: {anchor: ['home']}, grade: 'enriching', day: true, why: 'The night he got in over the fence is a home night on a known day.'},
    ],
    title: 'Over the fence · {date}', brief: 'You are in. Your scarf is not: the fence took it, and somebody kicked it down the terrace. Get it back, then a spot by a barrier where nobody who knows you will look.',
    neutralTitle: 'Over the fence', neutralBrief: 'You are in. Your scarf is not: the fence took it, and somebody kicked it down the terrace. Get it back, then a spot by a barrier where nobody who knows you will look.',
    weight: {home: 1, derby: 1},
  },
  {
    id: 'away-pen', verb: 'find', camera: 'eyes', route: 'main', ages: [12, 18], clock: 200,
    hazards: ['clock', 'crowd'],
    needs: [
      {of: {anchor: ['away']}, grade: 'enriching', day: true, why: 'The away end stands on a recorded away night dated to the day — the one the bus came home from.'},
    ],
    title: 'The away end · {date}', brief: 'The whistle has gone, the stewards are holding the end, and the bus home goes without anybody who is late. The way-back half of your ticket is somewhere on this concrete. So is your crew.',
    neutralTitle: 'The away end', neutralBrief: 'The whistle has gone, the stewards are holding the end, and the bus home goes without anybody who is late. The way-back half of your ticket is somewhere on this concrete. So is your crew.',
    weight: {away: 1, europe: 0.5},
  },
]

export const templateById = (id: string): MissionTemplate | null => MISSION_TEMPLATES.find(t => t.id === id) ?? null

/**
 * The Hebrew of every template, the same four lines in the same order, with the same tokens.
 * `templateProblems` holds them to the same rule: the neutral lines never print a date, a rival or a ground.
 */
export const TEMPLATE_HE: Readonly<Record<string, {title: string; brief: string; neutralTitle: string; neutralBrief: string}>> = {
  'kickoff-run': {title: 'ריצה לפתיחה · {date}', brief: 'השריקה ב{ground} לא תחכה. דרך {city}, עד השער, לפני הפתיחה.', neutralTitle: 'ריצה לפתיחה', neutralBrief: 'השריקה לא תחכה. דרך {city}, עד השער, לפני הפתיחה.'},
  'sneak-in': {title: 'בלי כרטיס · {date}', brief: 'אין כרטיס, אין כסף, פרצה אחת בגדר. להיכנס לפני שהסדרנים מסתכלים לכיוון שלך.', neutralTitle: 'בלי כרטיס', neutralBrief: 'אין כרטיס, אין כסף, פרצה אחת בגדר. להיכנס לפני שהסדרנים מסתכלים לכיוון שלך.'},
  'away-day': {title: 'משחק חוץ · {date}', brief: 'דרך ארוכה מ{city}, רכב מלא, ופתיחה אחת. להגיע.', neutralTitle: 'משחק חוץ', neutralBrief: 'דרך ארוכה מ{city}, רכב מלא, ופתיחה אחת. להגיע.'},
  'cup-final-trip': {title: 'הגמר · {date}', brief: 'כל העיר בדרך לגמר. וגם כל מכונית שלפניך.', neutralTitle: 'הגמר', neutralBrief: 'כל העיר בדרך לגמר. וגם כל מכונית שלפניך.'},
  'europe-night': {title: 'לילה באירופה · {date}', brief: 'עיר זרה, טלפון מת, והכרטיס של החבר שלך בכיס שלך. למצוא אותו לפני שסוגרים את השערים.', neutralTitle: 'לילה באירופה', neutralBrief: 'עיר זרה, טלפון מת, והכרטיס של החבר שלך בכיס שלך. למצוא אותו לפני שסוגרים את השערים.'},
  'title-night': {title: 'אלופים · {date}', brief: 'השריקה נשמעה ואף אחד לא הלך הביתה. אבא שלך היה ביציע; עכשיו הוא איפשהו על הדשא. למצוא אותו.', neutralTitle: 'אלופים', neutralBrief: 'השריקה נשמעה ואף אחד לא הלך הביתה. אבא שלך היה ביציע; עכשיו הוא איפשהו על הדשא. למצוא אותו.'},
  'where-you-stood': {title: 'איפה שעמדת · {date}', brief: 'כולם הולכים. לעלות בחזרה במדרגות למקום שתמיד עמדת בו, פעם אחרונה העונה.', neutralTitle: 'איפה שעמדת', neutralBrief: 'כולם הולכים. לעלות בחזרה במדרגות למקום שתמיד עמדת בו, פעם אחרונה העונה.'},
  'new-ground': {title: 'היום הראשון · {date}', brief: 'אף אחד עוד לא יודע איך נכנסים. למצוא את השער ב{ground} לפני השריקה הראשונה שם.', neutralTitle: 'היום הראשון', neutralBrief: 'אף אחד עוד לא יודע איך נכנסים. למצוא את השער החדש לפני השריקה הראשונה שם.'},
  'derby-banner-raid': {title: 'הדגל שלהם · {date}', brief: 'הדגל שלהם תלוי במחסן ליד היציע של {rival}. להחזיר אותו לפני הדרבי — אף אחד לא נפגע.', neutralTitle: 'הדגל שלהם', neutralBrief: 'הדגל של החבר’ה מהצד השני תלוי במחסן ליד היציע שלהם. להחזיר אותו לפני הדרבי — אף אחד לא נפגע.'},
  'tifo-carry': {title: 'הכוראוגרפיה · {date}', brief: 'שתי חבילות נייר לכל הכוראוגרפיה, והם זורקים כל מה שיש להם ביד. להביא את שתיהן ליציע שלמות.', neutralTitle: 'הכוראוגרפיה', neutralBrief: 'שתי חבילות נייר לכל הכוראוגרפיה, והצד השני זורק כל מה שיש לו ביד. להביא את שתיהן ליציע שלמות.'},
  'bottle-run': {title: 'חסרים שישה', brief: 'חסרים שישה לחולצה. כל בקבוק ריק ברחובות האלה שווה משהו — והקיוסק ליד השער נסגר בפתיחה.', neutralTitle: 'חסרים שישה', neutralBrief: 'חסרים שישה לחולצה. כל בקבוק ריק ברחובות האלה שווה משהו — והקיוסק ליד השער נסגר בפתיחה.'},
  'lead-the-way': {title: 'להוביל', brief: 'היום אתה זה שיודע את הדרך. להביא אותם דרך {city} עד השער — ביחד, ובזמן.', neutralTitle: 'להוביל', neutralBrief: 'היום אתה זה שיודע את הדרך. להביא אותם דרך {city} עד השער — ביחד, ובזמן.'},
  'errands': {title: 'מה חסר', brief: 'צבע, בד, נייר דבק, נייר — מפוזרים על חצי {city}. לאסוף הכול ולהביא לחדר המועדון לפני שפותחים את השערים.', neutralTitle: 'מה חסר', neutralBrief: 'צבע, בד, נייר דבק, נייר — מפוזרים על חצי {city}. לאסוף הכול ולהביא לחדר המועדון לפני שפותחים את השערים.'},
  'banner-march': {title: 'הצעדה · {date}', brief: 'הדגל הגדול, בראש. בכל פינה בדרך ל{ground} מחכים אנשים להצטרף מאחוריו.', neutralTitle: 'הצעדה', neutralBrief: 'הדגל הגדול, בראש. בכל פינה בדרך מחכים אנשים להצטרף מאחוריו.'},
  'tin-hunt': {title: 'איפה הקופסה?', brief: 'אמא סידרה את החדר, וקופסת החסכונות לא איפה שהשארת אותה. מתחת למיטה, בארון, איפשהו. הקיוסק נסגר בשש.', neutralTitle: 'איפה הקופסה?', neutralBrief: 'אמא סידרה את החדר, וקופסת החסכונות לא איפה שהשארת אותה. מתחת למיטה, בארון, איפשהו. הקיוסק נסגר בשש.'},
  'ticket-hunt': {title: 'הכרטיסים', brief: 'אבא בדק את הכרטיסים אחת־עשרה פעמים. עכשיו הוא לא מוצא אותם. איפשהו בדירה יש מעטפה, והאוטובוס לא יחכה.', neutralTitle: 'הכרטיסים', neutralBrief: 'אבא בדק את הכרטיסים אחת־עשרה פעמים. עכשיו הוא לא מוצא אותם. איפשהו בדירה יש מעטפה, והאוטובוס לא יחכה.'},
  'night-window': {title: 'מרותק', brief: 'אבא במשחק. אמא על הספה מול הטלוויזיה, והדלת פתוחה. הנעליים שלך ליד דלת הכניסה, והחלון שלך הוא הדרך היחידה החוצה.', neutralTitle: 'מרותק', neutralBrief: 'אבא במשחק. אמא על הספה מול הטלוויזיה, והדלת פתוחה. הנעליים שלך ליד דלת הכניסה, והחלון שלך הוא הדרך היחידה החוצה.'},
  'pack-bag': {title: 'התיק למשחק החוץ', brief: 'צעיף, כסף, הכריכים, הטלכרט לשיחה שהבטחת. הכול איפשהו בדירה, ולאמא יש תנאים.', neutralTitle: 'התיק למשחק החוץ', neutralBrief: 'צעיף, כסף, הכריכים, הטלכרט לשיחה שהבטחת. הכול איפשהו בדירה, ולאמא יש תנאים.'},
  'flat-run': {title: 'לפני שריקת הפתיחה', brief: 'הצעיף בקופסה למעלה על הארון. בטריה אחת באיזו מגירה, אחת התגלגלה מתחת לשולחן במטבח. אבא על הספה עם רדיו מת, והשריקה לא תחכה.', neutralTitle: 'לפני שריקת הפתיחה', neutralBrief: 'הצעיף בקופסה למעלה על הארון. בטריה אחת באיזו מגירה, אחת התגלגלה מתחת לשולחן במטבח. אבא על הספה עם רדיו מת, והשריקה לא תחכה.'},
  'clipping-hunt': {title: 'הגזיר · {date}', brief: 'בעיתון של הבוקר יש את הלילה של {date} בעמוד האחרון, ואבא לוקח את העיתון לעבודה. למצוא אותו, את המספריים ואת הדבק, ולהכניס אותו לאלבום לפני ההסעה לבית הספר.', neutralTitle: 'הגזיר', neutralBrief: 'בעיתון של הבוקר יש את אתמול בלילה בעמוד האחרון, ואבא לוקח את העיתון לעבודה. למצוא אותו, את המספריים ואת הדבק, ולהכניס אותו לאלבום לפני ההסעה לבית הספר.'},
  'first-step': {title: 'שלישית מהגדר · {date}', brief: 'הקרוסלה לקחה חצי כרטיס, והקהל לקח לך את החצי השני מהיד. להחזיר אותו, ואז למצוא את אבא: הוא שומר מדרגה ב{ground} עם המרפקים.', neutralTitle: 'שלישית מהגדר', neutralBrief: 'הקרוסלה לקחה חצי כרטיס, והקהל לקח לך את החצי השני מהיד. להחזיר אותו, ואז למצוא את אבא: הוא שומר מדרגה עם המרפקים.'},
  'lost-scarf': {title: 'מעל הגדר · {date}', brief: 'אתה בפנים. הצעיף שלך לא: הגדר לקחה אותו, ומישהו בעט אותו במורד היציע. להחזיר אותו, ואז מקום ליד מעקה שאף אחד שמכיר אותך לא יסתכל עליו.', neutralTitle: 'מעל הגדר', neutralBrief: 'אתה בפנים. הצעיף שלך לא: הגדר לקחה אותו, ומישהו בעט אותו במורד היציע. להחזיר אותו, ואז מקום ליד מעקה שאף אחד שמכיר אותך לא יסתכל עליו.'},
  'away-pen': {title: 'יציע האורחים · {date}', brief: 'השריקה נשמעה, הסדרנים מחזיקים את היציע, והאוטובוס הביתה יוצא בלי מי שמאחר. חצי הכרטיס של הדרך חזרה נמצא איפשהו על הבטון הזה. גם החבר’ה שלך.', neutralTitle: 'יציע האורחים', neutralBrief: 'השריקה נשמעה, הסדרנים מחזיקים את היציע, והאוטובוס הביתה יוצא בלי מי שמאחר. חצי הכרטיס של הדרך חזרה נמצא איפשהו על הבטון הזה. גם החבר’ה שלך.'},
  'sticker-swap': {title: 'המשבצת החסרה', brief: 'משבצת אחת ריקה באלבום, ומישהו בחצר הזאת מחזיק אותה פעמיים. לשאול מסביב. למצוא לפני הצלצול.', neutralTitle: 'המשבצת החסרה', neutralBrief: 'משבצת אחת ריקה באלבום, ומישהו בחצר הזאת מחזיק אותה פעמיים. לשאול מסביב. למצוא לפני הצלצול.'},
}
