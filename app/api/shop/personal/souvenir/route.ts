import {NextResponse} from 'next/server'
import {streamed} from '@/lib/shop/personal/stream'
import {REGISTRY} from '@/lib/master/registry'
import {loadClub} from '@/lib/clubs/resolver'
import {bannedHere} from '@/lib/clubs/theme'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {kitFor,SWATCH} from '@/lib/clubs/rumble-kit'
import {kitArt} from '@/lib/clubs/kit-sources'
import {FORMATIONS as XI_SLOTS} from '@/lib/clubs/rumble-xi/formations'
import {clubAwayData} from '@/lib/away-days/club'
import {awayJourney} from '@/lib/away-days/data'
import {fanShirtMap} from '@/lib/fanlife/catalog'
import {readCareer} from '@/lib/legends/store'
import {viewer} from '@/lib/legends/owner'
import {cleanLine,cleanManager} from '@/lib/shop/personal/sign'
import {printPng} from '@/lib/shop/personal/render'
import {drawingOf,hashOf,makePersonal,recipe,today} from '@/lib/shop/personal/make'
import {PROBE,type Man} from '@/lib/shop/personal/xi-poster'
import type {AwayStop,SouvenirSpec} from '@/lib/shop/personal/souvenirs'
import {readShop} from '@/lib/shop/store'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
const KINDS={shirts:'My Shirt Collection',legends:'My Legends Manager Season',first:'My First Match',away:'I Was There'} as const
type Kind=keyof typeof KINDS
const hexOf=(names:string[])=>{const [a,b]=names.map(c=>SWATCH[c]).filter(Boolean);return a?{a,b:b??null}:null}

/**
 * POST /api/shop/personal/souvenir — the personal prints beyond the XI (owner, 15.11.2026): kind = shirts | legends | first | away.
 * What is printed comes from the archive by id — shirts from the catalogue, a match from the club's record, the nights away
 * from UEFA's journey, a season from his own Legends career (his only) — and from him only his name, one line, his age, his gate.
 * `dry` answers the proof; otherwise the product is made at the printer and its checkout link is returned (as the XI does).
 */
/** answered as a stream: the press outlasts Cloudflare's 100 s (lib/shop/personal/stream) */
export const POST=(r:Request)=>streamed(()=>handle(r))
async function handle(r:Request):Promise<Response>{
 let b:Record<string,unknown>;try{b=await r.json()}catch{return json({error:'Bad request.'},400)}
 const kind=String(b.kind||'') as Kind;if(!(kind in KINDS))return json({error:'Which print?'},422)
 const shop=await readShop();if(!shop.settings.open||!shop.settings.shopId)return json({error:'The shop is closed for now.'},503)
 const product=b.product==='poster'?'poster':'framed'
 const who=cleanManager(b.who),line=cleanLine(b.line),note=cleanLine(b.note,28)
 if(!who.ok||!line.ok||!note.ok)return json({error:'That cannot be printed — letters, numbers and simple punctuation only.'},422)
 const built=await build(kind,b,{who:who.value,line:line.value,note:note.value})
 if('error' in built)return json({error:built.error},built.status)
 const spec=built.spec,{s,path}=recipe(spec)
 if(b.dry)return json({proof:path})
 const id=`personal.${spec.c}.${hashOf(s,product)}.${product}`,name=who.value?`${who.value}’s ${KINDS[kind].replace(/^My /,'')}`:KINDS[kind]
 const out=await makePersonal(r,{id,subject:spec.c,kind:product,proof:path,size:{w:3600,h:4800},png:()=>printPng(spec,{k:3}),
  title:`${name} · ${product==='framed'?'Framed print':'Poster'}`,description:`${name} — ${spec.cn}. A FAN LIFE souvenir, drawn from the club’s own record and printed to order. An independent fan design — not an official club product.`})
 return 'error' in out?json({error:out.error},out.status):'pending' in out?json(out,202):json(out)
}

