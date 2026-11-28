/**
 * LIFE · the hood — coming back (the owner's screenplay, 28.11.2026: a return after a week opens on a person or a thing
 * from the save and one line, "You still have her ticket.", before any list of missions).
 *
 * Pure: which line a continued life opens on. The last thing he kept, if he kept anything; else whoever has the next
 * mission for him. Keys only: the words are in `words.ts` and `story/words.ts`.
 */
export type ResumeLine = {key: 'hood.resume.keep'; thing: string} | {key: 'hood.resume.wait'; who: string} | null

export function resumeLine(o: {keeps: readonly string[]; /** the person who has the next mission, by the hood's id */ giver: string | null}): ResumeLine {
  const last = o.keeps[o.keeps.length - 1]
  if (last) return {key: 'hood.resume.keep', thing: `story.keep.${last}`}
  if (o.giver) return {key: 'hood.resume.wait', who: o.giver}
  return null
}
