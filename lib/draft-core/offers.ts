import {hash} from '@/lib/clubs/rumble-rng'
import {TIER_PRICES,type DCard,type Offer,type Tier} from './types'

/**
 * Three different men for the three tiers, preferring men the solver allows, then fresh decades, then a stable shuffle (so the same
 * state always shows the same three). `tight` makes the budget tier take the cheapest allowed man. Tier orders are tried one after the
 * other, so a tier with few men is filled first; null when three different men cannot be found.
 */
export function pickTrio<C extends DCard>(pool:readonly C[],ok:(c:C)=>boolean,recent:readonly number[],salt:string,tight:boolean):Offer[]|null{
 const rk=new Map<string,number>(),rank=(c:C)=>{let v=rk.get(c.id);if(v===undefined){v=(ok(c)?0:1e6)+(c.decades?.some(d=>!recent.includes(d))??true?0:1e5)+(hash(`${salt}:${c.id}`)%1e5);rk.set(c.id,v)}return v}
 const orders:Tier[][]=[['premium','mid','budget'],['premium','budget','mid'],['budget','premium','mid'],['mid','premium','budget']]
 for(const order of orders){
  const taken=new Set<string>(),out:Partial<Record<Tier,C>>={}
  for(const t of order){
   const cands=pool.filter(c=>!taken.has(c.id)&&TIER_PRICES[t].includes(c.price)).sort((a,b)=>t==='budget'&&tight?(Number(!ok(a))-Number(!ok(b)))||a.price-b.price||rank(a)-rank(b):rank(a)-rank(b))
   const c=cands[0];if(!c)break;taken.add(c.id);out[t]=c
  }
  if(out.premium&&out.mid&&out.budget)return (['premium','mid','budget'] as const).map(t=>({id:out[t]!.id,tier:t,locked:null}))
 }
 return null
}
/**
 * The same, but when no man is left for one of the tiers (a small group late in a draft) any three different men are dealt, dearest
 * first, filed under the tiers in order. Used only after `pickTrio` found nothing — the fan still sees three cards and a real choice.
 */
export function looseTrio<C extends DCard>(pool:readonly C[],ok:(c:C)=>boolean,salt:string):Offer[]|null{
 const ranked=[...pool].sort((a,b)=>(Number(!ok(a))-Number(!ok(b)))||(hash(`${salt}:${a.id}`)%1e5)-(hash(`${salt}:${b.id}`)%1e5)).slice(0,3)
 if(ranked.length<3)return null
 return ranked.sort((a,b)=>b.price-a.price||a.id.localeCompare(b.id)).map((c,i)=>({id:c.id,tier:(['premium','mid','budget'] as const)[i]!,locked:null}))
}
