import 'server-only'
import {randomBytes} from 'node:crypto'
import {engineClubIds,loadClub} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
import {hash} from '@/lib/clubs/rumble-rng'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {linesOf} from '@/lib/clubs/rumble-xi/simulator'
import {serverFeatures} from '@/lib/features-server'
import {buildCatalog,validXI} from './catalog'
import {cardsOf,createCareer,me,nextFixture,sellPrice,standings,windowOpen} from './career'
import {readinessOf,type Readiness} from './readiness'
import {insertCareer,ownerIndex} from './store'
import {MAX_ACTIVE,SQUAD_MAX,SQUAD_MIN,type Card,type Career,type Catalog,type Team} from './types'

/**
 * The server side of FAN LEAGUE: the clubs' catalogs (read from the same rated pool the Royal Rumble deals from, approved men
 * only), their readiness, and the client-safe VIEW of a career — no hidden rating ever leaves this file, only the team lines.
 */
type Cached={version:string;catalog:Catalog}
const g=globalThis as typeof globalThis&{fanLeagueCatalogs?:Map<string,Cached>}
const cache=g.fanLeagueCatalogs??=new Map()
export async function catalogFor(club:string):Promise<Catalog|null>{
 const r=await loadClub(club).catch(()=>null);if(!r)return null
 const hit=cache.get(club);if(hit&&hit.version===r.data.version)return hit.catalog
 const approved=new Set((r.data.players||[]).filter(f=>f.status==='approved').map(f=>f.value.id))
 const catalog=buildCatalog(club,r.data.identity.name,ratedPool(r.data),approved)
 cache.set(club,{version:r.data.version,catalog});return catalog
}
export async function allCatalogs():Promise<Catalog[]>{return (await Promise.all((await engineClubIds()).map(catalogFor))).filter((c):c is Catalog=>!!c)}
export type ClubChoice=Readiness&{held:boolean}
export async function leagueClubs():Promise<ClubChoice[]>{
 const [cats,f]=await Promise.all([allCatalogs(),serverFeatures()])
 return cats.map(c=>({...readinessOf(c),held:f.fanLeagueOff.includes(c.club)})).sort((a,b)=>a.name.localeCompare(b.name))
}

export async function startCareer(owner:string,club:string,decade:number):Promise<{ok:true;id:string}|{ok:false;error:string}>{
 const idx=await ownerIndex(owner)
 if(idx.careers.filter(c=>c.status==='active').length>=MAX_ACTIVE)return {ok:false,error:`You already run ${MAX_ACTIVE} careers. Finish one first.`}
 const clubs=await leagueClubs(),pick=clubs.find(c=>c.club===club)
 if(!pick||pick.held||pick.verdict==='BLOCK')return {ok:false,error:'That club is not open for a new career.'}
 const cats=await allCatalogs(),own=cats.find(c=>c.club===club)!,id=randomBytes(8).toString('hex')
 const rivals=clubs.filter(c=>c.club!==club&&!c.held&&c.verdict!=='BLOCK').sort((a,b)=>hash(`${id}:${a.club}`)-hash(`${id}:${b.club}`))
  .map(c=>({catalog:cats.find(x=>x.club===c.club)!,decade:c.homeDecades[hash(`${id}:${c.club}:decade`)%c.homeDecades.length]!}))
 const made=createCareer({id,owner,now:new Date().toISOString(),own,homeDecade:decade,rivals})
 if(!made.ok)return made
 await insertCareer(made.career)
 return {ok:true,id}
}

