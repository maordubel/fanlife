import type {SeasonArchive} from './history'
import type {Fixture,MatchEventRow,SeasonRecord} from './types'

/**
 * The magazine cover (U05): a finished moment of a career turned into a public, narrow snapshot. `CoverData` is built ONLY from a
 * finished, server-saved season (its one-line record and, when it exists, its F04 archive) and holds nothing but the fields below —
 * no owner, account, career id, cash, ledger, full squad, token or cookie. The share link is the manager's ENTRY link, never the
 * career: there is no public results route, so a viewer cannot read a save. Pure.
 */
export type CoverKind='champions'|'season'|'big-win'|'late-winner'
export type CoverData={
 v:1;kind:CoverKind;/** registry club id — drives the colours and the rival-colour policy */club:string;clubName:string;season:number
 headline:string;/** the one big thing: a place, a scoreline */big:string;/** one short line under it */label:string
 lines:string[];star:{name:string;detail:string}|null;/** the stamp in the corner */stamp:string
}
export const COVER_FIELDS=['v','kind','club','clubName','season','headline','big','label','lines','star','stamp'] as const
export const COVER_LINK=(club:string)=>`https://fanlife.dubelteam.com/all-football/legends?club=${encodeURIComponent(club)}`
const ord=(n:number)=>`${n}${n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'}`
const shape=(a:CoverData):CoverData=>Object.fromEntries(COVER_FIELDS.map(k=>[k,a[k]])) as CoverData

export type CoverInput={club:string;clubName:string;record:SeasonRecord;archive:SeasonArchive|null}
/** the moments a finished season can honestly offer; a moment that needs the archive is absent without one */
export function coversFor(i:CoverInput):CoverData[]{
 const {club,clubName,record:r,archive:a}=i,out:CoverData[]=[]
 const base={v:1 as const,club,clubName,season:r.ordinal}
 const star=r.topScorer?{name:r.topScorer.name,detail:`${r.topScorer.goals} goals`}:null
 const recLine=`${r.w} won · ${r.d} drawn · ${r.l} lost`,goalLine=`${r.gf} scored · ${r.ga} conceded`
 if(r.champion)out.push(shape({...base,kind:'champions',headline:'CHAMPIONS',big:`Season ${r.ordinal}`,label:'The title is ours.',lines:[`${r.points} points`,recLine,goalLine],star,stamp:r.playoff?'WON THE PLAY-OFF':'LEAGUE WINNERS'}))
 out.push(shape({...base,kind:'season',headline:`SEASON ${r.ordinal}`,big:`${ord(r.place)} of ${r.of}`,label:r.champion?'Champions':`${r.points} points`,lines:r.champion?[recLine,goalLine]:[recLine,goalLine],star,stamp:'SEASON REVIEW'}))
 if(a){
  const team=(id:string)=>a.table.find(t=>t.club===id)?.name??id,mine=[...a.fixtures,...(a.playoff?[a.playoff]:[])].filter(f=>f.result&&(f.home===club||f.away===club))
  const win=bigWin(mine,club)
  if(win)out.push(shape({...base,kind:'big-win',headline:'BIG WIN',big:`${win.gf}–${win.ga}`,label:`against ${team(win.against)}`,lines:[`Season ${r.ordinal}, round ${win.round}`],star:null,stamp:'MATCH REPORT'}))
  const late=lateDecider(mine,club)
  if(late){const who=a.names[`${club}:${late.player}`]??null
   out.push(shape({...base,kind:'late-winner',headline:late.kind==='winner'?'LATE WINNER':'LATE EQUALISER',big:`${late.gf}–${late.ga}`,label:`against ${team(late.against)}`,lines:[`Season ${r.ordinal}, round ${late.round}`,`${late.minute}′`],star:who?{name:who,detail:`${late.minute}′`}:null,stamp:'MATCH REPORT'}))}
 }
 return out
}
export function bigWin(fx:readonly Fixture[],club:string){
 let best:null|{gf:number;ga:number;against:string;round:number}=null
 for(const f of fx){const side=f.home===club?0:1,gf=f.result!.goals[side],ga=f.result!.goals[1-side]!
  if(gf>ga&&(!best||gf-ga>best.gf-best.ga||(gf-ga===best.gf-best.ga&&(gf>best.gf||(gf===best.gf&&f.round<best.round)))))best={gf,ga,against:side===0?f.away:f.home,round:f.round}}
 return best
}
/**
 * The explicit definition (U05): the LAST goal of the match is the club's, struck at minute 80 or later, and it either put the club
 * one clear from level ("winner") or levelled it from one behind ("equaliser"). Replayed from the goal events in order and refused
 * when the replay does not reproduce the stored score. If several matches qualify: winners first, then the latest minute, then the earliest round.
 */
export function lateDecider(fx:readonly Fixture[],club:string){
 let best:null|{kind:'winner'|'equaliser';gf:number;ga:number;against:string;round:number;minute:number;player:string}=null
 const rank=(x:{kind:string;minute:number;round:number})=>(x.kind==='winner'?1e6:0)+x.minute*100-x.round
 for(const f of fx){
  const r=f.result!,side=f.home===club?0:1
  const goals=[...r.events].filter((e:MatchEventRow)=>e.kind==='goal'&&e.side!==null).sort((a,b)=>a.seq-b.seq)
  const tally:[number,number]=[0,0];for(const g of goals)tally[g.side!]++
  if(!goals.length||tally[0]!==r.goals[0]||tally[1]!==r.goals[1])continue
  const last=goals[goals.length-1]!;if(last.side!==side||last.minute<80||!last.player)continue
  const gf=r.goals[side],ga=r.goals[1-side]!,before=gf-1-ga
  const kind=before===0&&gf-ga===1?'winner':before===-1&&gf===ga?'equaliser':null;if(!kind)continue
  const c={kind,gf,ga,against:side===0?f.away:f.home,round:f.round,minute:last.minute,player:last.player} as const
  if(!best||rank(c)>rank(best))best={...c}
 }
 return best
}
/** the allow-list guard a payload passes before it is drawn or shared */
export function coverOk(x:unknown):x is CoverData{
 const c=x as Record<string,unknown>|null;if(!c||typeof c!=='object')return false
 if(Object.keys(c).some(k=>!(COVER_FIELDS as readonly string[]).includes(k)))return false
 return c.v===1&&typeof c.club==='string'&&typeof c.headline==='string'&&Array.isArray(c.lines)&&c.lines.every(l=>typeof l==='string')
}
