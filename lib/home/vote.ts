/**
 * "Which club opens next?" — the hub's ballot.
 * DEMO NUMBERS (owner's instruction, 8.10.2026): there is no vote store yet, so the first 33 votes are a fixed, deterministic
 * seed with Maccabi Haifa in front. When a real tally lands, replace `seedVotes` with the store and delete `DEMO_VOTES`
 * (tests/home/hub-vote.test.ts fails on purpose if the label is dropped while the seed is still in use).
 */
export const DEMO_VOTES=true
/** Votes the owner added on top of the early count (13.10.2026: Fenerbahçe, 9). They are exact, not weighted, and they raise the total. */
export const BONUS:Record<string,number>={fenerbahce:9}
const BONUS_SUM=Object.values(BONUS).reduce((a,b)=>a+b,0)
export const SEED_TOTAL=33+BONUS_SUM
/** Relative appetite per club; only the order and rough shape matter. Unknown clubs weigh 1. */
const WEIGHT:Record<string,number>={
 'maccabi-haifa':10,'olympiacos':6,'panathinaikos':5,'aek-athens':4,'dinamo-zagreb':3,'borussia-dortmund':3,'celtic':3,'st-pauli':3,
 'hapoel-petah-tikva':3,'paok':2,'hajduk-split':2,'atalanta':2,'leicester-city':2,'zrinjski-mostar':2,'partizan-belgrade':1,'union-berlin':1,
}
/** Splits exactly `total` votes over `ids` by weight (largest remainder), keeping Maccabi Haifa strictly first when it is on the ballot. */
export function seedVotes(ids:readonly string[],total=SEED_TOTAL):Record<string,number>{
 if(!ids.length)return {}
 // bonus clubs on this ballot keep their exact votes; everyone else shares the rest
 const fixed=ids.filter(id=>BONUS[id]!==undefined),rest=ids.filter(id=>BONUS[id]===undefined)
 if(fixed.length){
  const out:Record<string,number>={}
  for(const id of fixed)out[id]=BONUS[id]!
  Object.assign(out,seedVotes(rest,total-fixed.reduce((a,id)=>a+BONUS[id]!,0)))
  return out
 }
 const w=ids.map(id=>WEIGHT[id]??1),sum=w.reduce((a,b)=>a+b,0)
 const raw=w.map(x=>x*total/sum),base=raw.map(Math.floor)
 let left=total-base.reduce((a,b)=>a+b,0)
 ;[...raw.keys()].sort((a,b)=>(raw[b]!-base[b]!)-(raw[a]!-base[a]!)||a-b).forEach(i=>{if(left>0){base[i]!++;left--}})
 const out:Record<string,number>={}
 ids.forEach((id,i)=>{out[id]=base[i]!})
 const top=ids.indexOf('maccabi-haifa')
 if(top>=0){const best=Math.max(...ids.filter(x=>x!=='maccabi-haifa').map(x=>out[x]!),0);if(out['maccabi-haifa']!<=best&&ids.length>1){const give=best+1-out['maccabi-haifa']!;const donor=ids.filter(x=>x!=='maccabi-haifa').sort((a,b)=>out[b]!-out[a]!)[0]!;out['maccabi-haifa']!+=give;out[donor]!-=give}}
 return out
}
/** Ids ordered by votes, then name order of input, for the leaderboard and "#n in the vote". */
export function rank(votes:Record<string,number>,ids:readonly string[]):string[]{
 return [...ids].sort((a,b)=>(votes[b]??0)-(votes[a]??0)||ids.indexOf(a)-ids.indexOf(b))
}
export const VOTE_KEY='fanlife.vote.v1'
