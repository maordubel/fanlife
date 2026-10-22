/**
 * research:daily-report — what changed in the clubs' compiled data since the last run, per club and gate, plus the
 * advisory AI triage. Read-only on data: it writes only `research-reports/`. Never approves, builds a pack or publishes
 * (rules 92, 93, 114). Used by .github/workflows/research-daily.yml.
 *   npm run research:daily-report -- --census census.json
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:undefined}
type Row=Record<string,unknown>&{gates?:Record<string,string|null>}
const NUM=['players','matches','matchesWithEleven','matchesWithScorers','archive','timeline','kits','trophies','seasons','mysteries','trivia','sources']
const ready=(g?:Record<string,string|null>)=>Object.entries(g||{}).filter(([,v])=>v&&String(v).startsWith('READY')).map(([k])=>k)
async function triage(delta:string):Promise<string>{
 const key=process.env.ANTHROPIC_API_KEY
 if(!key)return '_AI triage skipped: no ANTHROPIC_API_KEY secret. Everything above is deterministic._'
 try{
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:process.env.RESEARCH_AI_MODEL||'claude-sonnet-5-5',max_tokens:900,system:'You triage football-club research for a fan portal. You only read the table you are given. Never invent facts, dates, names or sources. For each club that is NOT fully ready, name the single gate closest to opening and what kind of record would close it (e.g. "player squad lists with positions", "kit photographs by season"). One short line per club. You cannot approve or publish anything.',messages:[{role:'user',content:delta}]})})
  if(!res.ok)return `_AI triage unavailable (${res.status})._`
  const j=await res.json() as {content?:{text?:string}[]}
  return (j.content?.map(c=>c.text||'').join('')||'_AI triage returned nothing._')
 }catch(e){return `_AI triage unavailable (${(e as Error).message})._`}
}
async function main(){
 const now=JSON.parse(readFileSync(arg('census')||'census.json','utf8')) as Record<string,Row>
 mkdirSync('research-reports',{recursive:true})
 const prevPath='research-reports/daily-latest.json'
 const prev=(existsSync(prevPath)?JSON.parse(readFileSync(prevPath,'utf8')):{}) as Record<string,Row>
 const day=new Date().toISOString().slice(0,10)
 const lines=[`# Daily research report — ${day}`,'','| Club | Open gates | New since last run |','|---|---|---|']
 const table:string[]=[]
 for(const [id,r] of Object.entries(now)){
  const p=prev[id]
  const diff=NUM.map(k=>{const a=Number(r[k]||0),b=Number(p?.[k]||0);return a!==b?`${k} ${a-b>0?'+':''}${a-b}`:''}).filter(Boolean).join(', ')
  const rd=ready(r.gates),all=Object.keys(r.gates||{}).length
  const opened=rd.filter(g=>!ready(p?.gates).includes(g))
  lines.push(`| ${id} | ${rd.length}/${all} | ${diff||'—'}${opened.length?` · NEWLY READY: ${opened.join(', ')}`:''} |`)
  table.push(`${id}: ready ${rd.length}/${all}; not ready: ${Object.entries(r.gates||{}).filter(([,v])=>!v||!String(v).startsWith('READY')).map(([k,v])=>`${k} ${v}`).join('; ')}`)
 }
 // closed clubs have no compiled pack yet: report what the daily UEFA pull has collected for them
 const closed=readdirSync('research-staging',{withFileTypes:true}).filter(d=>d.isDirectory()&&!now[d.name]&&existsSync(`research-staging/${d.name}/ingest.json`)).map(d=>d.name)
 if(closed.length){lines.push('','## Clubs without a pack yet — UEFA pull','','| Club | Matches | Approved | With eleven |','|---|---|---|---|')
  for(const id of closed){const f=`research-staging/${id}/wave-auto.json`;const m=(existsSync(f)?JSON.parse(readFileSync(f,'utf8')).matches:[]) as {status?:string;value?:{primaryOnly?:{lineup?:unknown[]}}}[]
   lines.push(`| ${id} | ${m.length} | ${m.filter(x=>x.status==='approved').length} | ${m.filter(x=>x.value?.primaryOnly?.lineup?.length===11).length} |`);table.push(`${id}: no pack; UEFA matches ${m.length}`)}}
 lines.push('','## AI triage (advisory only)','',await triage(table.join('\n')))
 lines.push('','_Collected rows arrive unreviewed. Approval stays with the owner (rules 92, 93, 114)._')
 writeFileSync(`research-reports/daily-${day}.md`,lines.join('\n')+'\n')
 writeFileSync(prevPath,JSON.stringify(now,null,1)+'\n')
 if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n',{flag:'a'})
 console.log(lines.join('\n'))
}
main().catch(e=>{console.error(e);process.exit(1)})
