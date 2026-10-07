import 'server-only'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {ADMIN_COOKIE,cookieValue,loginPath,sessionFrom,type AdminSession} from './admin-token'
import {cronAuthorized} from './request'
/**
 * One gate for every admin page and every admin API action (audit F01). Evaluation mode is the
 * fans' preview of the gates; it never opens the control room. See `admin-token.ts` for policy.
 */
const env=()=>({FAN_LIFE_ADMIN_KEY:process.env.FAN_LIFE_ADMIN_KEY,NODE_ENV:process.env.NODE_ENV})
/** The admin session of the current request (server components, server actions), or null. */
export function adminSession():AdminSession|null{return sessionFrom(env(),cookies().get(ADMIN_COOKIE)?.value)}
/** Pages: the session, or a redirect to the login page that comes back to `next`. */
export function requireAdmin(next:string):AdminSession{const s=adminSession();if(!s)redirect(loginPath(next));return s}
/** API routes: the session from the request's own Cookie header, or null (→ 401). */
export function adminFromRequest(r:Request):AdminSession|null{return sessionFrom(env(),cookieValue(r.headers.get('cookie')))}
/** The scheduler: either the owner's cookie or the existing CRON_SECRET bearer header. */
export function adminOrCron(r:Request):AdminSession|{actor:'scheduler';role:'cron'}|null{if(cronAuthorized(r))return{actor:'scheduler',role:'cron'};return adminFromRequest(r)}
