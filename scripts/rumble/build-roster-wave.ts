import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {norm} from '@/lib/fixtures/names'
import {englishName} from '@/lib/clubs/rumble-xi/names'
import {isLatinName,isGreek,isHebrew,greekToEnglish,hebrewToEnglish} from '@/lib/clubs/rumble-xi/translit'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
/**
 * Roster wave builder (ROSTER_WAVE_OFF=1 so the archive is read WITHOUT its own previous wave).
 * Candidates: (1) rows of the owner's consolidated file that no archive record matches by exact name; (2) the titles of the club's Wikipedia player category
 * (research-data/rosters/<club>.json, `scripts/rumble/research-wikipedia-rosters.mjs`). A candidate is skipped when the archive already holds the man:
 * exact name/alias, or the same family name with the same first letter and consonant skeleton (a likely twin — reported, not added; rule 11: no man twice).
 * Everything added is confidence 1, years/positions only where the owner's file states them.
 */
const rev=JSON.parse(readFileSync('content/manual/rumble-review-2026-10-10.json','utf8')) as {club:string;nameEn:string;original:string;position:string;start:number|null;end:number|null;enStatus:string}[]
const NOW='2026-10-10',BY='Maor Harel (owner, chat)'
const skel=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ph/g,'f').replace(/th/g,'t').replace(/kh|ch/g,'h').replace(/[ckq]/g,'k').replace(/[wb]/g,'v').replace(/tz|ts/g,'s').replace(/[^a-z]/g,'').replace(/[aeiouyj]/g,'').replace(/(.)\1+/g,'$1')
const latinOf=(club:string,name:string)=>isLatinName(name)?name:isGreek(name)?greekToEnglish(name):isHebrew(name)?hebrewToEnglish(name):name
const twinKey=(latin:string)=>{const w=latin.replace(/\(.*?\)/g,'').trim().split(/\s+/);return w.length<2?null:`${skel(w.at(-1)!)}|${skel(w[0]!)[0]??''}`}
const cleanTitle=(t:string)=>t.replace(/\s*\((?:[^)]*(?:footballer|soccer|born|player|association football|sportsman)[^)]*)\)\s*$/i,'').trim()
async function main(){
 for(const id of CORE_CLUB_IDS){const d=await loadClub(id);if(!d)continue
  const have=new Set<string>(),twins=new Set<string>(),ids=new Set(d.data.players!.map(p=>p.id))
  for(const p of d.data.players!){for(const n of [p.value.name,...p.value.aliases])have.add(norm(n))
   const k=twinKey(englishName(id,p.id,latinOf(id,p.value.name)));if(k)twins.add(k)
   for(const a of p.value.aliases.filter(isLatinName)){const k2=twinKey(a);if(k2)twins.add(k2)}}
  const sources:any[]=[],players:any[]=[],skipped={exact:0,twin:0};const added=new Set<string>()
  const mk=(name:string,aliases:string[],positions:string[],from:number|null,to:number|null,srcId:string,notes:string)=>{
   const pid=`${id==='hapoel-tel-aviv'?'p_wv':id+':wv'}-${createHash('sha256').update(id+'|'+name).digest('hex').slice(0,10)}`
   if(ids.has(pid)||added.has(norm(name)))return;added.add(norm(name))
   players.push({id:pid,value:{id:pid,name,positions,fromYear:from,toYear:to,aliases},sources:[srcId],confidence:1,status:'approved',researchedAt:NOW,approvedAt:NOW,approvedBy:BY,notes})}
  // 1. the owner's file
  const csv=rev.filter(r=>r.club===id);let nCsv=0
  if(csv.length){sources.push({id:'src-owner-roster-2026-10-10',title:'Owner consolidated roster and pricing review (2026-10-10)',url:'https://github.com/maordubel/fanlife/blob/main/content/manual/rumble-review-2026-10-10.json',publisher:'FAN LIFE owner review',access:'available',checkedAt:NOW})}
  for(const r of csv){const name=r.original.trim();if(!name||have.has(norm(name))||have.has(norm(r.nameEn)))continue
   const pos=['GK','DF','MF','FW'].includes(r.position)?[r.position]:[]
   const before=players.length
   mk(name,isLatinName(name)?[]:[r.nameEn].filter(x=>isLatinName(x)&&!/review/.test(x)),pos,r.start,r.end,'src-owner-roster-2026-10-10','In the owner\'s consolidated roster file (2026-10-10); not in the earlier archive. One source, unreviewed: years and position only as that file states them.')
   if(players.length>before)nCsv++}
  // 2. the club's Wikipedia player category
  const f=`research-data/rosters/${id}.json`;let nWp=0
  if(existsSync(f)){const j=JSON.parse(readFileSync(f,'utf8')) as {category:string;source:string;fetchedAt:string;titles:string[]}
   sources.push({id:'src-wp-roster-'+id,title:`Wikipedia — ${j.category}`,url:j.source,publisher:'Wikipedia',access:'available',checkedAt:j.fetchedAt})
   for(const t of j.titles){if(/^(List|Category|Template)\b/.test(t))continue
    const name=cleanTitle(t);if(have.has(norm(name))||have.has(norm(t))||added.has(norm(name))){skipped.exact++;continue}
    const k=twinKey(name);if(k&&twins.has(k)){skipped.twin++;continue}
    const before=players.length
    mk(name,t!==name?[t]:[],[],null,null,'src-wp-roster-'+id,`Listed in the club's Wikipedia player category (${j.fetchedAt}). One source, unreviewed: no years or position taken from it.`)
    if(players.length>before)nWp++}}
  // 3. what the man's own Wikipedia infobox says about HIS time at this club (scripts/rumble/enrich-wave-from-wikipedia.mjs): years, caps, goals, position family
  const ib=`research-data/wp-infobox/${id}.json`;let nFacts=0
  if(existsSync(ib)){const facts=JSON.parse(readFileSync(ib,'utf8')) as Record<string,{from?:number|null;to?:number|null;caps?:number;goals?:number;pos?:string|null;title?:string;rev?:number}>
   for(const p of players){const f=facts[p.id];if(!f||f.from===undefined)continue
    if(f.from!==null&&f.from>1850){p.value.fromYear=f.from;p.value.toYear=f.to??null}
    if(f.pos)p.value.positions=[f.pos]
    if(f.caps||f.goals)p.value.career={apps:f.caps||null,goals:f.goals||null,basis:'Wikipedia infobox: league caps and goals at this club'}
    p.notes+=` Years${f.pos?', position':''}${f.caps||f.goals?' and league caps/goals':''} from the man's own Wikipedia infobox (revision ${f.rev}), for this club only.`;nFacts++}}
  writeFileSync(`club-packs/${id}/wave-roster-2026-10-10.json`,JSON.stringify({sources,players},null,0)+'\n')
  console.log(id,'archive',ids.size,'+owner file',nCsv,'+wikipedia',nWp,'with infobox facts',nFacts,'skipped',JSON.stringify(skipped))}
}
main()
