/** Editorial opening figures. Real account and guest votes are stored separately. */
export const DEMO_VOTES = true
export const SEED_TOTAL = 42
export const OPENING_VOTES: Readonly<Record<string, number>> = {
 'raja-casablanca': 8,
 'wydad-casablanca': 7,
 'al-ahly': 6,
 'maccabi-haifa': 5,
 fenerbahce: 4,
}

/** Keep the leading five close. Share the remaining opening figures among eligible clubs. */
export function seedVotes(ids: readonly string[]): Record<string, number> {
 const others = ids.filter(id => !Object.hasOwn(OPENING_VOTES, id))
 const fixedTotal = Object.values(OPENING_VOTES).reduce((sum, votes) => sum + votes, 0)
 const remaining = SEED_TOTAL - fixedTotal
 return Object.fromEntries(ids.map(id => {
  const index = others.indexOf(id)
  const votes = index === -1
   ? OPENING_VOTES[id]!
   : Math.min(3, Math.floor(remaining / others.length) + Number(index < remaining % others.length))
  return [id, votes]
 }))
}

/** Ids ordered by votes, then name order of input, for the leaderboard and "#n in the vote". */
export function rank(votes:Record<string,number>,ids:readonly string[]):string[]{
 return [...ids].sort((a,b)=>(votes[b]??0)-(votes[a]??0)||ids.indexOf(a)-ids.indexOf(b))
}
export const VOTE_KEY='fanlife.vote.v1'
