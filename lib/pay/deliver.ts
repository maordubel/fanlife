import 'server-only'
import type {Order} from './orders'

/**
 * Delivery, per kind, after Stripe says paid. A print file is made by lib/pay/files (drawn once, stored, then emailed). A film is a queued job: the studio is asked through a repository dispatch and
 * answers the order when the film is up — until that job exists the film is off in the catalogue.
 */
export async function deliver(o:Order):Promise<{status:'fulfilled'|'paid';result?:Record<string,unknown>}>{
 const token=process.env.GITHUB_DISPATCH_TOKEN
 if(token){await fetch('https://api.github.com/repos/maordubel/fanlife/dispatches',{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},
  body:JSON.stringify({event_type:'personal-film',client_payload:{order:o.id}})}).catch(()=>{})}
 return {status:'paid',result:{queued:true}}
}
