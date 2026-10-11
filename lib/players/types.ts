/**
 * Player Control Center — the owner's edits to a man, kept apart from the archive.
 * An override is a MASK: a key that is present is an explicit decision, a key that is absent inherits the archive.
 *   price     1–5 whole millions (the Rumble price at THIS club)
 *   positions [primary, ...secondary]; [] means "explicitly unknown" (not "inherit")
 *   rating    the hidden strength the games use (the "manager score"), 40–99
 *   removed   the man is taken out of the squad (a mistake in the archive) — reversible, audited, never a delete
 * Identity is `(clubId, playerId)`; a name is never a key.
 */
export type Pos='GK'|'DF'|'MF'|'FW'
export const POSITIONS:readonly Pos[]=['GK','DF','MF','FW']
export type Price=1|2|3|4|5
export const RATING_MIN=40,RATING_MAX=99
export type Override={price?:Price;positions?:Pos[];rating?:number;removed?:true;note?:string;rev:number;by:string;at:string;reason:string}
/** what an editor sends: `null` clears the field (back to the archive), a value sets it, absent leaves it alone */
export type Patch={price?:Price|null;positions?:Pos[]|null;rating?:number|null;removed?:boolean|null;note?:string|null}
export type Snapshot={revision:number;updatedAt:string;overrides:Record<string,Override>}
export const EMPTY_SNAPSHOT:Snapshot={revision:0,updatedAt:'',overrides:{}}
export const keyOf=(club:string,id:string)=>`${club}|${id}`
export type Draft={patch:Patch;baseRev:number;by:string;at:string}
export type AuditEvent={id:string;at:string;actor:string;role:string;action:'publish'|'revert'|'draft'|'discard';club:string;player:string;before:Override|null;after:Override|null;reason:string;revision:number}
