import type {AuditEntry} from './types'
import type {AdminSession} from './admin-token'
/**
 * The control room's log (audit F19). `control.json` keeps the newest AUDIT_KEEP entries; anything older
 * is MOVED — never dropped — to `audit-archive/<YYYY-MM>.jsonl`, one line per entry, by the month it
 * happened. The 1,000-entry truncation this replaces lost history silently.
 */
export const AUDIT_KEEP=5000
export const AUDIT_ARCHIVE_DIR='audit-archive'
/** Who acted, as written into an entry. `owner` only ever comes from a verified session cookie. */
export type AuditActor={actor:string;role?:string}
export const actorOf=(s:AdminSession):AuditActor=>({actor:s.actor,role:s.role})
export const SYSTEM_ACTOR:AuditActor={actor:'system',role:'system'}
const monthOf=(at:unknown)=>typeof at==='string'&&/^\d{4}-\d{2}/.test(at)?at.slice(0,7):'undated'
/** Which entries stay in the file, and which go to which month's archive (oldest first, order kept). */
export function splitAudit(entries:AuditEntry[],keep=AUDIT_KEEP):{kept:AuditEntry[];archive:Record<string,AuditEntry[]>}{
 if(entries.length<=keep)return{kept:entries,archive:{}}
 const cut=entries.length-keep,archive:Record<string,AuditEntry[]>={}
 for(const e of entries.slice(0,cut))(archive[monthOf(e.at)]??=[]).push(e)
 return{kept:entries.slice(cut),archive}
}
export const archiveLines=(rows:AuditEntry[])=>rows.map(r=>JSON.stringify(r)).join('\n')+'\n'
