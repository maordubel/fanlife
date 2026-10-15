import type {Fixture,SeasonRecord} from './types'

/**
 * The hall of fame (U04): records across a whole career, made from every season the server still holds in full (F04) and the
 * season in progress. A season is read once whichever way it reaches us (a stored archive and the live season of the same
 * ordinal never both count) and every event is counted under `(season, fixture, seq)`, so reading twice cannot count twice.
 * A man who has been sold stays on the board: names travel with the season they were read from. A season that pre-dates the
 * archive (`summary-only`) gives titles and places — which its one-line record holds — and nothing else, and the board says
 * from which season the detail starts instead of printing a total that looks whole. Derbies, captain histories and anything the
 * data does not hold are not invented. Pure.
 */
export type SeasonSource={ordinal:number;fixtures:readonly Fixture[];names:Readonly<Record<string,string>>;/** the finished season's champion; null while it is in progress */champion:{club:string;name:string}|null}
export type ManRecord={id:string;name:string;goals:number;apps:number;winners:number}
export type Scoreline={gf:number;ga:number;against:string;season:number;round:number}
export type Records={
 /** titles by the club that actually won them (the play-off included) — read from every season's own record */
 titles:number;seasons:number;bestPlace:{place:number;of:number;season:number}|null
 /** the club's men across the career, sold ones included */scorers:ManRecord[];appearances:ManRecord[];decisive:ManRecord[]
 mostGoalsInSeason:{season:number;goals:number}|null
 biggestWin:Scoreline|null;winStreak:{length:number;from:{season:number;round:number}|null;to:{season:number;round:number}|null}
 matches:{played:number;w:number;d:number;l:number}
 /** seasons read in full, and the ones that give titles and places only */
 detail:{full:number[];summaryOnly:number[];firstFull:number|null;note:string|null}
}
const TOP=10
export function buildRecords(mine:string,history:readonly SeasonRecord[],sources:readonly SeasonSource[]):Records{
 const bySeason=new Map<number,SeasonSource>();for(const s of sources)if(!bySeason.has(s.ordinal))bySeason.set(s.ordinal,s)
 const ordinals=[...bySeason.keys()].sort((a,b)=>a-b)
 const seen=new Set<string>(),men=new Map<string,ManRecord>(),perSeason=new Map<number,number>()
 const man=(id:string,name:string)=>{let m=men.get(id);if(!m){m={id,name,goals:0,apps:0,winners:0};men.set(id,m)}else if(name)m.name=name;return m}
 const once=(...k:(string|number)[])=>{const key=k.join('\u0000');if(seen.has(key))return false;seen.add(key);return true}
 let played=0,w=0,d=0,l=0,biggest:Scoreline|null=null,run=0,runFrom:{season:number;round:number}|null=null
 let best:Records['winStreak']={length:0,from:null,to:null}
 for(const o of ordinals){
  const s=bySeason.get(o)!
  const fx=[...s.fixtures].filter(f=>f.result&&(f.home===mine||f.away===mine)).sort((a,b)=>a.round-b.round)
  for(const f of fx){
   const r=f.result!,side=f.home===mine?0:1,gf=r.goals[side],ga=r.goals[1-side]!
   if(!once('m',o,f.id))continue
   played++;if(gf>ga)w++;else if(gf===ga)d++;else l++
   const against=side===0?f.away:f.home
   if(gf>ga&&(!biggest||gf-ga>biggest.gf-biggest.ga||(gf-ga===biggest.gf-biggest.ga&&gf>biggest.gf)))biggest={gf,ga,against,season:o,round:f.round}
   if(gf>ga){if(!run)runFrom={season:o,round:f.round};run++;if(run>best.length)best={length:run,from:runFrom,to:{season:o,round:f.round}}}else run=0
   const nm=(id:string)=>s.names[`${mine}:${id}`]??id
   for(const p of r.sides?.[side]?.xi??[])if(once('a',o,f.id,p.id))man(p.id,p.name).apps++
   let mineGoals=0
   for(const e of r.events){
    if(e.side!==side||!e.player)continue
    if(e.kind==='sub'&&r.sides&&once('s',o,f.id,e.seq))man(e.player,nm(e.player)).apps++
    if(e.kind==='goal'&&once('g',o,f.id,e.seq)){
     man(e.player,nm(e.player)).goals++;perSeason.set(o,(perSeason.get(o)??0)+1)
     mineGoals++
     // the winning goal of a one-goal win: the goal that put the club one clear of the other side's final tally
     if(gf-ga===1&&mineGoals===ga+1)man(e.player,nm(e.player)).winners++
    }
   }
  }
 }
 const rank=(v:(m:ManRecord)=>number)=>[...men.values()].filter(m=>v(m)>0).sort((a,b)=>v(b)-v(a)||a.name.localeCompare(b.name)).slice(0,TOP)
 const full=ordinals.filter(o=>bySeason.get(o)!.fixtures.some(f=>f.result)),fullSet=new Set(full)
 const summaryOnly=history.map(h=>h.ordinal).filter(o=>!fullSet.has(o)).sort((a,b)=>a-b)
 const firstFull=full.length?full[0]!:null
 const bestPlace=history.reduce<Records['bestPlace']>((b,h)=>!b||h.place<b.place||(h.place===b.place&&h.of>b.of)?{place:h.place,of:h.of,season:h.ordinal}:b,null)
 const topSeason=[...perSeason.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]
 return {
  titles:history.filter(h=>h.champion).length,seasons:history.length,bestPlace,
  scorers:rank(m=>m.goals),appearances:rank(m=>m.apps),decisive:rank(m=>m.winners),
  mostGoalsInSeason:topSeason?{season:topSeason[0],goals:topSeason[1]}:null,
  biggestWin:biggest,winStreak:best,matches:{played,w,d,l},
  detail:{full,summaryOnly,firstFull,note:summaryOnly.length&&firstFull!==null?`Detailed records available from season ${firstFull}.`:summaryOnly.length?'Detailed records begin with your next finished season.':null}
 }
}
