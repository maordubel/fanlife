import type {ClothSpec} from '@/lib/clubs/kit-model'
import type {PixelKit,ReelPlayer,ReelTeam} from './types'

/**
 * What the theatre's boards print for a side (owner, 13.10.2026: "the club crests, and the nice shirts with the logo and the
 * sponsor"). The club's own crest where the repo holds one, otherwise the colour chip of its kit; a man's documented shirt as
 * the garment renderer draws it (maker, sponsor, crest — `KitCloth`) where the archive can draw it, otherwise a plain shirt in
 * the pixel kit's colours. Nothing is invented: no crest file → no crest, no drawable kit → the colours only. Pure.
 */
export type TeamMark={kind:'crest';src:string}|{kind:'chip';background:string}
export function teamMark(t:Pick<ReelTeam,'crest'|'kit'>):TeamMark{
 if(t.crest)return {kind:'crest',src:t.crest}
 const k=t.kit
 return {kind:'chip',background:k.second&&k.pattern!=='plain'?`linear-gradient(90deg,${k.shirt} 0 50%,${k.second} 50% 100%)`:`linear-gradient(90deg,${k.shirt} 0 50%,${k.shorts} 50%)`}
}
export type ShirtArt={kind:'cloth';spec:ClothSpec;crest:string|null}|{kind:'pixel';kit:PixelKit;number:number|null;name:string|null}
/** the side's shirt (front, for a board) or one man's (back, with his name and number — the goal cards) */
export function shirtArt(team:Pick<ReelTeam,'cloth'|'crest'|'kit'>,player?:Pick<ReelPlayer,'cloth'|'kit'|'no'|'name'>,back=false):ShirtArt{
 const cloth=player?player.cloth??null:team.cloth??null,name=player&&back?surname(player.name):null,number=player&&back?player.no:null
 if(cloth)return {kind:'cloth',spec:{...cloth,crest:!!team.crest&&cloth.crest,name,number},crest:team.crest??null}
 return {kind:'pixel',kit:player?.kit??team.kit,number,name}
}
export const surname=(n:string)=>{const p=n.trim().split(/\s+/);return (p.length>1?p[p.length-1]!:p[0]??'').toUpperCase()}
