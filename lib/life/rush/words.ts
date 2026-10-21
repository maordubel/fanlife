/**
 * LIFE · RUSH — every word a mission prints, in the two languages LIFE speaks.
 *
 * Authored fiction and interface only: no date, no score, no name of a club, a player or a ground.
 * The mission's title and brief come from the template (`specFor`), the club's words (the gate,
 * the signs) from the club's own skin. `{gate}` is the club's gate as its own signs write it.
 */
export type RushLocale = 'en' | 'he'

const EN = {
  // briefing
  'brief.kicker': 'Mission',
  'brief.required': 'This one has to be done',
  'brief.optional': 'You can skip this one',
  'brief.go': 'Go',
  'brief.skip': 'Skip',
  'brief.controls.touch': 'Left thumb moves. Hold the arrow to sprint. The eye button looks through his eyes.',
  'brief.controls.keys': 'WASD or arrows move · Shift sprints · E acts · V switches the camera · Esc pauses',
  'brief.controls.drive': 'Up is the pedal, down the brake, left and right steer. Shift for the open road.',
  'brief.archive': 'From the club’s archive',
  'brief.neutral': 'No date: the archive does not hold this night yet',
  // verbs
  'verb.run': 'Run', 'verb.drive': 'Drive', 'verb.sneak': 'Sneak', 'verb.carry': 'Carry', 'verb.find': 'Find',
  // HUD
  'hud.clock': 'Kickoff in', 'hud.clock.drive': 'Kickoff in', 'hud.clock.find': 'Gates shut in', 'hud.clock.sneak': 'Kickoff in',
  'hud.left': 'to go', 'hud.legs': 'Legs', 'hud.seen': 'Seen', 'hud.camera': 'Camera', 'hud.sprint': 'Sprint', 'hud.act': 'This one', 'hud.pause': 'Pause',
  'hud.story': 'Story mode',
  'hud.clue': 'Look for',
  'hud.roll': 'The roll', 'hud.dropped': 'Dropped — go back for it',
  'hud.banner': 'Their banner', 'hud.back': 'Now get it home',
  // pause
  'pause.title': 'Paused', 'pause.resume': 'Carry on', 'pause.restart': 'Start again', 'pause.story': 'Story mode', 'pause.story.on': 'Story mode is on: the clock stops at zero and nobody catches you twice.', 'pause.skip': 'Skip the mission',
  // events
  'ev.car': 'Sorry — sorry!', 'ev.police': 'Waved over. Licence, please.', 'ev.throw': 'Something hits the roll. You keep your feet.', 'ev.shove': 'A shoulder. You stay up.',
  'ev.caught': 'A hand on your shoulder. “Back you go.”', 'ev.wrong': 'Not him.', 'ev.found': 'There.', 'ev.grab': 'Got it.', 'ev.drop': 'The roll goes down.',
  'ev.tired': 'Legs… burning.',
  // inner voice
  'run.1': 'Kickoff soon. Keep going.', 'run.2': 'Breathe. Don’t stop now.', 'run.3': 'Hear that? They’re singing.', 'run.4': '{gate}. There it is.',
  'carry.1': 'Heavier than it looks.', 'carry.2': 'Don’t look at them. Look at the stand.', 'carry.3': 'Nearly. Nearly.',
  'drive.1': 'Long road. Full tank, empty stomachs.', 'drive.2': 'Someone in the back is singing already.', 'drive.3': 'Easy through the checks.', 'drive.4': 'Floodlights. We made it this far.',
  'sneak.1': 'They look where they walk. Walk where they don’t.', 'sneak.2': 'The gap. Now.',
  'steal.1': 'Their storeroom. Quiet.', 'steal.2': 'Hands on it.',
  // clues
  'clue.cap': 'a cap', 'clue.scarf': 'a scarf', 'clue.kit': 'the shirt', 'clue.plain': 'no shirt, a plain top', 'clue.beard': 'a beard', 'clue.tall': 'taller than the rest',
  'clue.barrier': 'by a crush barrier', 'clue.light': 'under the floodlight',
  // result
  'res.good': 'Made it', 'res.ok': 'There, just', 'res.slip': 'Not this time',
  'res.good.sub': 'Exactly as it should be.', 'res.ok.sub': 'With some help. It still counts.', 'res.slip.sub': 'The day goes on from here, a different way.',
  'res.left': 'left on the clock', 'res.late': 'late',
  'res.carry': 'Back to the day', 'res.again': 'Try again', 'res.story': 'Story mode',
  // fallbacks
  'err.webgl': 'This device could not open the mission’s picture. The day carries on without it.',
  'loading': 'The street is loading…',
} as const

export type RushKey = keyof typeof EN

