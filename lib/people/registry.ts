import 'server-only'
import stintsJson from '@/content/generated/people-stints.json'
import linksJson from '@/content/manual/people-links.json'
import {readJson,update} from '@/lib/players/store'
import {Refusal,type Actor} from '@/lib/players/service'
import {buildRegistry,linkKey,type Candidate,type Link,type Registry,type Stint,type StintKey} from './model'

/**
 * The People Registry reader (18.11.2026). Server-only: the stints carry the hidden ratings (rule 4) and the file is ~2 MB.
 *
 * Verdicts come from two places and the later one wins: the repository (`content/manual/people-links.json` — the Wikidata
 * pass and anything reviewed into the repo) and the owner's desk (`players/people-links.json` in the durable store, the same
 * store as every published player change). A desk decision shows on every screen at once; nothing is ever re-guessed.
 */
const GEN=stintsJson as unknown as {stints:Stint[];candidates:Candidate[]}
const REPO=(linksJson as unknown as {links:Link[]}).links
const FILE='people-links.json'
type DeskFile={links:Record<string,Link&{by:string}>}
const EMPTY:DeskFile={links:{}}
const byKey=new Map(GEN.stints.map(s=>[s.key,s]))

let cached:{sig:string;reg:Registry}|null=null
export async function deskLinks():Promise<(Link&{by:string})[]>{const f=await readJson<DeskFile>(FILE,EMPTY).catch(()=>EMPTY);return Object.values(f.links??{})}
/** the registry with the owner's decisions applied; rebuilt only when they change */
export async function people():Promise<Registry>{
 const desk=await deskLinks()
 const sig=desk.map(l=>`${linkKey(l.a,l.b)}=${l.verdict}`).sort().join(',')
 if(cached?.sig===sig)return cached.reg
 const reg=buildRegistry(GEN.stints,[...REPO,...desk],GEN.candidates)
 cached={sig,reg};return reg
}
/** the registry without the desk (a build, a test, a page that must not wait on the store) */
let repoOnly:Registry|null=null
export const peopleFromRepo=():Registry=>repoOnly??=buildRegistry(GEN.stints,REPO,GEN.candidates)

export async function decide(a:StintKey,b:StintKey,verdict:'same'|'different',who:Actor){
 if(a===b)throw new Refusal(400,'Choose two different records.')
 const sa=byKey.get(a),sb=byKey.get(b)
 if(!sa||!sb)throw new Refusal(404,'No such player record.')
 if(sa.club===sb.club)throw new Refusal(400,'Both records are at one club — use Merge duplicates for that.')
 const key=linkKey(a,b),on=new Date().toISOString()
 await update<DeskFile>(FILE,EMPTY,f=>({links:{...(f.links??{}),[key]:{a,b,verdict,basis:'owner',evidence:who.actor,on,by:who.actor}}}))
 cached=null;return {key}
}
export async function undecide(a:StintKey,b:StintKey){
 const key=linkKey(a,b)
 await update<DeskFile>(FILE,EMPTY,f=>{const n={...(f.links??{})};delete n[key];return {links:n}})
 cached=null;return {key}
}
