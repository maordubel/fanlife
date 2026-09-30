import type { CharacterId } from './types'

/**
 * מרשם הדמויות — everybody the life can know, as data.
 *
 * The engine used to depend on the union `'kobi' | 'rachel' | 'ofir'`, which meant the
 * day 1996 introduces a squadmate is the day a type at the bottom of the stack changes
 * and every switch statement over it has to be revisited. A character is now a row.
 *
 * `activeEras` is the honest way to say that people arrive and leave. Nobody is deleted
 * from a life — Ofir at eight and Ofir at twenty-two are one person with two portrait
 * sets — so the registry carries the whole cast and the era decides who is on screen.
 */

export type CharacterCategory = 'family' | 'friend' | 'supporter' | 'historical' | 'rival' | 'other'

/**
 * How much of a person is real (bible §9, §15).
 *
 * `fiction` — invented, free to talk. `composite` — fictionalized from a real person
 * (Yosef, Melamed, Asaf, Yevgeny): the real name is provenance in a comment, never on
 * screen. `real` — a real, named person: appears only in public, dated settings, never in
 * an invented private meeting, never as a "boss", every claim sourced. `open-history` —
 * real AND still unfolding (Ofer Yannay): no redemption arc, no downfall, every figure
 * dated, re-checked before publishing.
 */
export type CharacterProvenance = 'fiction' | 'composite' | 'real' | 'open-history'

export type CharacterDefinition = {
  id: CharacterId
  displayNameHe: string
  category: CharacterCategory
  /** chapter keys, e.g. '1983' | '1986' | '1990'. '*' means every era. */
  activeEras: string[]
  /**
   * Other names this person answers to on screen.
   *
   * A scene calls him `מישל`; the registry knows him as `מישל בר־כליפא`. Both are the same
   * man, and until 15.9.2026 nothing connected them — so the short form resolved to no
   * portrait and no row, and a guard asking "is this speaker a real person" would have
   * said no about a real person. Same for `עומר` / `עומר חרמש`.
   */
  aliases?: readonly string[]
  /** the art key prefix the runtime uses for this person's plates */
  portraitSet?: string
  tags?: string[]
  /** defaults to 'fiction' */
  provenance?: CharacterProvenance
}

/**
 * Ids the bible (5.9.2026, §15) forbids outright. They were provisional names in earlier
 * drafts, or the real people behind composites; a script that reaches for one of them is
 * a script that has re-invented a person who already has a row.
 */
export const FORBIDDEN_CHARACTER_IDS: readonly string[] = [
  'maor',
  'assi',
  'eyal-melamed',
  'gabi',
  'meir',
  'tiki',
  'yuri',
]

