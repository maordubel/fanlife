import inventory from '@/docs/fanlife/drive-library/inventory.json'

/**
 * THE PICTURE LIBRARY (owner, 12.11.2026: "use the library we already have through the studio — one brand line").
 * The shop invents no artwork. Every product is printed from a picture in the owner's Drive library — the same
 * inventory the Football Stories studio draws on (docs/fanlife/drive-library) — or from a picture he uploads himself.
 * The library is public by link, so Printify fetches the original file straight from Drive; nothing is copied here.
 */
export type LibraryPicture={id:string;name:string;folder:string;subject:string;approved:boolean;review:boolean;bytes:number}
type Row={id:string;path:string;name:string;mime:string;bytes:number|null}
/** which subject a folder belongs to: a club by its folder, everything else is FAN LIFE's own shelf (usable for any club) */
const OWNER:[RegExp,string][]=[[/AEK/i,'aek-athens'],[/Panathinaikos/i,'panathinaikos'],[/Olympiacos/i,'olympiacos'],[/Zrinjski/i,'zrinjski-mostar'],[/The Worker|Hapoel|סופרגול/i,'hapoel-tel-aviv']]
/** not artwork for a product: other apps' logos, concept sheets, previews, working frames, documents */
const SKIP=/Shared Brands|Product_Concepts|\/preview$|source-frames|^05_|^99_|Motion_Tests|Props_Shirts_and_Badges/i
/** drawn over photographs or archive material: may need permission before it is sold (the library's own guide says so) */
const REVIEW=/Photo_Based|Drafts|סופרגול/i
const MAX_BYTES=20e6
export const LIBRARY:LibraryPicture[]=(inventory.files as Row[])
 .filter(f=>/^image\/(png|jpe?g)$/.test(f.mime)&&f.path&&!SKIP.test(f.path)&&(f.bytes??0)>60e3&&(f.bytes??0)<=MAX_BYTES)
 .map(f=>({id:f.id,name:f.name,folder:f.path.split('/').slice(1).join(' / ')||f.path,subject:OWNER.find(([re])=>re.test(f.path))?.[1]??'fanlife',approved:/Approved Graphics|01_Brand_Logos|fanlife_graphic_kit|Club_Stickers/i.test(f.path),review:REVIEW.test(f.path),bytes:f.bytes??0}))
export const pictureById=(id:string)=>LIBRARY.find(p=>p.id===id)??null
/** the pictures a subject may print: its own shelf first, then FAN LIFE's shared shelf */
export const picturesFor=(subject:string)=>[...LIBRARY.filter(p=>p.subject===subject),...(subject==='fanlife'?[]:LIBRARY.filter(p=>p.subject==='fanlife'))]
/** Drive addresses of a public file: a thumbnail for the desk, the original for the printer */
export const thumb=(id:string,w=400)=>`https://drive.google.com/thumbnail?id=${id}&sz=w${w}`
export const original=(id:string)=>`https://drive.usercontent.google.com/download?id=${id}&export=download`
/** a title from a file name: "03-matchday-walk.png" → "Matchday Walk" */
export const titleOf=(name:string)=>name.replace(/\.[a-z0-9]+$/i,'').replace(/^[\d_\-. ]+/,'').replace(/[_-]+/g,' ').replace(/\b[0-9a-f]{8}\b|\b\dK\b|\b1080p\b/gi,'').replace(/\s+/g,' ').trim().replace(/\b\p{L}/gu,c=>c.toUpperCase()).slice(0,60)||'FAN LIFE print'
