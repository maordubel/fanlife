import 'server-only'
import type {ClubData} from './contract'
import type {Debate} from '@/lib/polls/debates'
import {debateRound} from '@/lib/polls/debate-engine'
import {gameCopy} from './game-copy'
import type {UiLocale} from './locale'
import {yearOfOn} from './polls-duel/pool'
import {localizedDate} from './locale'
import {englishPlayer} from './rumble-xi/names'
import {SOMBRE} from '@/lib/trivia/forge'
import {englishTimeline,englishTitle} from './title-en'
import {readNights} from './mystery-forge'
/** `from`/`to` are the recorded years of a choice (a player's span, an event's year) — optional, null when the record has none; the duel's period filter reads them */
export type ClubPollChoice={id:string;name:string;from?:number|null;to?:number|null}
export type ClubPoll={id:string;prompt:string;choices:ClubPollChoice[]}
/** Opinion prompts make no new historical or culture claims. Options are eligible records. */
export function clubPolls(data:ClubData,locale:UiLocale):ClubPoll[]{
 const copy=gameCopy(locale),events=pollChoices(data),players=(data.players||[]).map(f=>englishPlayer(data.identity.id,f.value)).map(v=>({id:v.id,name:v.name,from:v.fromYear,to:v.toYear}))
 return [...(events.length>=2?['pollReplay','pollStory','pollCalendar'] as const:[]).map(id=>({id,prompt:copy[id],choices:events})),...(players.length>=2?['pollCaptain','pollMeet','pollFirstXI'] as const:[]).map(id=>({id,prompt:copy[id],choices:players}))]
}
export function clubPollRound(data:ClubData,locale:UiLocale,seed:number,cursor:number):ClubPoll[]{
 const pool=clubPolls(data,locale),byId=new Map(pool.map(p=>[p.id,p]))
 return debateRound(seed,cursor,pool.map(p=>({id:p.id,promptHe:p.prompt,kind:'match'} as Debate))).debates.map(p=>byId.get(p.id)!)
}

/**
 * The nights worth an opinion: a final, a title, a derby, a European night, a first — read from the club's own approved
 * timeline, spread across its decades (the latest hundred rows were mostly last season's league rounds), never a loss of
 * life (remembered on the timeline, never voted on), and in the record's own order.
 */
const LATIN=/^[\x00-\u024f\u2010-\u2027\u2032\u00b7\s]+$/,LEDGER=/\b(incomplete|abandoned|awarded|walkover|annulled|not played)\b/i
const NOTABLE=/\b(final|champion\w*|title|cup|derby|europe\w*|promot\w*|record|first|founded|won|win|double|treble|stadium|ground)\b/i
export function pollEvents(data:ClubData,max=48):ClubData['timeline']{
 const ok=englishTimeline(data.timeline).filter(f=>!SOMBRE.test(f.value.title)&&!LEDGER.test(f.value.title)&&LATIN.test(f.value.title))
 const pool=ok.filter(f=>NOTABLE.test(f.value.title))
 const byDecade=new Map<number,typeof pool>()
 for(const f of pool){const d=Math.floor((yearOfOn(f.value.on)??0)/10)*10;byDecade.set(d,[...(byDecade.get(d)??[]),f])}
 const out:typeof pool=[],lanes=[...byDecade.entries()].sort((a,b)=>a[0]-b[0]).map(([,xs])=>xs)
 for(let i=0;out.length<max&&lanes.some(l=>l.length>i);i++)for(const l of lanes){const f=l[l.length-1-i];if(f&&out.length<max)out.push(f)}
 return out.sort((a,b)=>a.value.on.localeCompare(b.value.on))
}

/** Poll choices for the club's nights: its notable English timeline, and — where the timeline is not in English (Hapoel
 * Tel Aviv's is The Worker's Hebrew) — its finals, derbies and European nights, printed from the match records in English. */
export function pollChoices(data:ClubData):ClubPollChoice[]{
 const fromTimeline=pollEvents(data).map(f=>{const y=yearOfOn(f.value.on);return {id:f.id,name:`${englishTitle(f.value.title)} · ${localizedDate(f.value.on,'en')}`,from:y,to:y}})
 if(fromTimeline.length>=24)return fromTimeline
 const nights:ClubPollChoice[]=readNights(data).filter(n=>n.us!==null&&n.them!==null&&(n.kind==='europe'||n.derby||/final/i.test(n.comp))).map(n=>{
  const y=yearOfOn(n.on),line=n.home===false?`${n.opp} ${n.them}-${n.us} ${data.identity.name}`:`${data.identity.name} ${n.us}-${n.them} ${n.opp}`
  return {id:n.id,name:`${line} — ${n.comp} · ${localizedDate(n.on,'en')}`,from:y,to:y}
 })
 const byDecade=new Map<number,ClubPollChoice[]>();for(const n of nights){const d=Math.floor((n.from??0)/10)*10;byDecade.set(d,[...(byDecade.get(d)??[]),n])}
 const out:ClubPollChoice[]=[],lanes=[...byDecade.values()]
 for(let i=0;out.length<48&&lanes.some(l=>l.length>i);i++)for(const l of lanes){const n=l[l.length-1-i];if(n&&out.length<48)out.push(n)}
 const all=[...fromTimeline,...out]
 // a club with neither: its latest recorded rows, as before
 if(all.length<12)for(const f of data.timeline.slice(-48).reverse()){if(all.length>=48)break;if(SOMBRE.test(f.value.title)||!LATIN.test(englishTitle(f.value.title))||all.some(c=>c.id===f.id))continue;const y=yearOfOn(f.value.on);all.push({id:f.id,name:`${englishTitle(f.value.title)} · ${localizedDate(f.value.on,'en')}`,from:y,to:y})}
 return all.slice(0,48).sort((a,b)=>(a.from??0)-(b.from??0))
}