const REGISTRY: CharacterDefinition[] = [
  /**
   * פוגי — the protagonist, and until 15.9.2026 the one person in this game with no row.
   *
   * He speaks in ten content files. He had no entry, no portrait key of his own in the
   * registry, and no way for anything to ask a question about him — which is how the cast
   * guard, the first time it ran, reported the hero of the game as a stranger.
   *
   * It survived because nothing needs the registry to draw HIM: the player's body comes
   * from `PlayerFigure` on the era and his face from the `PORTRAIT` maps, both of which
   * name `facePogi` directly. The row was only missing where somebody asks "who is this",
   * and nobody had asked until there was a test that does.
   *
   * Three ages ship on disk (rule 48): `pogi`, `hero80`, `hero90`. `heights.ts` anchors the
   * child at 1.30m and `PlayerFigure.scale` carries the growth — see rule 55 and
   * `tests/life-bodies.test.ts`.
   */
  {
    id: 'pogi',
    displayNameHe: 'פוגי',
    category: 'family',
    activeEras: ['*'],
    portraitSet: 'facePogi',
    tags: ['protagonist'],
  },
  {
    id: 'kobi',
    displayNameHe: 'קובי',
    category: 'family',
    activeEras: ['*'],
    portraitSet: 'faceKobi',
    tags: ['father', 'gate7'],
  },
  {
    id: 'rachel',
    displayNameHe: 'רחל',
    category: 'family',
    activeEras: ['*'],
    portraitSet: 'faceRachel',
    tags: ['mother'],
  },
  {
    id: 'ofir',
    displayNameHe: 'אופיר',
    category: 'friend',
    activeEras: ['1986+'],
    portraitSet: 'faceOfir',
    tags: ['neighbourhood', 'street'],
  },
  {
    id: 'amit',
    displayNameHe: 'עמית',
    category: 'friend',
    activeEras: ['1986+'],
    portraitSet: 'faceAmit',
    tags: ['information', 'newspaper'],
  },
  {
    id: 'efi',
    displayNameHe: 'אפי',
    category: 'friend',
    activeEras: ['1986+'],
    portraitSet: 'faceEfi',
    tags: ['basketball', 'ussishkin'],
  },
  /**
   * קרן — אותה שכנה, עשרים וארבע שנה אחר כך.
   *
   * השורה אמרה `['1986','1990']` עד 21.9.2026, והתסריט מדבר בשמה ב-`D` וב-`C05`.
   * ההכרעה כבר נלקחה במקום שבו לוקחים אותה: `CHARACTER_OF.keren = 'keren'` במפת
   * התסריט — כלומר **קרן של 2010 היא קרן של 1986**, בדיוק כמו שאילן השכן הוא אילן
   * (כלל 79). העידנים כאן הם ההמשך של אותה הכרעה ולא הכרעה שנייה; שורה שנייה בשם
   * קרן הייתה ההפך המדויק ממה שהמרשם קיים בשבילו.
   */
  {
    id: 'keren',
    displayNameHe: 'קרן',
    category: 'friend',
    // (27.9.2026) + '2020': היא מדברת ב-`2021-promises` ועומדת בקיוסק ב-`2023-visit`
    activeEras: ['1986', '1990', '2000', '2010', '2020'],
    portraitSet: 'faceKeren',
    tags: ['neighbourhood'],
  },
  /**
   * המורה, הסדרן והמוכר — 1991, and the first people in this life who are a ROLE.
   *
   * They have no first names on purpose. A twelve-year-old does not know his teacher's
   * first name and has never asked the usher's; what he knows is what they do, which is
   * exactly how the chapter addresses them. They are registered all the same, because a
   * schedule may only drive somebody the cast knows about, and because the usher is
   * going to remember him for another fifteen years of this game.
   */
  {
    id: 'teacher',
    displayNameHe: 'המורה',
    category: 'other',
    activeEras: ['1991', '1998-laces'],
    portraitSet: 'faceTeacher',
    tags: ['school'],
  },
  {
    id: 'usher',
    displayNameHe: 'סדרן',
    category: 'other',
    activeEras: ['1980', '1990'],
    portraitSet: 'faceUsher',
    tags: ['ussishkin'],
  },
  {
    id: 'vendor',
    displayNameHe: 'מוכר',
    category: 'other',
    activeEras: ['1991'],
    portraitSet: 'faceVendor',
    tags: ['ussishkin'],
  },
  /**
   * יוסף — the neighbour, and the reason he has a name at all.
   *
   * He was written as "שלום", which collides head-on with שלום תקוה, a real Hapoel
   * footballer who appears in the canonical archive and in the kit and squad data. One
   * of the two had to move, and it is never the historical person: a fictional character
   * borrowing a real player's name is exactly the class of confusion rule 11 exists to
   * prevent, and it would eventually put an invented sentence in a real man's mouth.
   * Maor renamed the fiction on 2.9.2026. שלום תקוה stays שלום תקוה, in the archive,
   * where he belongs.
   */
  {
    /**
     * יוסף — 2000s, and not a day earlier.
     *
     * Two of Maor's own documents disagreed about him: the character bible put him in the
     * neighbourhood of 1986–1990, the production table said he enters at the beginning of
     * the 2000s. Maor settled it on 5.9.2026 — he is fictionalized from the founder of
     * Hapoel Ussishkin and a senior figure in Ultras Hapoel, and that man's story starts
     * in the 2000s. So the adult on the 1986 stairwell is אילן השכן, who was always the
     * neighbour in the bible, and Yosef waits for his own decade. His figure (`yosef`,
     * `yosef-back`) is the one the September sheet labelled שלום — "שלום בתמונות הישנות
     * → יוסף" — and it is not placed in any chapter before 2000.
     */
    id: 'yosef',
    displayNameHe: 'יוסף',
    category: 'supporter',
    activeEras: ['2000', '2010', '2020'],
    tags: ['ussishkin', 'ultras', 'neighbourhood', 'katamin', 'voice'],
    provenance: 'composite',
  },
  /**
   * אילן השכן — שורה אחת, ארבעה עשורים, והכרעה של בעל הבית.
   *
   * התסריט של 2000–2026 כותב `אילן` בסצנה `A03` ("השבת שלי"), ובמרשם ישבה מאז
   * 5.9.2026 שורה בשם `neighbour` בשם **אילן השכן** עם `activeEras: ['1986']` בלבד.
   * שם קרוב אינו ראיה (כלל 64 §5), ולכן זה נשאל ולא הוכרע לבד.
   *
   * **מאור, 20.9.2026: "אילן השכן זה אילן כן."** — אדם אחד, עשרים שנה אחר כך.
   *
   * לכן שני שינויים, ושניהם נובעים מהתשובה הזאת ולא ממנה והלאה: `aliases` כדי
   * ש`אילן` בתוכן ייפתר לשורה הזאת (אותו פגם של `רפי` מול `רפי מהקיוסק`), ו
   * `activeEras` שנפתח לעשורים — ב-`A03` הוא עומד ליד **בתיה**, שכנה עם
   * `['2000','2010','2020']`, ומחזיק סולם מול קיר ותיק. שכן שנמצא בסצנה אחת
   * ב-1986 ובסצנה אחת בעשור הרביעי הוא שכן, לא ניצב.
   */
  {
    id: 'neighbour',
    displayNameHe: 'אילן השכן',
    aliases: ['אילן', 'ilan'],
    category: 'other',
    activeEras: ['1986', '2000', '2010', '2020'],
    portraitSet: 'faceOldMan',
    tags: ['neighbourhood'],
  },
  /**
   * רפי מהקיוסק — הדמות הכי מתמשכת במשחק, ושורה שתיארה אותה כניצב ליום אחד (20.9.2026).
   *
   * שתי תקלות באותה שורה, ושתיהן נמדדו ולא שוערו:
   *
   * **הוא ענה רק ל"רפי מהקיוסק".** התוכן קורא לו `רפי` — כך הוא מדבר בכל 33 השיחות
   * שלו — ו-`speakerKeys` לא ידע לקשר בין השניים. זה בדיוק הפגם של `מישל` מול
   * `מישל בר־כליפא` (15.9.2026): הפלייט נפתר לכלום, ושומר ששואל "האם הדובר הזה אדם"
   * ענה "לא" על אדם.
   *
   * **ו-`activeEras: ['1986']` תיאר יום אחד מתוך חמש-עשרה שנה.** `gig-errands-rafi`
   * ו-`gig-crates-kiosk` רצים מ-`a4-shirt` (1985) עד `2000-double`, והוא מדבר בשתיהן
   * בכל פרק — כלומר הוא הדמות הלא-משפחתית שפוגי פוגש הכי הרבה פעמים בחיים האלה,
   * והמרשם קרא לו ניצב של שבת אחת. הרשימה כאן נקראה מהתוכן.
   *
   * **ומה שלא תוקן, כי אי-אפשר לתקן אותו בלי ציור:** `faceOldMan` הוא גם הפלייט של
   * `neighbour`. שני אנשים חולקים פנים אחת, וזה לא ייפתר בשורה — זה ייפתר כשייחתך
   * פלייט לרפי מהפיגורה שלו עצמו (כלל 67).
   */
  {
    id: 'shopkeeper',
    displayNameHe: 'רפי מהקיוסק',
    aliases: ['רפי', 'rafi'],
    category: 'other',
    activeEras: ['a4-shirt', 'a5-first', 'a6-radio', 'a7-week', '1986', '1990s', '2000s'],
    portraitSet: 'faceOldMan',
    tags: ['kiosk', 'work'],
  },
  /**
   * ---------------------------------------------------------------------------------
   * הקאסט של ה-Character Bible (4.9.2026) — registered before their art exists.
   *
   * The bible is explicit about the order of operations (§13): a character is a ROW
   * first — stable id, display name, eras, tags — so that relationships, encounters and
   * placements can be written against them, and `portraitSet` is added only in the same
   * change that adds every file it names. So nobody below has a portrait set: pointing
   * runtime code at a PNG that does not exist is the one thing the bible forbids twice.
   *
   * Eras are written the way the bible writes them: a chapter id ('1993-cup'), a decade
   * ('1990' = every 199x chapter), or a start year with a plus ('1996+' = from the army
   * chapter on, for the rest of the life). `eraCovers` below does the matching.
   *
   * Provenance stays in comments and never on screen: מאור הראל → יוסף, אסי והבה → אסף,
   * אייל מלמד → מלמד. The real names are production history, not characters.
   */
  {
    id: 'barry',
    displayNameHe: 'בארי',
    category: 'supporter',
    activeEras: ['1986+'],
    tags: ['gate7', 'terrace', 'continuity'],
  },
  {
    // The production table renames the 1980s radio man גבי → לירון and says so in those
    // words ("formerly listed as גבי"); the character bible still calls him Gabi. One
    // person, one id, and the newer name wins — flagged for Maor in the delivery notes.
    id: 'liron',
    displayNameHe: 'לירון',
    category: 'supporter',
    // (27.9.2026) + '2000': הסדנה באלנבי ב-`2006-home` (H03) היא שלו בתסריט — קריאה של
    // התסריט (כלל 18), כמו שחור ופרדי למטה
    activeEras: ['1980', '1990', '2000'],
    tags: ['radio', 'gate7', 'repairs', 'car'],
  },
  {
    id: 'crowd-aliza',
    displayNameHe: 'עליזה',
    category: 'supporter',
    activeEras: ['1980', '1990'],
    tags: ['tickets', 'memory', 'neighbourhood'],
  },
  {
    id: 'melamed',
    displayNameHe: 'מלמד',
    category: 'supporter',
    activeEras: ['1990', '2000', '2010'],
    tags: ['songs', 'darbuka'],
    provenance: 'composite',
  },
  /**
   * מישל בר־כליפא — אדם אמיתי, ותפקידו במשחק הוא תפקידו במציאות.
   *
   * הוא היה האיש שאחראי בפועל על הסעות האוהדים של הפועל בשנות השמונים והתשעים, ואוהד
   * ידוע ומוכר של המועדון. המקור הוא מאור הראל, ידע אישי, 15.9.2026 — וכלל 18 אומר
   * שזה מקור, לא טענה שצריך לאמת מול עיתון.
   *
   * השורה הזאת נשאה `tags: ['transport', …]` מהיום שנכתבה, ובכל זאת **כל עבודת ההסעות
   * בקוד הייתה כתובה על לימור**: היא הכירה את הנהג ב-1993-cup, היא החזיקה מקום בתור,
   * ובגליל היא עמדה ליד ההסעה עם הפנקס וגבתה תשעים שקל. למישל היו שבע שורות דיבור
   * ואמנות מוזמנת על הדיסק שאיש לא חיבר. מאור הצביע על זה ב-15.9.2026, והתפקיד הוחזר.
   *
   * `activeEras` הוא העשור, לא השנה: הוא נמצא ב-1990, ב-1991, בשני פרקי 1993 ובהמשך,
   * כי הסעה היא לא אירוע חד־פעמי אלא מה שהאיש הזה עשה במשך עשרים שנה.
   */
  {
    id: 'michel',
    displayNameHe: 'מישל בר־כליפא',
    aliases: ['מישל'],
    category: 'supporter',
    // (27.9.2026) + `2000-double`: המיניבוס של שער 5 לגמר של 2000 הוא שלו בתוכן — המרשם
    // פשוט לא ידע. פרק אחד בשמו, לא עשור: אדם אמיתי, ולא ממציאים לו שנים (כלל 18)
    activeEras: ['1990s', '2000-double'],
    tags: ['transport', 'network', 'memorial'],
    provenance: 'real',
  },
  {
    id: 'soko',
    displayNameHe: 'סוקו',
    category: 'supporter',
    // (27.9.2026) + '2000': הוא כבר מדבר ב-`2000-double`, ומ-27.9 הוא זה שמצלם את הכניסה
    // לאוסישקין ב-2006 (H02.2) — התפקיד שבתיה החזיקה בטעות (מאור)
    activeEras: ['1990', '2000'],
    tags: ['archive', 'records'],
  },
  /**
   * שחור, פרדי ומלמד — `activeEras: ['1990']` עד 21.9.2026, והתסריט מדבר בשמם
   * עשרים שנה אחר כך: שחור ב-`U01` וב-`N02`, פרדי ב-`N03`, מלמד ב-`N04`. התסריט הוא
   * המקור (כלל 18), ולכן ההרחבה כאן היא **קריאה שלו** ולא הכרעה חדשה — בדיוק כמו
   * קרן למעלה. שורה שנייה לאדם שכבר יש לו שורה היא ההפך ממה שהמרשם קיים בשבילו.
   */
  {
    id: 'shachor',
    displayNameHe: 'שחור',
    category: 'supporter',
    activeEras: ['1990', '2000', '2010'],
    tags: ['ussishkin', 'organiser'],
    provenance: 'real',
  },
  {
    id: 'freddy',
    displayNameHe: 'פרדי',
    category: 'supporter',
    activeEras: ['1990', '2000', '2010'],
    tags: ['law', 'politics', 'argument'],
  },
  {
    id: 'crowd-dudu',
    displayNameHe: 'דודו',
    category: 'supporter',
    activeEras: ['1990'],
    tags: ['away', 'bus', 'noise'],
  },
  /**
   * לימור — הדרך פנימה, ולא ההסעה.
   *
   * עד 15.9.2026 היא עשתה את עבודתו של מישל: נהג, פנקס, תור, תשעים שקל. זה הוחזר אליו,
   * ומה שנשאר לה הוא מה שתמיד היה הכי טוב בה ואין לאיש אחר — **הכניסה מהצד ולא
   * מהחזית**, התור שלוקח שעה, הסדרן שמכיר את כולם, ומי שאמר לה ב-1991 שהוא לא יודע
   * כלום וזכרה אותו שנתיים. `tags` כבר אמרו את זה; התוכן פשוט לא הלך אחריהם.
   *
   * היא עדיין `crowd-` בזיהוי ובתוך `CROWD_POOL`, וזה לא מדויק לדמות עם שלושים ושלוש
   * שורות. שינוי מזהה נוגע בשמירות ובזיכרונות ולכן הוא החלטה בפני עצמה, לא תיקון אגב.
   */
  {
    id: 'crowd-limor',
    displayNameHe: 'לימור',
    category: 'supporter',
    activeEras: ['1990s'],
    tags: ['ussishkin', 'queues', 'side-entrance'],
  },
  /**
   * ...and the people whose chapters do not exist yet.
   *
   * They are here for one reason and it is worth stating: an id that is not registered is
   * an id somebody re-invents. The provisional names in earlier drafts — מאיר for ירון,
   * תיקי for בתיה — are exactly what this prevents, and so is a second row for a person
   * who already has one. `castFor` never returns them until their chapter exists, and no
   * scene may place them before their entry era.
   */
  { id: 'yaron', displayNameHe: 'ירון', category: 'friend', activeEras: ['1996+'], tags: ['army', 'peer'] },
  { id: 'asaf', displayNameHe: 'אסף', category: 'supporter', activeEras: ['1996+'], provenance: 'composite', tags: ['gate5', 'organiser'] },
  { id: 'omer-hermesh', displayNameHe: 'עומר חרמש', aliases: ['עומר'], category: 'friend', activeEras: ['1997+'], provenance: 'real', tags: ['records', 'travel', 'memorial'] },
  { id: 'uli', displayNameHe: 'אולי', category: 'friend', activeEras: ['2000', '2010'], tags: ['away', 'risk'] },
  /**
   * בתיה — החברה המבוגרת מהשכונה (מאור, 27.9.2026).
   *
   * *"בתיה אמורה להיות החברה המבוגרת מהשכונה, חברה כייפית אוהדת הפועל"* — והיא *"לוקחת
   * ל'סוקו' ול'מישל' את התפקיד"*. שני התיקונים: המשפט על הצילום של הכניסה (2006, H02.2)
   * עבר לסוקו, ו-`memory` ירד מהתגיות — "זיכרון חי" בספר הוא זיכרון של שכונה ואוכל, לא
   * ארכיון (סוקו) ולא רשימות וקשרים (מישל). מה שלה: אוכל, קיצורי דרך, קללות אוהבות,
   * השחקנים כילדיה, ודאגה לקובי. `content/batya.ts`.
   * **רק מ-2000:** הגוף שלה נחתך מצילום של אישה בת שישים (`batya`); בשנות ה-80/90 היא
   * הייתה צריכה גוף צעיר יותר, ואין כזה — אז היא לא ממוקמת לפני 2000, בכוונה.
   */
  { id: 'batya', displayNameHe: 'בתיה', category: 'supporter', activeEras: ['2000', '2010', '2020'], portraitSet: 'faceBatya', tags: ['neighbourhood', 'comedy', 'food', 'shortcuts', 'care'] },
  { id: 'yonatan', displayNameHe: 'יונתן', category: 'friend', activeEras: ['2010', '2020'], tags: ['music', 'rival-friend'] },

  { id: 'melanie', displayNameHe: 'מלאני', category: 'other', activeEras: ['2010', '2020'], tags: ['relationship'] },
  { id: 'dor', displayNameHe: 'דור', category: 'other', activeEras: ['2010', '2020'], tags: ['relationship', 'protest'] },
  { id: 'crowd-erez', displayNameHe: 'ארז', category: 'supporter', activeEras: ['2000', '2010'], tags: ['tifo', 'work'] },
  { id: 'crowd-inbal', displayNameHe: 'ענבל', category: 'supporter', activeEras: ['2000', '2010'], tags: ['ussishkin', 'volunteer'] },
  { id: 'crowd-lior', displayNameHe: 'ליאור', category: 'supporter', activeEras: ['2010', '2020'], tags: ['protest', 'phones'] },
  // `J01` (2002) היא הפעם הראשונה ששני מופיעה — הצלמת שהתמונה שלה, והתסריט הוא הסמכות
  { id: 'crowd-shani', displayNameHe: 'שני', category: 'supporter', activeEras: ['2000', '2010', '2020'], tags: ['photography', 'away'] },
  { id: 'crowd-noam', displayNameHe: 'נועם', category: 'supporter', activeEras: ['2020'], tags: ['songs', 'archive'] },
  { id: 'crowd-maya', displayNameHe: 'מאיה', category: 'supporter', activeEras: ['2020'], tags: ['mutual-aid'] },
  /**
   * ---------------------------------------------------------------------------------
   * שבע שורות מתסריט ההמשך 2000–2026 (20.9.2026) — דמות היא שורה לפני שהיא פנים.
   *
   * התסריט מזיז יחסים עם עשרים וארבעה אנשים; חמישה־עשר כבר היו כאן, שלושה הם **תפקיד
   * ולא אדם** (`partner`, `child`, `target` — נפתרים ממסלולי החיים בזמן ריצה, ושורה
   * שהייתה קובעת להם שם היא המשחק בוחר בת זוג בשבילך), ואלה השבעה שנשארו.
   *
   * כל אחד נקרא מהסצנה שמציגה אותו ולא מהשם: `I01` פותחת ב-*"זאת לינה, זה ניקו. הם
   * מארגנים מפגש נגד גזענות"*, ולכן הם `supporter` בעידן 2010 עם `international`
   * ולא "חברים". **אף אחד מהשבעה אינו נושא `portraitSet`** — אין להם פלייט, ובדיקה
   * נופלת על מי שמצביע על פנים שלא צוירו (כלל 58).
   *
   * `provenance` נשאר ריק לכולם: אלה דמויות בדיוניות של התסריט, ולא אנשים מהארכיון.
   * התסריט עצמו אומר את זה על תמר במילים שלו — *"דמות אקדמאית בדיונית מוצעת"*.
   * ---------------------------------------------------------------------------------
   */
  // מתוקי — מי שתמיד מארגן ותמיד נשאר בחוץ ברשימה; מופיע בשבעה פרקים, מ-2002 עד 2023
  { id: 'metuki', displayNameHe: 'מתוקי', category: 'friend', activeEras: ['2000', '2010', '2020'], tags: ['roster', 'travel', 'volunteer'] },
  // רומא — מי שמסדר את האוטובוס, את הספה ואת הקשר לחוץ לארץ
  { id: 'roma', displayNameHe: 'רומא', category: 'friend', activeEras: ['2000', '2010', '2020'], tags: ['away', 'hosting', 'international'] },
  // לינה וניקו — מארגני המפגש נגד גזענות, במילים של `I01` עצמה
  { id: 'lina', displayNameHe: 'לינה', category: 'supporter', activeEras: ['2010', '2020'], tags: ['international', 'antiracism', 'organiser'] },
  { id: 'nico', displayNameHe: 'ניקו', category: 'supporter', activeEras: ['2010'], tags: ['international', 'antiracism'] },
  // תמר — מחוץ לכדורגל לגמרי, וזו כל הסצנה שלה: "שאלתי מה אתה אוהב לעשות"
  { id: 'tamar', displayNameHe: 'תמר', category: 'other', activeEras: ['2010'], tags: ['relationship', 'outside-football'] },
  // אלכס — החבר שאצלו יש לפוגי מפתח בחו״ל: *"גם פה יש לך מפתח"*
  { id: 'alex', displayNameHe: 'אלכס', category: 'friend', activeEras: ['2010', '2020'], tags: ['abroad', 'work'] },
  /**
   * מיכל ואדם — ענף הבעלות, שהתסריט עצמו מסמן **היסטוריה חלופית**.
   *
   * הם צוות עבודה בסצנות O02–O05, ולא אנשים מהארכיון. `provenance` נשאר `fiction`
   * והקטגוריה `other`, כי מה שהם עושים הוא עבודה ולא אוהדות — וזה גם מה שמונע מהם
   * להופיע בכובע הקהל (`CROWD_POOL`) בטעות.
   */
  { id: 'michal', displayNameHe: 'מיכל', category: 'other', activeEras: ['2020'], tags: ['owner-branch', 'work'] },
  { id: 'adam', displayNameHe: 'אדם', category: 'other', activeEras: ['2020'], tags: ['owner-branch', 'work'] },
  /**
   * **ו-`ilan` אינו שורה חדשה** — כי `neighbour` הוא הוא.
   *
   * התסריט כותב `ilan` בסצנה `A03`, ובמרשם כבר ישב **אילן השכן** מ-1986. שתי
   * האפשרויות היו סבירות — אותו שכן עשרים שנה אחר כך, או אדם אחר באותו שם — ולכן
   * `life:screenplay-map` דיווח את ההתנגשות במקום להכריע בה. **מאור הכריע ב-20.9.2026:
   * "אילן השכן זה אילן כן."** השורה של `neighbour` למעלה נפתחה בהתאם, והמיפוי יושב
   * ב-`CHARACTER_OF` עם התאריך והמשפט.
   */
 /**
   * ---------------------------------------------------------------------------------
   * The bible of 5.9.2026 — forty-five locked ids.
   *
   * Eleven rows were missing from this registry. They divide into three kinds and the
   * kind decides what a script may do with them:
   *
   * The FOOTBALLERS (שלום תקוה, שביט אלימלך) are historical. They are seen from the stand
   * and talked ABOUT; the player never chats with them and no line is put in their mouth.
   * The spelling שלום תקוה — one vav — is the bible's and is final.
   *
   * The OWNERS (אייזנברג, טביב, ינאי) are real and named. §15: not bosses, not free for
   * invented dialogue, never a private meeting with Pogi; the game shows the supporters'
   * version, their own version, and the historical outcome. Yannay is `open-history`.
   *
   * The 2000s CAST (אזולאי, ארז מחיפה, שלומי קעקוע, יבגני, נטע, גור) are fiction or
   * composites. Two people are named ארז and the bible forbids merging them: `crowd-erez`
   * builds tifo at night for Hapoel; `fan-erez-haifa` is the dry half of a Maccabi Haifa
   * friendship. Yevgeny is fictionalized from יורי סדלצקי — the name stays in this
   * comment — and the 2015 attack on him is never shown graphically.
   */
  { id: 'shalom-tikva', displayNameHe: 'שלום תקוה', category: 'historical', activeEras: ['1997+'], tags: ['footballer', 'seen-only'], provenance: 'real' },
  { id: 'shavit-elimelech', displayNameHe: 'שביט אלימלך', category: 'historical', activeEras: ['1996+'], tags: ['footballer', 'goalkeeper', 'seen-only'], provenance: 'real' },
  { id: 'shaul-eisenberg', displayNameHe: 'שאול אייזנברג', category: 'historical', activeEras: ['1995+'], tags: ['owner', 'basketball', 'ussishkin', 'public-only'], provenance: 'real' },
  { id: 'eli-tabib', displayNameHe: 'אלי טביב', category: 'historical', activeEras: ['2010'], tags: ['owner', 'football', 'protest', 'public-only'], provenance: 'real' },
  { id: 'ofer-yannay', displayNameHe: 'עופר ינאי', category: 'historical', activeEras: ['2020'], tags: ['owner', 'basketball', 'yad-eliyahu', 'public-only', 'open-history'], provenance: 'open-history' },
  { id: 'fan-azoulay', displayNameHe: 'אזולאי', category: 'rival', activeEras: ['2000', '2010'], tags: ['maccabi-haifa', 'kiryat-eliezer', 'warm'] },
  { id: 'fan-erez-haifa', displayNameHe: 'ארז מחיפה', category: 'rival', activeEras: ['2000', '2010'], tags: ['maccabi-haifa', 'kiryat-eliezer', 'dry'] },
  { id: 'shlomi-tattoo', displayNameHe: 'שלומי קעקוע', aliases: ['שלומי'], category: 'rival', activeEras: ['2000'], tags: ['beitar', 'confrontation', 'off-screen-death'] },
  { id: 'yevgeny', displayNameHe: 'יבגני', category: 'supporter', activeEras: ['2000', '2010', '2020'], tags: ['ultras', 'leader'], provenance: 'composite' },
  { id: 'neta-katamin', displayNameHe: 'נטע גופן', aliases: ['נטע'], category: 'friend', activeEras: ['2010', '2020'], tags: ['katamin', 'bass', 'producer'], provenance: 'composite' },
  { id: 'gur-katamin', displayNameHe: 'גור שפיגל', aliases: ['גור'], category: 'friend', activeEras: ['2010', '2020'], tags: ['katamin', 'drums'], provenance: 'composite' },
  {
    id: 'veteran',
    displayNameHe: 'אוהד ותיק',
    category: 'supporter',
    activeEras: ['1986', '1990'],
    portraitSet: 'faceBarry',
    tags: ['terrace', 'gate7'],
  },
]

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = Object.fromEntries(
  REGISTRY.map((entry) => [entry.id, entry]),
)

