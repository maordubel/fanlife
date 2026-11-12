/**
 * club:lineups — a club's league and cup nights from TWO independent public score sites, kept only where they AGREE.
 *   365Scores (webws.365scores.com/web)  ×  LiveScore (prod-cdn-public-api.livescore.com/v1/api/app)
 * For a club's latest finished matches (not UEFA's — UEFA is its own authority, see rule 102) it reads the eleven from 365Scores,
 * finds the same match on LiveScore by date + club names + score, reads that eleven too, and compares them by surname.
 * Agreement (≥10 of 11 surnames, same score) → two publishers → `approved`, confidence 3, the compiler's own automated-approval rule.
 * Anything else stays `review` with its single source and the reason, and reaches no gate. Names are written as 365Scores prints them.
 *
 * 12.11.2026 — the archive refresh:
 *  · SCORERS: 365Scores' goal events for our side × LiveScore's goal incidents for our side. Recorded only when the two lists
 *    agree surname for surname (own goals are not a scorer of ours); otherwise the match keeps `scorers: []`.
 *  · POSITIONS: every man who started is a GK / DF / MF / FW on both sites' sheets; where both sites put him in the same line
 *    he becomes (or fills) a player record of the club — an existing man of the same full name keeps his id and his years,
 *    and gains only the position he lacked (lib/clubs/waves.ts narrow fill). Disagreements are counted, never resolved.
 *  · ACCUMULATES: the file keeps every match it ever approved; a run adds the newest, so the archive grows with each season.
 *  · RESOLVES: a club without `scores365Id` in ingest.json is looked up by its names (exact club-name match, rule 7) and the
 *    id is written back.
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/ingest/clubs/league-lineups.ts --club celtic [--max 40]
 * Both are unofficial public JSON the sites' own pages call; reads are paced and nothing is retried past a refusal (rule 11).
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {sameClub} from '../../../lib/fixtures/names'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]??null}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
// letters NFD does not split (ø, æ, ß, đ, ł, ı) are spelled out first: "Høgh" must read "hogh", not "h gh"
const SPELL:Record<string,string>={ø:'o',æ:'ae',œ:'oe',ß:'ss',đ:'d',ł:'l',ı:'i',þ:'th',ð:'d'}
const fold=(s:string)=>s.toLowerCase().replace(/[øæœßđłıþð]/g,c=>SPELL[c]!).normalize('NFD').replace(/\p{M}+/gu,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
type J=Record<string,any>
const B365='https://webws.365scores.com/web',Q365='appTypeId=5&langId=1&timezoneName=Europe/London&userCountryId=1',LS='https://prod-cdn-public-api.livescore.com/v1/api/app'
async function get(url:string):Promise<any>{
 for(let i=0;i<3;i++){
  try{await sleep(160);const r=await fetch(url,{headers:{accept:'application/json','user-agent':'FanLife-ingest/1.0 (+https://github.com/maordubel/fanlife)'}});if(r.status===403||r.status===404)return null;if(r.ok)return await r.json()}catch{}
  await sleep(700*(i+1))
 }
 return null
}
const slug=(s:string)=>s.normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const EURO=/UEFA|Champions League|Europa League|Conference League/i
const surname=(n:string)=>{const p=fold(n).split(' ').filter(Boolean);return p[p.length-1]??''}
/** given names too common to tell two team-mates apart (Arabic, Portuguese, Spanish naming) never prove a match on their own */
const COMMON=new Set(['mohamed','mohammed','muhammad','ahmed','ahmad','mahmoud','abdel','abdul','abdelrahman','hassan','hussein','hossam','ibrahim','ali','omar','youssef','yousef','mostafa','mustafa','karim','amr','ayman','walid','tarek','khaled','junior','silva','santos','souza','pereira','oliveira','jose','juan','carlos'])
/** is printed name n one of the folded names on a sheet? surname first; else a distinctive token of four letters or more */
const onSheet=(n:string,sheet:string[])=>{const s=surname(n);if(sheet.some(l=>l.split(' ').includes(s)||l.endsWith(s)))return true
 const toks=fold(n).split(' ').filter(t=>t.length>=4&&!COMMON.has(t));return toks.length>0&&sheet.some(l=>toks.some(t=>l.split(' ').includes(t)))}
