/**
 * research:stage — isolated staging + dry run for a club research package. Writes nothing to production.
 *   npm run research:stage -- --club panathinaikos [--asof 2026-10-06]
 * Reads research-staging/<club>/*.json (made by xlsx-to-staging.py), prints the dry-run report, and writes
 * dry-run-report.{json,md} beside it. Re-running is idempotent: the report is a pure function of the files.
 */
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {dryRun,reportMarkdown,type Staging} from '../../lib/club-research/report'
const arg=(k:string,d:string)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1]||d}
const club=arg('club',''),dir=`research-staging/${club}`
if(!club||!existsSync(dir)){console.error('Usage: --club <id> (research-staging/<id>/ must exist)');process.exit(2)}
const manifest=JSON.parse(readFileSync(`${dir}/manifest.json`,'utf8')),asOf=arg('asof',manifest.snapshotAsOf)
const s:Staging={}
for(const f of readdirSync(dir)){
 const n=f.replace(/\.(json|jsonl\.gz)$/,'')
 if(f.endsWith('.jsonl.gz'))s[n]=gunzipSync(readFileSync(`${dir}/${f}`)).toString('utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l))
 else if(f.endsWith('.json')&&!['manifest','dry-run-report'].includes(n))s[n]=JSON.parse(readFileSync(`${dir}/${f}`,'utf8'))
}
const ids=JSON.parse(readFileSync('content/manual/player-ids.json','utf8')).records as {id:string}[]
const report=dryRun(club,asOf,s,new Set(ids.map(r=>`pao:${r.id}`)))
writeFileSync(`${dir}/dry-run-report.json`,JSON.stringify(report,null,1));writeFileSync(`${dir}/dry-run-report.md`,reportMarkdown(report))
console.log(reportMarkdown(report))
