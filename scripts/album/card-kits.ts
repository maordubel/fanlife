import {readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {loadClub} from '@/lib/clubs/resolver'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {kitFor} from '@/lib/clubs/rumble-kit'
import type {Stint} from '@/lib/people/model'

/**
 * `tsx scripts/album/card-kits.ts` — THE ALBUM roster (28.11.2026): the shirt every man of the archive wears on a sticker
 * pressed from the owner's card pack (scripts/album/cards.py). The same rule as the edition (scripts/album/curate.ts):
 * the club's measured drawing nearest his years (rule club-shirt-only), a keeper's shirt for a keeper, else the club's
 * classic drawing. Writes content/generated/album-roster-kits.json, keyed by the stint's eid.
 */
const ROOT=process.cwd()
const gen=JSON.parse(readFileSync(path.join(ROOT,'content/generated/people-stints.json'),'utf8')) as {stints:Stint[];clubs:string[]}
async function main(){
 const out:Record<string,string>={}
 for(const club of gen.clubs){
  const data=(await loadClub(club))?.data,w=data?clubWardrobe(data):null
  if(!w)continue
  for(const s of gen.stints.filter(x=>x.club===club)){
   const worn=kitFor({fromYear:s.from,toYear:s.to},'us',w,{keeper:s.pos.includes('GK')})
   const kit=worn.source==='archive'&&worn.kit.svg?worn.kit.svg:w.classic?.home??null
   if(kit)out[s.eid]=kit
  }
 }
 writeFileSync(path.join(ROOT,'content/generated/album-roster-kits.json'),JSON.stringify(out,null,0)+'\n')
 console.log('album:card-kits —',Object.keys(out).length,'shirts')
}
void main()
