import 'server-only'
import {createHash} from 'node:crypto'
import type {ClubData,ClubMystery,Fact,MysteryClue} from './contract'
import {normKey} from './trivia-bank'
import {localizedDate} from './locale'
import {enClub,enCompetition,isLatin} from '@/lib/trivia/names'
import {canonClub,competitionOn} from '@/lib/trivia/club-names'
import {CLUB_SPELLINGS} from './spellings'
import {englishName} from './rumble-xi/names'
import {foldMerged} from './rumble-xi/merges'
import {evaluate,COMPETITIVE_CLUES,PRACTICE_MIN_CLUES} from './mystery-rules'
import {englishMysteries} from './mystery-english'

/**
 * Gate 10 · THE ARCHIVE MYSTERY FORGE — Blind Cow puzzles built from what a club's own approved archive already proves.
 *
 * A clue is a PREDICATE over the club's people, never a sentence somebody wrote: "a midfielder", "first recorded in the
 * 1990s", "started against Ajax — European Cup, 2 Jun 1971", "scored against PAOK — Greek Cup, 12 May 2004". Because each
 * clue is a set, the narrowing ladder is COUNTED, not claimed: after every clue the number of people in the archive who
 * still fit is computed over the whole domain — every approved man, plus every name a line-up or scoresheet prints that no
 * approved man answers to (a "phantom" stays a possible answer, BC-R05). A puzzle ships only when that count reaches one.
 *
 * Nothing is invented. Every clue cites the record it was read from (the player row, the match row), every opponent and
 * competition prints in English or the clue is not made, and the target is never named. A club that already has an
 * eligible hand-made mystery for a man keeps it; the forge only fills men nobody has written a puzzle for.
 */
const h=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,12)
const POS:Record<string,string>={GK:'A goalkeeper.',DF:'A defender.',MF:'A midfielder.',FW:'A forward.'}
type Clue=MysteryClue&{fits:Set<string>}
export type Night={id:string;on:string;opp:string;comp:string;kind:'europe'|'cup'|'league';derby:boolean;home:boolean|null;us:number|null;them:number|null;starters:string[];scorers:string[];sources:string[]}

/**
 * Every approved competitive night of a club, read the same way wherever it is needed (Blind Cow clues, poll choices):
 * the date, the opponent and competition in English (or the night is skipped — nothing is guessed), the score from "us",
 * and who started and scored.
 */
export function readNights(data:ClubData):Night[]{
 const id=data.identity.id,us=[data.identity.name,...(CLUB_SPELLINGS[id]??[])].map(normKey).filter(Boolean)
 const isUs=(s:string)=>{const k=normKey(s);return us.some(u=>k===u||k.includes(u))}
 const rivals=new Set((data.rivals??[]).flatMap(r=>[r.value.name,...((r.value as {aliases?:string[]}).aliases??[])]).map(x=>normKey(canonClub(enClub(x)??x))))
 const nights:Night[]=[]
 for(const f of data.matches??[]){
  if(f.status!=='approved'||f.confidence<2)continue
  const v=f.value as Record<string,unknown>,on=typeof v.on==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.on)?v.on:null
  if(!on||typeof v.competition!=='string')continue
  const c0=enCompetition(v.competition);if(!c0||/friendl/i.test(c0))continue
  const comp=competitionOn(c0.replace(/\s*\(?\b(?:19|20)\d{2}(?:\s*[/–-]\s*\d{2,4})?\)?\s*$/,'').trim(),on,data.identity.country)
  let opp:string|null=null,home:boolean|null=null,g:number|null=null,t:number|null=null
  const num=(x:unknown)=>typeof x==='number'?x:null
  if(typeof v.opponent==='string'){opp=v.opponent;g=num(v.clubGoals);t=num(v.opponentGoals)}
  else if(typeof v.home==='string'&&typeof v.away==='string'&&(v.us==='home'||v.us==='away')){home=v.us==='home';opp=home?v.away:v.home;const hg=num(v.homeGoals),ag=num(v.awayGoals);[g,t]=home?[hg,ag]:[ag,hg]}
  else{const m=/^(.*\S)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(\S.*)$/.exec(String(v.name??'').replace(/\s*\([^)]*\)\s*$/,''));if(m){if(isUs(m[1]!)){home=true;opp=m[4]!;g=Number(m[2]);t=Number(m[3])}else if(isUs(m[4]!)){home=false;opp=m[1]!;g=Number(m[3]);t=Number(m[2])}}}
  const en=opp?enClub(opp):null;if(!en||isUs(en))continue
  const starters=Array.isArray(v.lineup)&&v.lineup.length===11?(v.lineup as unknown[]).filter((x):x is string=>typeof x==='string'):[]
  const scorers=Array.isArray(v.scorers)?(v.scorers as {name?:unknown}[]).flatMap(s=>typeof s?.name==='string'?[s.name]:[]):[]
  const name=canonClub(en)
  nights.push({id:f.id,on,opp:name,comp,kind:kindOf(comp),derby:rivals.has(normKey(name)),home,us:g,them:t,starters,scorers,sources:f.sources})
 }
 return nights
}
const kindOf=(c:string):Night['kind']=>/UEFA|Europ|Champions(?!hip)|Intertoto|Cup Winners|Fairs|Conference|Mitropa/i.test(c)?'europe':/cup|pokal|coppa|copa|kupa|trophy|shield/i.test(c)?'cup':'league'