/** both sites' words for a line, folded to the four the archive uses */
export function line(raw:unknown):'GK'|'DF'|'MF'|'FW'|null{
 const s=fold(String(raw??''))
 if(/goalkeeper|keeper/.test(s))return 'GK'
 if(/defender|back/.test(s))return 'DF'
 if(/midfield/.test(s))return 'MF'
 if(/forward|attack|striker|winger/.test(s))return 'FW'
 return null
}
/** LiveScore goal incidents (IT 36 goal, 37 penalty goal) of one side, nested assists excluded; own goals (IT 39) are not ours */
export function lsScorers(incs:J|null|undefined,side:1|2):string[]{
 const out:string[]=[]
 const walk=(list:J[])=>{for(const x of list){
  if(Array.isArray(x.Incs)&&x.Incs.length){const g=x.Incs.find((y:J)=>y.IT===36||y.IT===37);if(g&&g.Nm===side)out.push(fold(`${g.Fn||''} ${g.Ln||''}`));continue}
  if((x.IT===36||x.IT===37)&&x.Nm===side)out.push(fold(`${x.Fn||''} ${x.Ln||''}`))
 }}
 for(const half of Object.values(incs?.Incs||{}))if(Array.isArray(half))walk(half as J[])
 return out
}
/** the two scorer lists agree when every 365Scores scorer's surname is found once on LiveScore's list, and the counts match */
export function scorersAgree(a:string[],b:string[]):boolean{
 if(a.length!==b.length)return false
 const pool=[...b]
 for(const n of a){const i=pool.findIndex(l=>onSheet(n,[l]));if(i<0)return false;pool.splice(i,1)}
 return true
}
async function resolveId(names:string[]):Promise<number|null>{
 for(const q of names){
  const s=await get(`${B365}/search/?${Q365}&query=${encodeURIComponent(q)}`)
  const hit=((s?.competitors||[]) as J[]).filter(c=>c.sportId===1&&c.type===1&&names.some(n=>sameClub(n,String(c.name))))
  if(hit.length===1)return Number(hit[0]!.id)
 }
 return null
}

