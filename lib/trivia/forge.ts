import 'server-only'
import {createHash} from 'node:crypto'
import type {ClubData,ClubTrivia,Fact,Source} from '@/lib/clubs/contract'
import type {MasterQuestion,QTopic,QType,SourceRef} from '@/lib/game/questions/types'
import {localizedDate} from '@/lib/clubs/locale'
import {englishName} from '@/lib/clubs/rumble-xi/names'
import playerLabels from '@/content/manual/trivia-player-labels.json'
import heritage from '@/content/manual/trivia-heritage-facts-2026-10-21.json'
import goalReviews from '@/content/manual/trivia-goal-reviews.json'
import {rawPool} from '@/lib/clubs/rumble'
import {normKey} from '@/lib/clubs/trivia-bank'
import {clampLevel,difficultyOf} from './levels'
import {brand,enClub,enCompetition,enSponsor,enText,isLatin} from './names'
import {CLUB_SPELLINGS} from '@/lib/clubs/spellings'
import {canonClub,clubCore,competitionOn} from './club-names'
import {clubWorld} from '@/lib/clubs/world'
import {foldMerged} from '@/lib/clubs/rumble-xi/merges'

/**
 * THE QUESTION FORGE — one English trivia bank for every club, built from the club's own approved records (owner,
 * 12.10.2026: "learn the Hebrew questions The Worker built, translate what is needed, and use everything you can, wisely,
 * with tags every club and ALL FOOTBALL can use; four levels; English, always").
 *
 * The Worker's craft carried over, template by template: a prompt names ONE match (date + competition + sides), a
 * league round decades ago is deep and rated Expert, a European night / derby / final keeps an easier rating, a
 * distractor is a real value of the same kind, an option set never holds the answer twice, and a "false" statement is
 * checked against every true one. Nothing is invented: every question stands on a record with a source at confidence ≥ 2
 * (rule 2), and every name is English or the question is not made (`names.ts`).
 *
 * Levels (`levels.ts`) are earned, not typed: notability, age of the record, and — for a man — how prominent he is in
 * his club's own archive (his hidden game rating's percentile; it never leaves the server).
 */
export type ForgeExtras={
 /** honours lists with every winning season (complete=true: a season NOT listed is a season not won) */
 trophies?:{id:string;name:string;seasons:string[];complete:boolean;count:number|null;source:SourceRef}[]
 /** season-bound shirt numbers (The Worker's Player Master) */
 numbers?:{playerId:string;number:number;season:string;source:SourceRef}[]
}
export type ForgeReport={club:string;made:number;byTemplate:Record<string,number>;byLevel:Record<string,number>;skipped:Record<string,number>}
type Draft={template:string;type:QType;topic:QTopic;tags?:QTopic[];level:number;prompt:string;answer:string|string[];pool?:string;distractors?:string[];left?:string[];explanation:string;hint:MasterQuestion['hint'];factIds:string[];decades:number[];source:SourceRef;facets:string[];key:string}

const h=(s:string,n=16)=>createHash('sha256').update(s).digest('hex').slice(0,n)
/** one of several phrasings, fixed per question key — a run should not read like one sentence twelve times */
const say=(key:string,xs:readonly string[])=>xs[Number.parseInt(h(`say:${key}`,6),16)%xs.length]!
/** a season label never rides inside a competition name: "Greek Super League 2023/24" gives the season question away */
const bareComp=(c:string|null)=>c?c.replace(/\s*\(?\b(?:19|20)\d{2}(?:\s*[\/–-]\s*\d{2,4})?\)?\s*$/,'').trim()||c:null
const decadeOf=(y:number)=>Math.floor(y/10)*10
const seasonOf=(iso:string)=>{const y=Number(iso.slice(0,4)),m=Number(iso.slice(5,7));const a=m>=7?y:y-1;return `${a}/${String((a+1)%100).padStart(2,'0')}`}
const seasonYear=(s:string)=>Number(s.slice(0,4))
const POS:Record<string,string>={GK:'Goalkeeper',DF:'Defender',MF:'Midfielder',FW:'Forward'}
const ORD=['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th','13th','14th','15th','16th','17th','18th','19th','20th']
const plural=(n:number,w:string)=>`${n} ${w}${n===1?'':'s'}`
/** native spellings of the club itself in its own sources — how a match line is read for "us" */
const US:Readonly<Record<string,readonly string[]>>=CLUB_SPELLINGS

type Row={id:string;on:string;season:string;year:number;comp:string|null;kind:'europe'|'cup'|'league';final:boolean;opp:string;oppKey:string;us:number;them:number;home:boolean|null;derby:boolean;scorers:{name:string;minute:number|null}[];lineup:string[];bench:string[];source:SourceRef}
const kindOf=(c:string|null):Row['kind']|'friendly'=>!c?'league':/friendl/i.test(c)?'friendly':/UEFA|Europ|Champions(?!hip)|Intertoto|Cup Winners|Fairs|Conference|Asian|Mitropa|Latin Cup/i.test(c)?'europe':/cup|pokal|coppa|copa|kupa|trophy|shield/i.test(c)?'cup':'league'

