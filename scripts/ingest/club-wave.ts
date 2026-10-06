/**
 * club:wave — pull a club's matches (date, score, scorers with minutes, full elevens, bench) from public
 * providers and write `club-packs/<id>/wave-auto.json`, which the club resolver merges and the compiler
 * re-validates. Run by .github/workflows/club-ingest.yml (no terminal needed) or locally:
 *   npm run club:wave -- --club olympiacos [--dry-run] [--max 60]
 * Config per club: club-packs/<id>/ingest.json  { names:[…exact club names…], country:"GRE", uefaTeamId:"…"|null }
 * Never invents: a provider refusal is reported and skipped, a match without a readable side is skipped,
 * a lineup that is not exactly eleven stays empty, and nothing is approved without a second publisher.
 */
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {sameClub} from '../../lib/fixtures/names'
import {RefusedError,type Fetcher} from './clubs/types'
import {COMPETITIONS,teamsIn,uefaMatchesForTeam,withLineup,UEFA} from './clubs/uefa'
import {corroborate} from './clubs/corroborate'
import {buildWave} from './clubs/wave'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]&&!process.argv[i+1]!.startsWith('--')?process.argv[i+1]!:'true'}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
const fetchJson:Fetcher=async url=>{
 await sleep(350)
 const res=await fetch(url,{headers:{accept:'application/json','user-agent':'FanLife-ingest/1.0 (+https://github.com/maordubel/fanlife)'}})
 if(res.status===403||res.status===404||res.status===400)throw new RefusedError(res.status,url)
 if(!res.ok)throw new Error(`${res.status} ${url}`)
 return res.json()
}
async function discover(names:string[],country:string|null):Promise<string|null>{
 const year=new Date().getFullYear()
 for(let y=year+1;y>=year-3;y--)for(const c of Object.values(COMPETITIONS))for(let off=0;off<400;off+=50){
  let rows:unknown;try{rows=await fetchJson(`${UEFA}/matches?competitionId=${c}&seasonYear=${y}&limit=50&offset=${off}`)}catch{break}
  if(!Array.isArray(rows)||!rows.length)break
  const hit=teamsIn(rows).filter(t=>names.some(n=>sameClub(n,t.name))&&(!country||t.country===country))
  if(hit.length===1)return hit[0]!.id
 }
 return null
}
async function main(){
 const club=arg('club');if(!club)throw new Error('--club <id> required')
 const cfgPath=`club-packs/${club}/ingest.json`;if(!existsSync(cfgPath))throw new Error(`missing ${cfgPath}`)
 const cfg=JSON.parse(readFileSync(cfgPath,'utf8')) as {names:string[];country?:string;uefaTeamId?:string|null}
 const max=Number(arg('max')||80),today=new Date().toISOString().slice(0,10)
 const teamId=cfg.uefaTeamId||await discover(cfg.names,cfg.country||null)
 if(!teamId){console.log(`[${club}] no UEFA team id found (club may not play in UEFA competitions) — nothing pulled.`);return}
 console.log(`[${club}] UEFA team id ${teamId}`)
 const matches=(await uefaMatchesForTeam(fetchJson,teamId)).slice(0,max),rows=[]
 for(const m of matches){const full=await withLineup(fetchJson,m);rows.push({m:full,second:await corroborate(fetchJson,full,process.env.THESPORTSDB_KEY||'123')})}
 const wave=buildWave(rows,cfg.names,club,today),path=`club-packs/${club}/wave-auto.json`
 console.log(`[${club}] ${wave.matches.length} matches (${wave.matches.filter(f=>f.status==='approved').length} approved, ${wave.matches.filter(f=>f.value.lineup.length===11).length} with a full eleven)`)
 if(arg('dry-run')){console.log('dry run, nothing written');return}
 writeFileSync(path,JSON.stringify(wave,null,1)+'\n')
}
main().catch(e=>{console.error(e instanceof RefusedError?`refused: ${e.message}`:e);process.exit(1)})