async function main(){
 const club=arg('club');if(!club)throw new Error('--club required')
 const max=Number(arg('max')||40),cfgPath=`club-packs/${club}/ingest.json`,cfg=JSON.parse(readFileSync(cfgPath,'utf8'))
 let id=cfg.scores365Id
 if(!id){
  id=await resolveId(cfg.names||[])
  if(!id){console.log(`[${club}] NO_365_TEAM — no single 365Scores club answers to ${(cfg.names||[]).join(' / ')} — nothing pulled.`);return}
  cfg.scores365Id=id;writeFileSync(cfgPath,JSON.stringify(cfg,null,1)+'\n');console.log(`[${club}] 365Scores id ${id} resolved and written to ingest.json`)
 }
 const today=new Date().toISOString().slice(0,10),file=`club-packs/${club}/wave-league-lineups-2026-10-10.json`
 const prev=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{sources:[],matches:[],players:[]}
 const sources=new Map<string,J>(((prev.sources||[]) as J[]).map(s=>[s.id,s])),byId=new Map<string,J>(((prev.matches||[]) as J[]).map(m=>[m.id,m]))
 // the club's own men by full name — a position fills the man the pack already knows instead of adding a second one
 const core=existsSync(`club-packs/${club}/core.json`)?JSON.parse(readFileSync(`club-packs/${club}/core.json`,'utf8')):{players:[]}
 const known=new Map<string,string|null>()
 for(const p of [...((core.players||[]) as J[]),...((prev.players||[]) as J[])]){const k=fold(String(p.value?.name||''));if(!k)continue;const was=known.get(k);known.set(k,was===undefined||was===p.id?p.id:null)}
 const lines=new Map<string,{name:string;votes:Map<string,number>;years:Set<number>;srcs:Set<string>}>()
 const prevPlayers=new Map<string,J>(((prev.players||[]) as J[]).map(p=>[p.id,p]))
 const why=new Map<string,number>();let pages=0
 let url:string|null=`${B365}/games/results/?${Q365}&competitors=${id}&showOdds=false`,seen=0,agreed=0,single=0,fetched=0,withScorers=0,posAgree=0,posDiffer=0
 const lsDay=new Map<string,any>()
 while(url&&seen<max){
  const page=await get(url);if(!page)break
  pages++
  for(const g of (page.games||[])as J[]){
   if(seen>=max)break
   if(g.statusGroup!==4||!g.hasLineups||EURO.test(String(g.competitionDisplayName||'')))continue
   seen++
   const d=await get(`${B365}/game/?${Q365}&gameId=${g.id}`);const game=d?.game;if(!game)continue
   fetched++
   const names=new Map<number,string>((game.members||[]).map((m:J)=>[m.id,m.name]))
   const home=game.homeCompetitor,away=game.awayCompetitor,weHome=Number(home.id)===Number(id),ours=weHome?home:away
   const members=(ours.lineups?.members||[]) as J[]
   const starters=members.filter(m=>m.status===1).map(m=>names.get(m.id)).filter(Boolean) as string[]
   const bench=members.filter(m=>m.status===2).map(m=>names.get(m.id)).filter(Boolean) as string[]
   const sh=Number(home.score),sa=Number(away.score);if(starters.length!==11||!Number.isFinite(sh)||!Number.isFinite(sa)||(sh<0||sa<0))continue
   const on=String(game.startTime).slice(0,10),comp=String(game.competitionDisplayName||'').replace(/^[^,]+,\s*/,'')
   const goals365=((game.events||[]) as J[]).filter(e=>e.eventType?.id===1&&Number(e.competitorId)===Number(ours.id)&&!/own/i.test(String(e.eventType?.subTypeName||''))).map(e=>names.get(e.playerId)).filter(Boolean) as string[]
   // LiveScore: the same match = our club (exact normalised name), the same score, and an opponent who shares a significant word
   // with his 365Scores name ("Volos NFC" / "Volos"); the day is tried with the next and the previous one because the sites cut midnight differently
   const ourName=ours.name,oppName=(weHome?away:home).name
   const words=(n:string)=>fold(n).split(' ').filter(w=>w.length>=4)
   const near=(a:string,b:string)=>sameClub(a,b)||words(a).some(w=>words(b).includes(w))
   // 12.11.2026 — opponents are often spelled apart ("Maghreb Fès" / "MAS Fes"): on a day where OUR club played exactly one
   // match with this exact score (and on the same side of the fixture), that match is the one, whatever the opponent is called
   let ev:J|null=null
   const day0=new Date(`${on}T12:00:00Z`)
   for(const off of [0,1,-1]){
    const key=new Date(day0.getTime()+off*86400000).toISOString().slice(0,10).replace(/-/g,'');let day=lsDay.get(key);if(!day){day=await get(`${LS}/date/soccer/${key}/0?locale=en`);lsDay.set(key,day)}
    const ours:J[]=[]
    for(const st of (day?.Stages||[])as J[])for(const e of (st.Events||[])as J[]){
     const t1=e.T1?.[0]?.Nm??'',t2=e.T2?.[0]?.Nm??''
     if(Number(e.Tr1)!==sh||Number(e.Tr2)!==sa)continue
     if((weHome?near(t1,ourName)&&near(t2,oppName):near(t1,oppName)&&near(t2,ourName))){ev=e;break}
     if(weHome?near(t1,ourName):near(t2,ourName))ours.push(e)
    }
    if(!ev&&ours.length===1)ev=ours[0]!
    if(ev)break
   }
   if(!ev&&process.env.LL_DEBUG){const cands:string[]=[];for(const [,day] of lsDay)for(const st of (day?.Stages||[])as J[])for(const e of (st.Events||[])as J[])if(Number(e.Tr1)===sh&&Number(e.Tr2)===sa&&[e.T1?.[0]?.Nm,e.T2?.[0]?.Nm].some((n:string)=>words(n||'').some(w=>words(ourName).includes(w))))cands.push(`${e.T1?.[0]?.Nm} v ${e.T2?.[0]?.Nm} (${st.Cnm}/${st.Snm})`);console.log(`[${club}] no LS match: ${home.name} ${sh}-${sa} ${away.name} ${on} · near: ${cands.slice(0,3).join('; ')||'none'}`)}
   let agree=false,why_='LiveScore lists no matching match (date, both clubs, score)',lsSrc:J|null=null,scorers:string[]=[]
   const side:1|2=weHome?1:2
   if(ev){
    const lu=await get(`${LS}/lineups/soccer/${ev.Eid}?locale=en`)
    const sideLu=(lu?.Lu||[]).find((x:J)=>x.Tnb===side)
    const lsPlayers=((sideLu?.Ps||[]) as J[]).filter(p=>p.Pon!=='COACH'&&p.Fp)
    const ls=lsPlayers.map(p=>fold(`${p.Fn||''} ${p.Ln||''}`))
    if(ls.length===11){
     const hit=starters.filter(n=>onSheet(n,ls)).length
     agree=hit>=10;why_=agree?'':`LiveScore's eleven differs (${hit}/11 surnames agree)`
     lsSrc={id:`ls-lu-${ev.Eid}`,title:`LiveScore: ${home.name} ${sh}-${sa} ${away.name}, ${on} (line-ups)`,url:`${LS}/lineups/soccer/${ev.Eid}`,publisher:'LiveScore',access:'available',checkedAt:today}
     if(agree){
      // the lines both sites drew
      for(const m of members.filter(x=>x.status===1)){
       const n=names.get(m.id);if(!n)continue
       const a=line(m.position?.name??m.formation?.name),lp=lsPlayers.find(p=>onSheet(n,[fold(`${p.Fn||''} ${p.Ln||''}`)])),b=line(lp?.Pon)
       if(!a||!b)continue
       if(a!==b){posDiffer++;continue}
       posAgree++
       const k=fold(n),r=lines.get(k)??{name:n,votes:new Map(),years:new Set(),srcs:new Set()}
       r.votes.set(a,(r.votes.get(a)||0)+1);r.years.add(Number(on.slice(0,4)));r.srcs.add(`s365-${g.id}`);r.srcs.add(lsSrc.id);lines.set(k,r)
      }
      // the scoresheet both sites print
      if(goals365.length===(weHome?sh:sa)){
       const inc=await get(`${LS}/incidents/soccer/${ev.Eid}?locale=en`),lsGoals=lsScorers(inc,side)
       if(scorersAgree(goals365,lsGoals)){scorers=goals365;withScorers++}
      }
     }
    }else why_='LiveScore has no full eleven for this match'
   }
   const s365={id:`s365-${g.id}`,title:`365Scores: ${home.name} ${sh}-${sa} ${away.name}, ${on}`,url:`${B365}/game/?gameId=${g.id}`,publisher:'365Scores',access:'available',checkedAt:today}
   const ok=agree&&!!lsSrc
   const mid=`a-m-${on}-${slug(home.name)}-${slug(away.name)}`,old=byId.get(mid)
   // an approved night is never downgraded by a later refusal; a better read (now agreed, or now with scorers) replaces it
   if(old&&old.status==='approved'&&(!ok||((old.value?.scorers||[]).length>=scorers.length))){ok?agreed++:single++;continue}
   sources.set(s365.id,s365);if(lsSrc&&agree)sources.set(lsSrc.id,lsSrc)
   ok?agreed++:single++
   if(!ok)why.set(why_,(why.get(why_)||0)+1)
   byId.set(mid,{id:mid,value:{name:`${home.name} ${sh}-${sa} ${away.name}`,on,competition:comp,score:`${sh}-${sa}`,venue:null,lineup:starters,bench,scorers},
    sources:ok?[s365.id,lsSrc!.id]:[s365.id],researchedAt:today,parserCertainty:'high',conflictFree:true,
    notes:ok?`Two publishers (365Scores, LiveScore) agree on date, clubs, score and the starting eleven (≥10 of 11 surnames)${scorers.length?'; both print the same scorers':''}.`:`One publisher only — ${why_}.`,
    confidence:ok?3:2,status:ok?'approved':'review',approvedAt:ok?today:null,approvedBy:ok?`automated:cross-source-review-league-lineups-${club}`:null})
  }
  url=page.paging?.previousPage?`https://webws.365scores.com${page.paging.previousPage}`:null
 }
 // positions: one line on every agreed sheet (a man both sites put in two lines over the season is listed, not resolved)
 const players=new Map(prevPlayers)
 let filled=0,added=0,split=0
 for(const [k,r] of lines){
  if(r.votes.size!==1){split++;continue}
  const pos=[...r.votes.keys()][0]!,mine=known.get(k)
  if(mine===null)continue // a name two men of the club share fills neither (rule 7)
  const srcs=[...r.srcs].slice(-2),ys=[...r.years].sort()
  const base={sources:srcs,confidence:3,status:'approved',researchedAt:today,approvedAt:today,approvedBy:`automated:cross-source-review-league-lineups-${club}`,parserCertainty:'high',conflictFree:true,notes:`Both publishers (365Scores, LiveScore) list him in the same line on the agreed team sheets: ${pos}.`}
  if(mine&&!prevPlayers.has(mine)){players.set(mine,{id:mine,value:{name:r.name,positions:[pos],sensitive:false},...base});filled++;continue}
  const pid=mine??`p-ll-${slug(r.name)}`,was=players.get(pid)
  const from=Math.min(ys[0]!,Number(was?.value?.fromYear??9999)),to=Math.max(ys[ys.length-1]!,Number(was?.value?.toYear??0))
  if(!was)added++
  players.set(pid,{id:pid,value:{name:r.name,sport:'football',positions:[pos],fromYear:from,toYear:to,aliases:[],sensitive:false},...base})
 }
 const matches=[...byId.values()].sort((x,y)=>String(y.value.on).localeCompare(String(x.value.on)))
 const used=new Set([...matches.flatMap(m=>m.sources as string[]),...[...players.values()].flatMap(p=>p.sources as string[])])
 writeFileSync(file,JSON.stringify({sources:[...sources.values()].filter(s=>used.has(s.id)),matches,players:[...players.values()],kits:[],rivals:[]},null,1)+'\n')
 console.log(`[${club}] ${seen} matches read, ${fetched} with detail, ${agreed} agreed by two publishers, ${single} single-source · ${withScorers} with an agreed scoresheet · positions ${posAgree} agreed / ${posDiffer} differ → ${filled} filled, ${added} added, ${split} in two lines · file holds ${matches.length} matches · ${pages} result pages`)
 if(why.size)console.log(`[${club}] single-source reasons: ${[...why].map(([k,n])=>`${n}× ${k}`).join(' | ')}`)
}
if(process.argv[1]?.endsWith('league-lineups.ts'))main().catch(e=>{console.error(e);process.exit(1)})