const HE: Record<RushKey, string> = {
  'brief.kicker': 'משימה',
  'brief.required': 'את זה חייבים לעשות',
  'brief.optional': 'אפשר לדלג על זה',
  'brief.go': 'יוצאים',
  'brief.skip': 'לדלג',
  'brief.controls.touch': 'האגודל השמאלי מזיז. החזק את החץ כדי לרוץ. כפתור העין מראה דרך העיניים שלו.',
  'brief.controls.keys': 'WASD או חיצים לזוז · Shift לרוץ · E לפעול · V להחליף מצלמה · Esc להשהות',
  'brief.controls.drive': 'למעלה זה גז, למטה ברקס, ימינה ושמאלה הגה. Shift לכביש הפתוח.',
  'brief.archive': 'מהארכיון של המועדון',
  'brief.neutral': 'בלי תאריך: הארכיון עוד לא מחזיק את הערב הזה',
  'verb.run': 'לרוץ', 'verb.drive': 'לנהוג', 'verb.sneak': 'להתגנב', 'verb.carry': 'לסחוב', 'verb.find': 'למצוא',
  'hud.clock': 'עד שריקת הפתיחה', 'hud.clock.drive': 'עד שריקת הפתיחה', 'hud.clock.find': 'עד שסוגרים את השערים', 'hud.clock.sneak': 'עד שריקת הפתיחה',
  'hud.left': 'נשארו', 'hud.legs': 'רגליים', 'hud.seen': 'רואים אותך', 'hud.camera': 'מצלמה', 'hud.sprint': 'ספרינט', 'hud.act': 'זה הוא', 'hud.pause': 'השהיה',
  'hud.story': 'מצב סיפור',
  'hud.clue': 'לחפש',
  'hud.roll': 'הגליל', 'hud.dropped': 'נפל — תחזור לקחת',
  'hud.banner': 'הדגל שלהם', 'hud.back': 'עכשיו הביתה איתו',
  'pause.title': 'עצירה', 'pause.resume': 'להמשיך', 'pause.restart': 'להתחיל מחדש', 'pause.story': 'מצב סיפור', 'pause.story.on': 'מצב סיפור פועל: השעון נעצר באפס ואף אחד לא תופס אותך פעמיים.', 'pause.skip': 'לדלג על המשימה',
  'ev.car': 'סליחה — סליחה!', 'ev.police': 'עצרו אותך בצד. רישיון, בבקשה.', 'ev.throw': 'משהו פוגע בגליל. אתה נשאר על הרגליים.', 'ev.shove': 'כתף. אתה נשאר עומד.',
  'ev.caught': 'יד על הכתף. „אחורה.”', 'ev.wrong': 'זה לא הוא.', 'ev.found': 'שם.', 'ev.grab': 'תפסתי.', 'ev.drop': 'הגליל נופל.',
  'ev.tired': 'הרגליים… שורפות.',
  'run.1': 'עוד מעט פתיחה. ממשיכים.', 'run.2': 'לנשום. לא לעצור עכשיו.', 'run.3': 'שומע? הם שרים.', 'run.4': '{gate}. הנה זה.',
  'carry.1': 'כבד יותר ממה שנראה.', 'carry.2': 'לא להסתכל עליהם. להסתכל על היציע.', 'carry.3': 'כמעט. כמעט.',
  'drive.1': 'דרך ארוכה. מיכל מלא, בטן ריקה.', 'drive.2': 'מישהו מאחורה כבר שר.', 'drive.3': 'לאט במחסומים.', 'drive.4': 'זרקורים. הגענו עד כאן.',
  'sneak.1': 'הם מסתכלים לאן שהם הולכים. תלך לאן שהם לא.', 'sneak.2': 'הפרצה. עכשיו.',
  'steal.1': 'המחסן שלהם. בשקט.', 'steal.2': 'ידיים עליו.',
  'clue.cap': 'כובע', 'clue.scarf': 'צעיף', 'clue.kit': 'החולצה', 'clue.plain': 'בלי חולצה, בגד פשוט', 'clue.beard': 'זקן', 'clue.tall': 'גבוה מכולם',
  'clue.barrier': 'ליד מעקה', 'clue.light': 'מתחת לזרקור',
  'res.good': 'הגעת', 'res.ok': 'שם, בקושי', 'res.slip': 'לא הפעם',
  'res.good.sub': 'בדיוק כמו שצריך.', 'res.ok.sub': 'עם קצת עזרה. זה עדיין נחשב.', 'res.slip.sub': 'היום ממשיך מכאן, בדרך אחרת.',
  'res.left': 'נשאר בשעון', 'res.late': 'באיחור',
  'res.carry': 'חזרה ליום', 'res.again': 'שוב', 'res.story': 'מצב סיפור',
  'err.webgl': 'המכשיר לא הצליח לפתוח את התמונה של המשימה. היום ממשיך בלעדיה.',
  'loading': 'הרחוב נטען…',
}

export const RUSH_WORDS: Record<RushLocale, Record<RushKey, string>> = {en: EN, he: HE}

export function rushWord(locale: RushLocale, key: RushKey | string, vars: Record<string, string> = {}): string {
  const table = RUSH_WORDS[locale] as Record<string, string>
  const raw = table[key] ?? (EN as Record<string, string>)[key] ?? ''
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
}
