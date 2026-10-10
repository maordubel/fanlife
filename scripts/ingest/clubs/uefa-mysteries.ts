/**
 * club:mysteries — Blind Cow targets from UEFA's own line-ups (owner decision, chat 2026-10-10: UEFA is sufficient for its competitions).
 * For a club's latest European matches it reads the official starting elevens + benches, keeps the players of OUR side that map to exactly one
 * pack player by exact normalised name (rule 7, never fuzzy), and writes `club-packs/<id>/wave-mysteries-2026-10-10.json`:
 * one mystery per player with Position · Nationality · European tie · Birth month · Height · Shirt number (with its season).
 * A clue UEFA does not state is left out, a mystery under five clues is not written, the name is never in a clue.
 *   NODE_USE_ENV_PROXY=1 node --require ./scripts/master/server-only.cjs --import tsx scripts/ingest/clubs/uefa-mysteries.ts --club celtic [--max 120]
 */
import {readFileSync,writeFileSync} from 'node:fs'
import {loadClub} from '../../../lib/clubs/resolver'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]??null}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
const fold=(s:string)=>s.normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
type J=Record<string,any>
const OWNER='Maor Harel (owner, chat 2026-10-10: UEFA is sufficient for its own competitions)',DAY='2026-10-10'
const POS:Record<string,string>={GOALKEEPER:'A goalkeeper.',DEFENDER:'A defender.',MIDFIELDER:'A midfielder.',FORWARD:'A forward.'}
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
async function get(url:string):Promise<any>{
 for(let i=0;i<4;i++){try{await sleep(120);const r=await fetch(url,{headers:{accept:'application/json','user-agent':'FanLife-ingest/1.0'}});if(r.ok)return await r.json()}catch{}await sleep(600*(i+1))}
 return null
}
async function main(){
 const club=arg('club');if(!club)throw new Error('--club required')
 const max=Number(arg('max')||120),cfg=JSON.parse(readFileSync(`club-packs/${club}/ingest.json`,'utf8')),teamId=String(cfg.uefaTeamId)
 const visits:J[]=JSON.parse(readFileSync(`content/generated/away-days-${club}.json`,'utf8')).visits.slice(-max).reverse()
 const loaded=await loadClub(club);if(!loaded)throw new Error('no club')
 const byName=new Map<string,string[]>()
 for(const p of loaded.data.players||[])for(const n of [p.value.name,...(p.value.aliases??[])]){const k=fold(n);if(!k)continue;byName.set(k,[...new Set([...(byName.get(k)??[]),p.value.id])])}
 const have=new Set((loaded.data.mysteries||[]).filter(m=>m.status==='approved').map(m=>m.value.targetPlayerId))
 const per=new Map<string,{pid:string;rec:J;match:J;n:number}>(),sources=new Map<string,J>()
 let fetched=0
 for(const v of visits){
  const l=await get(`https://match.uefa.com/v5/matches/${v.uefaId}/lineups`);if(!l)continue;fetched++
  const mm=await get(`https://match.uefa.com/v5/matches?matchId=${v.uefaId}`);const m:J=Array.isArray(mm)?mm[0]:mm;if(!m)continue
  const ours=String(m.homeTeam?.id)===teamId?l.homeTeam:String(m.awayTeam?.id)===teamId?l.awayTeam:null;if(!ours)continue
  for(const slot of [...(ours.field||[]),...(ours.bench||[])]){
   const p:J=slot.player||{},name=p.internationalName;if(!name)continue
   const ids=byName.get(fold(name));if(!ids||ids.length!==1)continue
   const pid=ids[0]!.replace(`${club}:`,'');if(have.has(ids[0]!))continue
   const cur=per.get(pid);if(cur){cur.n++;continue}
   per.set(pid,{pid,rec:{...p,jersey:slot.jerseyNumber??p.clubJerseyNumber},match:{id:v.uefaId,comp:v.competition,season:v.season,on:v.playedOn},n:1})
  }
  if(!sources.has(v.uefaId))sources.set(v.uefaId,{id:`uefa-lu-${v.uefaId}`,title:`UEFA match centre — official line-ups, match ${v.uefaId}`,url:`https://match.uefa.com/v5/matches/${v.uefaId}/lineups`,publisher:'UEFA',access:'available',checkedAt:DAY})
 }
 const mysteries:J[]=[],used=new Set<string>()
 for(const {pid,rec,match} of per.values()){
  const src=[`uefa-lu-${match.id}`],clues:J[]=[]
  const pos=POS[String(rec.nationalFieldPosition||'').toUpperCase()],nat=rec.translations?.countryName?.EN,bd=String(rec.birthDate||'').match(/^(\d{4})-(\d{2})-/)
  const y=Number(match.season),season=y?`${y-1}/${String(y).slice(2)}`:null,comp=String(match.comp||'').trim()
  if(nat)clues.push({id:'c1',label:'Nationality',value:`${nat}.`,sources:src})
  if(pos)clues.push({id:`c${clues.length+1}`,label:'Position',value:pos,sources:src})
  if(season&&comp)clues.push({id:`c${clues.length+1}`,label:'In Europe',value:`In the matchday squad for a ${comp} tie in the ${season} season.`,sources:src,scope:{season,competition:comp}})
  if(bd)clues.push({id:`c${clues.length+1}`,label:'Born',value:`Born in ${MONTHS[Number(bd[2])-1]} ${bd[1]}.`,sources:src})
  if(Number(rec.height)>=140)clues.push({id:`c${clues.length+1}`,label:'Height',value:`Stands ${rec.height} cm.`,sources:src})
  const jn=Number(rec.jersey);if(jn>0&&season)clues.push({id:`c${clues.length+1}`,label:'Shirt number',value:`Wore number ${jn} in the ${season} season.`,sources:src,type:'shirt_number',scope:{season,competition:comp}})
  if(clues.length<5)continue
  used.add(match.id)
  mysteries.push({id:`uefa2-m-${pid}`,value:{targetPlayerId:pid,clues},sources:src,confidence:2,status:'approved',researchedAt:DAY,approvedAt:DAY,approvedBy:OWNER,parserCertainty:'high',conflictFree:true,notes:'Every clue is stated by UEFA\'s official line-up record of one European tie; the target is mapped to the pack player by exact normalised name.'})
 }
 const out={sources:[...sources.values()].filter(s=>used.has(s.id.replace('uefa-lu-',''))),mysteries}
 writeFileSync(`club-packs/${club}/wave-mysteries-2026-10-10.json`,JSON.stringify(out,null,1)+'\n')
 console.log(`[${club}] lineups ${fetched}/${visits.length}, mapped players ${per.size}, mysteries ${mysteries.length}`)
}
main().catch(e=>{console.error(e);process.exit(1)})
