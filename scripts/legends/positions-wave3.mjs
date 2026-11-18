// Positions, wave 3 (18.11.2026, owner: "every man an exact position"). Runs in GitHub Actions (the workspace cannot reach Wikipedia).
// Reads the men still unplaced in content/manual/player-positions-extra.json and tries, in order:
//   1 · Wikidata — every human who played for the club (P54) with a position (P413), matched on the cleaned full name against the
//       label AND every alias in en/he/el/de/hr/bs, accent-blind. Accepted only when exactly one such man carries that name.
//   2 · Wikipedia search — "<cleaned name>" + club word, titles that START with the cleaned name; the page must be a football biography
//       that names this club and states a position; accepted only when exactly one candidate passes.
// The name is cleaned of archive notes only (asterisks, [notes], "Dr", quoted or leading nicknames, "(Jnr)" → "Jr."); never cut to a
// surname. Output: out/positions-wave3.json — {added:{club:{id:{pos,raw,title,rev,lang,src}}}, still:{club:[{id,name,why}]}}.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
const UA=`FanLifeArchive/1.0 (${process.env.RESEARCH_CONTACT||'football archive research'}; polite)`
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const doc=JSON.parse(readFileSync('content/manual/player-positions-extra.json','utf8'))
const ARTICLE={celtic:'Celtic F.C.','st-pauli':'FC St. Pauli','zrinjski-mostar':'HŠK Zrinjski Mostar','aek-athens':'AEK Athens F.C.','hapoel-petah-tikva':'Hapoel Petah Tikva F.C.','hapoel-tel-aviv':'Hapoel Tel Aviv F.C.',panathinaikos:'Panathinaikos F.C.',olympiacos:'Olympiacos F.C.'}
const CLUB={celtic:/Celtic/,'st-pauli':/St\.? Pauli/,'zrinjski-mostar':/Zrinjski/,'aek-athens':/AEK/,'hapoel-petah-tikva':/Hapoel Petah/i,'hapoel-tel-aviv':/Hapoel Tel[ -]Aviv/i,panathinaikos:/Panathinaikos/,olympiacos:/Olympiacos|Olympiakos/}
const HE={'hapoel-tel-aviv':/הפועל תל[ -]אביב/,'hapoel-petah-tikva':/הפועל פתח תקו/}
const fam=t=>{t=t.toLowerCase();return /goalkeeper|goalie|שוער|τερματοφύλακ/.test(t)?'GK':/back|defender|sweeper|stopper|centre-half|center-half|libero|מגן|בלם|αμυντικ/.test(t)?'DF':/midfield|playmaker|half-back|wing-half|wing half|קשר|μέσος/.test(t)?'MF':/forward|striker|winger|wing\b|outside|inside|attacker|חלוץ|כנף|επιθετικ/.test(t)?'FW':null}
const fold=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’'`.]/g,'').replace(/[-‐]/g,' ').replace(/\s+/g,' ').trim()
function cleanName(n){
 let s=n.replace(/\[[^\]]*\]/g,'').replace(/[*†]/g,'').replace(/\s*\(Jnr\)/i,' Jr.').replace(/^Dr\.?\s+/,'').replace(/["“”][^"“”]*["“”]/g,'').trim()
 s=s.split(/\s+or\s+/)[0].trim()
 const out=[s]
 const parts=s.split(/\s+/)
 if(parts.length>=3&&/^(Sunny|Dun|Bobo|Jinky|Lisbon|Big|Wee|Young|Old)$/i.test(parts[0]))out.push(parts.slice(1).join(' '))
 return [...new Set(out.map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean))]
}
async function get(url,tries=12){
 for(let i=0;i<tries;i++){
  const r=await fetch(url,{headers:{'User-Agent':UA,Accept:'application/json'}})
  if(r.status===429||r.status>=500){await sleep((Number(r.headers.get('retry-after'))||15)*1000);continue}
  if(!r.ok)throw new Error(`HTTP ${r.status} ${url.slice(0,120)}`)
  await sleep(900);return r.json()
 }
 throw new Error('rate limited')
}
const wiki=(host,p)=>get(`https://${host}/w/api.php?`+new URLSearchParams({format:'json',action:'query',redirects:'1',...p}))
const cleanRaw=s=>s.replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g,'').replace(/\{\{[^{}]*\}\}/g,m=>m.replace(/\{\{(?:nowrap|small)\|?|\}\}/g,'')).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g,'$1').replace(/<br\s*\/?>/g,', ').trim()

