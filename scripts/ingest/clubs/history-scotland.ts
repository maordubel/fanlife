/**
 * club:history-sco — a Scottish club's EVERY match, season by season, from two independent publishers, kept only where they agree.
 *   FitbaStats (fitbastats.com/<slug>/team_results_season.php?from=<season id>)   — date, venue, competition, opponent, score
 *   London Hearts (londonhearts.com/scores/a<decade>/<slug><end year>.htm)          — date, competition, home, score, away, ground, crowd
 * A night is the same night when both print the same date and the same score from the club's side (a club plays once a day).
 * Agreement → two publishers → `approved`, confidence 3 (the compiler's automated-approval rule). A night only one prints is not kept.
 * The file accumulates: a run adds seasons, never drops an approved night.
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/ingest/clubs/history-scotland.ts --club celtic [--from 1888 --to 2025]
 * ingest.json carries {"history":{"fitbastats":"celtic","londonhearts":"celtic"}}. Reads are paced (rule 11).
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]??null}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}
async function text(url:string):Promise<string|null>{
 for(let i=0;i<3;i++){try{await sleep(900);const r=await fetch(url,{headers:UA});if(r.status===404||r.status===403)return null;if(r.ok)return await r.text()}catch{}await sleep(2000*(i+1))}
 return null
}
const strip=(s:string)=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#039;|&#39;/g,"'").replace(/\s+/g,' ').trim()
const cells=(row:string)=>[...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(m=>strip(m[1]!))
const slug=(s:string)=>s.normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const MON:Record<string,string>={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}
export type Night={on:string;home:string;away:string;hg:number;ag:number;competition:string;venue:string|null;crowd:number|null;ref:string}

/** FitbaStats season page → nights from the club's side (H/A/N, opponent, "for-against") */
export function parseFitba(html:string,club:string,base:string):Night[]{
 const out:Night[]=[]
 for(const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)||[]){
  const id=/gameid=(\d+)/.exec(row)?.[1];if(!id)continue
  const c=cells(row);if(c.length<6)continue
  const d=/^(\d\d)\/(\d\d)\/(\d{4})$/.exec(c[0]!);const s=/^(\d+)-(\d+)$/.exec(c[5]!);if(!d||!s)continue
  const on=`${d[3]}-${d[2]}-${d[1]}`,f=Number(s[1]),a=Number(s[2]),home=c[1]!==('Away'),opp=c[3]!
  out.push({on,home:home?club:opp,away:home?opp:club,hg:home?f:a,ag:home?a:f,competition:c[2]!,venue:c[1]==='Neutral'?'neutral':null,crowd:null,ref:`${base}/game.php?gameid=${id}`})
 }
 return out
}
/** London Hearts season page → nights as printed (home, score, away), ground and crowd where given */
export function parseHearts(html:string,url:string):Night[]{
 const out:Night[]=[]
 for(const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g)||[]){
  const c=cells(row);if(c.length<6)continue
  const d=/^(?:\w{3} )?(\w{3}) (\d{1,2})\*? (\d{4})/.exec(c[0]!);if(!d||!MON[d[1]!.toLowerCase()])continue
  // columns: Date | Comp | Rd | Home | Score | Away | Notes | Venue | Crowd  (Rd may be empty)
  const si=c.findIndex((x,i)=>i>=3&&/^\d+-\d+$/.test(x));if(si<1)continue
  const [hg,ag]=c[si]!.split('-').map(Number) as [number,number]
  const on=`${d[3]}-${MON[d[1]!.toLowerCase()]}-${String(d[2]).padStart(2,'0')}`
  const crowd=Number((c[si+4]||'').replace(/[^\d]/g,''))||null
  out.push({on,home:c[si-1]!,away:c[si+1]!,hg,ag,competition:[c[1],c[2]].filter(Boolean).join(' '),venue:c[si+3]||null,crowd,ref:url})
 }
 return out
}
const ours=(n:Night,club:RegExp)=>club.test(n.home)?[n.hg,n.ag]:club.test(n.away)?[n.ag,n.hg]:null

