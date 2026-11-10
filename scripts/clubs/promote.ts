/**
 * clubs:promote — a club the owner OPENED on the research desk becomes a full repository club, with nothing left out.
 * Run by .github/workflows/club-open.yml (no terminal for the owner); locally:
 *   npm run clubs:promote -- --club paok --decisions decisions.json [--logos <football-logos checkout>] [--dry-run]
 *
 * What "open" means (owner, 10.11.2026: "the whole club — graphics, the home pages, the inner pages, and the shared
 * features with the other clubs; don't miss anything"). Every place a club is wired by hand for Raja/Wydad/Al Ahly
 * (28.10.2026) is written here, from the club's own staged material and the owner's decisions:
 *   1. club-packs/<id>/core.json      the staged pack frozen with the owner's approvals (lib/research/staged)
 *   2. club-packs/<id>/ingest.json + wave-auto.json   moved from research-staging, so the daily pull keeps it growing
 *   3. lib/clubs/resolver-ids.ts · providers.ts · euro-wave.ts   a repository club: hub, /me, sources, players desk,
 *      Royal Rumble, LIFE entry, ALL FOOTBALL, LEGENDS, the social plan — every CORE_CLUB_IDS reader
 *   4. club-packs/<id>/life/cast.json + timeline.json + lib/clubs/life/packs.ts   LIFE, proposed for the owner
 *   5. public/crests/<id>.png + lib/clubs/crest.ts + content/manual/club-crests.json   the crest, from the same open
 *      catalogue as the other clubs (owner approved crests everywhere a club mark appears, 10.10.2026)
 *   6. lib/clubs/spellings.ts · lib/fixtures/teams.ts · lib/marketing/tags.ts   how archives write the club; its next
 *      match; its tag in the social plan
 * The workflow then re-runs the generated lists (Rumble prices freeze, English names, launch defaults), the type
 * check and the club tests, and merges only when all pass. Never invents: a crest that is not in the catalogue is
 * left out (the initials badge stays), a name table missing a country leaves the roles' own words.
 */
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
process.env.FANLIFE_PRECOMPILED='off'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]&&!process.argv[i+1]!.startsWith('--')?process.argv[i+1]!:'true'}
type Raw=Record<string,unknown>

/** Fictional first names by country for LIFE's street (roles: friend, kiosk, elder; dad and mum keep their word). Proposed, never real people. */
const NAMES:Record<string,{dad:string;mum:string;friend:string;kiosk:string;elder:string}>={
 Greece:{dad:'Giorgos',mum:'Eleni',friend:'Nikos',kiosk:'Stavros',elder:'Kyr Thanasis'},Croatia:{dad:'Zoran',mum:'Snježana',friend:'Ivan',kiosk:'Mate',elder:'Đuro'},
 Serbia:{dad:'Goran',mum:'Jelena',friend:'Marko',kiosk:'Dragan',elder:'Čika Mile'},'Bosnia and Herzegovina':{dad:'Mario',mum:'Ivana',friend:'Ante',kiosk:'Mirko',elder:'Stari Jure'},
 Germany:{dad:'Thomas',mum:'Sabine',friend:'Jonas',kiosk:'Uwe',elder:'Opa Heinz'},England:{dad:'Gary',mum:'Karen',friend:'Danny',kiosk:'Raj',elder:'Old Les'},
 Scotland:{dad:'Tam',mum:'Senga',friend:'Callum',kiosk:'Sandy',elder:'Auld Jimmy'},Italy:{dad:'Marco',mum:'Giulia',friend:'Luca',kiosk:'Gino',elder:'Nonno Pietro'},
 Turkey:{dad:'Mehmet',mum:'Ayşe',friend:'Emre',kiosk:'Hasan',elder:'Hüseyin Amca'},Israel:{dad:'Avi',mum:'Orna',friend:'Yossi',kiosk:'Shlomo',elder:'Saba Moshe'},
 Morocco:{dad:'Hassan',mum:'Fatima',friend:'Youssef',kiosk:'Driss',elder:'Haj Ali'},Egypt:{dad:'Mahmoud',mum:'Mona',friend:'Karim',kiosk:'Sayed',elder:'Amm Hassan'},
}
/** a country the table does not know still gets the five roles (LIFE parity, tests/life-club-parity-data.test.ts) — plain names, proposed like the rest */
const ANY={dad:'Paul',mum:'Anna',friend:'Leo',kiosk:'Max',elder:'Old Karl'}
const LOGO_COUNTRY:Record<string,string>={Turkey:'Türkiye'}
const norm=(s:string)=>s.normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const FORM=new Set(['fc','fk','sk','bc','hnk','gnk','nk','hsk','sc','ac','cf','afc','pfc','bv','1'])
const words=(s:string)=>norm(s).split(' ').filter(w=>w&&!FORM.has(w))
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex')
const varName=(id:string)=>id.replace(/-([a-z0-9])/g,(_,c:string)=>c.toUpperCase()).replace(/^[0-9]/,'c$&')