export const ALL_CHARACTERS: readonly CharacterDefinition[] = REGISTRY

export function characterName(id: CharacterId): string {
  return CHARACTERS[id]?.displayNameHe ?? id
}

/**
 * A registered era matches a chapter three ways: exactly ('1993-cup'), by decade start
 * ('1990' covers every 199x chapter — the bible writes "שנות ה־90"), or by decade key
 * ('1990s'). So `ofir` registered for '1990' is on the 1993 stairs without a row edit
 * every time a chapter is added.
 */
function eraCovers(era: string, chapter: string): boolean {
  if (era === '*' || era === chapter) return true
  const year = Number(chapter.slice(0, 4))
  if (!Number.isFinite(year)) return false
  if (era.endsWith('+')) return year >= Number(era.slice(0, -1))
  const decade = Math.floor(year / 10) * 10
  return era === String(decade) || era === `${decade}s`
}

export function isActiveIn(id: CharacterId, era: string): boolean {
  const definition = CHARACTERS[id]
  if (!definition) return false
  return definition.activeEras.some((e) => eraCovers(e, era))
}

/** The people a chapter should be tracking, so a profile screen does not list a stranger. */
export function castFor(era: string): readonly CharacterDefinition[] {
  return REGISTRY.filter((entry) => entry.activeEras.some((e) => eraCovers(e, era)))
}

