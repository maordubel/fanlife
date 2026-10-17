import {NextRequest, NextResponse} from 'next/server'
import {cronAuthorized} from '@/lib/master/request'
import {fileArea} from '@/lib/master/files'
import {getDestination} from '@/lib/final-whistle/service'
import {countdownOf,readRoundLock} from '@/lib/promo/roundLock'
export const dynamic='force-dynamic'
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
const area=fileArea('promo')
type Sent={[key:string]:string}
/**
 * The 12-hour reminder. The scheduler asks `GET`: is a message due, and for which chat? It sends it (the bot token lives in Actions)
 * and confirms with `POST`, which stamps the round+lock time so the same lock is announced once. A moved lock time is a new announcement.
 */
export async function GET(r:NextRequest){
 if(!cronAuthorized(r))return json({error:'Not authorised.'},401)
 const now=Date.now(),lock=await readRoundLock(),c=countdownOf(lock,now)
 if(!lock||!c)return json({due:false,reason:lock?'outside the window':'no round'})
 const dest=await getDestination()
 if(!dest)return json({due:false,reason:'no Telegram chat linked'})
 const stamp=`${lock.code}@${lock.lockAt}`,sent=await area.readJson<Sent>('dubid-lock-sent.json',{})
 if(sent[stamp])return json({due:false,reason:'already sent',stamp})
 return json({due:true,stamp,chatId:dest.chatId,number:lock.number,lockAt:lock.lockAt,hours:c.hours})
}
export async function POST(r:NextRequest){
 if(!cronAuthorized(r))return json({error:'Not authorised.'},401)
 let b:Record<string,unknown>={};try{b=await r.json()}catch{/* empty */}
 const stamp=typeof b.stamp==='string'?b.stamp.slice(0,120):''
 if(!/^[a-z0-9-]+@\d{4}-\d{2}-\d{2}T/i.test(stamp))return json({error:'stamp is required.'},400)
 // `release` hands the claim back after Telegram definitely refused the message, so the next run may try again.
 if(b.release===true){await area.update<Sent>('dubid-lock-sent.json',{},cur=>{const n={...cur};delete n[stamp];return n});return json({ok:true,released:true})}
 // The claim is taken BEFORE the message goes out: at most one runner wins it, so a lost confirmation can never cause a repeat.
 let already=false
 await area.update<Sent>('dubid-lock-sent.json',{},cur=>{already=!!cur[stamp];if(already)return cur;const keep=Object.entries(cur).slice(-40);return {...Object.fromEntries(keep),[stamp]:new Date().toISOString()}})
 return already?json({ok:false,error:'already claimed',already:true},409):json({ok:true})
}
