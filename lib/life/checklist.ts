/**
 * הרשימה — one clear objective, and the steps under it, discovered one at a time.
 *
 * The red cloth says the shape of the day in one line and never gives an instruction.
 * Under the "?" the player finds this: the steps of the day as a list, but a list that
 * GROWS — a step appears only once the world has shown it (a name heard, a door seen, a
 * flag raised) and is ticked once it is done. Nothing is spelled out in advance, nothing
 * is a waiting task, and a player who never opens the sheet loses nothing: the world
 * itself is the checklist.
 *
 * Every step is two conditions on the state (`revealWhen`, `doneWhen`), which are the
 * same `Condition` shape doors and beats use, so `tests/life-checklist.test.ts` can walk
 * a chapter's flags and watch the list grow and tick without a browser.
 */
import { meets, type Condition } from './world/types'
import type { LifeState } from './types'

export type ChecklistStep = {
  id: string
  textHe: string
  /** the step shows only once this holds; omit for a step known from the first minute */
  revealWhen?: Condition
  /** ticked once this holds */
  doneWhen: Condition
}

export type ChecklistItem = { id: string; textHe: string; done: boolean }

const F = (flag: string): Condition => ({ flag })
const ANY = (...flags: string[]): Condition => ({ any: flags.map((flag) => ({ flag })) })

