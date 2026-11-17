import 'server-only'
import {db} from './insight-report'

/**
 * GAMES · the funnel as a report (17.11.2026). Read side of `worker_events_insight` (service_role only), over the
 * measurement recorded since 25.9.2026 (public.worker_event). A "player" is a visitor-day: one device on one day.
 */
export type GTotals={players:number;opened:number;started:number;finished:number;shares:number;cross:number;leaves:number;events:number}
export type GateRow={gate:string;opened:number;started:number;finished:number;leaves:number;shares:number;cross:number;steps:[number,number][]}
export type GamesReport={from:string;to:string;days:number;since:string|null;totals:GTotals;previous:GTotals
 series:{day:string;opened:number;started:number;finished:number}[];grid:[number,number,number][];hours:[number,number,number][];weekdays:[number,number,number][]
 gates:GateRow[];events:{key:string;n:number;players:number}[];shares:{key:string;n:number}[];modes:{key:string;n:number}[];clubs:{key:string;opened:number;started:number;finished:number}[]}
export type GamesLoaded={state:'ok';report:GamesReport}|{state:'unconfigured'}|{state:'error';message:string}

export async function loadGames(from:string,to:string,club:string|null):Promise<GamesLoaded>{
 const c=db();if(!c)return {state:'unconfigured'}
 try{
  const r=await c.rpc('worker_events_insight',{p_from:from,p_to:to,p_club:club||null})
  if(r.error||!r.data)return {state:'error',message:r.error?.message||'no answer'}
  return {state:'ok',report:r.data as GamesReport}
 }catch(e){return {state:'error',message:String((e as Error)?.message||e).slice(0,160)}}
}

/** a share of a whole, as a whole percent; null when there is no whole */
export const rate=(part:number,whole:number)=>whole>0?Math.round(part/whole*100):null