/** Real, named people — every line about them is sourced and they are never "bosses". */
export function isRealPerson(id: CharacterId): boolean {
  const p = CHARACTERS[id]?.provenance
  return p === 'real' || p === 'open-history'
}

/**
 * מי מדבר — one speaker, one face, whichever way the line spells him.
 *
 * `Say.who` is free text by design: a writer types `who: 'קובי'` in one scene and
 * `who: 'kobi'` in the next, and both are obviously the same man. The portrait maps
 * (`PORTRAIT`, `PORTRAIT_1990`, …) are keyed by the HEBREW name only, and the dialogue
 * box looked the speaker up with a plain `portraits[who]` — so every line that spelled
 * him by id resolved to `undefined` and the box drew a nameplate with no face.
 *
 * Measured on 15.9.2026 across every content file: **363 of 953 lines — 38% of the
 * dialogue in the game — had no portrait**, and 109 of them were Kobi, which is more
 * than half of everything the boy's father says.
 *
 * Nothing was broken and nothing threw. A missing portrait is a `?? null`, and `null` is
 * a legal value that the box renders as a narration line. That is why it survived: the
 * defect had the same shape as a deliberate choice.
 *
 * The registry already holds both spellings of every person, so it is the place that can
 * answer. `speakerKeys()` returns every name one character answers to, and the box tries
 * them in order against whichever era's plates are loaded.
 */
