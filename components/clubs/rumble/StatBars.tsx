import type {GameCopy} from '@/lib/clubs/game-copy'
import type {StatsAt} from '@/lib/clubs/rumble-play'
import {tr} from './shared'
import s from './rumble.module.css'

const Row=({label,a,b,fmt=(n:number)=>String(n)}:{label:string;a:number;b:number;fmt?:(n:number)=>string})=>{const t=a+b||1;return <li><span dir="ltr">{fmt(a)}</span><div><p>{label}</p><i data-side="us" style={{inlineSize:`${(a/t)*100}%`}}/><i data-side="them" style={{inlineSize:`${(b/t)*100}%`}}/></div><span dir="ltr">{fmt(b)}</span></li>}
/** the match centre's numbers as paired bars — the same list on the live panel, at half time and at full time */
export function StatBars({stats,copy,testId}:{stats:StatsAt;copy:GameCopy;testId?:string}){
 const U=stats.us,T=stats.them,L=(k:string)=>tr(copy,`rr.mc.stat.${k}`)
 return <ul className={s.statBars} data-testid={testId}>
  <Row label={L('possession')} a={stats.possession.us} b={stats.possession.them} fmt={n=>`${n}%`}/>
  <Row label={L('shots')} a={U.shots} b={T.shots}/>
  <Row label={L('onTarget')} a={U.onTarget} b={T.onTarget}/>
  <Row label={L('xg')} a={U.xg} b={T.xg} fmt={n=>n.toFixed(2)}/>
  <Row label={L('passes')} a={U.passes} b={T.passes}/>
  <Row label={L('corners')} a={U.corners} b={T.corners}/>
  <Row label={L('tackles')} a={U.tackles} b={T.tackles}/>
  <Row label={L('fouls')} a={U.fouls} b={T.fouls}/>
  <Row label={L('booked')} a={U.booked} b={T.booked}/>
 </ul>
}