export const CHECKLISTS: Record<string, readonly ChecklistStep[]> = {
  '1986': [
    // (Director V3 §11, 24.9.2026) the key is no longer the first thing the day asks for:
    // it is in the drawer for whoever opens it, and the door does not need it
    { id: 'dad', textHe: 'לדבר עם אבא.', doneWhen: F('knows:match') },
    { id: 'east', textHe: 'לרחוב. אחרי האנשים, מזרחה.', revealWhen: F('kobi:left'), doneWhen: ANY('entry:granted', 'entry:ticket') },
    { id: 'gate', textHe: 'שער 7. להיכנס.', revealWhen: F('kobi:left'), doneWhen: F('entry:granted') },
    { id: 'match', textHe: 'המשחק.', revealWhen: F('entry:granted'), doneWhen: F('match:over') },
    { id: 'kobi', textHe: 'למצוא את אבא.', revealWhen: F('saw:goal'), doneWhen: F('found:kobi') },
  ],
  '1990': [
    { id: 'math', textHe: 'להבין בכמה צריך לנצח היום.', doneWhen: F('knows:math') },
    { id: 'go', textHe: 'לצאת. מזרחה.', revealWhen: F('kobi:left'), doneWhen: ANY('entry:granted', 'entry:ticket', 'saw:goal') },
    { id: 'gate', textHe: 'שער 7. עם אבא, עם כרטיס, או לחכות למחצית.', revealWhen: F('kobi:left'), doneWhen: ANY('entry:granted', 'entry:ticket') },
    { id: 'kobi', textHe: 'למצוא את אבא.', revealWhen: F('entry:granted'), doneWhen: F('found:kobi') },
    { id: 'home', textHe: 'הביתה.', revealWhen: F('found:kobi'), doneWhen: F('walked:home') },
  ],
  '1991': [
    { id: 'school', textHe: 'בית ספר. עד הצלצול.', doneWhen: F('school:done') },
    { id: 'hw', textHe: 'שיעורי בית — או משהו שנראה כמו שיעורי בית.', revealWhen: F('hw:given'), doneWhen: ANY('hw:done', 'hw:half', 'hw:faked') },
    { id: 'permission', textHe: 'רשות מאמא. או דרך אחרת.', revealWhen: ANY('hw:done', 'hw:half', 'hw:faked'), doneWhen: ANY('permission:yes', 'sneak:ready') },
    /**
     * אמרה לא — and the list says where the other way is, by name.
     *
     * A boy told "no" at seven in the evening has two routes and neither of them is a
     * locked door: the pad on the kitchen table (leave a note and go, and pay for it
     * later), or the evening at home by the radio, which is a real 11.3.1991 and ends the
     * chapter like any other. This line exists because the version without it left a
     * player standing in a flat with nothing to press (6.9.2026).
     */
    { id: 'refused', textHe: 'אמרה לא. הפנקס במטבח — אפשר להשאיר פתק. אפשר גם להישאר.', revealWhen: F('permission:no'), doneWhen: ANY('sneak:ready', 'night:home', 'derby:over') },
    { id: 'hall', textHe: 'אוסישקין. הדלת.', revealWhen: ANY('permission:yes', 'sneak:ready'), doneWhen: F('spot:asked') },
    { id: 'derby', textHe: 'הדרבי.', revealWhen: F('spot:asked'), doneWhen: F('derby:over') },
    { id: 'home', textHe: 'הביתה. לפני שמישהו שם לב.', revealWhen: F('derby:over'), doneWhen: F('walked:home') },
  ],
  '1993-cup': [
    { id: 'money', textHe: 'כסף לאוטובוס.', doneWhen: ANY('money:enough', 'route:tv') },
    { id: 'route', textHe: 'עם מי נוסעים — אפי, אופיר, או הטלוויזיה.', revealWhen: F('money:enough'), doneWhen: ANY('route:efi', 'route:ofir', 'route:tv') },
    { id: 'corner', textHe: 'הפינה של אוסישקין לפני שש.', revealWhen: ANY('route:efi', 'route:ofir'), doneWhen: F('on:bus') },
    { id: 'final', textHe: 'הגמר.', revealWhen: ANY('on:bus', 'route:tv'), doneWhen: F('final:over') },
    { id: 'home', textHe: 'הביתה.', revealWhen: F('final:over'), doneWhen: F('walked:home') },
  ],
  '1993-galil': [
    { id: 'g1', textHe: 'משחק 1. האולם.', doneWhen: F('life:galil:d2') },
    { id: 'g2', textHe: 'משחק 2. הרדיו.', revealWhen: F('life:galil:d2'), doneWhen: F('life:galil:d3') },
    { id: 'g3', textHe: 'משחק 3. האולם.', revealWhen: F('life:galil:d3'), doneWhen: F('life:galil:d4') },
    { id: 'g4', textHe: 'המשחק המכריע. בצפון. איך מגיעים?', revealWhen: F('life:galil:d4'), doneWhen: F('g4:decided') },
    { id: 'after', textHe: 'הפינה. אחרי.', revealWhen: F('life:galil:after'), doneWhen: F('after:done') },
  ],
  '1995-sinai': [
    { id: 'radio', textHe: 'הרדיו אצל רפי.', doneWhen: F('s1:heard') },
    { id: 'argue', textHe: 'להגיד מה אתה מרגיש.', revealWhen: F('s1:heard'), doneWhen: F('s1:argued') },
    { id: 'poster', textHe: 'הפוסטר על הקיר.', revealWhen: F('s1:argued'), doneWhen: F('life:sinai:d2') },
    { id: 'facts', textHe: 'הקיוסק. העובדות.', revealWhen: F('life:sinai:d2'), doneWhen: F('s2:done') },
  ],
  '1996-army': [
    { id: 'pack', textHe: 'לארוז את התיק. להיפרד מאמא.', doneWhen: F('a1:packed') },
    { id: 'gate', textHe: 'שער 7, שער 5 — או הגדר באמצע. לעמוד איפשהו.', revealWhen: F('life:army:d2'), doneWhen: F('a2:chose') },
    { id: 'bus', textHe: 'האוטובוס ברציף, הדלת פתוחה. לעלות — או לא.', revealWhen: F('life:army:d3'), doneWhen: F('a3:decided') },
    { id: 'road', textHe: 'האוטו של לירון.', revealWhen: F('life:army:d4'), doneWhen: F('a4:road') },
    { id: 'journeys', textHe: 'שתי נסיעות. אפשר אחת.', revealWhen: F('life:army:d5'), doneWhen: F('a5:done') },
  ],
  '1997-basket': [
    { id: 'corner', textHe: 'שחור, לימור, פרדי. בפינה.', doneWhen: ANY('h1:crates', 'h1:decided') },
    { id: 'choose', textHe: 'האולם — או בלומפילד. לא שניהם.', revealWhen: ANY('h1:crates', 'h1:decided'), doneWhen: F('h1:decided') },
    { id: 'after', textHe: 'שנה אחרי. אותו אולם.', revealWhen: F('life:hall:d2'), doneWhen: F('h2:done') },
  ],
  '1998-laces': [
    { id: 'dad', textHe: 'אבא זהיר. להגיד לו משהו.', doneWhen: ANY('l1:match', 'l1:after') },
    { id: 'ground', textHe: 'בלומפילד לפני חמש.', revealWhen: F('life:laces:d1'), doneWhen: ANY('l1:match', 'l1:after') },
    { id: 'match', textHe: 'המשחק. ומה שקורה במקום אחר.', revealWhen: F('l1:match'), doneWhen: F('l1:inside') },
    { id: 'class', textHe: 'יום ראשון. שיעור.', revealWhen: F('life:laces:d2'), doneWhen: F('l2:done') },
  ],
  '1999-basket': [
    { id: 'corner', textHe: 'שחור וסוקו בפינה.', doneWhen: F('seed:opened') },
    { id: 'hall', textHe: 'לעבוד באולם. לשאול למה.', revealWhen: F('seed:opened'), doneWhen: F('seed:hall') },
    { id: 'kiosk', textHe: 'הקיוסק. מי יושב שם.', revealWhen: F('seed:hall'), doneWhen: F('seed:list') },
  ],
  '1999-cup': [
    { id: 'route', textHe: 'עם מי נוסעים לרמת גן.', doneWhen: F('c99:route') },
    { id: 'ground', textHe: 'רמת גן. שמונה.', revealWhen: F('c99:route'), doneWhen: F('c99:over') },
  ],
  '2000-title': [
    { id: 'route', textHe: 'איך מגיעים לשכונת התקווה — ועם מי.', doneWhen: F('t:route') },
    { id: 'ground', textHe: 'המגרש. שלוש.', revealWhen: F('t:route'), doneWhen: F('t:over') },
  ],
  '2000-double': [
    { id: 'days', textHe: 'ארבעה ימים. שני דברים. לא יותר.', doneWhen: F('d:final') },
    { id: 'final', textHe: 'רמת גן. הגמר.', revealWhen: F('d:final'), doneWhen: F('d:over') },
    { id: 'walk', textHe: 'החוצה. מי לידך.', revealWhen: F('d:over'), doneWhen: F('d:walked') },
  ],
  /**
   * הגשר — ולכן שלושה שלבים בלבד, אחד לכל סצנה בתסריט (B00, B01, B02).
   *
   * `revealWhen` שומר על הסדר שהתסריט כותב: הקופסה נפתחת אחרי שהלילה נסגר,
   * וההתחייבות נלקחת אחרי הקופסה. בלי זה הרשימה מציגה שלוש משימות בבת אחת בלילה
   * שכל כולו "עם מי אתה מסיים אותו".
   */
  '2000-bridge': [
    { id: 'night', textHe: 'הלילה נגמר. עם מי אתה מסיים אותו.', doneWhen: F('b:night') },
    { id: 'box', textHe: 'הקופסה על המדף.', revealWhen: F('b:night'), doneWhen: F('b:box') },
    { id: 'commit', textHe: 'רפי פותח בשש. יש מחר.', revealWhen: F('b:box'), doneWhen: F('b:commit') },
  ],
  '2002-europe': [
    { id: 'chelsea', textHe: 'צ׳לסי מגיעים. איפה אתה בערב הזה.', doneWhen: F('e:chelsea') },
    { id: 'beds', textHe: 'רומא מחפש איפה להשכיב שלושה.', revealWhen: F('e:chelsea'), doneWhen: F('e:beds') },
    { id: 'trip', textHe: 'רבע גמר. שולחן המטבח.', revealWhen: F('e:beds'), doneWhen: F('e:trip') },
    { id: 'milan', textHe: 'משחק הבית.', revealWhen: F('e:trip'), doneWhen: F('e:milan') },
    { id: 'after', textHe: 'מה עושים עכשיו.', revealWhen: F('e:milan'), doneWhen: F('e:after') },
  ],
  '2006-home': [
    { id: 'derby', textHe: 'אפי גורר אותך לאולם. יש דרבי.', doneWhen: F('h:derby') },
    { id: 'door', textHe: 'אוסישקין. מבחוץ, הפעם.', revealWhen: F('h:derby'), doneWhen: F('h:door') },
    { id: 'work', textHe: 'לירון קרא לך.', revealWhen: F('h:door'), doneWhen: F('h:work') },
    { id: 'oli', textHe: 'יש נסיעה. מישהו נוהג.', revealWhen: F('h:work'), doneWhen: F('h:oli') },
  ],
  // (דלתא 90) 2007 — מה שנלקח נעשה בידיים: המחסן, הדף עם המספרים, הציוד לפני מחר
  '2007-table': [
    { id: 'role', textHe: 'חדר הקהילה. יוסף ושחור מחכים עם הדף.', doneWhen: F('u:role') },
    { id: 'count', textHe: 'המחסן. מה יש, ומה חסר.', revealWhen: { flagIs: { flag: 'u:roleKind', value: 'operations' } }, doneWhen: F('u:counted') },
  ],
  '2007-registered': [
    { id: 'calls', textHe: 'הדף עם המספרים. שיחה אחת בכל פעם.', revealWhen: F('u:calls'), doneWhen: ANY('u:adapted', 'u:deliver') },
    { id: 'deliver', textHe: 'המתנדבים. מה שהבטחת — ליוסף, ביד.', doneWhen: F('u:deliver') },
    { id: 'loss', textHe: 'אוסישקין. היום.', revealWhen: F('u:deliver'), doneWhen: F('u:loss') },
  ],
  '2007-key': [
    { id: 'kit', textHe: 'מחר בשמונה מישהו אחר פותח. להכין לו.', revealWhen: F('u:keyPlan'), doneWhen: ANY('u:sorted', 'u:listed') },
    { id: 'key', textHe: 'מחר בשמונה. מישהו צריך לפתוח.', doneWhen: F('u:key') },
  ],
  '2009-up': [
    { id: 'after', textHe: 'עלינו. יש מי שיסגור?', doneWhen: F('u:after') },
  ],
  '2010-cup': [
    { id: 'photo', textHe: 'המגרש של החבר׳ה. תמונה.', doneWhen: F('d10:photo') },
    { id: 'math', textHe: 'בקיוסק עמית כבר מחשב.', revealWhen: F('d10:photo'), doneWhen: F('d10:math') },
    { id: 'derby', textHe: 'אחרי הדרבי.', revealWhen: F('d10:math'), doneWhen: F('d10:derby') },
    { id: 'cup', textHe: 'גמר הגביע.', revealWhen: F('d10:derby'), doneWhen: F('d10:cup') },
  ],
  '2010-teddy': [
    { id: 'plan', textHe: 'אולי ליד הרכב. מי בא?', doneWhen: ANY('d10:plan', 'd10:mode') },
    // (דלתא 90) התוכנית היא לוגיסטיקה שעושים ברחוב: מקום, כסף, ואיך חוזרים
    { id: 'seat', textHe: 'מקום אחד נשאר ברכב.', revealWhen: { flagIs: { flag: 'd10:mode', value: 'venue' } }, doneWhen: ANY('d10:seated', 'd10:plan') },
    { id: 'pay', textHe: 'כרטיס ודלק — ביד של אולי.', revealWhen: F('d10:seated'), doneWhen: ANY('d10:paid', 'd10:plan') },
    { id: 'promise', textHe: 'עמית: איך חוזרים?', revealWhen: F('d10:paid'), doneWhen: F('d10:plan') },
    { id: 'title', textHe: 'שבת. שני מגרשים.', revealWhen: F('d10:plan'), doneWhen: F('d10:title') },
    { id: 'call', textHe: 'אחרי השריקה.', revealWhen: F('d10:title'), doneWhen: F('d10:call') },
    { id: 'back', textHe: 'מי נשאר מאחור.', revealWhen: F('d10:call'), doneWhen: F('d10:back') },
    { id: 'morning', textHe: 'הבוקר.', revealWhen: F('d10:back'), doneWhen: F('d10:morning') },
  ],
  '2010-qualify': [
    { id: 'diary', textHe: 'היומן בקיוסק. שלושה סיבובים.', doneWhen: F('c10:qualify') },
    { id: 'trip', textHe: 'רומא. עיר אחת, או אף אחת.', revealWhen: F('c10:qualify'), doneWhen: F('c10:trip') },
  ],
  '2010-anthem': [
    { id: 'debut', textHe: 'הערב הראשון.', doneWhen: F('c10:debut') },
    { id: 'host', textHe: 'האירוח שסיכמת.', revealWhen: F('c10:debut'), doneWhen: F('c10:host') },
    { id: 'keren', textHe: 'קרן שאלה מה שלומך.', revealWhen: F('c10:host'), doneWhen: F('c10:call') },
    { id: 'promise', textHe: 'מחר בערב. השיחה שהבטחת.', revealWhen: F('promise:callKeren'), doneWhen: F('c10:callback') },
    { id: 'benfica', textHe: 'בלומפילד. אבא כבר שם.', revealWhen: F('c10:call'), doneWhen: F('c10:benfica') },
    { id: 'lyon', textHe: 'הערב האחרון.', revealWhen: F('c10:benfica'), doneWhen: F('c10:lyon') },
  ],
  '2012-cups': [
    { id: 'word', textHe: 'הטלפון בסלון: השעה שהובטחה.', doneWhen: F('n:word') },
    { id: 'cup', textHe: 'גמר. ומה שצריך להודיע לפניו.', revealWhen: F('n:word'), doneWhen: F('n:cups') },
    { id: 'place', textHe: 'מה שבחרת לערב — במקום שלו.', revealWhen: F('n:cups'), doneWhen: F('n:done') },
  ],
  '2012-five': [
    { id: 'five', textHe: 'פינת אלנבי. חמש שנים.', doneWhen: F('n:five') },
    { id: 'own', textHe: 'פרדי, והדפים.', revealWhen: F('n:five'), doneWhen: F('n:own') },
    { id: 'room', textHe: 'חדר החזרות, בערב.', revealWhen: F('n:own'), doneWhen: F('n:room') },
  ],
  '2015-newhall': [
    { id: 'hall', textHe: 'האולם החדש. עם מי שלא ראה את הישן.', doneWhen: F('nr:hall') },
    { id: 'prep', textHe: 'עד שש וחצי: הבד, הנייר, הדלתות, השורה — זמן לשניים.', revealWhen: F('nr:prep'), doneWhen: F('nr:crowd') },
    { id: 'route', textHe: 'מאיפה יוצאים.', revealWhen: F('nr:first'), doneWhen: F('nr:route') },
  ],
  '2016-crisis': [
    { id: 'news', textHe: 'מה ידוע, ומה עוד לא.', doneWhen: F('p:news') },
    { id: 'till', textHe: 'הקופה של הקבוצה.', revealWhen: F('p:news'), doneWhen: F('p:till') },
    { id: 'deliver', textHe: 'הרשימה של מתוקי.', revealWhen: F('p:till'), doneWhen: F('p:deliver') },
    { id: 'table', textHe: 'הטבלה, אחרי שהיא מתעדכנת.', revealWhen: F('p:deliver'), doneWhen: F('p:table') },
  ],
  '2017-after': [
    { id: 'amit', textHe: 'עמית.', doneWhen: F('p:amit') },
    { id: 'choice', textHe: 'מה עכשיו. אבא שואל.', revealWhen: F('p:amit'), doneWhen: F('p:choice') },
    { id: 'invite', textHe: 'שישי. אפי שאל.', revealWhen: F('p:choice'), doneWhen: F('p:invite') },
  ],
  '2018-return': [
    { id: 'back', textHe: 'חזרנו — או שהקבוצה חזרה.', doneWhen: F('r:back') },
    { id: 'signs', textHe: 'בלומפילד המחודש. השילוט, לא הזיכרון.', revealWhen: F('r:reopen'), doneWhen: F('r:signs') },
  ],
  '2021-losses': [
    { id: 'indoors', textHe: 'ערב בבית. אבא על המסך.', doneWhen: F('r:indoors') },
    { id: 'final', textHe: 'הגמר, על המסך הקטן בקיוסק.', revealWhen: F('r:indoors'), doneWhen: F('r:final') },
    { id: 'cup', textHe: 'אחרי הגמר.', revealWhen: F('r:final'), doneWhen: F('r:cup') },
    { id: 'young', textHe: 'ערב שכואב לאנשים אחרים.', revealWhen: F('r:cup'), doneWhen: F('r:young') },
  ],
  '2023-tournament': [
    { id: 'role', textHe: 'איזה תפקיד אתה לוקח.', doneWhen: F('z:role') },
    { id: 'derby', textHe: 'הדרבי, ומה כותבים מתחת לתמונה.', revealWhen: F('z:role'), doneWhen: F('z:derby') },
    { id: 'owner', textHe: 'הדף על הלוח: חמישים ואחת, שלושים, תשע־עשרה.', revealWhen: F('z:derby'), doneWhen: F('z:owner') },
    { id: 'grow', textHe: 'מי מחליט כשגדלים.', revealWhen: F('z:owner'), doneWhen: F('z:grow') },
  ],
  '2023-quiet': [
    { id: 'aid', textHe: 'מאיה. אין פה משימה.', doneWhen: F('z:aid') },
    { id: 'where', textHe: 'אחד־עשר במאי. איפה אתה כשזה נגמר.', revealWhen: F('z:aid'), doneWhen: F('z:where') },
    { id: 'again', textHe: 'אבא, שוב.', revealWhen: F('z:where'), doneWhen: F('z:again') },
  ],
  '2024-home': [
    { id: 'rumor', textHe: 'הקיוסק. מי קונה, ומה באמת נחתם.', doneWhen: F('h24:board') },
    { id: 'ask', textHe: 'עמית שואל מה אתה אומר.', revealWhen: F('h24:board'), doneWhen: F('h24:ask') },
    { id: 'small', textHe: 'הדרייב אין. עד אז מה?', revealWhen: F('h24:ask'), doneWhen: F('h24:concern') },
    { id: 'ticket', textHe: 'המנוי: להעביר, לא להעביר, או לחכות לבורר.', revealWhen: F('h24:concern'), doneWhen: F('h24:night') },
    // S5 — the first night is a room (`menora`, 27.9.2026)
    { id: 'menora', textHe: 'ההיכל. למצוא את המקום, לחפש פנים — ולשבת.', revealWhen: { flagIs: { flag: 'life:menora:2025', value: 'went' } }, doneWhen: F('h24:inside') },
  ],
  '2025-eurocup': [
    { id: 'euro', textHe: 'הגמר באירופה.', doneWhen: F('z:euro') },
    { id: 'night', textHe: 'חצות וחצי, ומישהו מחכה למחר.', revealWhen: F('z:euro'), doneWhen: F('z:collide') },
    { id: 'glad', textHe: 'אפי שואל אם אתה שמח.', revealWhen: { all: [F('z:euro'), F('life:menora:2025')] }, doneWhen: F('z:glad') },
    { id: 'up', textHe: 'הדרכון של אבא.', revealWhen: F('z:euro'), doneWhen: F('z:up') },
  ],
  '2026-plan': [
    { id: 'money', textHe: 'מי משלם, ועל מה.', doneWhen: F('f:money') },
    { id: 'plan', textHe: 'להראות לאבא את התוכנית.', revealWhen: F('f:money'), doneWhen: F('f:plan') },
  ],
  '2026-finale': [
    { id: 'road', textHe: 'הרציף, הטיסה, ונמל ההגעה.', doneWhen: F('f:road') },
    { id: 'seats', textHe: 'מחוץ לאולם. היום אתה אחריי.', revealWhen: F('f:road'), doneWhen: F('f:seats') },
    { id: 'inside', textHe: 'המושבים. הוא לידך.', revealWhen: F('f:seats'), doneWhen: F('f:inside') },
    { id: 'back', textHe: 'בחוץ, אחרי. עם מי חוזרים.', revealWhen: F('f:inside'), doneWhen: F('f:back') },
  ],
  '2011-people': [
    { id: 'melanie', textHe: 'מלאני.', doneWhen: F('l:melanie') },
    { id: 'dor', textHe: 'דור.', revealWhen: F('l:melanie'), doneWhen: F('l:dor') },
    { id: 'tamar', textHe: 'תמר.', revealWhen: F('l:dor'), doneWhen: F('l:tamar') },
  ],
  '2013-household': [
    { id: 'diary', textHe: 'היומן שעל המקרר.', doneWhen: F('hh:diary') },
    { id: 'parent', textHe: 'לא "מתישהו".', revealWhen: F('hh:diary'), doneWhen: F('hh:parent') },
    { id: 'first', textHe: 'הערב הראשון.', revealWhen: { flagIs: { flag: 'hh:intent', value: 'yes' } }, doneWhen: F('hh:first') },
  ],
  '2021-promises': [
    { id: 'first', textHe: 'המשחק הראשון שלו.', revealWhen: F('life:child'), doneWhen: F('pr:first') },
    { id: 'promise', textHe: 'מה נעשה בפעם הבאה.', doneWhen: F('pr:promise') },
    { id: 'scarf', textHe: 'השבת שלו.', revealWhen: { all: [F('life:child'), F('pr:promise')] }, doneWhen: F('pr:scarf') },
    { id: 'evening', textHe: 'הערב עצמו. הטיילת, והטלפון בכיס.', revealWhen: F('pr:out'), doneWhen: F('pr:evened') },
  ],
  '2000-team': [
    { id: 'name', textHe: 'שם עד מחר.', doneWhen: F('y:name') },
    { id: 'guest', textHe: 'האורח הוא בן אדם.', revealWhen: F('y:name'), doneWhen: F('y:guest') },
    { id: 'train', textHe: 'אימון אחד. לא שלושה.', revealWhen: F('y:guest'), doneWhen: F('y:train') },
    { id: 'match', textHe: 'עוד התקפה אחת.', revealWhen: F('y:train'), doneWhen: F('y:match') },
    { id: 'after', textHe: 'אחרי המשחק.', revealWhen: F('y:match'), doneWhen: F('y:after') },
  ],
  '2001-terrace': [
    { id: 'first', textHe: 'מה אתה יכול לקחת עד הסוף.', doneWhen: F('t:first') },
    // under the stand (`gate5-stand`, 27.9.2026): three jobs, time for two, and the gate at five
    { id: 'prep', textHe: 'מתחת ליציע: הדגלים, הבד, החבלים. זמן לשתיים.', revealWhen: F('t:prep'), doneWhen: F('t:open') },
    { id: 'open', textHe: 'השער נפתח. מי עשה מה.', revealWhen: F('t:open'), doneWhen: F('t:credit') },
  ],
  '2002-desk': [
    { id: 'cards', textHe: 'על השולחן: ראיתי, עובדה, שמעתי.', doneWhen: F('j:board') },
    { id: 'check', textHe: 'שני על התמונה, הקופאי על הרשימה.', revealWhen: F('j:verifying'), doneWhen: F('j:second') },
    { id: 'first', textHe: 'הפרסום הראשון — לפני תשע, או אחרי.', doneWhen: F('j:first') },
  ],
  '2006-desk': [
    { id: 'desk', textHe: 'מה מחכה על השולחן שלך.', doneWhen: F('j2:read') },
    { id: 'fix', textHe: 'מה נשאר מהפרסום ההוא.', revealWhen: F('j2:read'), doneWhen: F('j:fix') },
  ],
  '2012-terrace': [
    { id: 'hand', textHe: 'מי פותח כשאתה לא בא.', doneWhen: F('t:hand') },
    // the test on the gate-5 stairs (27.9.2026)
    { id: 'test', textHe: 'ההחלטה הראשונה של יבגני — ומה אתה עושה איתה.', revealWhen: { any: [{ flagIs: { flag: 't:mode', value: 'trust' } }, { flagIs: { flag: 't:mode', value: 'small' } }] }, doneWhen: F('t:test') },
  ],
  '2024-terrace': [{ id: 'lead', textHe: 'הם מחכים שתסביר.', doneWhen: F('t:lead') }],
  '2025-interview': [
    { id: 'where', textHe: 'איפה מדברים.', doneWhen: ANY('j:where', 'j:asked') },
    { id: 'item', textHe: 'מה על השולחן בסמטה.', revealWhen: { flagIs: { flag: 'life:interview:at', value: 'jaffa' } }, doneWhen: ANY('life:interview:item', 'j:asked') },
    { id: 'asked', textHe: 'שלוש שאלות.', doneWhen: F('j:asked') },
  ],
  '2010-friends': [
    { id: 'meet', textHe: 'רומא מביא אנשים.', doneWhen: F('i:meet') },
    { id: 'banner', textHe: 'השם של מי על הבד.', revealWhen: F('i:meet'), doneWhen: F('i:banner') },
    { id: 'lineup', textHe: 'מי האורח ומי החבר.', revealWhen: F('i:banner'), doneWhen: F('i:lineup') },
  ],
  '2024-lina': [
    { id: 'phone', textHe: 'לינה קראה מה כתבת.', doneWhen: ANY('i:phone', 'i:call') },
    { id: 'tower', textHe: 'מגדל השעון, ביפו.', revealWhen: F('i:jaffa'), doneWhen: ANY('i:tower', 'i:call') },
    { id: 'call', textHe: 'לדבר לאט.', doneWhen: F('i:call') },
  ],
  '2021-suitcase': [
    { id: 'suitcase', textHe: 'מה נכנס למזוודה.', doneWhen: F('x:suitcase') },
    { id: 'corner', textHe: 'הפינה האחרונה במזוודה.', revealWhen: F('x:move'), doneWhen: { flag: 'life:abroad:corner' } },
    { id: 'sea', textHe: 'ערב אחרון על הים.', revealWhen: F('x:move'), doneWhen: F('x:sea') },
  ],
  '2023-visit': [
    { id: 'visit', textHe: 'יומיים, לא עשור.', doneWhen: F('x:visit') },
    { id: 'evening', textHe: 'הערב שבחרת.', revealWhen: { any: [{ flagIs: { flag: 'life:abroad:visit', value: 'family' } }, { flagIs: { flag: 'life:abroad:visit', value: 'friends' } }] }, doneWhen: F('x:evening') },
  ],
  '2023-abroad': [
    { id: 'phone', textHe: 'ההודעה מאבא.', doneWhen: F('x:phone') },
    { id: 'call', textHe: 'אצלם כבר התחיל.', doneWhen: F('x:call') },
    { id: 'alex', textHe: 'גם פה יש לך מפתח.', doneWhen: F('x:alex') },
  ],
  '2025-abroad': [
    { id: 'reunion', textHe: 'הפעם אתה מחכה לו.', doneWhen: F('x:reunion') },
    { id: 'leave', textHe: 'תאריך. המחשב, והחופש במאי.', revealWhen: F('x:later'), doneWhen: F('x:leave') },
    { id: 'pack', textHe: 'מה שנכנס לפינה של המזוודה, ב-2021.', revealWhen: F('x:invited'), doneWhen: F('x:packed') },
  ],
  '2025-owner': [
    { id: 'fork', textHe: 'סכום, לא תוצאה.', doneWhen: F('o:fork') },
    { id: 'money', textHe: 'עד שמונה: הכסף, המגרש, האנשים — זמן לשניים.', revealWhen: F('o:brief'), doneWhen: F('o:money') },
    { id: 'team', textHe: 'מי יעבוד איתך.', revealWhen: F('o:dealGo'), doneWhen: F('o:team') },
    { id: 'sign', textHe: 'השבוע של כולם.', revealWhen: F('o:moneyGo'), doneWhen: F('o:sign') },
    { id: 'monday', textHe: 'ביום שני עדיין צריך לפתוח.', revealWhen: F('o:signGo'), doneWhen: F('o:monday') },
  ],
  '2017-distance': [
    { id: 'told', textHe: 'אופיר.', doneWhen: F('k:told') },
    { id: 'life', textHe: 'איפה כן היית — קרן, על הטיילת.', revealWhen: F('k:told'), doneWhen: F('k:life') },
    { id: 'back', textHe: 'התחנה. האוטובוס של משחק הבית.', revealWhen: F('k:life'), doneWhen: F('k:back') },
  ],
  '2019-armchair': [
    { id: 'remote', textHe: 'השלט אצל אבא.', doneWhen: F('a:remote') },
    { id: 'photo', textHe: 'התמונה של עמית.', revealWhen: F('a:remote'), doneWhen: F('a:photo') },
    { id: 'saturday', textHe: 'השבת שלך.', revealWhen: F('a:photo'), doneWhen: F('a:saturday') },
  ],
  'a2-alley': [
    { id: 'mom', textHe: 'אמא רוצה משהו.', doneWhen: F('a2:errand') },
    { id: 'bread', textHe: 'לחם מהקיוסק.', revealWhen: F('a2:errand'), doneWhen: F('a2:bread') },
    { id: 'alley', textHe: 'הסמטה. לפני שהקבוצות מתמלאות.', revealWhen: F('a2:errand'), doneWhen: ANY('a2:played', 'a2:late') },
  ],
  'a3-hall': [
    { id: 'efi', textHe: 'אפי אמר שיש משהו אחרי הקיר.', doneWhen: F('a3:inside') },
  ],
  'a4-shirt': [
    { id: 'tin', textHe: 'הקופה מתחת למיטה.', doneWhen: F('a4:tin') },
    { id: 'earn', textHe: 'בקבוקים, ארגזים, ריצה למעלה — עד 30.', revealWhen: F('a4:tin'), doneWhen: ANY('a4:worked', 'a4:ready-to-buy', 'own:shirt85') },
    { id: 'shirt', textHe: 'להספיק לרפי עד שבע.', revealWhen: F('a4:tin'), doneWhen: ANY('own:shirt85', 'a4:gave') },
  ],
  'a5-first': [
    { id: 'dress', textHe: 'להתלבש לבד.', doneWhen: F('a5:dressed') },
    { id: 'gate', textHe: 'שער 7. אבא.', revealWhen: F('a5:dressed'), doneWhen: F('a5:there') },
  ],
  'a6-radio': [
    { id: 'radio', textHe: 'לנסות את הרדיו.', doneWhen: ANY('a6:radio-dead', 'a6:heard') },
    { id: 'liron', textHe: 'לירון ברחוב מתקן רדיו.', revealWhen: F('a6:radio-dead'), doneWhen: F('a6:heard') },
  ],
  'a7-week': [
    { id: 'hear', textHe: 'לגלות על מה כולם מדברים.', doneWhen: F('a7:knows') },
    { id: 'dad', textHe: 'אבא. לשאול.', revealWhen: F('a7:knows'), doneWhen: F('a7:refused') },
  ],
}

/** the steps the player has discovered, in order, each with its tick */
export function checklistFor(state: LifeState): ChecklistItem[] {
  const steps = CHECKLISTS[state.chapter] ?? []
  const out: ChecklistItem[] = []
  for (const step of steps) {
    const done = meets(state, step.doneWhen)
    // a step that is done is known by definition; otherwise it must have been revealed
    if (!done && step.revealWhen && !meets(state, step.revealWhen)) continue
    out.push({ id: step.id, textHe: step.textHe, done })
  }
  return out
}

/** the step the player is on now — the first discovered, undone one */
export function nextStep(state: LifeState): ChecklistItem | null {
  return checklistFor(state).find((item) => !item.done) ?? null
}

/** every chapter id that has a list, for the tests */
export const CHECKLIST_CHAPTERS = Object.keys(CHECKLISTS)

