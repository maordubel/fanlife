import {readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {foldName,linkKey,type Candidate,type Link,type Stint} from '@/lib/people/model'

/**
 * `npm run people:links` — the system decides what a public source settles (18.11.2026).
 *
 * For every cross-club name pair with no verdict yet, Wikidata is asked who carries that name and plays association football
 * (P106 = Q937857), and which of our clubs each such item lists as a team (P54):
 *   · ONE item lists both clubs           → `same`, evidence = that item;
 *   · two items, each lists one club only → `different`, evidence = both items;
 *   · anything else                       → left for the owner's review queue.
 * Polite (sequential, a pause between calls, retries with back-off), and it only ever APPENDS verdicts it can prove.
 * Runs in GitHub Actions (research-daily); the sandbox may not reach Wikidata, which simply leaves the queue as it is.
 */
const ROOT=process.cwd(),LINKS='content/manual/people-links.json',STINTS='content/generated/people-stints.json'
/** our clubs as Wikidata items (resolved through their English Wikipedia titles, 18.11.2026) */
export const CLUB_QID:Record<string,string>={'hapoel-tel-aviv':'Q206585','zrinjski-mostar':'Q399282','hapoel-petah-tikva':'Q1130537','panathinaikos':'Q4122219','aek-athens':'Q201584','celtic':'Q19593','st-pauli':'Q6463','olympiacos':'Q19628','raja-casablanca':'Q1051514','wydad-casablanca':'Q1139095','al-ahly':'Q223566','atalanta':'Q1886','maccabi-haifa':'Q2129100'}
const API='https://www.wikidata.org/w/api.php?format=json&'
const UA={'User-Agent':'FANLIFE-people-registry/1.0 (https://fanlife.dubelteam.com; fanlife@dubelteam.com)'}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
async function get<T>(url:string):Promise<T|null>{for(let t=0;t<5;t++){try{const r=await fetch(url,{headers:UA});if(r.ok){const j=await r.json() as T&{error?:unknown};if(!j.error)return j}}catch{/* retry */}await sleep(1500*(t+1))}return null}
type Hit={q:string;clubs:string[]}
type Claims={entities:Record<string,{claims?:Record<string,{mainsnak:{datavalue?:{value:{id?:string}}}}[]>}>}

/** the decision, pure: kept apart so the tests can prove it */
export function decide(a:Stint,b:Stint,hits:readonly Hit[],on:string):Link|null{
 const both=hits.filter(h=>h.clubs.includes(a.club)&&h.clubs.includes(b.club))
 if(both.length===1)return {a:a.key,b:b.key,verdict:'same',basis:'wikidata',evidence:both[0]!.q,on}
 if(both.length)return null
 const ha=hits.filter(h=>h.clubs.includes(a.club)),hb=hits.filter(h=>h.clubs.includes(b.club))
 if(ha.length===1&&hb.length===1&&ha[0]!.q!==hb[0]!.q)return {a:a.key,b:b.key,verdict:'different',basis:'wikidata',evidence:`${ha[0]!.q} / ${hb[0]!.q}`,on}
 return null
}

async function hitsFor(name:string,clubs:readonly string[]):Promise<Hit[]|null>{
 const s=await get<{search?:{id:string}[]}>(API+'action=wbsearchentities&language=en&type=item&limit=8&search='+encodeURIComponent(name))
 if(!s)return null
 const ids=(s.search??[]).map(x=>x.id);if(!ids.length)return []
 await sleep(250)
 const e=await get<Claims>(API+'action=wbgetentities&props=claims&ids='+ids.join('|'));if(!e)return null
 const byQ=Object.fromEntries(Object.entries(CLUB_QID).map(([k,q])=>[q,k]))
 const out:Hit[]=[]
 for(const [q,ent] of Object.entries(e.entities)){
  const c=ent.claims??{},occ=(c.P106??[]).map(x=>x.mainsnak.datavalue?.value.id)
  if(!occ.includes('Q937857'))continue
  const teams=[...new Set((c.P54??[]).map(x=>byQ[x.mainsnak.datavalue?.value.id??'']).filter((k):k is string=>!!k&&clubs.includes(k)))]
  if(teams.length)out.push({q,clubs:teams})
 }
 return out
}

async function run(){
 const file=JSON.parse(readFileSync(path.join(ROOT,LINKS),'utf8')) as {note:string;links:Link[]}
 const gen=JSON.parse(readFileSync(path.join(ROOT,STINTS),'utf8')) as {stints:Stint[];candidates:Candidate[]}
 const st=new Map(gen.stints.map(s=>[s.key,s])),have=new Set(file.links.map(l=>linkKey(l.a,l.b)))
 const open=gen.candidates.filter(c=>!have.has(linkKey(c.a,c.b)))
 const on=new Date().toISOString().slice(0,10),cache=new Map<string,Hit[]|null>()
 let added=0,unreachable=0
 for(const c of open){
  const a=st.get(c.a),b=st.get(c.b);if(!a||!b||!CLUB_QID[a.club]||!CLUB_QID[b.club])continue
  const k=foldName(c.name)
  if(!cache.has(k)){cache.set(k,await hitsFor(c.name,Object.keys(CLUB_QID)));await sleep(300)}
  const hits=cache.get(k);if(hits===null){unreachable++;continue}
  const l=decide(a,b,hits!,on);if(l){file.links.push(l);added++}
 }
 file.links.sort((x,y)=>linkKey(x.a,x.b).localeCompare(linkKey(y.a,y.b)))
 writeFileSync(path.join(ROOT,LINKS),JSON.stringify(file,null,1)+'\n')
 console.log(`people:links — ${open.length} open pairs, ${added} decided from Wikidata, ${unreachable} unreachable, ${open.length-added-unreachable} left for review`)
}
if(process.argv[1]?.endsWith('wikidata-links.ts'))run().catch(e=>{console.error(e);process.exit(1)})