/** Insert text once: a file that already holds `probe` is left alone (the script is safe to run twice). */
function edit(file:string,probe:string,fn:(s:string)=>string,changed:string[]){
 const s=readFileSync(file,'utf8');if(s.includes(probe))return
 const n=fn(s);if(n===s)throw new Error(`${file}: the insertion point was not found — the file changed shape; update scripts/clubs/promote.ts`)
 writeFileSync(file,n);changed.push(file)
}
const insertAfter=(s:string,marker:string,line:string)=>{const i=s.indexOf(marker);return i<0?s:s.slice(0,i+marker.length)+'\n'+line+s.slice(i+marker.length)}
const insertBeforeClose=(s:string,open:string,line:string)=>{const i=s.indexOf(open);if(i<0)return s;const j=s.indexOf('\n}',i);return j<0?s:s.slice(0,j)+'\n'+line+s.slice(j)}

/** The crest: the most recent mark in the catalogue whose file name carries every word of one of the club's names, in its country's folder. */
export function findCrest(files:string[],names:string[],country:string):string|null{
 const folder=(LOGO_COUNTRY[country]||country)+' - '
 const pool=files.filter(f=>f.endsWith('.png')&&f.split('/').some(seg=>seg.startsWith(folder)))
 const score=(f:string)=>{const w=new Set(words(path.basename(f,'.png')));let best=0;for(const n of names){const nw=words(n);if(nw.length&&nw.every(x=>w.has(x)))best=Math.max(best,nw.length)}return best}
 const ranked=(pref:string)=>pool.filter(f=>f.startsWith(pref)).map(f=>({f,s:score(f)})).filter(x=>x.s>0)
 // current marks first; then the newest season folder that holds the club (a relegated club keeps its last mark)
 const now=ranked('logos/');if(now.length){const top=Math.max(...now.map(x=>x.s)),hits=now.filter(x=>x.s===top);return hits.length===1?hits[0]!.f:null}
 const hist=ranked('history/').sort((a,b)=>b.f.localeCompare(a.f));return hist[0]?.f??null
}

