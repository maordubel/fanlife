import {readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {buildRegistry,type Candidate,type Link,type Stint} from '@/lib/people/model'
import {curateWing,type EditionFile} from '@/lib/album/curate'
import {livery} from '@/lib/club-livery'
import {REGISTRY} from '@/lib/master/registry'
import {codes as CODES} from '../../content/manual/album-codes.json'
import {loadClub} from '@/lib/clubs/resolver'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {kitFor} from '@/lib/clubs/rumble-kit'

/**
 * `npm run album:curate` — THE ALBUM, edition one (18.11.2026): 36 stickers per club, six pages of six.
 * Reads the People Registry (repository verdicts) and writes `content/generated/album-edition-1.json`. The page plan and the
 * choice are `lib/album/curate.ts` (pure, tested). The owner can re-curate on the desk later; this is the starting set.
 */
const ROOT=process.cwd()
const read=<T>(f:string)=>JSON.parse(readFileSync(path.join(ROOT,f),'utf8')) as T
const gen=read<{stints:Stint[];candidates:Candidate[];clubs:string[]}>('content/generated/people-stints.json')
const links=read<{links:Link[]}>('content/manual/people-links.json').links
const reg=buildRegistry(gen.stints,links,gen.candidates)
async function main(){
const out:EditionFile={edition:1,builtOn:new Date().toISOString().slice(0,10),wings:{}}
for(const club of gen.clubs){
 const wing=curateWing(club,gen.stints.filter(s=>s.club===club),s=>reg.personOf(s.club,s.eid)?.id??s.id)
 if(!wing.length)continue
 // the shirt a man without a free photo wears on his sticker (owner, 18.11.2026): the club's measured drawing nearest his
 // years (rule club-shirt-only), else the club's classic drawing; the press and the album's drawn figure both wear it
 const data=(await loadClub(club))?.data,w=data?clubWardrobe(data):null
 for(const s of wing){
  const worn=w?kitFor({fromYear:s.from,toYear:s.to},'us',w,{keeper:s.pos.includes('GK')}):null
  s.kit=worn?.source==='archive'&&worn.kit.svg?worn.kit.svg:w?.classic?.home??null
 }
 out.wings[club]=wing
}
// the frame's colours for the sticker press (scripts/album/stickers.py): the club's own livery, never a hand-picked hex
const clubs=Object.fromEntries(Object.keys(out.wings).map(id=>{const l=livery(id),r=REGISTRY.find(c=>c.id===id);return [id,{name:r?.name??id,primary:l?.primary??'#1b1b1b',on:l?.on??'#FFFFFF',initials:l?.initials??id.slice(0,2).toUpperCase(),code:(CODES as Record<string,string>)[id]??id.replace(/[^a-z]/g,'').slice(0,3).toUpperCase()}]}))
writeFileSync(path.join(ROOT,'content/generated/album-clubs.json'),JSON.stringify(clubs,null,1)+'\n')
writeFileSync(path.join(ROOT,'content/generated/album-edition-1.json'),JSON.stringify(out,null,1)+'\n')
console.log('album:curate —',Object.entries(out.wings).map(([k,v])=>`${k}:${v.length}`).join(' '))
}
void main()
