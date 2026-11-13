/**
 * Reads the "All players" table of olympiacos-history.gr (owner-approved source, 13.11.2026) into a committed snapshot:
 * every row as the site prints it (name, then the numbers per column), the header row, and each name's link if it has one.
 * Facts only — nothing from the site's pictures. Runs in GitHub Actions (the sandbox cannot reach the site).
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/ingest/clubs/olympiacos-history-fetch.ts
 */
import {writeFileSync,mkdirSync} from 'node:fs'
export const OLYHIST_URL='https://olympiacos-history.gr/?page_id=60212'
export const OLYHIST_SNAPSHOT='research-data/olympiacos-history/players-table.json'
const clean=(s:string)=>s.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&#8217;|&#039;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()
async function main(){
 const r=await fetch(OLYHIST_URL,{headers:{'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}});if(!r.ok)throw new Error(`site answered ${r.status}`)
 const html=await r.text()
 const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c=>({text:clean(c[1]!),href:/href="([^"]+)"/.exec(c[1]!)?.[1]??null})))
 const header=rows.find(c=>c.length>=3&&!c.some(x=>/^\d+$/.test(x.text)))?.map(c=>c.text)??[]
 const table=rows.filter(c=>c.length>=3&&/\p{Script=Greek}/u.test(c[0]!.text)&&/^\d+$/.test(c[1]!.text)&&/^\d+$/.test(c[2]!.text))
 mkdirSync('research-data/olympiacos-history',{recursive:true})
 writeFileSync(OLYHIST_SNAPSHOT,JSON.stringify({url:OLYHIST_URL,checkedAt:new Date().toISOString().slice(0,10),header,rows:table.map(c=>({name:c[0]!.text,href:c[0]!.href,cells:c.slice(1).map(x=>x.text)}))},null,1)+'\n')
 console.log(`[olympiacos] ${table.length} rows · header: ${header.join(' | ')}`)
}
if(process.argv[1]?.endsWith('olympiacos-history-fetch.ts'))main().catch(e=>{console.error(e);process.exit(1)})
