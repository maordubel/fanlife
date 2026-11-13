/**
 * club:olympiacos-history-players — every Olympiacos player's official appearances and goals, from the "All players" table of
 * olympiacos-history.gr (from the archive of Tassos Stathopoulos). The owner approved the site as a source on 13.11.2026.
 *
 * Reads the committed snapshot (research-data/olympiacos-history/players-table.json, written by olympiacos-history-fetch.ts
 * in GitHub Actions) and joins each row to the club pack:
 *  1. the same name token for token, in either order, after folding Greek and Latin spellings to one skeleton, with the
 *     usual Greek given-name forms treated as one ("Γιώργος" = Giorgos = Georgios, "Κώστας" = Kostas = Konstantinos);
 *  2. otherwise a surname only one man of the pack carries (exact, or one letter apart) whose given name is the same name;
 *  3. a one-word name (Rivaldo) only when one man of the pack answers to it.
 * A row that matches two men fills neither (rule 7). A matched man without a stated career gets the site's figure; a man who
 * has one keeps it. A row that matches nobody is a man the archive did not know: he is ADDED as an archive player (name
 * transliterated from the Greek, the Greek kept as an alias, his appearances and goals), so the encyclopedia holds every man
 * who played for the club. Nothing is read from the site's pictures (they are its owners' work).
 *   node --require ./scripts/master/server-only.cjs --import tsx scripts/ingest/clubs/olympiacos-history-players.ts
 */
