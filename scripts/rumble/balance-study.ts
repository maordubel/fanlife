import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool,dealDraft,rivalFor,fits,settle,SELF,FIVE,type Rated} from '@/lib/clubs/rumble'
import {extraPositions} from '@/lib/clubs/rumble-xi/positions'
/**
 * Is the Royal Rumble a fair, interesting contest? Per club, over many seeds, a bot with each of three strategies plays the classic five against the dealt rival:
 *  random   — a random affordable pick per slot          price   — spends as much as it can (the price IS the strength?)
 *  optimum  — the best total rating that fits the €15M (a perfect player)
 * Healthy: optimum beats random clearly (skill matters) but not always; price alone beats random only modestly (a price is a hint, not a verdict).
 * Also printed: rating spread inside one price rung (a wide spread = hidden bargains = thinking pays) and the price–rating correlation.
 */
const SEEDS=Number(process.env.SEEDS??300)
const sd=(xs:number[])=>{const m=xs.reduce((a,b)=>a+b,0)/xs.length;return Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/xs.length)}
const corr=(a:number[],b:number[])=>{const ma=a.reduce((x,y)=>x+y,0)/a.length,mb=b.reduce((x,y)=>x+y,0)/b.length;let n=0,da=0,db=0;for(let i=0;i<a.length;i++){n+=(a[i]!-ma)*(b[i]!-mb);da+=(a[i]!-ma)**2;db+=(b[i]!-mb)**2}return n/Math.sqrt(da*db||1)}
function combos(board:Rated[][]):Rated[][]{let out:Rated[][]=[[]];for(const slot of board)out=out.flatMap(c=>slot.map(x=>[...c,x]));return out}
async function main(){
 for(const id of CORE_CLUB_IDS){const d=(await loadClub(id))!.data,pool=ratedPool(d,{extra:extraPositions(id)})
  const byPrice=[1,2,3,4,5].map(p=>pool.filter(c=>c.price===p).map(c=>c.rating))
  const res={optimum:[0,0,0],price:[0,0,0],random:[0,0,0]} as Record<string,number[]>,wins=(k:string,v:string)=>{res[k]![v==='win'?0:v==='draw'?1:2]!++}
  let played=0
  for(let seed=1;seed<=SEEDS;seed++){
   const cards=dealDraft(pool,seed,SELF,FIVE),byId=new Map(pool.map(p=>[p.id,p])),board=cards.map(s=>s.map(c=>byId.get(c.id)!))
   const legal=combos(board).filter(c=>c.reduce((t,x)=>t+x.price,0)<=FIVE.budget&&c.every((x,i)=>fits(x,FIVE.slots[i]!)))
   if(!legal.length)continue
   const rival=rivalFor(pool,seed,SELF,FIVE);if(!rival)continue
   const pick={optimum:legal.reduce((a,b)=>b.reduce((t,x)=>t+x.rating,0)>a.reduce((t,x)=>t+x.rating,0)?b:a),
    price:legal.reduce((a,b)=>b.reduce((t,x)=>t+x.price,0)>a.reduce((t,x)=>t+x.price,0)?b:a),random:legal[(seed*7919)%legal.length]!}
   for(const [k,c] of Object.entries(pick))wins(k,settle(c,rival,seed,c.reduce((t,x)=>t+x.price,0)).verdict)
   played++}
  const pct=(a:number[])=>a.map(x=>(100*x/played).toFixed(0)+'%').join('/')
  console.log(id.padEnd(20),'n',String(pool.length).padStart(5),'boards',played,'| W/D/L optimum',pct(res.optimum!),'price',pct(res.price!),'random',pct(res.random!),'| rating sd per rung €1..5',byPrice.map(r=>r.length>1?sd(r).toFixed(1):'-').join(' '),'| corr(price,rating)',corr(pool.map(p=>p.price),pool.map(p=>p.rating)).toFixed(2))}
}
main()
