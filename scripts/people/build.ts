import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {rawPool} from '@/lib/clubs/rumble'
import {extraPositions} from '@/lib/clubs/rumble-xi/positions'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import {rateClub,combinedScore} from '@/lib/legends/ratings'
import {candidates,stintKey,type Pos,type Stint} from '@/lib/people/model'
import {REGISTRY} from '@/lib/master/registry'

/**
 * `npm run people:build` — the People Registry's input (18.11.2026).
 *
 * Reads every repository club pack, writes one STINT per man per club (`content/generated/people-stints.json`) with the same
 * hidden rating, reputation and Legends stars the games use, and the cross-club name candidates the review queue starts from.
 * New stints are minted an id in `content/manual/people-ids.json` (append-only: an id is never changed or removed).
 * A man folded into another inside his own club (`rumble-merges.json`) is that other man's stint, not a stint of his own.
 */
const ROOT=process.cwd()
const IDS='content/manual/people-ids.json',OUT='content/generated/people-stints.json'
type IdFile={note:string;stints:Record<string,string>}
const mint=(key:string,taken:Set<string>)=>{for(let n=0;;n++){const id='pl_'+createHash('sha1').update(n?`${key}#${n}`:key).digest('hex').slice(0,10);if(!taken.has(id))return id}}

async function run(){
 const ids=JSON.parse(readFileSync(path.join(ROOT,IDS),'utf8')) as IdFile
 const taken=new Set(Object.values(ids.stints));let minted=0
 const select=process.argv.indexOf('--club'),only=select>=0?process.argv[select+1]:null
 if(select>=0&&!REGISTRY.some(c=>c.id===only))throw new Error('Unknown club')
 const previous=JSON.parse(readFileSync(path.join(ROOT,OUT),'utf8')) as {clubs:string[];stints:Stint[]}
 const clubs=only?[only]:process.argv.includes('--all')?REGISTRY.map(c=>c.id):[...new Set([...CORE_CLUB_IDS,...previous.clubs])]
 const stints=previous.stints.filter(s=>!clubs.includes(s.club))
 const processed:string[]=[]
 for(const club of clubs){
  const loaded=await loadClub(club)
  if(!loaded){stints.push(...previous.stints.filter(s=>s.club===club));continue}
  const data=loaded.data
  processed.push(club)
  const pool=rawPool(data,{extra:extraPositions(club)}),byPool=new Map(pool.map(p=>[p.id,p]))
  const rated=rateClub(club,pool.filter(p=>!p.free).map(p=>({id:p.id,position:p.position,rating:combinedScore(p.rating,p.reputation),goals:0})))
  const dropped=new Set(mergesFor(club).map(m=>m.drop))
  for(const f of data.players??[]){
   const p=f.value;if(dropped.has(p.id))continue
   const key=stintKey(club,p.id)
   if(!ids.stints[key]){const id=mint(key,taken);ids.stints[key]=id;taken.add(id);minted++}
   const r=byPool.get(p.id)
   stints.push({key,club,eid:p.id,id:ids.stints[key]!,name:p.name,aliases:[...p.aliases],pos:[...p.positions] as Pos[],from:p.fromYear,to:p.toYear,
    apps:p.career?.apps??null,goals:p.career?.goals??null,rating:r?.rating??null,reputation:r?.reputation??null,stars:rated.get(p.id)?.stars??null,archiveOnly:!!p.archiveOnly})
  }
 }
 stints.sort((a,b)=>a.key.localeCompare(b.key))
 const sorted=Object.fromEntries(Object.entries(ids.stints).sort(([a],[b])=>a.localeCompare(b)))
 writeFileSync(path.join(ROOT,IDS),JSON.stringify({note:ids.note,stints:sorted},null,1)+'\n')
 const cands=candidates(stints)
 writeFileSync(path.join(ROOT,OUT),JSON.stringify({schemaVersion:1,builtOn:new Date().toISOString().slice(0,10),clubs:[...new Set([...previous.clubs,...processed])],stints,candidates:cands})+'\n')
 console.log(`people:build — ${stints.length} stints, ${minted} new ids, ${cands.length} cross-club name pairs`)
}
run().catch(e=>{console.error(e);process.exit(1)})
