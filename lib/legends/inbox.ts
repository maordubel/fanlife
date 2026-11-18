import type {CareerView} from './view'
import type {LeagueRatings} from './form'

/**
 * THE INBOX (owner, 18.11.2026: "an INBOX and news like the real manager"). Football Manager's inbox is where the world talks to
 * the manager: the board, the assistant, the physio, the scouts, the press, the league. Ours is read from the career as it stands —
 * nothing is stored, nothing invented: every message is a fact of this career (a result, a table, an injury, a bid, the next
 * opponent's numbers) put in the voice of the desk that would send it. Each message has a stable id, so the screen can remember
 * what was read (the browser keeps that, per career) and the Continue button can say how many are new.
 */
export type InboxFrom='board'|'assistant'|'physio'|'scouts'|'press'|'league'|'transfers'
export type InboxItem={id:string;from:InboxFrom;title:string;body:string;tone:'good'|'bad'|'info'|'urgent';/** season·round it belongs to — newest first */at:number;to?:'match'|'squad'|'market'|'league'|'window';cta?:string}
const ord=(n:number)=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]??'th'}`
const money=(m:number)=>`€${Math.round(m*10)/10}M`

export function inboxOf(v:Omit<CareerView,'inbox'>,ratings?:LeagueRatings):InboxItem[]{
 if(v.phase==='draft')return []
 const out:InboxItem[]=[],now=v.season*100+v.played,me=v.table.findIndex(r=>r.mine),mine=v.table[me]
 // the result, as the assistant reports it
 const L=v.last
 if(L){
  const atHome=L.homeClub===v.clubId,us=atHome?L.goals[0]:L.goals[1],them=atHome?L.goals[1]:L.goals[0],opp=atHome?L.away:L.home
  const r=us>them?'win':us<them?'defeat':'draw',scorers=(L.log??[]).filter(x=>x.kind==='goal'&&x.mine).map(x=>x.text.replace(/^.*?—\s*/,'').split(' (')[0]).slice(0,4)
  out.push({id:`res:${L.id}`,from:'assistant',at:v.season*100+L.round,tone:r==='win'?'good':r==='defeat'?'bad':'info',to:'match',cta:'Watch the highlights',
   title:`${r==='win'?'Victory':r==='defeat'?'Defeat':'A draw'} — ${us}–${them} ${atHome?'v':'at'} ${opp}`,
   body:`${r==='win'?'Three points.':r==='defeat'?'Nothing from this one.':'A point each.'}${scorers.length?` Our goals: ${scorers.join(', ')}.`:''}${mine?` We are ${ord(me+1)} on ${mine.pts} point${mine.pts===1?'':'s'}.`:''}`})
 }
 // the league: who leads, how far we are, the round's loudest result
 if(v.played>0&&v.table.length){
  const top=v.table[0]!,gap=mine?top.pts-mine.pts:0
  const round=Math.max(...v.results.map(r=>r.round).filter(r=>r<=v.rounds),0),loud=v.results.filter(r=>r.round===round&&!r.mine).sort((a,b)=>Math.abs(b.goals[0]-b.goals[1])-Math.abs(a.goals[0]-a.goals[1]))[0]
  out.push({id:`league:${v.season}:${round}`,from:'league',at:v.season*100+round,tone:mine&&me===0?'good':'info',to:'league',cta:'The table',
   title:mine&&me===0?`${v.clubName} top the table`:`${top.name} lead the league`,
   body:`${mine&&me===0?`${v.table[1]?`${v.table[1].name} are ${top.pts-v.table[1].pts} behind.`:''}`:`${top.pts} points after ${top.p}${mine?` — we are ${gap} behind in ${ord(me+1)}`:''}.`}${loud?` Round ${round}'s loudest: ${loud.home} ${loud.goals[0]}–${loud.goals[1]} ${loud.away}.`:''}`})
 }
 // the physio and the referee's book
 for(const s of v.squad){
  if(s.injury>0)out.push({id:`inj:${s.id}:${v.season}:${s.injury}`,from:'physio',at:now,tone:'bad',to:'squad',cta:'Team sheet',title:`${s.name} is injured`,body:`${s.injuryKind?`${s.injuryKind[0]!.toUpperCase()}${s.injuryKind.slice(1)} injury. `:''}Out for ${s.injury} more round${s.injury===1?'':'s'}.`})
  if(s.suspension>0)out.push({id:`ban:${s.id}:${v.season}:${s.suspension}`,from:'press',at:now,tone:'bad',to:'squad',cta:'Team sheet',title:`${s.name} is suspended`,body:`Banned for ${s.suspension} round${s.suspension===1?'':'s'}.`})
 }
 // the scouts: the next opponent, in numbers
 const n=v.next
 if(n&&v.phase!=='window'){
  const o=n.opponent,form=o.report?.form?.length?` Their form: ${o.report.form.join(' ')}.`:'',key=o.report?.keyMen?.length?` Watch ${o.report.keyMen.slice(0,2).map(k=>k.name).join(' and ')}.`:''
  out.push({id:`scout:${n.id}`,from:'scouts',at:now+1,tone:'info',to:'match',cta:'Matchday',title:`Next: ${n.playoff?'the title play-off':n.atHome?`${o.name} at home`:`away at ${o.name}`}`,body:`${o.formation}, their eleven rated ${o.stars.toFixed(1)}★.${form}${key}`})
 }
 // transfers: the window and the offers on the table
 if(v.window){
  const bids=v.window.bids
  out.push({id:`win:${v.season}:${v.window.which}`,from:'transfers',at:now+1,tone:'urgent',to:'window',cta:'Open the window',title:'The transfer window is open',body:`${money(v.cash)} to spend.${bids.length?` ${bids.length} offer${bids.length===1?'':'s'} for your men on the table.`:''}`})
  for(const b of bids)out.push({id:`bid:${b.card}:${b.club}:${b.fee}`,from:'transfers',at:now+1,tone:'info',to:'window',cta:'Answer the bid',title:`${b.clubName} bid ${money(b.fee)} for ${b.name}`,body:b.blocked??`Accept and he leaves today; decline and he stays.`})
 }
 // the board
 if(v.boardForecast!=null&&v.played>0)out.push({id:`board:${v.season}:${Math.floor(v.played/5)}`,from:'board',at:now,tone:'info',title:'A word from the board',body:`On today's table the board's grant for next season would be ${money(v.boardForecast)}. Every place counts.`})
 // the assistant's notes (lineup, quotas, the market)
 for(const a of v.advice)out.push({id:`adv:${a.id}`,from:'assistant',at:now+1,tone:a.severity==='blocker'?'urgent':a.severity==='risk'?'bad':'info',to:a.to,cta:a.cta,title:a.severity==='blocker'?'Before the next match':'Assistant\'s note',body:a.text})
 // form: the man of the moment
 const hot=[...v.squad].filter(s=>s.form&&s.form.games>=2&&s.form.avg!=null).sort((a,b)=>b.form!.avg!-a.form!.avg!)[0]
 if(hot&&hot.form!.avg!>=7)out.push({id:`form:${hot.id}:${v.season}:${v.played}`,from:'press',at:now,tone:'good',to:'squad',cta:'Team sheet',title:`${hot.name} in form`,body:`Averaging ${hot.form!.avg!.toFixed(2)} over ${hot.form!.games} matches${hot.form!.potm?`, ${hot.form!.potm} player-of-the-match award${hot.form!.potm===1?'':'s'}`:''}.`})
 if(ratings?.player&&v.played>=5)out.push({id:`pots:${v.season}:${ratings.player.id}:${Math.floor(v.played/5)}`,from:'league',at:now,tone:ratings.player.mine?'good':'info',to:'league',cta:'League numbers',title:`Player of the season so far: ${ratings.player.name}`,body:`${ratings.player.clubName}, ${ratings.player.avg.toFixed(2)} average in ${ratings.player.games}.`})
 const rank={urgent:0,bad:1,good:2,info:3}
 return out.sort((a,b)=>b.at-a.at||rank[a.tone]-rank[b.tone])
}
