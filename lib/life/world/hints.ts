/**
 * מה להגיד למי שתקוע — the sentence the room is allowed to say, and the rule behind it.
 *
 * On 6.9.2026 Maor started a new life and, in the first room of the first mission, was
 * told: «בלי מפתח אמא לא נותנת לצאת. ואבא בכורסה — תשאל אותו מה יש היום.» In 1984 his
 * father is not in that chair. He looked for him in every room, at every hour, and
 * concluded — correctly, on the evidence the game gave him — that the game was broken.
 *
 * The bug was not the father. The bug was that a hint written for ONE Saturday in 1986
 * was inherited, silently, by eighteen other chapters. That is a class of bug, not an
 * incident, so this file ends the class rather than the incident:
 *
 *   - `holds(text, present)` — an authored hint is used ONLY if every person it names is
 *     standing in the room. A line about somebody who is not there is not a hint, it is a
 *     wrong instruction, and a wrong instruction is worse than silence.
 *   - `compose(...)` — when the authored line fails, or there is none, the room composes
 *     one out of what is actually in it: who is here, which doors are open. It cannot lie,
 *     because it is generated from the same lists the renderer draws from.
 *
 * `scripts/life/deadend-audit.ts` and `tests/life-hints.test.ts` import the same `holds`,
 * so the audit and the runtime can never disagree about what counts as a lie.
 */

/**
 * The words the text uses for people, and the name each resolves to in a room's cast.
 * A room says "אבא"; the cast list says "קובי". Both are the same man and the check has
 * to know it.
 */
export const NICKNAMES: Record<string, readonly string[]> = {
  'אבא': ['קובי'],
  'קובי': ['קובי'],
  'אמא': ['רחל'],
  'רחל': ['רחל'],
  'רפי': ['רפי'],
  'אופיר': ['אופיר'],
  'עמית': ['עמית'],
  'יעקב': ['יעקב'],
  'מירי': ['מירי'],
  'שוקי': ['שוקי'],
  'קרן': ['קרן'],
  'אפי': ['אפי'],
}

/**
 * Hebrew glues its prepositions on: אבא, ואבא, לאבא, שאבא are one word to a reader and
 * four to a naive regular expression. The first version of the audit missed the exact
 * line that started all this ("ואבא") for precisely that reason.
 */
export function mentionsPerson(text: string, word: string): boolean {
  return new RegExp(`(^|[^\\p{L}])[והבלכמש]?${word}([^\\p{L}]|$)`, 'u').test(text)
}

/** every person-word this text names */
export function peopleNamed(text: string): string[] {
  return Object.keys(NICKNAMES).filter((word) => mentionsPerson(text, word))
}

/**
 * Is this line true of a room containing exactly these people?
 *
 * `present` is display names as the cast list writes them ("קובי", "רחל"). A line naming
 * nobody always holds — it is about doors, not people.
 */
export function holds(text: string, present: Iterable<string>): boolean {
  // A cast list writes people the way a player would point at them — "רפי מהקיוסק", not
  // "רפי" — so a name matches when it appears as a WORD in somebody's display name.
  const here = [...present]
  const standing = (name: string) => here.some((who) => who === name || mentionsPerson(who, name))
  for (const word of peopleNamed(text)) {
    const resolves = NICKNAMES[word] ?? [word]
    if (!resolves.some(standing) && !standing(word)) return false
  }
  return true
}

export type ComposeInput = {
  /** display names of people standing in the room who can be spoken to */
  people: readonly string[]
  /** labels of the doors that are open right now, best first */
  doors: readonly string[]
  /** what the chapter says the player wants, if it says anything */
  objectiveHe?: string | null
  /** labels of things in the room that can be looked at */
  things?: readonly string[]
}

/**
 * A hint built from the room as it actually is. Order is deliberate: a person first,
 * because talking is what moves a chapter; then a thing, because looking is free; then a
 * door, because leaving is always available and is the answer least likely to be what the
 * player wanted. The objective rides at the front when there is one, since it is the only
 * part that says WHY.
 */
export function compose(input: ComposeInput): string | null {
  const parts: string[] = []
  if (input.objectiveHe) parts.push(input.objectiveHe)
  if (input.people.length === 1) parts.push(`${input.people[0]} פה — תדבר איתו.`)
  else if (input.people.length > 1) parts.push(`${input.people.slice(0, 2).join(' ו')} פה.`)
  else if (input.things?.length) parts.push(`אפשר להסתכל על ${input.things[0]}.`)
  if (input.doors.length) parts.push(`יציאה: ${input.doors.slice(0, 2).join(' · ')}.`)
  const line = parts.join(' ').trim()
  return line.length ? line : null
}
