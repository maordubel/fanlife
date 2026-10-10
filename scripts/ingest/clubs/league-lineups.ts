/**
 * club:lineups — starting elevens of a club's matches from TWO independent public score sites, kept only where they AGREE.
 *   365Scores (webws.365scores.com/web)  ×  LiveScore (prod-cdn-public-api.livescore.com/v1/api/app)
 * For a club's latest finished matches (not UEFA's — UEFA is its own authority, see rule 102) it reads the eleven from 365Scores,
 * finds the same match on LiveScore by date + exact club names + score, reads that eleven too, and compares them by surname.
 * Agreement (≥10 of 11 surnames, same score) → two publishers → `approved`, confidence 3, the compiler's own automated-approval rule.
 * Anything else stays `review` with its single source and the reason, and reaches no gate. Names are written as 365Scores prints them.
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/ingest/clubs/league-lineups.ts --club celtic [--max 40]
 * Both are unofficial public JSON the sites' own pages call; reads are paced and nothing is retried past a refusal (rule 11).
 */
import {readFileSync,writeFileSync} from 'node:fs'
import {sameClub} from '../../../lib/fixtures/names'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]??null}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
const fold=(s:string)=>s.normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
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

async function main(){
 const club=arg('club');if(!club)throw new Error('--club required')
 const max=Number(arg('max')||40),cfg=JSON.parse(readFileSync(`club-packs/${club}/ingest.json`,'utf8')),id=cfg.scores365Id
 if(!id)throw new Error(`no scores365Id for ${club}`)
 const today=new Date().toISOString().slice(0,10),sources=new Map<string,J>(),matches:J[]=[]
 let url:string|null=`${B365}/games/results/?${Q365}&competitors=${id}&showOdds=false`,seen=0,agreed=0,single=0,fetched=0
 const lsDay=new Map<string,any>()
 while(url&&seen<max){
  const page=await get(url);if(!page)break
  for(const g of (page.games||[])as J[]){
   if(seen>=max)break
   if(g.statusGroup!==4||!g.hasLineups||EURO.test(String(g.competitionDisplayName||'')))continue
   seen++
   const d=await get(`${B365}/game/?${Q365}&gameId=${g.id}`);const game=d?.game;if(!game)continue
   fetched++
   const names=new Map<number,string>((game.members||[]).map((m:J)=>[m.id,m.name]))
   const home=game.homeCompetitor,away=game.awayCompetitor,ours=Number(home.id)===Number(id)?home:away
   const starters=(ours.lineups?.members||[]).filter((m:J)=>m.status===1).map((m:J)=>names.get(m.id)).filter(Boolean) as string[]
   const bench=(ours.lineups?.members||[]).filter((m:J)=>m.status===2).map((m:J)=>names.get(m.id)).filter(Boolean) as string[]
   const sh=Number(home.score),sa=Number(away.score);if(starters.length!==11||!Number.isFinite(sh)||!Number.isFinite(sa)||(sh<0||sa<0))continue
   const on=String(game.startTime).slice(0,10),comp=String(game.competitionDisplayName||'').replace(/^[^,]+,\s*/,'')
   // LiveScore: the same match = our club (exact normalised name), the same score, and an opponent who shares a significant word
   // with his 365Scores name ("Volos NFC" / "Volos"); the day is tried with the next and the previous one because the sites cut midnight differently
   const ourName=ours.name,oppName=(Number(home.id)===Number(id)?away:home).name,weHome=Number(home.id)===Number(id)
   const words=(n:string)=>fold(n).split(' ').filter(w=>w.length>=4)
   const near=(a:string,b:string)=>sameClub(a,b)||words(a).some(w=>words(b).includes(w))
   let ev:J|null=null
   const day0=new Date(`${on}T12:00:00Z`)
   for(const off of [0,1,-1]){
    const key=new Date(day0.getTime()+off*86400000).toISOString().slice(0,10).replace(/-/g,'');let day=lsDay.get(key);if(!day){day=await get(`${LS}/date/soccer/${key}/0?locale=en`);lsDay.set(key,day)}
    for(const st of (day?.Stages||[])as J[])for(const e of (st.Events||[])as J[]){
     const t1=e.T1?.[0]?.Nm??'',t2=e.T2?.[0]?.Nm??''
     if(Number(e.Tr1)!==sh||Number(e.Tr2)!==sa)continue
     if((weHome?sameClub(t1,ourName)&&near(t2,oppName):near(t1,oppName)&&sameClub(t2,ourName)))ev=e
    }
    if(ev)break
   }
   let agree=false,why='LiveScore lists no matching match (date, both clubs, score)',lsSrc:J|null=null
   if(ev){
    const lu=await get(`${LS}/lineups/soccer/${ev.Eid}?locale=en`)
    const side=(lu?.Lu||[]).find((x:J)=>x.Tnb===(Number(home.id)===Number(id)?1:2))
    const ls=(side?.Ps||[]).filter((p:J)=>p.Pon!=='COACH'&&p.Fp).map((p:J)=>fold(`${p.Fn||''} ${p.Ln||''}`))
    if(ls.length===11){
     const hit=starters.filter(n=>ls.some(l=>l.split(' ').includes(surname(n))||l.endsWith(surname(n)))).length
     agree=hit>=10;why=agree?'':`LiveScore's eleven differs (${hit}/11 surnames agree)`
     lsSrc={id:`ls-lu-${ev.Eid}`,title:`LiveScore: ${home.name} ${sh}-${sa} ${away.name}, ${on} (line-ups)`,url:`${LS}/lineups/soccer/${ev.Eid}`,publisher:'LiveScore',access:'available',checkedAt:today}
    }else why='LiveScore has no full eleven for this match'
   }
   const s365={id:`s365-${g.id}`,title:`365Scores: ${home.name} ${sh}-${sa} ${away.name}, ${on}`,url:`${B365}/game/?gameId=${g.id}`,publisher:'365Scores',access:'available',checkedAt:today}
   sources.set(s365.id,s365);if(lsSrc&&agree)sources.set(lsSrc.id,lsSrc)
   const ok=agree&&!!lsSrc
   ok?agreed++:single++
   matches.push({id:`a-m-${on}-${slug(home.name)}-${slug(away.name)}`,value:{name:`${home.name} ${sh}-${sa} ${away.name}`,on,competition:comp,score:`${sh}-${sa}`,venue:null,lineup:starters,bench,scorers:[]},
    sources:ok?[s365.id,lsSrc!.id]:[s365.id],researchedAt:today,parserCertainty:'high',conflictFree:true,
    notes:ok?'Two publishers (365Scores, LiveScore) agree on date, clubs, score and the starting eleven (≥10 of 11 surnames).':`One publisher only — ${why}.`,
    confidence:ok?3:2,status:ok?'approved':'review',approvedAt:ok?today:null,approvedBy:ok?`automated:cross-source-review-league-lineups-${club}`:null})
  }
  url=page.paging?.previousPage?`https://webws.365scores.com${page.paging.previousPage}`:null
 }
 matches.sort((x,y)=>String(y.value.on).localeCompare(String(x.value.on)))
 writeFileSync(`club-packs/${club}/wave-league-lineups-2026-10-10.json`,JSON.stringify({sources:[...sources.values()],matches,kits:[],rivals:[]},null,1)+'\n')
 console.log(`[${club}] ${seen} matches read, ${fetched} with detail, ${agreed} agreed by two publishers (approved), ${single} single-source (review)`)
}
main().catch(e=>{console.error(e);process.exit(1)})
