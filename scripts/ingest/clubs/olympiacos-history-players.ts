/**
 * club:olympiacos-history-players — every Olympiacos player's official appearances and goals, from the "All players" table of
 * olympiacos-history.gr (from the archive of Tassos Stathopoulos). The owner approved the site as a source on 13.11.2026.
 *
 * The table is read cell by cell (name, then total apps and goals, then per competition). A row fills the `career` of a player
 * the club pack already holds when his Greek name, written in Latin letters, is the pack's name token for token (given name and
 * surname, either order; rule 7: a name two players share fills neither). A player whose career is already stated keeps it — the
 * site's figure is written into the notes instead. Nothing is read from the site's pictures (they are its owners' work).
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/ingest/clubs/olympiacos-history-players.ts
 */
import {writeFileSync} from 'node:fs'
const URL_='https://olympiacos-history.gr/?page_id=60212'
const G:Record<string,string>={α:'a',ά:'a',β:'v',γ:'g',δ:'d',ε:'e',έ:'e',ζ:'z',η:'i',ή:'i',θ:'th',ι:'i',ί:'i',ϊ:'i',ΐ:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',ό:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',ύ:'y',ϋ:'y',ΰ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o',ώ:'o'}
/** Greek → a folded Latin skeleton both spellings reduce to ("Γιώργος" and "Giorgos" → "giorgos"; "Τζόρτζεβιτς" ~ "Djordjevic") */
export function skeleton(s:string):string{
 let t=s.toLowerCase().replace(/ου/g,'u').replace(/αι/g,'e').replace(/ει|οι/g,'i').replace(/μπ/g,'b').replace(/ντ/g,'d').replace(/γκ|γγ/g,'g').replace(/τζ/g,'j').replace(/τσ/g,'ts')
 t=[...t].map(c=>G[c]??c).join('').normalize('NFD').replace(/\p{M}+/gu,'')
 return t.replace(/ou/g,'u').replace(/dj|dz|zh|tz/g,'j').replace(/y/g,'i').replace(/ch|kh|h/g,'h').replace(/c/g,'k').replace(/ph|f/g,'f').replace(/th/g,'t').replace(/w/g,'v').replace(/ck/g,'k').replace(/its\b/g,'ik').replace(/(.)\1+/g,'$1').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim()
}
const key=(n:string)=>skeleton(n).split(' ').filter(w=>w.length>1).sort().join(' ')
async function main(){
 const r=await fetch(URL_,{headers:{'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}});if(!r.ok)throw new Error(`site answered ${r.status}`)
 const html=await r.text()
 const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c=>c[1]!.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim()))
 const table=rows.filter(c=>c.length>=3&&/\p{Script=Greek}/u.test(c[0]!)&&/^\d+$/.test(c[1]!)&&/^\d+$/.test(c[2]!))
 console.log(`[olympiacos] the site's table holds ${table.length} players`)
 // the club's compiled roster (every wave), ids written back without the club prefix the compiler adds
 process.env.FANLIFE_PRECOMPILED='off'
 const {loadClub}=await import('@/lib/clubs/resolver')
 const data=(await loadClub('olympiacos'))!.data
 const core={players:(data.players||[]).map(p=>({id:p.id.replace(/^olympiacos:/,''),value:{name:p.value.name,aliases:p.value.aliases,career:p.value.career}}))}
 const byKey=new Map<string,string|null>(),bySur=new Map<string,string|null>()
 const put=(m:Map<string,string|null>,k:string,id:string)=>{const was=m.get(k);m.set(k,was===undefined||was===id?id:null)}
 for(const p of core.players)for(const n of [p.value.name,...(p.value.aliases||[])]){const k=key(n);if(k.split(' ').length<2)continue;put(byKey,k,p.id);const sk=skeleton(n).split(' ');put(bySur,sk[sk.length-1]!,p.id)}
 // the site writes "Surname Given": its surname is the first word; a surname only one man of the pack and one row of the table carry is a match
 const tableSur=new Map<string,number>();for(const c of table){const k=skeleton(c[0]!).split(' ')[0]!;tableSur.set(k,(tableSur.get(k)||0)+1)}
 const today=new Date().toISOString().slice(0,10),src={id:'olyhist-players',title:'olympiacos-history.gr — Όλοι οι παίκτες του Ολυμπιακού (archive of Tassos Stathopoulos)',url:URL_,publisher:'olympiacos-history.gr',language:'el',checkedAt:today,access:'available'}
 const have=new Map(core.players.map(p=>[p.id,p]))
 const out:Record<string,unknown>[]=[],unmatched:string[]=[]
 let filled=0,kept=0
 for(const c of table){
  const sur=skeleton(c[0]!).split(' ')[0]!
  const id=byKey.get(key(c[0]!))||(tableSur.get(sur)===1?bySur.get(sur):null);if(!id){unmatched.push(c[0]!);continue}
  const apps=Number(c[1]),goals=Number(c[2]),p=have.get(id)!
  const career={apps,goals,basis:'all official competitions (olympiacos-history.gr, from the archive of Tassos Stathopoulos)'}
  if(p.value.career){kept++;continue}
  out.push({id,value:{name:p.value.name,career,sensitive:false},sources:[src.id],confidence:2,status:'approved',researchedAt:today,approvedAt:today,
   approvedBy:'Maor Harel (owner approved olympiacos-history.gr as a source, 13.11.2026)',parserCertainty:'high',conflictFree:true,notes:`Greek name on the site: ${c[0]}.`})
  filled++
 }
 writeFileSync('club-packs/olympiacos/wave-olympiacos-history.json',JSON.stringify({schemaVersion:1,clubId:'olympiacos',contentLocale:'en',sources:[src],players:out,matches:[],kits:[],rivals:[],unmatched},null,1)+'\n')
 console.log(`[olympiacos] careers filled ${filled} · already stated (kept) ${kept} · names the pack does not hold ${unmatched.length}`)
}
if(process.argv[1]?.endsWith('olympiacos-history-players.ts'))main().catch(e=>{console.error(e);process.exit(1)})
