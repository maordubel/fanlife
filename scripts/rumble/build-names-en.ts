import {isMan} from '@/lib/clubs/rumble-xi/names'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import {norm} from '@/lib/fixtures/names'
import {allPlayers} from '@/lib/archive/player-master'
import {greekToEnglish,hebrewToEnglish,isLatinName,isGreek,isHebrew,cleanLatin} from '@/lib/clubs/rumble-xi/translit'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
/**
 * Writes content/generated/player-names-en.json — one English display name for every man in every club's archive, with how it was found:
 *  owner-curated   the owner's reviewed workbook (status 'curated')            — content/manual/rumble-review-2026-10-10.json
 *  editor-override  a hand-written form for a name the workbook only guessed    — content/manual/player-names-en-overrides.json (keyed by the archive name)
 *  archive-latin   the archive already writes him in Latin letters (cleaned of scrape junk)
 *  alias-latin     an exact Latin alias in the archive record or the player master (rule 7: exact names only)
 *  transliterated  Greek / Hebrew letters converted by convention — flagged for review, never presented as fact (rule 11)
 * Ids and archive names never change: this is display only.
 */
const OUT='content/generated/player-names-en.json'
const rev=JSON.parse(readFileSync('content/manual/rumble-review-2026-10-10.json','utf8')) as {club:string;nameEn:string;original:string;enStatus:string}[]
const OV='content/manual/player-names-en-overrides.json'
const over:Record<string,Record<string,string>>=existsSync(OV)?JSON.parse(readFileSync(OV,'utf8')):{}
type E={name:string;how:'owner-curated'|'editor-override'|'archive-latin'|'alias-latin'|'transliterated'}
async function main(){
 const out:Record<string,Record<string,E>>={},todo:Record<string,string[]>={}
 const masterLatin=new Map<string,string[]>()
 for(const m of allPlayers()){if(m.kind!=='player')continue;for(const n of [m.displayName,...m.aliases.he])masterLatin.set(norm(n),[...new Set([...(masterLatin.get(norm(n))||[]),...m.aliases.latin.filter(isLatinName)])])}
 for(const id of CORE_CLUB_IDS){const d=await loadClub(id);if(!d)continue
  const dropped=new Set(mergesFor(id).map(m=>m.drop)),res:Record<string,E>={}
  const cur=new Map(rev.filter(r=>r.club===id&&(r.enStatus==='curated'||r.enStatus==='sourced EN')).map(r=>[norm(r.original),r.nameEn]))
  for(const {value:p} of d.data.players){if(!isMan(p.name)||dropped.has(p.id))continue
   const key=norm(p.name),ov=over[id]?.[p.name]
   if(ov){res[p.id]={name:ov,how:'editor-override'};continue}
   if(cur.has(key)){res[p.id]={name:cleanLatin(cur.get(key)!),how:'owner-curated'};continue}
   if(isLatinName(p.name)||(!isGreek(p.name)&&!isHebrew(p.name))){res[p.id]={name:cleanLatin(p.name),how:'archive-latin'};continue}
   const lat=[...new Set([...p.aliases.filter(isLatinName),...(masterLatin.get(key)||[])])]
   if(lat.length===1){res[p.id]={name:cleanLatin(lat[0]!),how:'alias-latin'};continue}
   const t=isGreek(p.name)?greekToEnglish(p.name):hebrewToEnglish(p.name)
   res[p.id]={name:t,how:'transliterated'}
   if(isHebrew(p.name))(todo[id]??=[]).push(p.name)}
  // two men with one English name stay two cards: the years tell them apart
  const seen=new Map<string,string[]>();for(const [pid,e] of Object.entries(res))seen.set(e.name.toLowerCase(),[...(seen.get(e.name.toLowerCase())||[]),pid])
  const years=new Map(d.data.players.map(f=>[f.value.id,f.value.fromYear]))
  for(const ids of seen.values())if(ids.length>1){const ys=ids.map(pid=>years.get(pid)),useYears=ys.every(y=>y)&&new Set(ys).size===ys.length;ids.sort().forEach((pid,i)=>{res[pid]!.name+=useYears?` (${years.get(pid)})`:` ${['I','II','III','IV'][i]??i+1}`})}
  out[id]=res}
 writeFileSync(OUT,JSON.stringify(out,null,0)+'\n')
 for(const [id,r] of Object.entries(out)){const c:Record<string,number>={};for(const e of Object.values(r))c[e.how]=(c[e.how]||0)+1;console.log(id,Object.keys(r).length,JSON.stringify(c))}
 writeFileSync('/tmp/claude-0/-home-user/b27fa958-23a9-5953-8334-9c5fdfd94dc8/scratchpad/heb-todo.json',JSON.stringify(todo))
}
main()