import {readFileSync,writeFileSync} from 'node:fs'
const SNAPSHOT='research-data/olympiacos-history/players-table.json'
const G:Record<string,string>={α:'a',ά:'a',β:'v',γ:'g',δ:'d',ε:'e',έ:'e',ζ:'z',η:'i',ή:'i',θ:'th',ι:'i',ί:'i',ϊ:'i',ΐ:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',ό:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',ύ:'y',ϋ:'y',ΰ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o',ώ:'o'}
/** Greek → a folded Latin skeleton both spellings reduce to ("Γιώργος" and "Giorgos" → "giorgos"; "Τζόρτζεβιτς" ~ "Djordjevic") */
export function skeleton(s:string):string{
 let t=s.toLowerCase().normalize('NFD').replace(/\u0301/g,'').normalize('NFC').replace(/γι(?=[αεηιοωυ])/g,'ι').replace(/\([^)]*\)/g,' ').replace(/ου/g,'u').replace(/αι/g,'e').replace(/ει|οι/g,'i').replace(/μπ/g,'b').replace(/ντ/g,'d').replace(/γκ|γγ/g,'g').replace(/τζ/g,'j').replace(/τσ/g,'ts')
 t=[...t].map(c=>G[c]??c).join('').normalize('NFD').replace(/\p{M}+/gu,'')
 return t.replace(/ou/g,'u').replace(/dj|dz|zh|tz/g,'j').replace(/y/g,'i').replace(/ch|kh|h/g,'h').replace(/c(?=[ei])/g,'s').replace(/c/g,'k').replace(/\bgi(?=[aeiou])|\bj(?=[aeiou])/g,'i').replace(/ph|f/g,'f').replace(/th/g,'t').replace(/w/g,'v').replace(/ck/g,'k').replace(/x/g,'ks').replace(/ei/g,'i').replace(/its\b/g,'ik').replace(/(.)\1+/g,'$1').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim()
}
/** the everyday and the formal form of a Greek given name are one name (skeleton forms) */
const GIVEN:Record<string,string[]>={
 georg:['giorgos','georgios','georgos','giorgis','georg','george','jorgos'],dimitr:['dimitris','dimitrios','mitsos','dimitri'],
 konst:['kostas','konstantinos','kostantinos','kostis','dinos','konstandinos','kostantis'],vasil:['vasilis','vasilios','vasileios','vasos','vasili'],
 nikol:['nikos','nikolaos','nikolas','nikolai'],ioan:['ianis','gianis','ioanis','iannis','giannis','ioannis','gianakis'],
 atanas:['tanasis','atanasios','tanos'],anast:['tasos','anastasios','anastasis'],panag:['panagiotis','panaiotis','panagotis','takis','panos'],
 hrist:['hristos','hristoforos','hristofor'],mihal:['mihalis','mihail','mihael','mihaelis'],eman:['manolis','emanuil','emanouil','manos'],
 stilian:['stelios','stilianos','stelianos'],sotir:['sotiris','sotirios'],elefter:['lefteris','elefterios'],haral:['babis','haralampos','haralambos','bambis'],
 evang:['vangelis','evangelos','vagelis'],kiriak:['kiriakos','kiriakis'],ilias:['ilias','elias','ilia'],aleks:['alexandros','aleksandros','alekos','alexis','aleksis'],
 spir:['spiros','spiridon','spiridonas'],grig:['grigoris','grigorios'],apost:['apostolos','tolis'],antoni:['antonis','antonios','anton','antonio'],
 iakov:['iakovos','jakob','iakob'],gerasim:['gerasimos','makis'],triant:['triantafilos','filos'],stef:['stefanos','stefan','stefanis'],
 pavl:['pavlos','paul','paulo','pablo'],petr:['petros','peter','pedro','petar'],andr:['andreas','andre','andrei','andrea'],
 marin:['marinos'],periklis:['periklis'],leon:['leonidas'],prodr:['prodromos'],iosif:['iosif','josef','joseph','pepe'],
}
const CANON=new Map(Object.entries(GIVEN).flatMap(([k,vs])=>vs.map(v=>[skeleton(v),k] as [string,string])))
const canon=(w:string)=>CANON.get(w)??w
const words=(n:string)=>skeleton(n).split(' ').filter(w=>w.length>1)
const key=(n:string)=>words(n).map(canon).sort().join(' ')
/** the same opening sound: Greek Χ/Γ/Γι for Spanish G/J, Κ for C */
const OPEN=(c:string)=>'ghij'.includes(c)?'g':c==='k'||c==='q'?'k':c
const sameStart=(a:string,b:string)=>!!a&&!!b&&OPEN(a[0]!)===OPEN(b[0]!)
/** one letter apart (an added, dropped or changed letter) — "Tzortzevits"/"Djordjevic" already share a skeleton */
function near(a:string,b:string):boolean{
 if(a===b)return true;if(Math.abs(a.length-b.length)>1||a.length<5||!sameStart(a,b))return false
 let i=0;while(i<a.length&&a[i]===b[i])i++
 return a.slice(i+1)===b.slice(i+1)||a.slice(i+1)===b.slice(i)||a.slice(i)===b.slice(i+1)
}
/** ELOT 743 transliteration for display ("Σιώκος Βασίλης" → "Siokos Vasilis") */
export function latin(s:string):string{
 const L:Record<string,string>={α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o'}
 return s.split(/(\s+|-)/).map(w=>{
  let t=w.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
  t=t.replace(/^μπ/,'b').replace(/^ντ/,'d').replace(/^γκ/,'g').replace(/μπ/g,'mp').replace(/ντ/g,'nt').replace(/γκ/g,'gk').replace(/γγ/g,'ng').replace(/ου/g,'ou').replace(/αυ(?=[θκξπσςτφχψ]|$)/g,'af').replace(/ευ(?=[θκξπσςτφχψ]|$)/g,'ef').replace(/αυ/g,'av').replace(/ευ/g,'ev')
  t=[...t].map(c=>L[c]??c).join('')
  return t?t[0]!.toUpperCase()+t.slice(1):t
 }).join('')
}
type Row={name:string;cells:string[]}
async function main(){
 const snap=JSON.parse(readFileSync(SNAPSHOT,'utf8')) as {url:string;checkedAt:string;header:string[];rows:Row[]}
 process.env.FANLIFE_PRECOMPILED='off';process.env.OLYHIST_REBUILD='1'
 const {loadClub}=await import('@/lib/clubs/resolver')
 const data=(await loadClub('olympiacos'))!.data
 const basis='all official competitions (olympiacos-history.gr, from the archive of Tassos Stathopoulos)'
 // this wave's own output (men it added, careers it filled) is not "the pack" — a re-run rebuilds it from the snapshot
 const core=(data.players||[]).map(p=>({id:p.id.replace(/^olympiacos:/,''),name:p.value.name,names:[p.value.name,...(p.value.aliases||[])],career:p.value.career?.basis===basis?undefined:p.value.career})).filter(p=>!p.id.startsWith('oh-'))
 const lastSur=new Map<string,Set<string>>(),byKey=new Map<string,Set<string>>(),bySur=new Map<string,Set<string>>(),one=new Map<string,Set<string>>()
 const add=(m:Map<string,Set<string>>,k:string,id:string)=>{if(!m.has(k))m.set(k,new Set());m.get(k)!.add(id)}
 const givensOf=new Map<string,Set<string>>()
 for(const p of core)for(const n of p.names){
  const w=words(n);if(!w.length)continue
  if(w.length===1){add(one,w[0]!,p.id);continue}
  add(byKey,key(n),p.id);for(const x of w)add(bySur,x,p.id);add(lastSur,w[w.length-1]!,p.id)
  if(!givensOf.has(p.id))givensOf.set(p.id,new Set());for(const x of w)givensOf.get(p.id)!.add(canon(x))
 }
 const tableSur=new Map<string,number>();for(const r of snap.rows)for(const x of new Set(words(r.name)))tableSur.set(x,(tableSur.get(x)??0)+1)
 const only=(s:Set<string>|undefined)=>s&&s.size===1?[...s][0]!:null
 const unique=(ids:string[])=>{const u=[...new Set(ids)];return u.length===1?u[0]!:u.length?'AMBIGUOUS':null}
 const matchRow=(name:string):string|null=>{
  const w=words(name);if(!w.length)return null
  if(w.length===1)return only(one.get(w[0]!))??only(byKey.get(w[0]!))
  const exact=byKey.get(key(name));if(exact)return exact.size===1?[...exact][0]!:'AMBIGUOUS'
  // a man the pack knows by one name (Rivaldo) printed with his full name by the site
  const mono=unique([...(one.get(w[0]!)??[])]);if(mono&&mono!=='AMBIGUOUS')return mono
  // the site prints "Surname Given": a man of the pack with that surname (or one letter apart) and the same given name
  // any word may be the surname ("Ελ Αραμπί Γιουσέφ"); the given name may be spelled one letter apart (Ματιέ ~ Mathieu)
  const cands:string[]=[]
  for(const sur of w){const givens=w.filter(x=>x!==sur).map(canon);if(!givens.length)continue
   for(const [s,ids] of bySur)if(near(s,sur))for(const id of ids)if([...(givensOf.get(id)??[])].filter(g=>!near(g,sur)).some(g=>givens.some(x=>x===g||near(x,g)||(x.length>=4&&g.startsWith(x))||(g.length>=4&&x.startsWith(g)))))cands.push(id)}
  const u=unique(cands);if(u)return u
  // a surname (5+ letters) that exactly one man of the pack and exactly one row of the table carry
  // (the site's surname is every word but the last; the pack's is its last word)
  // and only when the given names do not disagree (both have one: they open with the same sound)
  const rowGiven=w.length>1?w[w.length-1]!:null
  const sole=(w.length>1?w.slice(0,-1):w).filter(x=>x.length>=5&&(tableSur.get(x)??0)===1).flatMap(x=>[...(lastSur.get(x)??[])])
   .filter(id=>{const gs=[...(givensOf.get(id)??[])].filter(g=>!(w.length>1?w.slice(0,-1):w).some(x=>near(x,g)));return !rowGiven||!gs.length||gs.some(g=>sameStart(g,canon(rowGiven))||sameStart(g,rowGiven))})
  return unique(sole)
 }
 const today=new Date().toISOString().slice(0,10)
 const src={id:'olyhist-players',title:'olympiacos-history.gr — Όλοι οι παίκτες του Ολυμπιακού (archive of Tassos Stathopoulos)',url:snap.url,publisher:'olympiacos-history.gr',language:'el',checkedAt:snap.checkedAt,access:'available'}
 const approvedBy='Maor Harel (owner approved olympiacos-history.gr as a source, 13.11.2026)'
 // per-competition columns, printed into the notes ("league 363 (3) · cup 80 (2) · Europe 52")
 const COMP:[string,RegExp][]=[['league',/Α’ ΕΘΝΙΚΗ/],['second tier',/Β’ ΕΘΝΙΚΗ/],['Greek Cup',/^ΚΥΠΕΛΛΟ/],['Super Cup',/ΣΟΥΠΕΡ/],['League Cup',/ΛΙΓΚ ΚΑΠ/],['Europe',/ΕΥΡΩΠΗ/],['Rappan Cup',/ΡΑΠΑΝ/],['Balkans Cup',/ΒΑΛΚΑΝΙΚΟ/],['Piraeus championship',/ΠΕΙΡΑΙΑ/]]
 const cols=snap.header.slice(1)
 const split=(c:string[])=>COMP.flatMap(([label,re])=>{const i=cols.findIndex(h=>re.test(h));if(i<0)return [];const a=Number(c[i]),g=Number(c[i+1]);return a>0?[`${label} ${a}${g?` (${g})`:''}`]:[]}).join(' · ')
 const have=new Map(core.map(p=>[p.id,p]))
 const players:Record<string,unknown>[]=[],ambiguous:string[]=[],usedIds=new Set(core.map(p=>p.id)),claimed=new Map<string,string>()
 let filled=0,kept=0,added=0
 for(const r of snap.rows){
  const apps=Number(r.cells[0]),goals=Number(r.cells[1]);if(!Number.isInteger(apps)||!Number.isInteger(goals))continue
  const career={apps,goals,basis},split_=split(r.cells)
  let id=matchRow(r.name)
  if(id==='AMBIGUOUS'){ambiguous.push(r.name);continue}
  if(id&&claimed.has(id)){ambiguous.push(`${r.name} (and ${claimed.get(id)})`);continue}
  if(id){
   claimed.set(id,r.name);const p=have.get(id)!
   if(process.env.OLYHIST_AUDIT&&!byKey.get(key(r.name)))console.log(`~ ${r.name} → ${p.name}`)
   if(p.career){kept++;continue}
   players.push({id,value:{name:p.name,career,sensitive:false},sources:[src.id],confidence:2,status:'approved',researchedAt:today,approvedAt:today,approvedBy,parserCertainty:'high',conflictFree:true,notes:`Greek name on the site: ${r.name}. ${split_}.`})
   filled++;continue
  }
  // a man the archive did not hold: added, so the encyclopedia knows every man who played for the club
  const parts=r.name.replace(/\([^)]*\)/g,' ').trim().split(/\s+/),giv=parts.length>1?[parts[parts.length-1]!]:[],sur=parts.slice(0,parts.length>1?-1:undefined).join(' ')
  const display=latin([...giv,sur].join(' ')).trim()
  let nid='oh-'+skeleton([...giv,sur].join(' ')).replace(/\s+/g,'-').slice(0,60);let n=2;while(usedIds.has(nid))nid=`oh-${skeleton([...giv,sur].join(' ')).replace(/\s+/g,'-').slice(0,56)}-${n++}`;usedIds.add(nid)
  players.push({id:nid,value:{name:display,sport:'football',positions:[],fromYear:null,toYear:null,aliases:[r.name],career,archiveOnly:true,sensitive:false},sources:[src.id],confidence:2,status:'approved',researchedAt:today,approvedAt:today,approvedBy,parserCertainty:'high',conflictFree:true,
   notes:`Added from the club's all-players table; name transliterated from the Greek (${r.name}). ${split_}.`})
  added++
 }
 writeFileSync('club-packs/olympiacos/wave-olympiacos-history.json',JSON.stringify({schemaVersion:1,clubId:'olympiacos',contentLocale:'en',sources:[src],players,matches:[],kits:[],rivals:[],ambiguous},null,1)+'\n')
 console.log(`[olympiacos] ${snap.rows.length} rows · careers filled ${filled} · already stated ${kept} · added ${added} · two candidates (left out) ${ambiguous.length}`)
 if(ambiguous.length)console.log(ambiguous.join(' | '))
}
if(process.argv[1]?.endsWith('olympiacos-history-players.ts'))main().catch(e=>{console.error(e);process.exit(1)})