const added={},still={},QID={}
{const d=await wiki('en.wikipedia.org',{prop:'pageprops',ppprop:'wikibase_item',titles:Object.values(ARTICLE).join('|')})
 const pages=Object.values(d.query.pages),to=t=>{const n=(d.query.normalized||[]).find(x=>x.from===t)?.to??t;return (d.query.redirects||[]).find(x=>x.from===n)?.to??n}
 for(const [k,t] of Object.entries(ARTICLE)){QID[k]=pages.find(p=>p.title===to(t))?.pageprops?.wikibase_item}
 console.log('clubs',JSON.stringify(QID))}
for(const [club,list] of Object.entries(doc.unplaced)){
 const left=list.filter(u=>!doc.positions[club]?.[u.id]);if(!left.length||!QID[club])continue
 added[club]={};still[club]=[]
 // 1 · Wikidata, the whole club at once
 const q=`SELECT ?p ?pos ?posLabel ?name WHERE { ?p wdt:P54 wd:${QID[club]}; wdt:P413 ?pos. { ?p rdfs:label ?name } UNION { ?p skos:altLabel ?name } FILTER(LANG(?name) IN ("en","he","el","de","hr","bs","sr")) SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`
 let rows=[];try{rows=(await get('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q))).results.bindings}catch(e){console.log(club,'wikidata failed',e.message)}
 const byName=new Map()
 for(const r of rows){const k=fold(r.name.value),id=r.p.value;if(!byName.has(k))byName.set(k,new Map());const m=byName.get(k);m.set(id,[...(m.get(id)??[]),r.posLabel.value])}
 for(const u of left){
  let hit=null,why='no Wikidata man of that name played for this club'
  for(const n of cleanName(u.name)){const m=byName.get(fold(n));if(!m)continue
   if(m.size>1){why='several Wikidata men of this name played for this club';continue}
   const [qid,labels]=[...m.entries()][0],raw=[...new Set(labels)].join(', '),f=fam(raw)
   if(f){hit={pos:f,raw,title:qid.split('/').pop(),rev:0,lang:'wikidata',src:'wikidata-p54-p413-alias'};break}why=`position "${raw}" is not one of the four families`}
  if(hit){added[club][u.id]=hit;continue}
  // 2 · Wikipedia search (English, and Hebrew for Hebrew names)
  const he=/\p{Script=Hebrew}/u.test(u.name),host=he?'he.wikipedia.org':'en.wikipedia.org',clubRe=he?HE[club]:CLUB[club]
  if(!clubRe){still[club].push({id:u.id,name:u.name,why});continue}
  for(const n of cleanName(u.name)){
   const word=he?'כדורגלן':clubRe.source.replace(/[\\^$.*+?()[\]{}|]/g,' ').trim().split(/\s+/)[0]+' footballer'
   let sr;try{sr=await wiki(host,{list:'search',srsearch:`"${n}" ${word}`,srlimit:'6'})}catch(e){why='search failed';break}
   const cands=(sr.query?.search||[]).map(x=>x.title).filter(t=>fold(t.replace(/\s*\(.*\)$/,''))===fold(n))
   if(!cands.length){why=`${he?'he':'en'}: no page titled with this full name`;continue}
   const d=await wiki(host,{prop:'revisions',rvprop:'content|ids',rvslots:'main',titles:cands.join('|')})
   const ok=Object.values(d.query.pages).filter(pg=>pg.revisions).map(pg=>({title:pg.title,rev:pg.revisions[0].revid,text:pg.revisions[0].slots.main['*']}))
    .filter(pg=>/Infobox football biography|Infobox footballer|אישיות כדורגל|כדורגלן/i.test(pg.text)&&clubRe.test(pg.text))
    .map(pg=>{const m=/\|\s*(?:position|תפקיד כשחקן|עמדה)\s*=\s*([^\n|]*)/i.exec(pg.text),raw=m?cleanRaw(m[1]):'';return {pg,raw,f:raw?fam(raw):null}}).filter(x=>x.f)
   if(ok.length===1){hit={pos:ok[0].f,raw:ok[0].raw,title:ok[0].pg.title,rev:ok[0].pg.rev,lang:he?'he':'en',src:'wikipedia-search-wave3'};break}
   why=ok.length>1?'several footballers of this name played for this club':`${he?'he':'en'}: no football biography naming this club states a position`
  }
  if(hit)added[club][u.id]=hit;else still[club].push({id:u.id,name:u.name,why})
 }
 console.log(club,'placed',Object.keys(added[club]).length,'of',left.length)
}
mkdirSync('out',{recursive:true})
writeFileSync('out/positions-wave3.json',JSON.stringify({generatedAt:new Date().toISOString(),added,still},null,1))