function archiveContext(data:ClubData){
 const id=data.identity.id
 const approved=<T,>(f:Fact<T>)=>f.status==='approved'&&f.confidence>=2

 // ── the domain: one identity per approved man (by every printed name he answers to), plus phantoms
 // a man recorded in Greek or Hebrew is asked about under his reviewed English name (and answers to both)
 const men=foldMerged(id,(data.players??[]).filter(approved).map(f=>f.value)).map(v=>{const en=isLatin(v.name)?v.name:englishName(id,v.id,v.name);return {...v,name:en,aliases:[...v.aliases,...(en!==v.name?[v.name]:[])]}}).filter(p=>isLatin(p.name))
 const owners=new Map<string,string[]>()
 for(const p of men)for(const n of new Set([p.name,...p.aliases].map(normKey).filter(Boolean)))owners.set(n,[...(owners.get(n)??[]),p.id])
 const who=(name:string):string[]=>{const k=normKey(name);return k?owners.get(k)??[`phantom:${k}`]:[]}
 const domain=new Set<string>(men.map(p=>p.id)),phantoms=new Set<string>()

 // ── the nights the archive can name: date, English opponent and competition, and who started / scored
 const nights=readNights(data).filter(n=>n.starters.length||n.scorers.length)
 for(const n of nights)for(const x of [...n.starters,...n.scorers])for(const w of who(x))if(w.startsWith('phantom:')){phantoms.add(w);domain.add(w)}

 // ── what the archive knows about each identity
 const starts=new Map<string,Night[]>(),goals=new Map<string,Night[]>()
 for(const n of nights){
  for(const x of n.starters)for(const w of who(x))starts.set(w,[...(starts.get(w)??[]),n])
  for(const x of new Set(n.scorers))for(const w of who(x))goals.set(w,[...(goals.get(w)??[]),n])
 }
 const all=[...domain]
 const unknownPos=new Set(all.filter(w=>w.startsWith('phantom:')||!(men.find(p=>p.id===w)?.positions.length)))
 const byId=new Map(men.map(p=>[p.id,p]))
 const date=(on:string)=>localizedDate(on,'en')

 const records=new Map((data.players??[]).map(f=>[f.value.id,f.sources]))
 return {id,men,owners,who,domain,phantoms,nights,starts,goals,all,unknownPos,byId,date,records}
}

