/**
 * הפרשנות של ראמבל — short terrace-style Hebrew, all deterministic (delta 99).
 *
 * No runtime AI prose and no invented history: every line is a template filled with the
 * names and minute the SERVER's match already decided. The template is picked by
 * event index + seed + type, so the same match always reads the same.
 */

export type GoalStyle = 'close-finish' | 'long-shot' | 'header' | 'counter' | 'combination' | 'rebound' | 'set-piece' | 'solo'

type Vars = { name: string; other?: string; keeper?: string }

const GOAL: Record<GoalStyle, readonly string[]> = {
  'close-finish': ['{name} מול השער הפתוח — וסוגר את זה בקרוב.', '{name} לא מחמיץ מטווח כזה. בפנים.', 'מסירה אחרונה, ו{name} מסיים בשקט.'],
  'long-shot': ['{name} מרחוק — והכדור נכנס לפינה!', 'בעיטה מהחוץ של {name}, והשוער רק מסתכל.', '{name} מנסה מרחוק. וזה בפנים.'],
  header: ['{name} מנתר מעל כולם. גול בראש!', 'הרמה לרחבה, {name} נוגח פנימה.', '{name} בראש, והיציע קם.'],
  counter: ['התפרצות! {name} רץ לבד ומסיים.', 'מהר, ישר, קדימה — {name} בפנים.', 'הפסד כדור אצלם, ו{name} כבר בדרך לרשת.'],
  combination: ['נגיעה, נגיעה, ו{name} בפנים.', 'משחק צמוד ביניהם, ו{name} גומר את המהלך.', 'שלוש מסירות קצרות, ו{name} שם אותו.'],
  rebound: ['השוער מגן, אבל {name} ראשון על הכדור.', 'החזרה מהשוער — {name} דוחף פנימה.', '{name} לא מוותר על הריבאונד.'],
  'set-piece': ['כדור עומד, ו{name} מוצא את הרשת.', 'הבעיטה החופשית מגיעה ל{name}. בפנים.', 'קרן, בלגן ברחבה, ו{name} מסיים.'],
  solo: ['{name} עובר שניים ומסיים!', 'כדרור אחד יפה של {name} — וזה שער.', '{name} לבד מול כולם. ולא מפספס.'],
}

const SAVE: readonly string[] = ['{keeper} עוצר! {name} כבר חגג בלב.', '{keeper} מוציא את זה מהפינה.', 'הצלה של {keeper} על הקו.', '{keeper} גדול. הבעיטה של {name} נעצרת.']
const CHANCE: readonly string[] = ['{name} כמעט. חצי מטר מהשער.', 'מצב מסוכן של {name}, ועוד לא נכנס.', '{name} נכנס לרחבה — והיציע עוצר נשימה.']
const MISS: readonly string[] = ['{name} מעל הקורה. היה אפשר יותר.', '{name} בועט חצי־חצי, החוצה.', 'פספוס של {name}. יקרה.']
const BLOCK: readonly string[] = ['{other} נשכב וחוסם את הבעיטה של {name}.', 'חסימה של {other}. {name} לא מאמין.', '{other} מגיע ברגע האחרון.']

export type CommentaryKind = 'goal' | 'save' | 'chance' | 'miss' | 'block'

function fill(template: string, vars: Vars): string {
  return template
    .replaceAll('{name}', vars.name)
    .replaceAll('{other}', vars.other ?? '')
    .replaceAll('{keeper}', vars.keeper ?? '')
}

function pick(list: readonly string[], index: number, seed: number, salt: number): string {
  return list[Math.abs((index * 7 + seed + salt) | 0) % list.length]!
}

export function eventLine(args: { kind: CommentaryKind; style?: GoalStyle; index: number; seed: number } & Vars): string {
  const { kind, style, index, seed } = args
  const vars: Vars = { name: args.name, other: args.other, keeper: args.keeper }
  if (kind === 'goal') return fill(pick(GOAL[style ?? 'close-finish'], index, seed, 3), vars)
  const table = kind === 'save' ? SAVE : kind === 'chance' ? CHANCE : kind === 'miss' ? MISS : BLOCK
  return fill(pick(table, index, seed, kind.length), vars)
}
