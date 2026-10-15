import {LEGENDS_RULES as R,roundTenths,type QuotaPos} from './config'
import {finalProceeds} from './economy'
import {squadError} from './squad'
import type {SquadEntry} from './types'

/**
 * A deal laid out before it is made (U03). The same arithmetic the server runs for `buy` and `swap` — cash, the sale's final
 * proceeds, the squad size and the quotas afterwards — computed from figures the view already carries, so the screen can show
 * the full bill and the exact reason a move is closed without a round trip. The server still decides; this only explains.
 */
export type DealMan={id:string;quota:QuotaPos;paid:number;apps:number;sale:{net:number}|null}
export type Deal={
 kind:'buy'|'swap';price:number;/** what the outgoing man brings in (0 for a plain signing) */net:number;cashAfter:number
 squadAfter:number;quotasAfter:Record<QuotaPos,number>;
 blocked:{code:'closed'|'cash'|'full'|'quota'|'none-out'|'size';text:string}|null
}
export function planDeal(i:{open:boolean;cash:number;squad:readonly DealMan[];candidate:{id:string;pos:QuotaPos;price:number;name:string};out?:string|null}):Deal{
 const {cash,squad,candidate:c}=i,out=i.out?squad.find(s=>s.id===i.out):undefined
 const swap=squad.length>=R.maxSquad||!!out,kind:Deal['kind']=swap?'swap':'buy'
 const net=out?.sale?finalProceeds(out.sale.net,out.paid,out.apps):0
 const after=out?squad.filter(s=>s.id!==out.id):[...squad]
 const next:SquadEntry[]=[...after.map(s=>({id:s.id,quota:s.quota,paid:s.paid,apps:s.apps,appsTotal:s.apps,goals:0,joined:0})),{id:c.id,quota:c.pos,paid:c.price,apps:0,appsTotal:0,goals:0,joined:0}]
 const quotasAfter={GK:0,DF:0,MF:0,FW:0} as Record<QuotaPos,number>;for(const s of next)quotasAfter[s.quota]++
 const cashAfter=roundTenths(cash+net-c.price)
 const base={kind,price:c.price,net,cashAfter,squadAfter:next.length,quotasAfter}
 if(!i.open)return {...base,blocked:{code:'closed',text:'The transfer window is shut.'}}
 if(swap&&!out)return {...base,blocked:{code:'none-out',text:`A full squad holds ${R.maxSquad} — choose a man to make way.`}}
 if(!swap&&squad.length>=R.maxSquad)return {...base,blocked:{code:'full',text:`A squad holds ${R.maxSquad} at most.`}}
 if(cashAfter<-1e-9)return {...base,blocked:{code:'cash',text:swap?`After the sale you would have €${roundTenths(cash+net)}M; ${c.name} costs €${c.price}M.`:`${c.name} costs €${c.price}M; you have €${cash}M.`}}
 const err=swap?squadError(next):null
 if(err)return {...base,blocked:{code:'quota',text:err}}
 return {...base,blocked:null}
}
