import { characterName } from '../characters'
import { timeLabel } from '../clock'
import type { LifeState } from '../types'
import { canEnterArea } from './areas'
import { meets, type Condition } from './types'

/**
 * למה שום דבר לא קורה — the question this game had no way to answer.
 *
 * A chapter moves when a condition becomes true, and a condition is a nested object.
 * When it does not become true, everything the player and everything the developer can
 * see is identical: a room with nothing happening in it. Maor has now hit that three
 * times — a mother who never came home because a clock was frozen, a father in an empty
 * chair, an afternoon in 1984 that could not end — and each time the report was the same
 * sentence, *"השלב הזה לא זורם"*, because it is the only sentence available from outside.
 *
 * So the condition explains itself. `unmet()` walks a `Condition` and returns the parts
 * that are false, in Hebrew, as short phrases a person could act on ("אחרי 17:30",
 * "צריך: המפתח", "רק אם עוד לא: a2:done"). It is used in three places, and that is the
 * point of putting it here rather than in any of them:
 *
 *   - the help sheet, so a player who is standing still is told what he is waiting for;
 *   - `debug.pending()`, so a probe reports WHY a chapter did not close, not just that it
 *     did not;
 *   - `scripts/life/finish-audit.mjs`, which prints it beside every chapter it had to
 *     rescue, so "the written path is unreachable" stops being a guess.
 *
 * It never invents. Where a flag has no human name it prints the flag, because a flag id
 * a developer can grep for is more use than a sentence somebody made up.
 */

/** flags whose names are worth saying out loud; everything else prints as its id */
const FLAG_HE: Record<string, string> = {
  'knows:match': 'לדעת שיש היום משחק',
  'permission:yes': 'רשות מאמא',
  'entry:granted': 'להיכנס פנימה',
  'match:over': 'שהמשחק ייגמר',
  'played:football': 'לשחק כדורגל ברחוב',
  'sneak:ready': 'הפתק במטבח',
  'derby:over': 'שהדרבי ייגמר',
}

const ITEM_HE: Record<string, string> = {
  'house-key': 'המפתח',
  newspaper: 'העיתון',
  coin: 'מטבע',
  scarf: 'הצעיף',
  transistor: 'הטרנזיסטור',
  'school-note': 'הפתק מבית הספר',
}

const flagHe = (flag: string) => FLAG_HE[flag] ?? flag

/** אזורים שיש להם שם שאפשר לומר בקול; כל השאר מודפס כמזהה */
const AREA_HE: Record<string, string> = { ussishkin: 'אולם אוסישקין' }
const itemHe = (item: string) => ITEM_HE[item] ?? item

/**
 * The parts of this condition that are NOT true right now, as short Hebrew phrases.
 *
 * An empty array means the condition holds. Only the leaves that actually fail are
 * reported: a condition with eight clauses of which one is false reads as one line, which
 * is what makes the output usable rather than a dump.
 */
export function unmet(state: LifeState, condition?: Condition, depth = 0): string[] {
  if (!condition || meets(state, condition)) return []
  const out: string[] = []
  const say = (text: string) => out.push(text)

  if (condition.flag && !state.flags[condition.flag]) say(`צריך: ${flagHe(condition.flag)}`)
  if (condition.notFlag && state.flags[condition.notFlag]) say(`רק אם עוד לא: ${flagHe(condition.notFlag)}`)
  if (condition.hasItem && (state.inventory[condition.hasItem] ?? 0) < 1) say(`צריך: ${itemHe(condition.hasItem)}`)
  if (condition.lacksItem && (state.inventory[condition.lacksItem] ?? 0) > 0) say(`בלי: ${itemHe(condition.lacksItem)}`)
  if (condition.minAgorot !== undefined && state.agorot < condition.minAgorot) {
    say(`צריך ${Math.ceil(condition.minAgorot / 100)} ₪`)
  }
  if (condition.afterMinute !== undefined && state.minute < condition.afterMinute) say(`אחרי ${timeLabel(condition.afterMinute)}`)
  if (condition.beforeMinute !== undefined && state.minute >= condition.beforeMinute) say(`לפני ${timeLabel(condition.beforeMinute)}`)
  if (condition.bond && (state.bonds[condition.bond.who] ?? 0) < condition.bond.min) {
    say(`קשר חזק יותר עם ${characterName(condition.bond.who)}`)
  }
  if (condition.flagIs && state.flags[condition.flagIs.flag] !== condition.flagIs.value) {
    say(`צריך: ${flagHe(condition.flagIs.flag)}`)
  }
  if (condition.at && condition.at !== state.location) say(`להיות ב-${condition.at}`)
  /**
   * אזור שהוא לא יודע להגיע אליו — המשפט הזה הוא כל ההבדל בין מנעול לבין ידע.
   *
   * "הדלת סגורה" שולח שחקן לחפש מפתח שאינה קיימת. "אתה לא יודע איך מגיעים לשם" שולח אותו
   * לחפש **בן אדם**, וזאת התשובה הנכונה: `TEACHES` אומר מי, והמשחק כבר מציב את אותו אדם
   * ברחוב באותו אחר צהריים.
   */
  if (condition.area && !canEnterArea(state, condition.area)) say('אתה לא יודע איך מגיעים לשם — מישהו צריך לקחת אותך')
  if (condition.gateIs && state.gate.identity !== condition.gateIs) say(`לעמוד ב-${condition.gateIs}`)

  // composition — recursed, and only the failing side is reported
  for (const part of condition.all ?? []) out.push(...unmet(state, part, depth + 1))
  if (condition.any?.length && !condition.any.some((part) => meets(state, part))) {
    const options = condition.any.map((part) => unmet(state, part, depth + 1).join(', ')).filter(Boolean)
    if (options.length) say(`אחד מ: ${options.join(' / ')}`)
  }
  for (const part of condition.none ?? []) {
    if (meets(state, part)) {
      const why = describe(part)
      if (why) say(`רק אם עוד לא: ${why}`)
    }
  }

  // A condition that fails on a clause this file has no words for still has to say
  // something, or a silent empty array reads as "everything is fine" — which is the exact
  // failure mode this file exists to end.
  if (!out.length && depth === 0) say('תנאי שעדיין לא התקיים')
  return out
}

/** a one-phrase description of a condition, for the `none:` case */
function describe(condition: Condition): string | null {
  if (condition.flag) return flagHe(condition.flag)
  if (condition.hasItem) return itemHe(condition.hasItem)
  if (condition.flagIs) return flagHe(condition.flagIs.flag)
  if (condition.area) return AREA_HE[condition.area] ?? condition.area
  return null
}
