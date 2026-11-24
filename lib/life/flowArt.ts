import 'server-only'
import {listNames,signedDownload} from '@/lib/stories/media'
import {CLUB_TOWN,LIFE_DIR,lifePath,parseLifeStem,type LifeStem,type LifeTown,type LifeUse} from './flowArtSpec'

/**
 * The LIFE pictures Flow has drawn so far (rule life-flow-art), for the hood renderer. Reads the private bucket's
 * `library/life` folder, never the films' `library/flow`. Fails soft: when storage refuses, is not configured or
 * holds nothing, the answer is empty and the street is drawn from its own geometry as it is today (rules 104, 105).
 * The links are signed and short-lived, so a caller asks again rather than keeping them.
 */
export type LifeArt=LifeStem&{url:string}
export type LifeArtFilter={use?:LifeUse;town?:LifeTown;club?:string;stem?:string}

export async function lifeArt(f:LifeArtFilter={},seconds=3600):Promise<LifeArt[]>{
 try{
  const have=(await listNames(LIFE_DIR,500)).flatMap(n=>{const p=n.endsWith('.png')?parseLifeStem(n.slice(0,-4)):null;return p?[p]:[]})
   .filter(p=>(!f.stem||p.stem===f.stem)&&(!f.use||p.use===f.use)&&(!f.town||p.town===f.town)&&(!f.club||p.club===f.club))
  if(!have.length)return []
  const s=await signedDownload(have.map(p=>lifePath(p.stem)),seconds)
  return have.flatMap(p=>{const url=s[lifePath(p.stem)];return url?[{...p,url}]:[]})
 }catch{return []}
}

/** Everything one club's street can wear: its town's facades (the generic European set when the town has none yet),
 *  its own ground, its town's skyline and district aerial, and the story plates every club shares. */
export type ClubLifeArt={facades:LifeArt[];stadium:LifeArt[];skyline:LifeArt|null;aerial:LifeArt|null;story:Record<string,LifeArt>}
export function pickClubArt(all:LifeArt[],clubId:string):ClubLifeArt{
 const town=CLUB_TOWN[clubId],of=(use:LifeUse,t?:LifeTown)=>all.filter(a=>a.use===use&&(!t||a.town===t))
 const own=town?of('facade',town):[]
 return {
  facades:own.length?own:of('facade','eur'),
  stadium:all.filter(a=>a.use==='stadium'&&a.club===clubId),
  skyline:(town&&of('skyline',town)[0])||null,
  aerial:(town&&of('aerial',town)[0])||null,
  story:Object.fromEntries(of('story').map(a=>[a.key??a.stem,a])),
 }
}
export const clubLifeArt=async(clubId:string):Promise<ClubLifeArt>=>pickClubArt(await lifeArt(),clubId)
