/**
 * LIFE · the player grows with the story (owner 24.11.2026: time passing must be seen). Pure: no three, no DOM.
 * The kit's bodies (`kit.ts`): the boy (1.37 m model) to twelve, the teen (1.54 m) to eighteen, the father (1.78 m) after;
 * the troupe scales a body within what it can be (a child 0.62–1.12, anyone else 0.9–1.1).
 */
/** the player's height at an age: a boy grows from 1.16 m at six to 1.50 m at twelve, a teenager to 1.68 m, a man stands 1.78 m */
/** `pack`: the small school backpack is a boy's and a young teenager's; from sixteen he goes without it */
export function heroBody(age: number): {cast: 'boy' | 'teen' | 'father'; height: number; child: boolean; pack: boolean} {
  const a = Math.max(6, Math.round(age)), pack = a < 16
  if (a < 13) return {cast: 'boy', height: 1.16 + (a - 6) * (1.5 - 1.16) / 6, child: true, pack}
  if (a < 19) return {cast: 'teen', height: Math.min(1.68, 1.55 + (a - 13) * 0.035), child: false, pack}
  return {cast: 'father', height: 1.78, child: false, pack}
}