/* ───────── the view: what the browser may see ───────── */
export type CardView={id:string;name:string;position:Card['position'];alt?:Card['position'][];free?:boolean;price:number;sell:number;fromYear:number|null;toYear:number|null;decades:number[]}
export type Lines={attack:number;midfield:number;defence:number}
export type GoalView={minute:number;side:0|1;scorer:string;assist:string|null}
export type FixtureView={id:string;round:number;home:string;away:string;homeName:string;awayName:string;mine:boolean;goals:[number,number]|null;goalsLog:GoalView[]}
export type CareerView={
 id:string;revision:number;status:Career['status'];clubId:string;clubName:string;homeDecade:number;rounds:number;played:number;budget:number;window:boolean;mid:number;
 squadMin:number;squadMax:number;formation:Team['formation'];tactic:Team['tactic'];xi:string[];xiError:string|null;squad:CardView[];lines:Lines|null;
 slots:{id:string;fine:string;family:string;x:number;y:number}[];
 next:FixtureView|null;opponent:{name:string;decade:number;formation:string;lines:Lines}|null;last:FixtureView|null;fixtures:FixtureView[];
 table:{club:string;name:string;p:number;w:number;d:number;l:number;gf:number;ga:number;gd:number;pts:number;mine:boolean}[];
 rail:{decade:number|'archive';total:number;available:number}[];ledger:{kind:'buy'|'sell';name:string;amount:number;round:number}[];soldThisWindow:string[]
}
const round1=(l:Lines):Lines=>({attack:Math.round(l.attack),midfield:Math.round(l.midfield),defence:Math.round(l.defence)})
export const cardView=(c:Card):CardView=>({id:c.id,name:c.name,position:c.position,...(c.alt?{alt:c.alt}:{}),...(c.free?{free:true}:{}),price:c.price,sell:sellPrice(c.price),fromYear:c.fromYear,toYear:c.toYear,decades:c.decades})
function teamLines(c:Career,t:Team):Lines|null{
 const by=new Map(cardsOf(c,t).map(x=>[x.id,x]));if(t.xi.length!==11)return null
 const xi=t.xi.map(id=>by.get(id));if(xi.some(x=>!x))return null
 return round1(linesOf(xi.map(x=>({...x!,price:x!.price})),t.formation))
}
export function careerView(c:Career):CareerView{
 const t=me(c),by=new Map(c.catalog.cards.map(x=>[x.id,x])),teamBy=new Map(c.teams.map(x=>[x.club,x]))
 const nameOf=(club:string,id:string)=>{const tm=teamBy.get(club);return tm?cardsOf(c,tm).find(x=>x.id===id)?.name??'—':'—'}
 const fv=(f:Career['fixtures'][number]):FixtureView=>({id:f.id,round:f.round,home:f.home,away:f.away,homeName:teamBy.get(f.home)?.name??f.home,awayName:teamBy.get(f.away)?.name??f.away,mine:f.home===c.clubId||f.away===c.clubId,goals:f.result?.goals??null,
  goalsLog:(f.result?.events??[]).flatMap(e=>e.kind==='goal'?[{minute:e.minute,side:e.side,scorer:nameOf(e.side?f.away:f.home,e.scorer),assist:e.assist?nameOf(e.side?f.away:f.home,e.assist):null}]:[])})
 const nx=nextFixture(c),opp=nx?teamBy.get(nx.home===c.clubId?nx.away:nx.home)!:null
 const lastMine=[...c.fixtures].filter(f=>f.result&&(f.home===c.clubId||f.away===c.clubId)).sort((a,b)=>b.round-a.round)[0]??null
 const own=new Set(t.squad),decades=[...new Set(c.catalog.cards.flatMap(x=>x.decades))].sort((a,b)=>a-b)
 const rail=[...decades.map(d=>{const all=c.catalog.cards.filter(x=>x.decades.includes(d));return {decade:d as number|'archive',total:all.length,available:all.filter(x=>!own.has(x.id)).length}}),
  ...(()=>{const all=c.catalog.cards.filter(x=>!x.decades.length);return all.length?[{decade:'archive' as const,total:all.length,available:all.filter(x=>!own.has(x.id)).length}]:[]})()]
 return {id:c.id,revision:c.revision,status:c.status,clubId:c.clubId,clubName:c.clubName,homeDecade:c.homeDecade,rounds:c.rounds,played:c.played,budget:c.budget,window:windowOpen(c),mid:Math.floor(c.rounds/2),
  squadMin:SQUAD_MIN,squadMax:SQUAD_MAX,formation:t.formation,tactic:t.tactic,xi:t.xi,xiError:validXI(t.xi,t.squad,c.catalog.cards,t.formation),
  squad:t.squad.map(id=>by.get(id)).filter((x):x is Card=>!!x).map(cardView).sort((a,b)=>'GKDFMFFW'.indexOf(a.position)-'GKDFMFFW'.indexOf(b.position)||b.price-a.price||a.name.localeCompare(b.name)),
  lines:teamLines(c,t),slots:slotsOf(t.formation).map(s=>({id:s.id,fine:s.fine,family:s.family,x:s.x,y:s.y})),
  next:nx?fv(nx):null,opponent:opp?{name:opp.name,decade:opp.decade,formation:opp.formation,lines:teamLines(c,opp)!}:null,last:lastMine?fv(lastMine):null,fixtures:c.fixtures.map(fv),
  table:standings(c).map(r=>({...r,mine:r.club===c.clubId})),rail,
  ledger:[...c.ledger].reverse().slice(0,30).map(l=>({kind:l.kind,name:by.get(l.card)?.name??'—',amount:l.amount,round:l.round})),soldThisWindow:c.soldThisWindow}
}
/** the market: men of THIS club only, not already in the squad — one decade (or the archive of men with no recorded years) at a time */
export function marketPage(c:Career,decade:number|'archive',pos:string|null,q:string|null,limit=80):{cards:CardView[];total:number}{
 const own=new Set(me(c).squad),needle=q?.trim().toLowerCase()||null
 const all=c.catalog.cards.filter(x=>!own.has(x.id)&&(decade==='archive'?!x.decades.length:x.decades.includes(decade))&&(!pos||x.position===pos||(x.free&&pos!=='GK'))&&(!needle||x.name.toLowerCase().includes(needle)))
  .sort((a,b)=>b.price-a.price||a.name.localeCompare(b.name))
 return {cards:all.slice(0,limit).map(cardView),total:all.length}
}