export function forgeArchiveMysteries(data:ClubData,ctx=archiveContext(data)):Fact<ClubMystery>[]{
 const {id,men,owners,starts,goals,all,unknownPos,byId,date,nights,who}=ctx
 // a man who already has a PROVEN puzzle keeps it; an exploration (written, ladder unknown) gets a counted twin beside it
 const covered=new Set<string>()
 for(const f of data.mysteries??[]){const t=byId.get(f.value.targetPlayerId);if(!t)continue;const e=evaluate({id:f.id,clues:f.value.clues,remaining:f.value.remaining},{id:t.id,name:t.name,aliases:t.aliases});if(e.practice.ok&&e.practice.kind==='unique')covered.add(t.id)}

 const out:Fact<ClubMystery>[]=[]
 for(const p of men){
  if(covered.has(p.id)||(owners.get(normKey(p.name))?.length??0)>1)continue
  const mine=starts.get(p.id)??[],scored=goals.get(p.id)??[]
  if(mine.length+scored.length<2)continue
  const pool:Clue[]=[]
  const cid=(k:string)=>`${id}:arch-m-${h(p.id)}:${h(k)}`
  if(p.positions.length===1&&POS[p.positions[0]!]){
   const pos=p.positions[0]!
   pool.push({id:cid(`pos:${pos}`),label:'Position',value:POS[pos]!,sources:data.players!.find(f=>f.value.id===p.id)!.sources,type:'position',family:'profile',facet:'position',factKey:`position:${pos}`,fits:new Set(all.filter(w=>unknownPos.has(w)||byId.get(w)?.positions.includes(pos as never)))})
  }
  if(p.fromYear){
   const d=Math.floor(p.fromYear/10)*10
   pool.push({id:cid(`era:${d}`),label:'Era',value:`First recorded at the club in the ${d}s.`,sources:data.players!.find(f=>f.value.id===p.id)!.sources,type:'season_range',family:'profile',facet:'era',factKey:`first-decade:${d}`,fits:new Set(all.filter(w=>{const m=byId.get(w);return !m||m.fromYear===null||Math.floor(m.fromYear/10)*10===d}))})
  }
  for(const comp of new Set(mine.map(n=>n.comp))){
   const any=nights.filter(n=>n.comp===comp),fits=new Set(any.flatMap(n=>n.starters.flatMap(who)))
   pool.push({id:cid(`comp:${comp}`),label:'Competition',value:`Started a ${comp} match for the club.`,sources:any.find(n=>n.starters.some(x=>who(x).includes(p.id)))!.sources,type:'competition',family:'match',facet:'competition',factKey:`started-in:${normKey(comp)}`,scope:{competition:comp},fits})
  }
  for(const n of mine){
   const facet=n.derby?'derby':`start-${n.kind}`
   pool.push({id:cid(`start:${n.id}`),label:n.derby?'Derby':'Team sheet',value:`Started against ${n.opp} — ${n.comp}, ${date(n.on)}.`,sources:n.sources,type:'match_start',family:'match',facet,factKey:`start:${n.id}`,scope:{competition:n.comp},fits:new Set(n.starters.flatMap(who))})
  }
  for(const n of scored){
   pool.push({id:cid(`goal:${n.id}`),label:'Goal',value:`Scored against ${n.opp} — ${n.comp}, ${date(n.on)}.`,sources:n.sources,type:'goal',family:'goal',facet:`goal-${n.kind}`,factKey:`goal:${n.id}`,scope:{competition:n.comp},fits:new Set(n.scorers.flatMap(who))})
  }
  const ladder=climb(pool,all.length,p.id)
  if(!ladder)continue
  const clues=ladder.map(({fits:_f,...c})=>c),m:ClubMystery={id:`${id}:arch-m-${h(p.id)}`,targetPlayerId:p.id,clues,remaining:ladder.map(c=>c.remaining)}
  const ev=evaluate({id:m.id,clues:m.clues,remaining:m.remaining},{id:p.id,name:p.name,aliases:p.aliases})
  if(!ev.practice.ok||ev.practice.kind!=='unique')continue
  out.push({id:m.id,value:m,sources:[...new Set(clues.flatMap(c=>c.sources))],confidence:2,status:'approved',researchedAt:null,approvedAt:null,approvedBy:'derived:archive-mystery-forge',notes:'Built from approved player and match records; the ladder is counted over every approved man and every unresolved line-up name.'})
 }
 return out
}

/**
 * The ladder: broad clues first, each one strictly narrowing the field, two clues of one facet never side by side, until
 * one identity is left — then, while clues remain, settle (a competitive puzzle reads exactly ten). Deterministic.
 */
function climb(pool:Clue[],size:number,target:string):(Clue&{remaining:number})[]|null{
 let field:Set<string>|null=null,n=size
 const used:(Clue&{remaining:number})[]=[],keys=new Set<string>()
 const fitsNow=(c:Clue)=>{if(!c.fits.has(target))return -1;if(!field)return c.fits.size;let k=0;for(const x of field)if(c.fits.has(x))k++;return k}
 while(used.length<COMPETITIVE_CLUES){
  const last=used.at(-1)?.facet,left=COMPETITIVE_CLUES-used.length
  const options=pool.filter(c=>!keys.has(c.factKey!)&&c.facet!==last).map(c=>({c,k:fitsNow(c)})).filter(o=>o.k>=1&&(n===1?o.k===1:o.k<n))
  if(!options.length)break
  // aim for a gentle, geometric fall: reach one by the last clue, not by the third
  const goal=n<=1?1:Math.pow(n,Math.max(0,left-1)/left)
  options.sort((a,b)=>Math.abs(Math.log(a.k)-Math.log(goal))-Math.abs(Math.log(b.k)-Math.log(goal))||a.c.id.localeCompare(b.c.id))
  const {c,k}=options[0]!
  field=new Set([...(field??c.fits)].filter(x=>c.fits.has(x)));n=k
  used.push({...c,remaining:k});keys.add(c.factKey!)
 }
 if(n!==1||used.length<PRACTICE_MIN_CLUES)return null
 return used
}

/** Hapoel Tel Aviv keeps The Worker's own Blind Cow bank (re-printed in English); every other club gets its archive's puzzles on top of its written ones. */
export function withArchiveMysteries(input:ClubData):ClubData{
 // every puzzle on an English page reads in English (owner, 12.10.2026), or it is not dealt
 const data=englishMysteries(input)
 if(data.identity.id==='hapoel-tel-aviv')return data
 const ctx=archiveContext(data),repaired={...data,mysteries:(data.mysteries??[]).map(f=>repairMystery(f,ctx))}
 const have=new Set(repaired.mysteries.map(f=>f.id))
 return {...repaired,mysteries:[...repaired.mysteries,...forgeArchiveMysteries(repaired,ctx).filter(f=>!have.has(f.id))]}
}