async function main(){
 const id=arg('club');if(!id)throw new Error('--club <id> required')
 const {REGISTRY}=await import('@/lib/master/registry')
 const {STATIC_CLUB_IDS}=await import('@/lib/clubs/resolver-ids')
 const reg=REGISTRY.find(c=>c.id===id);if(!reg)throw new Error(`${id} is not in the registry`)
 if(STATIC_CLUB_IDS.includes(id)){console.log(`[${id}] already a repository club — nothing to do.`);return}
 const {readStagedInput}=await import('@/lib/research/staged/pack')
 const {composeStaged,emptyDecisions}=await import('@/lib/research/staged/model')
 const {mergeHistorical}=await import('@/lib/clubs/history-wave')
 const input=readStagedInput(id);if(!input)throw new Error(`${id}: nothing staged in research-staging/${id}`)
 const decisionsFile=arg('decisions'),decisions=decisionsFile&&existsSync(decisionsFile)?JSON.parse(readFileSync(decisionsFile,'utf8')):emptyDecisions(id)
 const dry=arg('dry-run')==='true',changed:string[]=[],report:string[]=[]
 const {pack,conflicts,approved}=composeStaged(input,decisions,(p,w)=>mergeHistorical(p,w))
 report.push(`approved batches: ${approved.join(', ')||'none'} · rival: ${decisions.rival?.name||'none'} · history conflicts held out: ${conflicts.length}`)
 const dir=`club-packs/${id}`,stage=`research-staging/${id}`
 if(dry){console.log(JSON.stringify({id,matches:(pack.matches as unknown[]).length,players:(pack.players as unknown[]).length,report},null,1));return}
 mkdirSync(`${dir}/life`,{recursive:true})
 // 1 · the pack
 writeFileSync(`${dir}/core.json`,JSON.stringify({...pack,schemaVersion:1,clubId:id,contentLocale:'en',note:`Promoted from the research desk on ${new Date().toISOString().slice(0,10)}: the club's staged material frozen with the owner's approvals (scripts/clubs/promote.ts).`},null,1)+'\n');changed.push(`${dir}/core.json`)
 // 2 · the pull's config and wave move with the club, so the daily pull writes into the pack from now on
 for(const f of ['ingest.json','wave-auto.json'])if(existsSync(`${stage}/${f}`)&&!existsSync(`${dir}/${f}`)){renameSync(`${stage}/${f}`,`${dir}/${f}`);changed.push(`${dir}/${f}`)}
 if(!existsSync(`${dir}/wave-auto.json`)){writeFileSync(`${dir}/wave-auto.json`,JSON.stringify({sources:[],matches:[],kits:[],rivals:[]},null,1)+'\n');changed.push(`${dir}/wave-auto.json`)}
 // 4 · LIFE: born 1978 unless the archive cannot carry a childhood from then (rule 139); fictional names, proposed
 const years=[...(pack.matches as Raw[]),...(pack.archive as Raw[])].map(f=>Number(String((f.value as Raw)?.on||'').slice(0,4))).filter(y=>y>1850).sort((a,b)=>a-b)
 // the parity guard holds a birth year between 1940 and 2008: a club whose record starts after 2016 gets the latest a childhood can stand on
 const first=years[0]??null,birth=first===null||first<=1986?1978:Math.min(2007,first-8)
 const n=NAMES[reg.country]??ANY
 writeFileSync(`${dir}/life/cast.json`,JSON.stringify({schemaVersion:1,clubId:id,status:'proposed',note:'Proposed fictional first names; awaiting owner approval. Nobody here is a real person.',names:n},null,1)+'\n')
 writeFileSync(`${dir}/life/timeline.json`,JSON.stringify({schemaVersion:1,clubId:id,birthYear:birth,status:'proposed',note:birth===1978?'1978, the life every club is handed (rule 139). Proposed; awaiting owner approval.':`${birth}: the club's recorded archive begins in ${first}, so a supporter born in ${birth} has a childhood that stands on recorded nights. A stopgap until older history is researched (rule 139). Proposed; awaiting owner approval.`},null,1)+'\n')
 changed.push(`${dir}/life/cast.json`,`${dir}/life/timeline.json`)
 const v=varName(id)
 // 3 · a repository club
 edit('lib/clubs/resolver-ids.ts',`'${id}'`,s=>s.replace(/(STATIC_CLUB_IDS:readonly string\[\]=\[[^\]]*)\]/,`$1,'${id}']`),changed)
 edit('lib/clubs/providers.ts',`'${id}':async()`,s=>insertAfter(s,'// ↓ promoted from the research desk (scripts/clubs/promote.ts) — one line per club',` '${id}':async()=>compilePackEuro((await import('@/club-packs/${id}/core.json')).default as never,REGISTRY.find(c=>c.id==='${id}')!),`),changed)
 edit('lib/clubs/euro-wave.ts',`${v}PromotedAuto`,s=>insertAfter(insertAfter(s,'// ↓ promoted wave-auto imports (scripts/clubs/promote.ts)',`import ${v}PromotedAuto from '@/club-packs/${id}/wave-auto.json'`),'const AUTO:Record<string,unknown>={',`'${id}':${v}PromotedAuto,`),changed)
 edit('lib/clubs/life/packs.ts',`${v}PromotedCast`,s=>{
  let t=insertAfter(s,'// ↓ promoted LIFE imports (scripts/clubs/promote.ts)',`import ${v}PromotedCast from '@/club-packs/${id}/life/cast.json'\nimport ${v}PromotedTimeline from '@/club-packs/${id}/life/timeline.json'`)
  t=insertBeforeClose(t,'export const LIFE_CAST: Record<string, CastManifest> = {',`  '${id}': ${v}PromotedCast as CastManifest,`)
  return insertBeforeClose(t,'export const LIFE_TIMELINE: Record<string, TimelineManifest> = {',`  '${id}': ${v}PromotedTimeline as TimelineManifest,`)
 },changed)
 // 6 · how archives write the club, and its next match
 const names=[...new Set([reg.name,...input.names])]
 edit('lib/clubs/spellings.ts',`'${id}':`,s=>insertBeforeClose(s,'export const CLUB_SPELLINGS',`  '${id}': ${JSON.stringify(names).replace(/","/g,"', '").replace(/^\["/,"['").replace(/"\]$/,"']")},`),changed)
 const teams=readFileSync('lib/fixtures/teams.ts','utf8')
 if(!teams.includes(`clubId: '${id}'`))edit('lib/fixtures/teams.ts',`clubId: '${id}'`,s=>s.replace(/\n\]\s*$/,`\n  {clubId: '${id}', search: '${reg.name.replace(/'/g,"\\'")}', names: ${JSON.stringify([...new Set(names.map(x=>norm(x)))]).replace(/"/g,"'")}, countries: ['${reg.country.toLowerCase()}']},\n]\n`),changed)
 // the social plan's own tag for the club: its name as one word (the plan adds the topic tags; supporters' tags are the owner's to add)
 const tag='#'+norm(reg.name).split(' ').map(w=>w[0]!.toUpperCase()+w.slice(1)).join('')
 edit('lib/marketing/tags.ts',`'${id}': [`,s=>insertBeforeClose(s,'export const CLUB_TAGS',`  '${id}': ['${tag}'],`),changed)
 // 5 · the crest
 const logos=arg('logos')
 if(logos&&existsSync(logos)&&!existsSync(`public/crests/${id}.png`)){
  const files=execFileSync('git',['-C',logos,'ls-tree','-r','--name-only','HEAD'],{encoding:'utf8',maxBuffer:64<<20}).split('\n').map(f=>f.replace(/^"|"$/g,'')).filter(Boolean)
  const commit=execFileSync('git',['-C',logos,'rev-parse','HEAD'],{encoding:'utf8'}).trim()
  const hit=findCrest(files,names,reg.country)
  if(hit){
   const buf=execFileSync('git',['-C',logos,'show',`HEAD:${hit}`],{maxBuffer:16<<20})
   if(buf.length>2000&&buf.length<400_000&&buf.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))){
    writeFileSync(`public/crests/${id}.png`,buf);changed.push(`public/crests/${id}.png`)
    const reg2=JSON.parse(readFileSync('content/manual/club-crests.json','utf8'));reg2.crests.push({club:id,file:`public/crests/${id}.png`,sha256:sha(buf),bytes:buf.length,source:'https://github.com/luukhopman/football-logos',sourcePath:hit,sourceCommit:commit})
    writeFileSync('content/manual/club-crests.json',JSON.stringify(reg2,null,2)+'\n');changed.push('content/manual/club-crests.json')
    edit('lib/clubs/crest.ts',`'${id}': '/crests/`,s=>insertBeforeClose(s,'export const CRESTS',`  '${id}': '/crests/${id}.png',`),changed)
    report.push(`crest: ${hit}`)
   }else report.push(`crest: ${hit} is not a usable PNG — left out, the initials badge stays`)
  }else report.push('crest: not in the catalogue — left out, the initials badge stays')
 }else if(existsSync(`public/crests/${id}.png`))report.push('crest: already on file')
 else report.push('crest: no catalogue checkout given (--logos) — left out')
 console.log(JSON.stringify({id,changed,report},null,1))
 if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,`### ${reg.name}\n${report.map(r=>`- ${r}`).join('\n')}\n`,{flag:'a'})
}
if(process.argv[1]&&/promote\.ts$/.test(process.argv[1]))main().catch(e=>{console.error(e);process.exit(1)})
