/**
 * research:daily-report — what changed in the clubs' compiled data since the last run, per club and gate; what is
 * waiting for the owner; and what collection returned nothing. Read-only on data: it writes only `research-reports/`
 * (the report, `daily-latest.json`, the 35-day `history.json` and the alarms in `health.json` that the research desk
 * shows). Never approves, builds a pack or publishes (rules 92, 93, 114). Used by .github/workflows/research-daily.yml.
 *   npm run research:daily-report -- --census census.json [--wave-log wave.log]
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {alarms,pushDay,weekGains,type DayRow,type History} from '../../lib/research/report-model'
import {REGISTRY} from '../../lib/master/registry'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:undefined}
type Row=Record<string,unknown>&{gates?:Record<string,string|null>;staged?:boolean}
const NUM=['players','matches','matchesWithEleven','matchesWithScorers','archive','timeline','kits','trophies','seasons','mysteries','trivia','sources']
const ready=(g?:Record<string,string|null>)=>Object.entries(g||{}).filter(([,v])=>v&&String(v).startsWith('READY')).map(([k])=>k)
const playable=(g?:Record<string,string|null>)=>Object.values(g||{}).filter(v=>v&&/^(READY|PARTIAL)/.test(String(v))).length
const DESK='https://fanlife.dubelteam.com/master/admin?section=research'
async function triage(delta:string):Promise<string>{
 const key=process.env.ANTHROPIC_API_KEY
 if(!key)return ''
 try{
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:process.env.RESEARCH_AI_MODEL||'claude-sonnet-5-5',max_tokens:900,system:'You triage football-club research for a fan portal. You only read the table you are given. Never invent facts, dates, names or sources. For each club that is NOT fully ready, name the single gate closest to opening and what kind of record would close it (e.g. "player squad lists with positions", "kit photographs by season"). One short line per club. You cannot approve or publish anything.',messages:[{role:'user',content:delta}]})})
  if(!res.ok)return `_AI triage unavailable (${res.status})._`
  const j=await res.json() as {content?:{text?:string}[]}
  return (j.content?.map(c=>c.text||'').join('')||'')
 }catch(e){return `_AI triage unavailable (${(e as Error).message})._`}
}
async function main(){
 const now=JSON.parse(readFileSync(arg('census')||'census.json','utf8')) as Record<string,Row>
 mkdirSync('research-reports',{recursive:true})
 const prevPath='research-reports/daily-latest.json',histPath='research-reports/history.json'
 const prev=(existsSync(prevPath)?JSON.parse(readFileSync(prevPath,'utf8')):{}) as Record<string,Row>
 const day=new Date().toISOString().slice(0,10),names=Object.fromEntries(REGISTRY.map(c=>[c.id,c.name]))
 // the day's rows → the history the week is measured on
 const rows:Record<string,DayRow>=Object.fromEntries(Object.entries(now).map(([id,r])=>[id,{ready:ready(r.gates).length,playable:playable(r.gates),matches:Number(r.matches||0),records:NUM.reduce((n,k)=>n+Number(r[k]||0),0)}]))
 const hist=pushDay((existsSync(histPath)?JSON.parse(readFileSync(histPath,'utf8')):{}) as History,day,rows),gains=weekGains(hist,day)
 // the staged line: what the owner's approval would open (research-reports/desk-preview.json, written by research:desk-preview)
 const preview=existsSync('research-reports/desk-preview.json')?JSON.parse(readFileSync('research-reports/desk-preview.json','utf8')).clubs as Record<string,{all:{opens:string[]}}>:{}
 const waiting=Object.entries(preview).map(([club,p])=>({club,gates:p.all.opens.length}))
 const log=arg('wave-log')&&existsSync(arg('wave-log')!)?readFileSync(arg('wave-log')!,'utf8'):''
 const noUefa=[...log.matchAll(/^\[([a-z0-9-]+)\] NO_UEFA_TEAM/gm)].map(m=>m[1]!)
 const found=alarms(hist,day,{noUefa,waiting,names})
 writeFileSync('research-reports/health.json',JSON.stringify({generatedAt:new Date().toISOString(),alarms:found},null,1)+'\n')
 writeFileSync(histPath,JSON.stringify(hist,null,1)+'\n')

 const lines=[`# Daily research report — ${day}`,'']
 const asks=found.filter(a=>a.code==='waiting-owner'),warn=found.filter(a=>a.code!=='waiting-owner')
 lines.push('## What needs you','')
 if(asks.length){for(const a of asks)lines.push(`- ${a.text}`);lines.push('',`Open the research desk: ${DESK}`)}else lines.push('- Nothing. Every club is waiting on collection, not on you.')
 const week=Object.values(gains).reduce((n,x)=>n+x,0)
 lines.push('','## This week','',`- Gates that became fully ready in the last seven days: **${week}**${week?` (${Object.entries(gains).filter(([,n])=>n).map(([id,n])=>`${names[id]||id} +${n}`).join(', ')})`:''}.`)
 if(warn.length){lines.push('','## Collection health','');for(const a of warn)lines.push(`- ${a.text}`)}
 lines.push('','## Open clubs','','| Club | Ready gates | New since last run |','|---|---|---|')
 const table:string[]=[]
 for(const [id,r] of Object.entries(now)){
  if(r.staged)continue
  const p=prev[id]
  const diff=NUM.map(k=>{const a=Number(r[k]||0),b=Number(p?.[k]||0);return a!==b?`${k} ${a-b>0?'+':''}${a-b}`:''}).filter(Boolean).join(', ')
  const rd=ready(r.gates),all=Object.keys(r.gates||{}).length,opened=rd.filter(g=>!ready(p?.gates).includes(g))
  lines.push(`| ${id} | ${rd.length}/${all} | ${diff||'—'}${opened.length?` · NEWLY READY: ${opened.join(', ')}`:''} |`)
  table.push(`${id}: ready ${rd.length}/${all}; not ready: ${Object.entries(r.gates||{}).filter(([,v])=>!v||!String(v).startsWith('READY')).map(([k,v])=>`${k} ${v}`).join('; ')}`)
 }
 const staged=Object.entries(now).filter(([,r])=>r.staged)
 if(staged.length){lines.push('','## New clubs — the staged line','','| Club | UEFA matches | With eleven | Playable now | Opens on your approval |','|---|---|---|---|---|')
  for(const [id,r] of staged){lines.push(`| ${id} | ${r.matches} | ${r.matchesWithEleven} | ${playable(r.gates)} | ${preview[id]?.all.opens.join(', ')||'—'} |`);table.push(`${id}: staged; playable ${playable(r.gates)}`)}}
 const ai=await triage(table.join('\n'));if(ai)lines.push('','## AI triage (advisory only)','',ai)
 lines.push('','_Collected rows arrive unreviewed. Approval stays with the owner (rules 92, 93, 114)._')
 writeFileSync(`research-reports/daily-${day}.md`,lines.join('\n')+'\n')
 writeFileSync(prevPath,JSON.stringify(now,null,1)+'\n')
 if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n',{flag:'a'})
 console.log(lines.join('\n'))
}
main().catch(e=>{console.error(e);process.exit(1)})