async function main(){
 const club=arg('club');if(!club)throw new Error('--club required')
 const cfg=JSON.parse(readFileSync(`club-packs/${club}/ingest.json`,'utf8')),h=cfg.history
 if(!h?.fitbastats||!h?.londonhearts){console.log(`[${club}] no Scottish history sources in ingest.json — skipped`);return}
 const me=new RegExp(`^${(cfg.names as string[]).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')}$`,'i')
 const from=Number(arg('from')||1870),to=Number(arg('to')||new Date().getFullYear())
 const file=`club-packs/${club}/wave-history-scotland.json`
 const prev=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{sources:[],matches:[]}
 const sources=new Map<string,Record<string,unknown>>((prev.sources||[]).map((s:Record<string,unknown>)=>[s.id,s])),byId=new Map<string,Record<string,unknown>>((prev.matches||[]).map((m:Record<string,unknown>)=>[m.id,m]))
 const today=new Date().toISOString().slice(0,10),fb=`https://www.fitbastats.com/${h.fitbastats}`
 const list=await text(`${fb}/team_results_season.php`);if(!list)throw new Error('FitbaStats did not answer')
 const sel=/<select name="from">([\s\S]*?)<\/select>/.exec(list)?.[1]||''
 const seasons=[...sel.matchAll(/<option value="(\d+)">(\d{4})\/(\d{4})<\/option>/g)].map(m=>({id:m[1]!,y1:Number(m[2]),y2:Number(m[3])})).filter(s=>s.y1>=from&&s.y1<=to).sort((a,b)=>a.y1-b.y1)
 let agreed=0,onlyOne=0,read=0
 for(const s of seasons){
  const fUrl=`${fb}/team_results_season.php?from=${s.id}&to=${s.id}`
  const hUrl=`https://www.londonhearts.com/scores/a${Math.floor(s.y1/10)*10}/${h.londonhearts}${s.y2}.htm`
  const [fh,hh]=[await text(fUrl),await text(hUrl)]
  if(!fh||!hh){console.log(`[${club}] ${s.y1}/${s.y2}: ${!fh?'FitbaStats':'London Hearts'} gave no page`);continue}
  read++
  const fn=parseFitba(fh,cfg.names[0],fb).filter(n=>n.on>=`${s.y1}-06-01`&&n.on<=`${s.y2}-07-31`),hn=parseHearts(hh,hUrl)
  const byDay=new Map<string,Night[]>();for(const n of hn)(byDay.get(n.on)??byDay.set(n.on,[]).get(n.on)!).push(n)
  const fSrc={id:`fitba-${h.fitbastats}-${s.y1}`,title:`FitbaStats: ${cfg.names[0]} results ${s.y1}/${s.y2}`,url:fUrl,publisher:'FitbaStats',access:'available',checkedAt:today}
  const hSrc={id:`lhearts-${h.londonhearts}-${s.y2}`,title:`London Hearts: ${cfg.names[0]} results ${s.y1}/${s.y2}`,url:hUrl,publisher:'London Hearts Supporters Club',access:'available',checkedAt:today}
  let n=0
  for(const f of fn){
   const mine=ours(f,me)!,twin=(byDay.get(f.on)||[]).find(x=>{const o=ours(x,me);return o&&o[0]===mine[0]&&o[1]===mine[1]})
   if(!twin){onlyOne++;continue}
   const home=twin.home,away=twin.away,id=`h-${f.on}-${slug(me.test(home)?away:home)}`
   if(byId.get(id)?.status==='approved')continue
   byId.set(id,{id,value:{name:`${home} ${twin.hg}-${twin.ag} ${away}`,on:f.on,competition:f.competition,score:`${twin.hg}-${twin.ag}`,venue:twin.venue&&twin.venue!=='n/a'?twin.venue:null,attendance:twin.crowd,lineup:[],bench:[],scorers:[],sport:'football'},
    sources:[fSrc.id,hSrc.id],confidence:3,status:'approved',researchedAt:today,approvedAt:today,approvedBy:`automated:cross-source-review-history-${club}`,parserCertainty:'high',conflictFree:true,
    notes:'Two publishers (FitbaStats, London Hearts) print the same date and the same score from the club\'s side.',detail:{fitbastats:f.ref}})
   n++;agreed++
  }
  if(n){sources.set(fSrc.id,fSrc);sources.set(hSrc.id,hSrc)}
  console.log(`[${club}] ${s.y1}/${s.y2}: FitbaStats ${fn.length}, London Hearts ${hn.length}, agreed ${n}`)
 }
 const matches=[...byId.values()].sort((a,b)=>String((a.value as {on:string}).on).localeCompare(String((b.value as {on:string}).on)))
 writeFileSync(file,JSON.stringify({sources:[...sources.values()],matches,players:[],kits:[],rivals:[]},null,1)+'\n')
 console.log(`[${club}] ${read} seasons read · ${agreed} nights agreed by two publishers · ${onlyOne} printed by one only (not kept) · file holds ${matches.length}`)
}
if(process.argv[1]?.endsWith('history-scotland.ts'))main().catch(e=>{console.error(e);process.exit(1)})