/**
 * מי שמדבר ואינו אדם — וההבדל בין תפקיד לבין שורה חסרה (20.9.2026).
 *
 * עד היום שתי התשובות נראו זהות. `אוהד` מדבר ברחוב ו-`רפי` מדבר בקיוסק; לשניהם לא
 * הייתה שורה במרשם, ולכן שומר ששואל "מי זה" ענה עליהם אותה תשובה. אבל הם שני דברים
 * שונים לגמרי: **רפי הוא אדם שחסרה לו שורה — באג. `אוהד` הוא תפקיד — בכוונה.**
 *
 * `usher`, `vendor` ו-`teacher` כבר הראו את הדרך (כלל 58): ילד בן שתים-עשרה לא יודע
 * את השם הפרטי של הסדרן ומעולם לא שאל. מה שהוא יודע הוא מה שהם עושים. אבל להמציא
 * שורת מרשם מלאה לכל *"אבא עם ילד"* היה מעמיד ניצב בעל גיל, עידנים ותיק פלייטים ליד
 * קובי — ושיחה אחת אינה קריירה.
 *
 * לכן תפקיד הוא **רשומה בשם עצמה** ולא דמות: אין לו גיל, אין לו עידן, אין לו פלייט,
 * ואי-אפשר להצביע עליו מלוח זמנים. מה שיש לו הוא הסיבה שהוא תפקיד, כתובה — כדי
 * שהוספה של שם לרשימה תהיה הכרעה ולא בריחה מבדיקה אדומה.
 */