/**
 * A written puzzle the archive can finish. Two repairs, both read from the club's own approved records and both cited:
 *  · "in the matchday squad for a European tie in 1960" names no competition (BC-R03). When the man STARTED a European
 *    night that year it becomes that night; when the club played one European competition that year, it is named.
 *  · four clues are one short of practice (BC-R07): the archive adds what it proves about him — a night he started, a goal
 *    he scored — after the written clues, never before them. Nothing written is removed or reworded beyond the scope fix.
 */
function repairMystery(f:Fact<ClubMystery>,ctx:ReturnType<typeof archiveContext>):Fact<ClubMystery>{
 const t=ctx.byId.get(f.value.targetPlayerId);if(!t)return f
 const mine=ctx.starts.get(t.id)??[],scored=ctx.goals.get(t.id)??[]
 const target={id:t.id,name:t.name,aliases:t.aliases}
 let clues=f.value.clues.map(c=>{
  if(c.scope?.competition||!/\bEuropean (tie|night|match)\b/i.test(c.value))return c
  const y=/\b(19|20)\d{2}\b/.exec(c.value)?.[0];if(!y)return c
  const night=mine.filter(n=>n.kind==='europe'&&n.on.startsWith(y)).sort((a,b)=>a.on.localeCompare(b.on))[0]
  if(night)return {...c,value:`Started against ${night.opp} — ${night.comp}, ${ctx.date(night.on)}.`,sources:[...new Set([...c.sources,...night.sources])],scope:{competition:night.comp}}
  const comps=[...new Set(ctx.nights.filter(n=>n.kind==='europe'&&n.on.startsWith(y)).map(n=>n.comp.replace(/\s+(final|semi-final|quarter-final).*$/i,'')))]
  return comps.length===1?{...c,value:`In the club's matchday squad for a ${comps[0]} tie in ${y}.`,scope:{competition:comps[0]!}}:c
 })
 if(clues.length<PRACTICE_MIN_CLUES){
  const said=new Set(clues.map(c=>c.value))
  const extra=[...scored.map(n=>({n,goal:true})),...mine.map(n=>({n,goal:false}))].sort((a,b)=>Number(b.goal)-Number(a.goal)||a.n.on.localeCompare(b.n.on))
  for(const {n,goal} of extra){
   if(clues.length>=PRACTICE_MIN_CLUES)break
   const value=goal?`Scored against ${n.opp} — ${n.comp}, ${ctx.date(n.on)}.`:`Started against ${n.opp} — ${n.comp}, ${ctx.date(n.on)}.`
   if(said.has(value)||clues.some(c=>c.value.includes(ctx.date(n.on))))continue
   said.add(value);clues=[...clues,{id:`${f.id}:arch-${createHash('sha256').update(n.id+String(goal)).digest('hex').slice(0,10)}`,label:goal?'Goal':'Team sheet',value,sources:n.sources,scope:{competition:n.comp}}]
  }
 }
 // still short: what his own player record states — position, then the decade he is first recorded in
 const rec=ctx.records.get(t.id)
 if(clues.length<PRACTICE_MIN_CLUES&&rec){
  const has=(re:RegExp)=>clues.some(c=>re.test(c.label)||re.test(c.value))
  const pos=t.positions.length===1?POS[t.positions[0]!]:undefined
  if(pos&&!has(/position|goalkeeper|defender|midfielder|forward/i))clues=[...clues,{id:`${f.id}:arch-pos`,label:'Position',value:pos,sources:rec}]
  if(clues.length<PRACTICE_MIN_CLUES&&t.fromYear&&!has(/first recorded|decade|era/i))clues=[...clues,{id:`${f.id}:arch-era`,label:'Era',value:`First recorded at the club in the ${Math.floor(t.fromYear/10)*10}s.`,sources:rec}]
 }
 if(clues===f.value.clues)return f
 const next={...f.value,clues}
 // a repair that does not make the puzzle playable changes nothing
 const before=evaluate({id:f.id,clues:f.value.clues,remaining:f.value.remaining},target),after=evaluate({id:f.id,clues,remaining:f.value.remaining&&f.value.remaining.length===clues.length?f.value.remaining:undefined},target)
 if(before.practice.ok||!after.practice.ok)return f
 return {...f,value:{...next,remaining:after.finalCandidates===null?undefined:next.remaining},sources:[...new Set([...f.sources,...clues.flatMap(c=>c.sources)])],notes:`${f.notes?`${f.notes} `:''}Archive repair 2026-10-28: European clue scoped and/or clues added from approved match records.`}
}
