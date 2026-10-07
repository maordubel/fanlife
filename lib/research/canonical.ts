import {createHash} from 'node:crypto'

/**
 * Canonical JSON: object keys sorted at every depth, `undefined` dropped, arrays kept in order.
 * Two values that mean the same thing serialise to the same bytes, so a fingerprint changes only when content does
 * (audit F16, 7.10.2026).
 */
export function canonicalJson(v:unknown):string{
 if(v===null||typeof v!=='object')return JSON.stringify(v===undefined?null:v)
 if(Array.isArray(v))return `[${v.map(x=>canonicalJson(x===undefined?null:x)).join(',')}]`
 const o=v as Record<string,unknown>
 return `{${Object.keys(o).filter(k=>o[k]!==undefined).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`
}
/** A record SET: order-insensitive (each record canonicalised, then the serialisations sorted). */
export const canonicalSet=(rows:readonly unknown[])=>`[${rows.map(canonicalJson).sort().join(',')}]`
export const sha256=(s:string)=>createHash('sha256').update(s).digest('hex')
