/**
 * THE ALBUM — what the screens draw (18.11.2026). Pure: the server hands in the catalog, the fan's copies (from
 * `worker_album_me`) and the pressed-sticker ledger; nothing here decides anything the database decides.
 */
export type Variant='base'|'silver'|'gold'
export type CatalogRow=[id:string,club:string,slot:number,page:number,person:string,name:string]
export type CopyRow=[id:string,copies:number,stuck:boolean,best:Variant]
export type Waiting={id:string;kind:'daily'|'starter'|'bonus'|'pick'|'trade'|'swap'|'coupon';stickers:string[];variants:Variant[];fresh:boolean[]}
export type Book={wing:string;cover:{name?:string};picks:number;weekDays:number;claimedToday:boolean|null;envelopes:number;since:string}
export type Me={ok:boolean;today:string;book:Book|null;copies?:CopyRow[];waiting?:Waiting[]}
export type Pressed={file:string;status:'photo'|'silhouette';frame?:'club'|'archive'|null;source?:{author:string;license:string;page:string;licenseUrl?:string;file?:string}|null;traits?:unknown}
export type WingInfo={id:string;name:string;primary:string;on:string;initials:string;code:string;crest:string|null}
export type Slot={id:string;slot:number;page:number;person:string;name:string;era:string;have:boolean;stuck:boolean;copies:number;best:Variant;image:string|null;credit:Pressed['source'];archive:boolean;code:string;kit:string|null}
export type Page={no:number;era:string;slots:Slot[];done:number}
export type Wing={info:WingInfo;pages:Page[];have:number;stuck:number;total:number;spares:number}

/** a short mark of what the press made (photo or drawn face): a new pressing gets a new address, so no cache keeps the old one */
export function pressMark(p:Pressed):string{
 const t=JSON.stringify([p.status,p.frame,p.source?.file??null,p.traits??null])
 let h=2166136261
 for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}
 return (h>>>0).toString(36)
}

export function wingView(info:WingInfo,catalog:readonly CatalogRow[],copies:readonly CopyRow[],pressed:Readonly<Record<string,Pressed>>,eras:Readonly<Record<string,string>>,kits:Readonly<Record<string,string>>={}):Wing{
 const mine=new Map(copies.map(c=>[c[0],c]))
 const rows=catalog.filter(r=>r[1]===info.id).sort((a,b)=>a[2]-b[2])
 const slots:Slot[]=rows.map(([id,,slot,page,person,name])=>{const c=mine.get(id),p=pressed[id]
  return {id,slot,page,person,name,era:eras[id]??'',have:!!c&&c[1]>0,stuck:!!c?.[2],copies:c?.[1]??0,best:c?.[3]??'base',image:p?.file?`${p.file}?v=${pressMark(p)}`:null,credit:p?.status==='photo'?p.source??null:null,archive:p?.frame==='archive',code:stickerCode(info.code,slot),kit:kits[id]??null}})
 const pages=[...new Set(slots.map(s=>s.page))].sort((a,b)=>a-b).map(no=>{const s=slots.filter(x=>x.page===no);return {no,era:s[0]?.era??'',slots:s,done:s.filter(x=>x.stuck).length}})
 return {info,pages,have:slots.filter(s=>s.have).length,stuck:slots.filter(s=>s.stuck).length,total:slots.length,spares:slots.reduce((n,s)=>n+Math.max(0,s.copies-1),0)}
}

/** five spare copies to trade in, most-duplicated first (one of each always stays in the album) */
export function spareFive(wings:readonly Wing[]):string[]|null{
 const pool:string[]=[]
 const all=wings.flatMap(w=>w.pages.flatMap(p=>p.slots)).filter(s=>s.copies>1).sort((a,b)=>b.copies-a.copies||a.id.localeCompare(b.id))
 for(const s of all)for(let i=1;i<s.copies&&pool.length<5;i++)pool.push(s.id)
 return pool.length===5?pool:null
}

/** "N days to the pick": five collecting days in a week earn one */
export const daysToPick=(weekDays:number)=>Math.max(0,5-weekDays)

/** the sticker's name in the album: AEK–05 (owner, 18.11.2026) — what a fan asks for and swaps */
export const stickerCode=(code:string,slot:number)=>`${code}\u2013${String(slot).padStart(2,'0')}`
