import 'server-only'

/** THE ALBUM's owner functions (service role): coupons. The database keeps only each code's SHA-256. */
export async function serviceRpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)throw new Error('The album database is not connected here (no service key).')
 const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store'})
 const j=await r.json().catch(()=>null)
 if(!r.ok)throw new Error((j as {message?:string}|null)?.message??`The album database answered ${r.status}.`)
 return j as T
}
export type Coupon={id:string;label:string;packets:number;maxUses:number|null;uses:number;endsAt:string|null;master:boolean;active:boolean;createdAt:string}
export const listCoupons=()=>serviceRpc<Coupon[]>('worker_album_coupon_list')
export const makeCoupon=(o:{code:string;label:string;packets:number;maxUses:number|null;endsAt:string|null})=>
 serviceRpc<{ok:boolean;error?:string}>('worker_album_coupon_make',{p_code:o.code,p_label:o.label,p_packets:o.packets,p_max_uses:o.maxUses,p_ends_at:o.endsAt,p_master:false})
export const switchOffCoupon=(id:string)=>serviceRpc<unknown>('worker_album_coupon_off',{p_id:id})