export const SOMBRE=/\b(deported|deportation|ghetto|murder\w*|killed|died|death|dies|concentration camp|holocaust|nazi\w*|executed|war\b|bomb\w*|disaster|tragedy|victims?)\b/i
export function forgeTrivia(club:ClubData,extras:ForgeExtras={}):{trivia:ClubTrivia;report:ForgeReport}{
 const id=club.identity.id,NAME=club.identity.name,skipped:Record<string,number>={}
 const skip=(why:string)=>{skipped[why]=(skipped[why]??0)+1}
 const srcBy=new Map(club.sources.map(s=>[s.id,s]))
 const sourceOf=(f:Pick<Fact<unknown>,'sources'|'confidence'>):SourceRef=>{const ss=f.sources.map(id=>srcBy.get(id)).filter((s):s is Source=>!!s);const s=ss.find(s=>s.url&&s.access==='available')??ss.find(s=>s.url)??ss[0];return {title:s?.title||'Club source ledger',url:s?.url??null,confidence:f.confidence}}
 const ok=(f:Fact<unknown>)=>f.status==='approved'&&f.confidence>=2
 const usKeys=[NAME,...(US[id]??[])].map(normKey).filter(Boolean)
 const isUs=(side:string)=>{const k=normKey(side);return usKeys.some(u=>k===u||k.includes(u))}
 const rivalNames=new Set((club.rivals??[]).flatMap(r=>[r.value.name,...((r.value as {aliases?:string[]}).aliases??[])]).map(x=>clubCore(enClub(x)??x)))
 const NICK=clubWorld(id)?.nicknames[0]?.text??null
 const drafts:Draft[]=[]
 const keys=new Set<string>(),add=(d:Draft)=>{if(keys.has(d.key))return;keys.add(d.key);drafts.push(d)}
 const dates=new Map<string,string>(),when=(iso:string)=>{let s=dates.get(iso);if(s===undefined){s=localizedDate(iso,'en');dates.set(iso,s)}return s}

 /* ───────── the club's men, English names, and how prominent each is in his own club's archive ───────── */
 type Man={id:string;name:string;positions:string[];from:number|null;to:number|null;fame:1|2|3|4;source:SourceRef}
 const rating=new Map<string,number>(),prominence=new Map<string,number>()
 try{for(const r of rawPool(club,{base:true})){rating.set(r.id,r.rating);prominence.set(r.id,r.reputation??r.rating)}}catch{/* no ratings: everyone is ordinary */}
 const sortedR=[...rating.values()].sort((a,b)=>b-a)
 const fameOf=(pid:string):1|2|3|4=>{const r=rating.get(pid);if(r===undefined||!sortedR.length)return 3;const at=sortedR.findIndex(x=>x<=r)/sortedR.length;return at<0.1?1:at<0.35?2:at<0.7?3:4}
 const byId=new Map<string,Man>(),players=new Map<string,Man>(),originalNames=new Map<string,Set<Man>>()
 // one man, one card: records the merge list folds together are read as ONE man (content/manual/rumble-merges.json)
 const approvedMen=(club.players??[]).filter(f=>ok(f as Fact<unknown>)),factOf=new Map(approvedMen.map(f=>[f.value.id,f]))
 for(const v of foldMerged(id,approvedMen.map(f=>f.value))){
  const f=factOf.get(v.id)!,labels=playerLabels as Record<string,Record<string,{name:string}>>,name=labels[id]?.[v.id]?.name??(v.name!==f.value.name&&isLatin(v.name)?v.name:englishName(id,v.id,v.name))
  if(!isLatin(name)||!name.trim())continue
  const man:Man={id:v.id,name,positions:v.positions,from:v.fromYear,to:v.toYear,fame:fameOf(v.id),source:sourceOf(f as Fact<unknown>)}
  if(players.has(normKey(name))){players.delete(normKey(name));continue}
  byId.set(v.id,man);players.set(normKey(name),man)
  for(const n of [v.name,...v.aliases,name]){const k=normKey(n),xs=originalNames.get(k)??new Set<Man>();xs.add(man);originalNames.set(k,xs)}
  for(const a of v.aliases)if(isLatin(a)&&!players.has(normKey(a)))players.set(normKey(a),man)
 }
 // two men with one printed name cannot both be asked about by name
 for(const [k,m] of [...byId.entries()])if(players.get(normKey(m.name))!==m)byId.delete(k)

 /* ───────── matches ───────── */
 const rows:Row[]=[]
 for(const f of club.matches??[]){
  if(!ok(f)){skip('match-unapproved');continue}
  const v=f.value as Record<string,unknown>,on=typeof v.on==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.on)?v.on:null
  if(!on){skip('match-no-date');continue}
  const rawComp=typeof v.competition==='string'?v.competition:null,comp0=rawComp?bareComp(enCompetition(rawComp)):null,comp=comp0?competitionOn(comp0,on,club.identity.country):null
  if(rawComp&&!comp){skip('match-competition-not-english');continue}
  const kind=kindOf(comp);if(kind==='friendly'){skip('match-friendly');continue}
  let opp:string|null=null,us:number,them:number,home:boolean|null=null
  if(v.neutral===true&&typeof v.opponent==='string'&&typeof v.clubGoals==='number'&&typeof v.opponentGoals==='number'){
   opp=v.opponent;us=v.clubGoals;them=v.opponentGoals;home=null
  }else if(typeof v.home==='string'&&typeof v.away==='string'&&typeof v.homeGoals==='number'&&typeof v.awayGoals==='number'&&(v.us==='home'||v.us==='away')){
   home=v.us==='home';opp=home?v.away:v.home;us=home?v.homeGoals:v.awayGoals;them=home?v.awayGoals:v.homeGoals
  }else{
   const name=String(v.name??'').replace(/\s*\([^)]*\)\s*$/,'').trim(),m=/^(.*\S)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(\S.*)$/.exec(name)
   if(!m){skip('match-unreadable');continue}
   const [a,ga,gb,b]=[m[1]!,Number(m[2]),Number(m[3]),m[4]!],ua=isUs(a),ub=isUs(b)
   if(ua===ub){skip('match-sides-unclear');continue}
   home=ua;opp=ua?b:a;us=ua?ga:gb;them=ua?gb:ga
  }
  const en0=enClub(opp),en=en0?canonClub(en0):null;if(!en||isUs(en)||isUs(en0!)){skip('match-opponent-not-english');continue}
  const names=(xs:unknown)=>Array.isArray(xs)?xs.filter((x):x is string=>typeof x==='string'&&isLatin(x)):[]
  const scorers=Array.isArray(v.scorers)?(v.scorers as {name?:string;minute?:number|null}[]).filter(s=>typeof s?.name==='string'&&isLatin(s.name)).map(s=>({name:s.name!,minute:typeof s.minute==='number'?s.minute:null})):[]
  // Historical seasons may span calendar years differently (1955, 1966/68).
  // A source's explicit label is authoritative; July is only a legacy fallback.
  const season=typeof v.season==='string'&&/^\d{4}(?:\/\d{2,4})?$/.test(v.season)?v.season:seasonOf(on)
  rows.push({id:f.id,on,season,year:Number(on.slice(0,4)),comp,kind,final:!!comp&&/\bfinal\b/i.test(comp)&&!/semi|quarter/i.test(comp),opp:en,oppKey:clubCore(en),us:us!,them:them!,home,derby:rivalNames.has(clubCore(en)),scorers,lineup:names(v.lineup),bench:names(v.bench),source:sourceOf(f)})
 }
 const spell=new Map<string,Map<string,number>>();for(const r of rows){const m=spell.get(r.oppKey)??new Map();m.set(r.opp,(m.get(r.opp)??0)+1);spell.set(r.oppKey,m)}
 for(const r of rows)r.opp=[...spell.get(r.oppKey)!.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]![0]
 const byDate=new Map<string,number>();for(const r of rows)byDate.set(r.on,(byDate.get(r.on)??0)+1)
 const seasons=[...new Set(rows.map(r=>r.season))].sort()
 const notable=(r:Row)=>r.kind==='europe'||r.derby||r.final
 const ageAdj=(y:number)=>y<1970?1:y>=2010?-1:0
 const topicOf=(r:Row):QTopic=>r.derby?'derby':r.kind==='europe'?'europe':'history'
 const compPhrase=(r:Row)=>r.comp?` in the ${r.comp}`:''
 const facetsOf=(r:Row,level:number)=>[`level:${level}`,`kind:${r.kind}`,`decade:${decadeOf(r.year)}`,...(r.derby?['derby']:[]),...(r.final?['final']:[]),...(!notable(r)?['archive-depth']:[])]
 const verbPhrase=(r:Row)=>r.us>r.them?`beat ${r.opp} ${r.us}-${r.them}`:r.us<r.them?`lost ${r.us}-${r.them} to ${r.opp}`:`drew ${r.us}-${r.them} with ${r.opp}`
 const lineOf=(r:Row)=>r.home===false?`${r.opp} ${r.them}-${r.us} ${NAME}`:`${NAME} ${r.us}-${r.them} ${r.opp}`
 // the same result against the same side in the same competition twice: a season prompt would have two answers
 const twin=new Map<string,number>();for(const r of rows){const k=`${r.oppKey}|${r.comp}|${r.us}|${r.them}`;twin.set(k,(twin.get(k)??0)+1)}
 // distractors from the same stage of the club's life: an option from another era or another competition is a giveaway
 const byKind=new Map<string,Row[]>();for(const r of rows){const xs=byKind.get(r.kind)??[];xs.push(r);byKind.set(r.kind,xs)}
 function rivalsOf(r:Row):string[]{
  const out:string[]=[],seen=new Set([r.oppKey])
  for(const span of [2,4,8,16]){
   const near=(byKind.get(r.kind)??[]).filter(x=>Math.abs(x.year-r.year)<=span&&!seen.has(x.oppKey)).sort((a,b)=>h(r.id+a.oppKey).localeCompare(h(r.id+b.oppKey)))
   for(const x of near){if(seen.has(x.oppKey))continue;seen.add(x.oppKey);out.push(x.opp);if(out.length>=5)return out}
  }
  return out
 }
 const seasonsBy=new Map<string,string[]>();for(const [k,xs] of byKind)seasonsBy.set(k,[...new Set(xs.map(x=>x.season))].sort())
 function seasonsNear(r:Row):string[]{
  const all=(seasonsBy.get(r.kind)??seasons).filter(x=>x!==r.season)
  return all.filter(x=>Math.abs(seasonYear(x)-seasonYear(r.season))<=8).sort((a,b)=>h(r.id+a).localeCompare(h(r.id+b))).slice(0,5)
 }
 // deep league rounds are sampled (a stable hash picks which) so a club with 3,000 league nights does not drown its Europe
 const DEEP_CAP=700
 const deep=rows.filter(r=>!notable(r)).sort((a,b)=>h(`${id}:${a.id}`).localeCompare(h(`${id}:${b.id}`)))
 const keepDeep=new Set(deep.slice(0,DEEP_CAP).map(r=>r.id))
 for(const r of rows){
  if(!notable(r)&&!keepDeep.has(r.id)){skip('match-deep-sampled-out');continue}
  const base=(notable(r)?(r.kind==='europe'&&r.final?1:2):4)+ageAdj(r.year),dec=[decadeOf(r.year)],t=topicOf(r)
  const explanation=`${lineOf(r)}${r.comp?`, ${r.comp}`:''}, ${when(r.on)}.`
  const common={factIds:[r.id],decades:dec,source:r.source}
  const res=r.us>r.them?'win':r.us<r.them?'defeat':'draw',side=NICK&&h(`nick:${r.id}`,2)<'40'?NICK:NAME
  if(byDate.get(r.on)===1){
   const L=clampLevel(base)
   const lead=r.derby?say(`opp:${r.id}`,[`${NAME} derby rewind`,`Derby day, ${when(r.on)}`]):r.final?`${NAME} final rewind`:r.kind==='europe'?say(`opp:${r.id}`,[`${NAME} rewind`,`A European night for ${side}`,`${NAME} on the road in Europe`]):say(`opp:${r.id}`,[`${NAME} rewind`,`From the ${NAME} archive`,`Turn back the clock`,`Matchday memory`])
   const prompt=lead.includes(when(r.on))?`${lead}${compPhrase(r)}: a ${r.us}-${r.them} ${res}. Who was across the pitch?`:say(`opp-q:${r.id}`,[`${lead}: ${when(r.on)}${compPhrase(r)}. A ${r.us}-${r.them} ${res} — against which club?`,`${lead}: ${when(r.on)}${compPhrase(r)}, ${NAME} ${r.us}-${r.them}. Who were the opponents?`])
   add({...common,key:`opp:${r.id}`,template:'fl-match-opponent',type:'mcq',topic:t,level:L,prompt,answer:r.opp,distractors:rivalsOf(r),pool:`opp:${r.kind}`,explanation,hint:{kind:'decade'},facets:facetsOf(r,L)})
   const L2=clampLevel(base+1),fixed=[[r.them,r.us],[r.us+1,r.them],[r.us,r.them+1],[Math.max(0,r.us-1),r.them],[r.us+1,r.them+1],[r.us+2,r.them]].filter(([a,b])=>a!==r.us||b!==r.them).map(([a,b])=>`${a}-${b}`)
   const sp=say(`score:${r.id}`,[`Remember the scoreline: ${NAME} v ${r.opp}, ${when(r.on)}${compPhrase(r)}. How did it finish? (${NAME} first)`,`${NAME} v ${r.opp}${compPhrase(r)}, ${when(r.on)}. Name the final score (${NAME} first).`,`Full time, ${when(r.on)}: ${NAME} v ${r.opp}${compPhrase(r)}. What did the scoreboard say? (${NAME} first)`])
   add({...common,key:`score:${r.id}`,template:'fl-match-score',type:'mcq',topic:'numbers',tags:[t],level:L2,prompt:sp,answer:`${r.us}-${r.them}`,distractors:[...new Set(fixed)],explanation,hint:{kind:'strike'},facets:facetsOf(r,L2)})
  }
  if(twin.get(`${r.oppKey}|${r.comp}|${r.us}|${r.them}`)===1&&r.comp){
   const L=clampLevel(base+1)
   const pp=say(`season:${r.id}`,[`Place this result in its season: ${NAME} ${verbPhrase(r)} in the ${r.comp}. Which campaign was it?`,`${NAME} ${verbPhrase(r)} in the ${r.comp}. Which season does that result belong to?`,`Find the year on the ticket stub: ${NAME} ${verbPhrase(r)} in the ${r.comp}. Which season?`])
   add({...common,key:`season:${r.id}`,template:'fl-match-season',type:'year',topic:t,level:L,prompt:pp,answer:r.season,distractors:seasonsNear(r),pool:'season',explanation,hint:{kind:'decade'},facets:facetsOf(r,L)})
   // A missing fixture is not evidence of a false season. Anchor both variants to ONE documented date.
   if(byDate.get(r.on)===1){
    const truth=Number.parseInt(h(r.id,2),16)%2===0
    // the wrong score is a near miss of three shapes, so "false" is never readable from a pattern
    const miss=[[r.us+1,r.them],[r.us,r.them+1],[r.them,r.us]].filter(([a,b])=>a!==r.us||b!==r.them)
    const [fu,ft]=truth?[r.us,r.them]:miss[Number.parseInt(h(`miss:${r.id}`,2),16)%miss.length]!
    const L3=clampLevel(base-1)
    add({...common,key:`tf:${r.id}`,template:'fl-match-tf',type:'tf',topic:t,level:L3,prompt:`Scoreboard check: ${NAME} v ${r.opp}, ${when(r.on)}${compPhrase(r)}. It finished ${fu}-${ft} (${NAME} first). True or false?`,answer:truth?'true':'false',explanation,hint:{kind:'decade'},facets:facetsOf(r,L3)})
   }
  }
  // scorers: one question per match, and only when it names one man without doubt
  const scoredBy=[...new Set(r.scorers.map(s=>s.name))],ours=scoredBy.filter(n=>players.has(normKey(n)))
  if(r.us>0&&r.scorers.length===r.us&&ours.length&&ours.length===scoredBy.length&&byDate.get(r.on)===1){
   const timed=r.scorers.filter(s=>s.minute!==null).sort((a,b)=>a.minute!-b.minute!)
   const one=scoredBy.length===1,first=timed[0]?.name
   const answer=one?scoredBy[0]!:first&&timed.length===r.scorers.length?first:null
   if(answer){
    const played=[...r.lineup,...r.bench].filter(n=>!scoredBy.includes(n)&&players.has(normKey(n)))
    const L=clampLevel((notable(r)?3:4)+ageAdj(r.year)/2)
    add({...common,key:`scorer:${r.id}`,template:'fl-match-scorer',type:'mcq',topic:t,tags:['players'],level:L,prompt:one?`Whose name went on the scoresheet for ${NAME} against ${r.opp}${compPhrase(r)} on ${when(r.on)}?`:`Who opened ${NAME}'s scoring against ${r.opp}${compPhrase(r)} on ${when(r.on)}?`,answer,distractors:[...new Set(played)].slice(0,5),pool:`pl:${decadeOf(r.year)}`,explanation:`${explanation} ${one?`${answer} scored for ${NAME}.`:`${answer} opened the scoring for ${NAME}.`}`,hint:{kind:'strike'},facets:[...facetsOf(r,L),'scorer']})
   }
  }
  // the starting eleven: three who started, three who were at the club then and were not in that matchday squad
  if(r.lineup.length>=11&&byDate.get(r.on)===1){
   const starters=r.lineup.filter(n=>players.has(normKey(n)))
   const squad=new Set([...r.lineup,...r.bench].map(normKey))
   const absent=[...players.values()].filter(p=>p.from!==null&&p.to!==null&&p.from<=r.year&&p.to>=r.year&&!squad.has(normKey(p.name))).map(p=>p.name)
   if(starters.length>=3&&absent.length>=3){
    const pick=(xs:string[],salt:string)=>[...new Set(xs)].sort((a,b)=>h(salt+a).localeCompare(h(salt+b))).slice(0,3)
    const L=clampLevel((notable(r)?3:4)+(r.final?-1:0))
    add({...common,key:`xi:${r.id}`,template:'fl-match-eleven',type:'multi',topic:t,tags:['players'],level:L,prompt:`Which three names belong in ${NAME}'s starting eleven against ${r.opp}${compPhrase(r)} on ${when(r.on)}?`,answer:pick(starters,r.id),distractors:pick(absent,r.id+'x'),explanation:`${explanation} Starting eleven: ${r.lineup.join(', ')}.`,hint:{kind:'strike'},facets:[...facetsOf(r,L),'lineup']})
   }
  }
 }
 // European nights in order: three at a time, from different seasons
 const nights=rows.filter(r=>r.kind==='europe'&&byDate.get(r.on)===1).sort((a,b)=>a.on.localeCompare(b.on))
 for(let i=0;i+2<nights.length;i+=3){
  const trio=nights.slice(i,i+3);if(new Set(trio.map(r=>r.season)).size<3)continue
  const labels=trio.map(r=>`${r.us}-${r.them} v ${r.opp}${r.comp?` (${r.comp.replace(/^UEFA\s+/,'')})`:''}`);if(new Set(labels.map(normKey)).size<3)continue
  const L=clampLevel(3+ageAdj(trio[0]!.year))
  add({key:`order-euro:${trio.map(r=>r.id).join(',')}`,template:'fl-euro-order',type:'order',topic:'europe',level:L,prompt:`Put these ${NAME} European nights in order, earliest first.`,answer:labels,explanation:trio.map(r=>`${when(r.on)}: ${lineOf(r)}`).join(' · '),hint:{kind:'context'},factIds:trio.map(r=>r.id),decades:[...new Set(trio.map(r=>decadeOf(r.year)))],source:trio[0]!.source,facets:[`level:${L}`,'kind:europe']})
 }

 /* ───────── kits ───────── */
 type Kit={id:string;season:string;type:string;maker:string|null;sponsor:string|null;source:SourceRef}
 const kits:Kit[]=[]
 for(const f of club.kits??[]){
  if(!ok(f))continue
  const v=f.value as Record<string,unknown>,season=typeof v.season==='string'&&/^\d{4}\/\d{2}$/.test(v.season)?v.season:null,type=typeof v.type==='string'?v.type:null
  if(!season||!type||!['home','away','third'].includes(type))continue
  kits.push({id:f.id,season,type,maker:typeof v.manufacturer==='string'?brand(enText(v.manufacturer)??enSponsor(v.manufacturer)):null,sponsor:typeof v.sponsor==='string'?brand(enText(v.sponsor)??enSponsor(v.sponsor)):null,source:sourceOf(f)})
 }
 const kitKey=new Map<string,number>();for(const k of kits)kitKey.set(`${k.season}|${k.type}`,(kitKey.get(`${k.season}|${k.type}`)??0)+1)
 const canonKit=(xs:(string|null)[])=>{const m=new Map<string,string>();for(const x of xs)if(x&&!m.has(normKey(x)))m.set(normKey(x),x);return m}
 const makerOf=canonKit(kits.map(k=>k.maker)),sponsorOf=canonKit(kits.map(k=>k.sponsor))
 for(const k of kits){if(k.maker)k.maker=makerOf.get(normKey(k.maker))!;if(k.sponsor)k.sponsor=sponsorOf.get(normKey(k.sponsor))!}
 const makers=new Set(makerOf.values()),sponsors=new Set(sponsorOf.values())
 for(const k of kits){
  if(kitKey.get(`${k.season}|${k.type}`)!==1)continue
  const y=seasonYear(k.season),L=clampLevel(2+(y<1995?1:0)+(y>=2015?-1:0)),dec=[decadeOf(y)],common={factIds:[k.id],decades:dec,source:k.source}
  const facets=[`level:${L}`,`decade:${decadeOf(y)}`,'kit']
  if(k.maker&&makers.size>=4){
   add({...common,key:`kit-maker:${k.id}`,template:'fl-kit-maker',type:'mcq',topic:'kits',level:L,prompt:`Picture ${NAME}'s ${k.season} ${k.type} shirt. Which maker belongs on the label?`,answer:k.maker,pool:'maker',explanation:`${NAME}'s ${k.season} ${k.type} shirt was made by ${k.maker}.`,hint:{kind:'decade'},facets})
   const wrong=[...makers].filter(m=>m!==k.maker).sort((a,b)=>h(k.id+a).localeCompare(h(k.id+b)))[0]
   const truth=Number.parseInt(h(k.id,2),16)%2===0||!wrong
   add({...common,key:`kit-tf:${k.id}`,template:'fl-kit-tf',type:'tf',topic:'kits',level:clampLevel(L-1),prompt:`True or false: ${truth?k.maker:wrong} made ${NAME}'s ${k.season} ${k.type} shirt.`,answer:truth?'true':'false',explanation:`It was ${k.maker}.`,hint:{kind:'decade'},facets:[`level:${clampLevel(L-1)}`,'kit']})
  }
  if(k.sponsor&&sponsors.size>=4){
   const L2=clampLevel(L+1)
   add({...common,key:`kit-sponsor:${k.id}`,template:'fl-kit-sponsor',type:'mcq',topic:'kits',level:L2,prompt:`From the shirt rail: ${NAME}, ${k.season}, ${k.type}. Which sponsor was on the front?`,answer:k.sponsor,pool:'sponsor',explanation:`${k.sponsor} was on the front of ${NAME}'s ${k.season} ${k.type} shirt.`,hint:{kind:'decade'},facets:[`level:${L2}`,`decade:${decadeOf(y)}`,'kit']})
  }
 }

 /* ───────── honours ───────── */
 const honours=[...(extras.trophies??[])]
 for(const f of club.trophies??[]){
  if(!ok(f))continue
  const v=f.value as {name?:string;seasons?:string[];count?:number|null},name=enText(v.name)?.replace(/\s+champions?$/i,'')??null
  const ss=[...new Set((v.seasons??[]).map(s=>s.replace('-','/')).filter(s=>/^\d{4}\/\d{2}$/.test(s)))].sort()
  if(!name||!ss.length)continue
  honours.push({id:f.id,name,seasons:ss,complete:typeof v.count==='number'&&v.count===ss.length,count:typeof v.count==='number'?v.count:null,source:sourceOf(f)})
 }
 for(const t of honours){
  const won=new Set(t.seasons)
  for(const s of t.seasons){
   const y=seasonYear(s),L=clampLevel(2+(y<1980?1:0)+(y>=2010?-1:0))
   add({key:`honour-tf:${t.id}:${s}`,template:'fl-honour-tf',type:'tf',topic:'history',level:L,prompt:`True or false: ${NAME} won the ${t.name} in ${s}.`,answer:'true',explanation:`${NAME} won the ${t.name} in ${s}.`,hint:{kind:'decade'},factIds:[`${t.id}:${s}`],decades:[decadeOf(y)],source:t.source,facets:[`level:${L}`,'honour']})
   if(t.complete){
    // the false twin is a nearby season NOT on the complete honours list
    const near=[1,-1,2,-2,3,-3].map(d=>`${y+d}/${String((y+d+1)%100).padStart(2,'0')}`).find(x=>!won.has(x))
    const before=t.seasons.filter(x=>x<(near??'')).at(-1),after=t.seasons.find(x=>x>(near??''))
    if(near)add({key:`honour-tf-false:${t.id}:${near}`,template:'fl-honour-tf',type:'tf',topic:'history',level:clampLevel(L+1),prompt:`True or false: ${NAME} won the ${t.name} in ${near}.`,answer:'false',explanation:`Not in ${near}.${before?` The ${t.name} before that came in ${before}.`:''}${after?` The next came in ${after}.`:''}`,hint:{kind:'decade'},factIds:[`${t.id}:${near}:not`],decades:[decadeOf(seasonYear(near))],source:t.source,facets:[`level:${clampLevel(L+1)}`,'honour']})
   }
  }
  if(t.seasons.length===1){
   const s=t.seasons[0]!,L=clampLevel(2+(seasonYear(s)<1980?1:0))
   add({key:`honour-season:${t.id}`,template:'fl-honour-season',type:'year',topic:'history',level:L,prompt:`In which season did ${NAME} win the ${t.name}?`,answer:s,pool:'season',explanation:`${NAME} won the ${t.name} in ${s}.`,hint:{kind:'decade'},factIds:[`${t.id}:${s}`],decades:[decadeOf(seasonYear(s))],source:t.source,facets:[`level:${L}`,'honour']})
  }
  const n=t.count??(t.complete?t.seasons.length:null)
  if(n&&n>=2){
   const L=clampLevel(n>=10?2:3)
   const fixed=[n-1,n+1,n-2,n+2,n+3,n-3].filter(x=>x>0).map(String)
   add({key:`honour-count:${t.id}`,template:'fl-honour-count',type:'mcq',topic:'numbers',tags:['history'],level:L,prompt:`How many times does ${NAME}'s honours list record the club winning the ${t.name}?`,answer:String(n),distractors:fixed,explanation:`${plural(n,'win')}: ${t.seasons.slice(-6).join(', ')}${t.seasons.length>6?' and more':''}.`,hint:{kind:'strike'},factIds:[`${t.id}:count`],decades:[],source:t.source,facets:[`level:${L}`,'honour']})
  }
 }

 /* ───────── seasons ───────── */
 for(const f of club.seasons??[]){
  if(!ok(f))continue
  const v=f.value as {name?:string;league?:string;finish?:string},s=v.name&&/^\d{4}\/\d{2}$/.test(v.name)?v.name:null,lg=enText(v.league),fin=/^(\d{1,2})(st|nd|rd|th)\b/.exec(v.finish??'')
  if(!s||!lg||!fin)continue
  const place=Number(fin[1]),ans=ORD[place-1];if(!ans)continue
  const L=clampLevel(place===1?2:3)
  add({key:`finish:${f.id}`,template:'fl-season-finish',type:'mcq',topic:'history',level:L,prompt:`Where did ${NAME} finish in the ${lg} in ${s}?`,answer:ans,distractors:ORD.slice(0,8).filter(x=>x!==ans),explanation:`${NAME} finished ${v.finish} in the ${lg} in ${s}.`,hint:{kind:'strike'},factIds:[f.id],decades:[decadeOf(seasonYear(s))],source:sourceOf(f),facets:[`level:${L}`,'season']})
 }

 /* ───────── shirt numbers (season-bound, The Worker's Player Master) ───────── */
 const numbersAll=[...new Set((extras.numbers??[]).map(n=>String(n.number)))]
 for(const n of extras.numbers??[]){
  const p=byId.get(n.playerId);if(!p)continue
  const L=clampLevel(p.fame+1)
  add({key:`number:${n.playerId}:${n.season}`,template:'fl-shirt-number',type:'mcq',topic:'numbers',tags:['players'],level:L,prompt:`Which number did ${p.name} wear for ${NAME} in ${n.season}?`,answer:String(n.number),pool:'number',explanation:`${p.name} wore number ${n.number} for ${NAME} in ${n.season}.`,hint:{kind:'strike'},factIds:[`number:${n.playerId}:${n.season}`],decades:[decadeOf(seasonYear(n.season))],source:n.source,facets:[`level:${L}`,'number']})
 }

 /* ───────── players: position, arrival decade, era sets, order ───────── */
 const ranked=[...byId.values()]
 for(const p of ranked){
  if(p.positions.length===1){
   const ans=POS[p.positions[0]!]!,L=clampLevel(p.fame)
   add({key:`pos:${p.id}`,template:'fl-player-position',type:'mcq',topic:'players',level:L,prompt:say(`pos:${p.id}`,[`${p.name} is on the ${NAME} team sheet. Which position was his?`,`Where did ${p.name} line up for ${NAME}?`,`Picture ${p.name} in ${/^[AEIOU]/i.test(NAME)?'an':'a'} ${NAME} shirt. What was his position?`]),answer:ans,distractors:Object.values(POS).filter(x=>x!==ans),explanation:`${p.name} played as a ${ans.toLowerCase()} for ${NAME}${p.from?` (recorded ${p.from}${p.to&&p.to!==p.from?`–${p.to}`:''})`:''}.`,hint:{kind:'strike'},factIds:[`pos:${p.id}`],decades:p.from?[decadeOf(p.from)]:[],source:p.source,facets:[`level:${L}`,'player']})
  }
  if(p.from){
   const d=decadeOf(p.from),ans=`${d}s`,L=clampLevel(p.fame+1)
   const fixed=[d-10,d+10,d-20,d+20,d+30,d-30].filter(x=>x>=1880&&x<=2020).map(x=>`${x}s`)
   add({key:`arrive:${p.id}`,template:'fl-player-decade',type:'mcq',topic:'players',level:L,prompt:say(`arrive:${p.id}`,[`Turn back to ${p.name}'s ${NAME} years. In which decade does the archive first place him at the club?`,`${p.name} in the ${NAME} record: in which decade is he first listed?`,`${p.name} joins the ${NAME} story. In which decade does he first appear?`]),answer:ans,distractors:fixed,explanation:`${p.name}'s recorded years at ${NAME}: ${p.from}${p.to&&p.to!==p.from?`–${p.to}`:''}.`,hint:{kind:'strike'},factIds:[`span:${p.id}`],decades:[d],source:p.source,facets:[`level:${L}`,`decade:${d}`,'player']})
  }
 }
 // era sets: "which three played in the 1990s" — the strongest-remembered first, never a man whose years are unknown
 const known=ranked.filter(p=>p.from!==null&&p.to!==null)
 for(const d of [...new Set(known.map(p=>decadeOf(p.from!)))].sort()){
  const inside=known.filter(p=>p.from!<=d+9&&p.to!>=d).sort((a,b)=>a.fame-b.fame||a.id.localeCompare(b.id))
  const outside=known.filter(p=>p.to!<d||p.from!>d+9).sort((a,b)=>a.fame-b.fame||a.id.localeCompare(b.id))
  for(let i=0;i+2<Math.min(inside.length,18)&&i+2<outside.length;i+=3){
   const yes=inside.slice(i,i+3),no=outside.slice(i,i+3),L=clampLevel(Math.round((yes.reduce((t,p)=>t+p.fame,0)/3))+1)
   add({key:`era:${d}:${i}`,template:'fl-player-era',type:'multi',topic:'players',level:L,prompt:`Build a ${d}s ${NAME} team sheet: which three of these players belong in that decade? (${i/3+1})`,answer:yes.map(p=>p.name),distractors:no.map(p=>p.name),explanation:[...yes,...no].map(p=>`${p.name}: ${p.from}–${p.to}`).join(' · '),hint:{kind:'strike'},factIds:yes.map(p=>`span:${p.id}`),decades:[d],source:yes[0]!.source,facets:[`level:${L}`,`decade:${d}`,'player']})
  }
 }
 // arrival order: three men from different decades, the better-known first
 const firsts=known.filter(p=>p.fame<=2).sort((a,b)=>h(id+a.id).localeCompare(h(id+b.id)))
 for(let i=0;i+2<Math.min(firsts.length,120);i+=3){
  const trio=firsts.slice(i,i+3).sort((a,b)=>a.from!-b.from!);if(new Set(trio.map(p=>decadeOf(p.from!))).size<3)continue
  const L=clampLevel(3)
  add({key:`arrive-order:${trio.map(p=>p.id).join(',')}`,template:'fl-player-order',type:'order',topic:'players',level:L,prompt:`Three chapters of ${NAME} history. Put these players in order of their first recorded club year, earliest first.`,answer:trio.map(p=>p.name),explanation:trio.map(p=>`${p.name} (${p.from})`).join(' → '),hint:{kind:'context'},factIds:trio.map(p=>`span:${p.id}`),decades:trio.map(p=>decadeOf(p.from!)),source:trio[0]!.source,facets:[`level:${L}`,'player']})
 }

 const timelineYears=[...new Set(club.timeline.map(t=>Number(t.value.on.slice(0,4))))].sort((a,b)=>a-b)
 const yearsNear=(y:number,salt:string)=>{const near=timelineYears.filter(x=>x!==y&&Math.abs(x-y)<=12);const fill=[-3,2,-1,4,-6,7,1,-2].map(d=>y+d).filter(x=>x!==y&&!near.includes(x)&&x<=new Date().getUTCFullYear());return [...near.sort((a,b)=>h(salt+a).localeCompare(h(salt+b))).slice(0,5),...fill].slice(0,5).map(String)}
 /* ───────── English timeline moments (a persecution, a death or a war is remembered on the timeline, never quizzed) */
 /* ───────── that are not match lines ───────── */
 // a club with two founding dates in its record (a meeting and a registration) cannot be asked "which year was it founded"
 const FOUNDING=/\b(found(?:ed|ing)|establish\w*|formed|birth(?:day)?)\b/i
 const foundingYears=new Set(club.timeline.filter(f=>FOUNDING.test(enText(f.value.title)??'')).map(f=>f.value.on.slice(0,4)))
 for(const f of club.timeline){
  const v=f.value,t=enText(v.title);if(!t||/\d\s*[-–:]\s*\d/.test(t)||SOMBRE.test(t)||!ok(f as Fact<unknown>))continue
  if(FOUNDING.test(t)&&foundingYears.size>1){skip('moment-founding-disputed');continue}
  // a bare fixture ("Tobol v Zrinjski") or a ledger note ("abandoned fixture") is not a moment anybody remembers by its year
  if(/^[^—:]{2,40}\s(?:v|vs\.?)\s[^—:]{2,40}$/i.test(t)||/\b(abandoned|awarded|walkover|annulled|replayed) fixture\b|administratively/i.test(t)){skip('moment-not-a-memory');continue}
  const y=Number(v.on.slice(0,4)),L=clampLevel(3+ageAdj(y))
  add({key:`moment-year:${f.id}`,template:'fl-moment-year',type:'year',topic:'history',level:L,prompt:say(`moment:${f.id}`,[`${NAME} history: in which year — “${t}”?`,`From the ${NAME} timeline: “${t}”. Which year?`,`Date the cutting: “${t}”. In which year did it happen?`]),answer:String(y),distractors:yearsNear(y,f.id),pool:'year',explanation:`${t} — ${when(v.on)}.`,hint:{kind:'decade'},factIds:[f.id],decades:[decadeOf(y)],source:sourceOf(f as Fact<unknown>),facets:[`level:${L}`,`decade:${decadeOf(y)}`,'moment']})
 }

 /* ───────── the scorer the replay actually names; no invented narrative, minute or winning-goal claim ───────── */
 for(const f of club.goals??[]){
  if(!ok(f))continue
  const v=f.value as Record<string,unknown>,on=typeof v.on==='string'?v.on:'',subtitle=String(v.subtitle??'')
  const opp=typeof v.opponent==='string'?enClub(v.opponent):null,comp=typeof v.competition==='string'?enCompetition(v.competition):null
  const seq=Array.isArray(v.sequence)?v.sequence as {actor?:string;side?:string;action?:string}[]:[],last=seq.at(-1)
  if(!opp||!/^\d{4}-\d{2}-\d{2}$/.test(on)||!last?.actor||last.side!=='club'||!['shot','header'].includes(last.action??''))continue
  const recordedMinute=/(?:·\s*|minute\s+|דקה\s+)(\d+(?:\s*\+\s*\d+)?)\s*['′]?(?:\s*$)/i.exec(subtitle)?.[1]
  if(!recordedMinute)continue
  const reviews=goalReviews as Record<string,{on:string;originalMinute:string;minute:string;source:SourceRef}>,candidate=reviews[f.id]
  const review=candidate?.on===on&&candidate.originalMinute===recordedMinute?candidate:null,minute=review?.minute??recordedMinute
  const found=originalNames.get(normKey(last.actor)),man=found?.size===1?[...found][0]:null
  const scorer=man?.name??(isLatin(last.actor)?last.actor:null);if(!scorer)continue
  const sameMatch=rows.filter(r=>r.on===on&&r.oppKey===clubCore(opp))
  const relevant=sameMatch[0],year=Number(on.slice(0,4)),topic:QTopic=relevant?topicOf(relevant):comp&&kindOf(comp)==='europe'?'europe':'history'
  const L=clampLevel(relevant?.final?1:relevant?.derby?2:2+(year<1990?1:0)),source=review?.source??sourceOf(f)
  if(!source.url)continue
  // Replay geometry can be illustrative. The scorer is documented; do not turn a sketch into a body-part claim.
  const action='found the net'
  add({key:`goal-finisher:${f.id}`,template:'fl-goal-finisher',type:'mcq',topic,tags:['players'],level:L,
   prompt:`Rewind to ${NAME} v ${opp}, ${when(on)}${comp?` (${comp})`:''}. Minute ${minute}: who ${action}?`,
   answer:scorer,distractors:[...new Set(seq.flatMap(s=>s.side==='club'&&s.actor&&isLatin(s.actor)&&normKey(s.actor)!==normKey(scorer)?[s.actor]:[]))],pool:`pl:${decadeOf(year)}`,
   explanation:`${scorer} ${action} against ${opp} in minute ${minute}, ${when(on)}.`,hint:{kind:'strike'},
   factIds:[f.id,...sameMatch.map(r=>r.id)],decades:[decadeOf(year)],source,facets:[`level:${L}`,'goal',...(relevant?.final?['final']:[]),...(relevant?.derby?['derby']:[])]})
 }
 // Pair names with genuinely different positions. Each component keeps its underlying fact identity.
 const positionMen=ranked.filter(p=>p.positions.length===1&&POS[p.positions[0]!]&&p.source.url).sort((a,b)=>(prominence.get(b.id)??0)-(prominence.get(a.id)??0)||a.id.localeCompare(b.id))
 const lanes=Object.keys(POS).map(pos=>positionMen.filter(p=>p.positions[0]===pos))
 for(let i=0;i<12;i++){
  const trio=lanes.map(l=>l[i]).filter((p):p is Man=>!!p).slice(0,3);if(trio.length!==3)continue
  const L=clampLevel(Math.round(trio.reduce((n,p)=>n+p.fame,0)/3))
  add({key:`player-pairs:${trio.map(p=>p.id).join(',')}`,template:'fl-player-pairs',type:'match',topic:'players',level:L,
   prompt:`Fill the ${NAME} team sheet: match each player to his position.`,left:trio.map(p=>p.name),answer:trio.map(p=>POS[p.positions[0]!]!),
   explanation:trio.map(p=>`${p.name}: ${POS[p.positions[0]!]}`).join(' · ')+'.',hint:{kind:'context'},
   factIds:trio.map(p=>`pos:${p.id}`),decades:[...new Set(trio.flatMap(p=>p.from?[decadeOf(p.from)]:[]))],source:trio[0]!.source,facets:[`level:${L}`,'player']})
 }
 // Three home shirts, three distinct makers: one unambiguous answer per season.
 const homeKits=kits.filter(k=>k.type==='home'&&k.maker&&k.source.url&&kitKey.get(`${k.season}|home`)===1).sort((a,b)=>a.season.localeCompare(b.season))
 for(let i=0;i<homeKits.length;i+=3){
  const trio:Kit[]=[],seen=new Set<string>()
  for(const k of homeKits.slice(i)){if(seen.has(normKey(k.maker!)))continue;seen.add(normKey(k.maker!));trio.push(k);if(trio.length===3)break}
  if(trio.length!==3)continue
  const L=2
  add({key:`kit-pairs:${trio.map(k=>k.id).join(',')}`,template:'fl-kit-pairs',type:'match',topic:'kits',level:L,
   prompt:`Three shirts from ${NAME}'s past. Match each home-shirt season to its maker.`,left:trio.map(k=>k.season),answer:trio.map(k=>k.maker!),
   explanation:trio.map(k=>`${k.season}: ${k.maker}`).join(' · ')+'.',hint:{kind:'context'},factIds:trio.map(k=>k.id),decades:[...new Set(trio.map(k=>decadeOf(seasonYear(k.season))))],source:trio[0]!.source,facets:[`level:${L}`,'kit']})
 }

 // Original questions from individually reviewed primary-source facts. Related variants share a fact group.
 for(const f of heritage.facts){
  if(f.club!==id||f.status!=='approved'||f.source.confidence<2||!f.source.url)continue
  add({key:`heritage:${f.id}`,template:`fl-heritage-${f.kind}`,type:'mcq',topic:'history',level:f.level,
   prompt:f.prompt,answer:f.answer,distractors:f.distractors,explanation:f.explanation,hint:{kind:'strike'},
   factIds:[`heritage:${id}:${f.group}`],decades:[f.decade],source:f.source,facets:[`level:${f.level}`,'heritage','editorial:2026-10-21']})
 }

 /* ───────── pools: real values of the same kind ───────── */
 const pools:Record<string,string[]>={season:seasons,maker:[...makers],sponsor:[...sponsors],number:numbersAll,year:[...new Set(club.timeline.map(t=>t.value.on.slice(0,4)))].sort()}
 for(const k of ['europe','cup','league'] as const)pools[`opp:${k}`]=[...new Set(rows.filter(r=>r.kind===k).map(r=>r.opp))]
 for(const p of known)for(let d=decadeOf(p.from!);d<=decadeOf(p.to!);d+=10)(pools[`pl:${d}`]??=[]).push(p.name)
 // one spelling per name in a pool: two spellings of one club are an alias of the answer, never a distractor
 for(const [k,v] of Object.entries(pools)){const seen=new Set<string>();pools[k]=v.filter(x=>{const n=normKey(x);if(!n||seen.has(n))return false;seen.add(n);return true})}

 const questions:MasterQuestion[]=drafts.map(d=>({id:`q_${h(`${id}:${d.template}:${d.key}`)}`,key:`${d.template}:${id}:${d.key}`,template:d.template,type:d.type,topic:d.topic,tags:[...new Set([d.topic,...(d.tags??[])])],sport:'football',decades:d.decades,difficulty:difficultyOf(d.level as 1|2|3|4),...(d.facets.includes('archive-depth')?{deep:true as const}:{}),prompt:d.prompt,answer:d.answer,...(d.pool?{pool:d.pool}:{}),...(d.distractors?{distractors:d.distractors}:{}),...(d.left?{left:d.left}:{}),explanation:d.explanation,hint:d.hint,factIds:d.factIds,source:d.source,facets:[`club:${id}`,`template:${d.template}`,...d.facets]}))
 const byTemplate:Record<string,number>={},byLevel:Record<string,number>={}
 for(const q of questions){byTemplate[q.template]=(byTemplate[q.template]??0)+1;byLevel[q.difficulty]=(byLevel[q.difficulty]??0)+1}
 return {trivia:{questions,pools},report:{club:id,made:questions.length,byTemplate,byLevel,skipped}}

}