export const SPEAKING_ROLES: Readonly<Record<string, string>> = {
  אוהד: 'אחד מהיציע, שיחה אחת ואין לו שם',
  'אוהד עם רדיו': 'מי שמחזיק את הטרנזיסטור ב-1990 — הוא המידע, לא האדם',
  'אוהד צעיר': 'מישהו צעיר יותר ביציע, בלי שם',
  הסדרן: 'מי שעומד בשער. אותו תפקיד כמו `usher`, בשיחה שאינה בחדר שלו',
  הקופאי: 'מי שמוכר את הכרטיס, ולא מי שהוא',
  קופאית: 'אותו דלפק בדיוק, אישה',
  המוכר: 'מי שעומד מאחורי הדוכן, בשיחה אחת',
  'מוכר הגרעינים': 'בדרך ליציע',
  המפקד: 'הצבא, 1996 — דרגה ולא שם',
  הבוס: 'מי שמשלם על המשמרת',
  'המנהל המקצועי': 'המאמן בשיחת הווידאו של 2025 — תפקיד בדיוני, לא האיש שהחזיק בו (אנשים אמיתיים לא מדברים)',
  הגבר: 'מישהו שעובר ברחוב, בשיחה אחת',
  ילד: 'ילד אחר במגרש, בשיחה אחת',
  'ילד מהשכונה': 'ילד אחר, מאותן מדרגות, בשיחה אחת',
  'אבא עם ילד': 'מה שפוגי רואה ולא מי שהוא',
  'קול מהרדיו': 'שדר. לא דמות, מקור מידע',
  מראיינת: 'מי ששואלת בראיון מקצועי — התפקיד הוא השאלה',
  אדם: 'נפתר בענף הבעלות; ראו את השורה שלו במרשם',
  'נציג הבעלים': 'בדיוני — מי שמדבר בשם הבעלים מול האוהדים ב-2024 (`2024-home`). הבעלים עצמם אנשים אמיתיים ואינם מדברים במשחק (תנ"ך §29)',
}

