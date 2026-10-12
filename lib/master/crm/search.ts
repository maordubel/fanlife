import 'server-only'
import {deskHref} from '@/lib/master/attention'
import {readState} from '@/lib/master/store'
import {listPlayers} from '@/lib/players/service'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {EXPERIENCES} from '@/lib/experiences/registry'

/**
 * One search box for the whole desk (CRM 2 §4.2): clubs, players, gates and experiences, each answered from the read model
 * that owns it — no index, no copy. Player matches come from the Player Control Center's own listing (paged, 8 rows), so
 * a name in Greek, Hebrew or Latin matches exactly as the players desk would match it.
 */
export type Hit={kind:'club'|'player'|'gate'|'experience'|'area';id:string;title:string;sub:string;href:string}
const fold=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
const AREAS:[string,string,string][]=[['Desk','overview','What needs you now'],['Players','players','Positions, prices, duplicates'],['Games','games','Every gate, every club'],['Market','market','Shirts, offers, reports'],['Community','community','Fan contributions'],['Performance','audience','Who plays'],['Sources & research','data','Collect, parse, stage'],['Operations','operations','Runs, storage, schedules'],['Settings','settings','Features, LIFE display'],['Features','settings','Switch ALL FOOTBALL, FAN LEAGUE, friendlies']]
export async function deskSearch(raw:string,scope:string|null):Promise<{q:string;hits:Hit[];players:'ok'|'unavailable'}>{
 const q=raw.trim().slice(0,80);if(q.length<2)return {q,hits:[],players:'ok'}
 const f=fold(q),hits:Hit[]=[]
 const state=await readState().catch(()=>null)
 for(const c of state?.clubs??[])if(fold(`${c.name} ${c.id}`).includes(f))hits.push({kind:'club',id:c.id,title:c.name,sub:`${c.status} · ${c.gates.length} gate${c.gates.length===1?'':'s'} on`,href:deskHref('clubs',{club:c.id})})
 for(const g of SHARED_GATES)if(fold(`${g.name} ${g.key} gate ${g.number}`).includes(f))hits.push({kind:'gate',id:g.key,title:`Gate ${g.number} · ${g.name}`,sub:g.requirement,href:deskHref('games',{gate:g.key,club:scope||undefined})})
 for(const e of EXPERIENCES)if(fold(`${e.name} ${e.id}`).includes(f))hits.push({kind:'experience',id:e.id,title:e.name,sub:e.tagline,href:deskHref('games',{view:e.id})})
 for(const [t,k,s] of AREAS)if(fold(t).includes(f))hits.push({kind:'area',id:`${k}:${t}`,title:t,sub:s,href:deskHref(k)})
 let players:'ok'|'unavailable'='ok'
 try{const l=await listPlayers({q,clubs:scope?[scope]:undefined,limit:10});for(const r of l.rows.slice(0,8))hits.push({kind:'player',id:`${r.club}/${r.id}`,title:r.name,sub:`${r.clubName} · ${r.fromYear??'?'}–${r.toYear??'?'} · ${r.positions.join('/')||'no position'} · €${r.price}M`,href:deskHref('players',{pc:r.club,player:r.id,q})})}
 catch{players='unavailable'}
 return {q,hits,players}
}
