import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {xiPoolRaw} from '@/lib/clubs/rumble-xi/pool'
import {QUANTILES,buildCuts} from '@/lib/clubs/rumble-xi/prices'
import {writeFileSync} from 'node:fs'
/**
 * The price table: every club's every dealable man, by family, on the one rating scale; a card's price is where he stands among ALL of them
 * (not among his own club), so a middling man of a small club is never priced like another club's legend. Cut points are ratings, made
 * strictly increasing so every half-million step is a real step. Rebuild after any change to ratings, squads or positions —
 * tests/clubs/rumble-xi.test.ts fails when the file is not what a fresh build produces.
 */
const run=async()=>{
 const by:Record<string,number[]>={GK:[],DF:[],MF:[],FW:[]}
 for(const id of CORE_CLUB_IDS)for(const p of xiPoolRaw((await loadClub(id))!.data))by[p.position]!.push(p.rating)
 const cuts=buildCuts(by),n=Object.fromEntries(Object.entries(by).map(([k,v])=>[k,v.length]))
 writeFileSync('content/generated/rumble-prices.json',JSON.stringify({version:'prices-v2',scheme:'global quantile by family',quantiles:QUANTILES,n,cuts},null,1)+'\n')
 console.log(n,cuts)
}
run()
