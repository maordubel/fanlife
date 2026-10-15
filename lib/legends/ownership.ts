import type {IndexRow} from './store'

/**
 * Guest → account claim (F05), the pure part. A fan who played before signing in holds careers under a device key; after a
 * verified sign-in the server may move them under the account. This plans the move: every guest save comes along, and when
 * the account would end up with more active careers than the cap the surplus — the least recently opened — is ARCHIVED, never
 * deleted. Pure, so a test can read it; the server does the writing (store.claimDeviceCareers).
 */
export type ClaimPlan={move:{id:string;status:IndexRow['status']}[];archived:string[]}
const stamp=(r:IndexRow)=>Date.parse(r.enteredAt??r.createdAt)||0
export function planClaim(guest:IndexRow[],account:IndexRow[],max:number):ClaimPlan{
 const mine=new Set(account.map(r=>r.id)),rows=guest.filter(r=>!mine.has(r.id)&&(r.status as string)!=='deleted')
 const room=Math.max(0,max-account.filter(r=>r.status==='active').length)
 const keep=new Set(rows.filter(r=>r.status==='active').sort((a,b)=>stamp(b)-stamp(a)||a.id.localeCompare(b.id)).slice(0,room).map(r=>r.id))
 const archived:string[]=[]
 const move=rows.map(r=>{if(r.status==='active'&&!keep.has(r.id)){archived.push(r.id);return {id:r.id,status:'archived' as const}}return {id:r.id,status:r.status}})
 return {move,archived}
}