type Mine={who:string|null;line:string|null;note:string|null}
async function clubBase(clubId:string){
 const reg=REGISTRY.find(c=>c.id===clubId);if(!reg)return null
 const club=await loadClub(clubId).catch(()=>null);if(!club)return null
 const th=club.data.theme
 return {club,base:{c:clubId,cn:club.data.identity.name,col:reg.primary,d:today(),g:!(th&&bannedHere(th,PROBE.green)),b:!(th&&bannedHere(th,PROBE.blue))},
  wardrobe:clubWardrobe(club.data)}
}
async function build(kind:Kind,b:Record<string,unknown>,m:Mine):Promise<{spec:SouvenirSpec}|{error:string;status:number}>{
 const mine={who:m.who,line:m.line}
 if(kind==='shirts'){
  const slugs=[...new Set((Array.isArray(b.slugs)?b.slugs:[]).map(String))].slice(0,9),all=await fanShirtMap()
  const shirts=slugs.map(s=>all[s]).filter((x):x is NonNullable<typeof x>=>!!x&&!!(x.kit?.season||x.seasonLabel))
  if(!shirts.length)return {error:'Pick at least one shirt from your closet.',status:422}
  // the shirt's own drawing: by its kit (or the photo's kit id), else by season and type when that names one kit
  const man=(f:(typeof shirts)[number]):Man=>{const season=f.kit?.season??f.seasonLabel!,file=kitArt(f.club,f.kit?.id??f.kitId??'',season,f.variant||'home')?.svg.split('/').pop()?.replace(/\.svg$/,''),c=hexOf(f.kit?.colours||[])
   return {x:0,y:0,name:'',cl:f.club,s:season,...(file?{u:file}:{}),...(c?{k:{d:f.kit?.design||'',...c}}:{})}}
  const cb=await clubBase(shirts[0]!.club);if(!cb)return {error:'This club is not open.',status:404}
  return {spec:{...cb.base,...mine,w:'shirts',hero:man(shirts[0]!),note:m.note,rest:shirts.slice(1).map(man)}}
 }
 const clubId=String(b.club||''),cb=await clubBase(clubId);if(!cb)return {error:'This club is not open.',status:404}
 if(kind==='first'){
  const hit=(cb.club.data.matches||[]).find(x=>(x.value as {id?:string}).id===String(b.match||''))?.value as Record<string,unknown>|undefined
  if(!hit)return {error:'Which match?',status:422}
  const parsed=/^(.*?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.*)$/.exec(String(hit.name||''))
  const home=String(hit.home||parsed?.[1]||''),away=String(hit.away||parsed?.[4]||''),hg=Number(hit.homeGoals??parsed?.[2]),ag=Number(hit.awayGoals??parsed?.[3])
  if(!home||!away||!Number.isFinite(hg)||!Number.isFinite(ag))return {error:'That match has no full score on record.',status:422}
  const age=Number(b.age),gate=String(b.gate??'').trim().slice(0,6)
  return {spec:{...cb.base,...mine,w:'first',home,away,hg,ag,on:String(hit.on||''),comp:hit.competition?String(hit.competition):null,venue:hit.venue?String(hit.venue):null,
   age:Number.isInteger(age)&&age>=2&&age<=90?age:null,gate:/^[\p{L}\p{N} -]+$/u.test(gate)?gate:null}}
 }
 if(kind==='away'){
  const want=new Set((Array.isArray(b.visits)?b.visits:[]).map(x=>String(x).replace(/^visit:/,''))),data=clubAwayData(clubId)
  let stops:AwayStop[],home:{city:string;lat:number;lng:number}|null
  if(data){const st=new Map(data.stadiums.map(s=>[s.id,s])),o=st.get(data.origin)
   stops=data.visits.filter(v=>want.has(v.id)&&v.physicallyAbroad).sort((x,y)=>x.playedOn.localeCompare(y.playedOn)).map(v=>{const s=st.get(v.venueId)!
    return {city:s.city||s.name,year:Number(v.playedOn.slice(0,4)),opp:v.opponent,sc:`${v.scoreFor}–${v.scoreAgainst}`,lat:s.lat,lng:s.lng}})
   home=o?{city:o.city||o.name,lat:o.lat,lng:o.lng}:null}
  else if(clubId==='hapoel-tel-aviv'){
   // Hapoel Tel Aviv's journey is THE WORKER's own (lib/away-days/data): the same UEFA record, kept with Hebrew and Latin names
   const j=awayJourney(),o=j.origin
   stops=j.visits.filter(v=>want.has(v.id.replace(/^visit:/,''))&&j.venues[v.venueId]&&j.venues[v.venueId]!.countryCode!==o.countryCode).sort((x,y)=>x.playedOn.localeCompare(y.playedOn)).map(v=>{const s=j.venues[v.venueId]!
    return {city:s.cityLatin||s.cityHe,year:v.year,opp:v.opponentLatin||v.opponentHe,sc:`${v.scoreFor}–${v.scoreAgainst}`,lat:s.lat,lng:s.lng}})
   home={city:o.cityLatin||o.cityHe,lat:o.lat,lng:o.lng}}
  else return {error:'This club has no away days yet.',status:404}
  stops=stops.slice(0,16)
  if(!stops.length)return {error:'Mark the nights you were there first.',status:422}
  if(!home)return {error:'This club has no home ground on the map.',status:404}
  return {spec:{...cb.base,...mine,w:'away',home,stops}}
 }
 // legends: only his own career, its last finished season
 const owner=await viewer(false),cur=await readCareer(String(b.career||'')).catch(()=>null)
 if(!owner||!cur||cur.career.owner!==owner||cur.career.clubId!==clubId)return {error:'That season is not yours to print.',status:403}
 const c=cur.career,rec=c.history.at(-1),team=c.teams.find(t=>!t.ai)
 if(!rec||!team)return {error:'Finish a season first.',status:422}
 const slots=XI_SLOTS[team.lineup.formation],n:Man[]=[]
 team.lineup.xi.forEach((id,i)=>{const card=team.cards[id],s=slots?.[i];if(!card||!s)return
  const w=kitFor({fromYear:card.from,toYear:card.to},'us',cb.wardrobe,{keeper:s.fine==='GK'}),kit=w.source==='archive'?w.kit:null
  const file=drawingOf(kit?.svg),c2=kit?hexOf(kit.colours):null
  n.push({x:s.x,y:12+(s.y-20)/64*84,name:card.name.trim().split(/\s+/).at(-1)!,...(file?{u:file}:{}),...(c2?{k:{d:kit!.design||'',...c2}}:{}),...(team.lineup.captain===id?{cap:true}:{})})})
 if(n.length!==11)return {error:'Your eleven is not complete.',status:422}
 return {spec:{...cb.base,...mine,w:'legends',team:c.clubName,season:rec.ordinal,pts:rec.points,place:rec.place,of:rec.of,champ:rec.champion,rec:[rec.w,rec.d,rec.l],f:team.lineup.formation,n}}
}

/** GET ?club=…&year=… — the club's matches of one year on record, for the "my first match" picker ({years} without a year) */
export async function GET(r:Request){
 const u=new URL(r.url),clubId=u.searchParams.get('club')||'',year=u.searchParams.get('year')
 if(!REGISTRY.some(c=>c.id===clubId))return json({error:'Which club?'},422)
 const club=await loadClub(clubId).catch(()=>null),ms=(club?.data.matches||[]).map(x=>x.value as {id?:string;on?:string;name?:string;competition?:string}).filter(x=>x.id&&x.on&&x.name)
 if(!year)return json({years:[...new Set(ms.map(x=>Number(x.on!.slice(0,4))))].sort((a,b)=>b-a)})
 return json({matches:ms.filter(x=>x.on!.startsWith(`${Number(year)}-`)).sort((a,b)=>a.on!.localeCompare(b.on!)).map(x=>({id:x.id,on:x.on,name:x.name,comp:x.competition??null}))})
}