/**
 * ...ומי שהוא תפקיד שהמשחק **ממלא בזמן ריצה** מתוך מה שהשחקן בחר.
 *
 * `PARTNER` ו-`הילד` הם `PARTNERSHIP` ו-`PARENTHOOD` ב-`lib/life/tracks.ts`: מי הם
 * תלוי בחיים שנחיו, ושורה שהייתה קובעת שם היא המשחק בוחר בת זוג בשבילך.
 * `PARTNER_OR_KEREN` הוא המקרה המפורש של אותו דבר — בת הזוג אם יש, וקרן אם אין.
 * `TARGET` הוא "מי שהסצנה הזאת מדברת איתו" ומשתנה בין הסתעפויות.
 *
 * **וסצנה לא תדפיס אף אחד מהם על המסך.** תפקיד שלא נפתר הוא מקום ריק, לא שם —
 * ומי שמגיע לסצנה בלי שלקח את המסלול רואה את החלופה שהתסריט כותב לו (`חלופה`),
 * לא את המילה `PARTNER`.
 */
export const RUNTIME_ROLES: Readonly<Record<string, string>> = {
  PARTNER: 'בן/בת הזוג שנבחר/ה ב-`2011-people` — `lib/life/partner.ts` מחליף בזמן ריצה',
  PARTNER_OR_KEREN: 'בת הזוג אם יש, וקרן אם אין',
  הילד: 'הילד מ-PARENTHOOD — אם המסלול נלקח',
  TARGET: 'מי שהסצנה הזאת מדברת איתו, לפי ההסתעפות',
}

/** a chorus is not a speaker — nobody in particular says it, and everybody does */
export const CHORUS: readonly string[] = ['כולם']

/**
 * האם יש למילה הזאת תשובה — אדם, תפקיד, תפקיד-ריצה או מקהלה.
 *
 * זו השאלה שאפשר לשאול מכנית, ותשובה שלילית עליה היא **תמיד** באג: או שמישהו נכנס
 * לתוכן בלי שורה, או שמישהו כתב תפקיד בלי להצהיר עליו. `tests/life-cast.test.ts`
 * שואל אותה על כל דובר בכל שיחה ועל כל דובר בתסריט ההמשך.
 */
export function speakerHasAnAnswer(who: string): boolean {
  if (SPEAKING_ROLES[who] || RUNTIME_ROLES[who] || CHORUS.includes(who)) return true
  return speakerKeys(who).some((key) => ALL_CHARACTERS.some((row) => row.id === key))
}

export function speakerKeys(who: string): string[] {
  const entry = ALL_CHARACTERS.find(
    (character) =>
      character.id === who ||
      character.displayNameHe === who ||
      (character.aliases ?? []).includes(who),
  )
  if (!entry) return [who]
  // The raw spelling first: an era map is allowed to override one person's plate for one
  // chapter, and that override must win over the registry's general answer.
  return [who, entry.displayNameHe, entry.id, ...(entry.aliases ?? [])]
}

/** The plate for a speaker, out of the plates this chapter loaded. */
export function portraitFor(who: string, plates: Record<string, string>): string | null {
  for (const key of speakerKeys(who)) {
    const plate = plates[key]
    if (plate) return plate
  }
  return null
}
