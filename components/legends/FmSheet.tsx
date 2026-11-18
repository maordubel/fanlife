import type {FmSheet as Sheet} from '@/lib/legends/fm'

/**
 * His manager ratings, the way a Football Manager screen reads them: three groups of 1–20, the key attributes for his position in
 * bold, his best three and his weakest three. Shown only on men in the manager's own squad (the server sends nothing for anyone
 * else). The small print says where the shape came from and that the level is Legends' own, so the clubs stay level.
 */
const GROUP:Record<string,string>={technical:'Technical',mental:'Mental',physical:'Physical',goalkeeping:'Goalkeeping'}
const band=(v:number)=>v>=16?'elite':v>=13?'good':v>=9?'fair':'weak'
const SOURCE:Record<Sheet['source'],string>={game:'From the game databases',partial:'From the game databases, gaps filled by the scouts',estimate:'Scout’s estimate — no game data on him'}
/** where he plays, on a little pitch (CM 01/02's position map): his stated role bright, the other lines he can play pale */
const SPOT:Record<string,[number,number][]>={GK:[[50,92]],CB:[[38,76],[62,76]],FB:[[14,70],[86,70]],DM:[[50,61]],CM:[[34,50],[66,50]],AM:[[50,37]],W:[[14,28],[86,28]],ST:[[50,13]]}
const FAMILY:Record<string,string>={GK:'GK',DF:'CB',MF:'CM',FW:'ST'}
function PositionMap({pos,role,alt}:{pos:string;role?:string;alt?:readonly string[]}){
 const main=role??FAMILY[pos]??'CM',others=(alt??[]).map(a=>FAMILY[a]).filter((x):x is string=>!!x&&x!==main)
 return <svg className="lgm-fm-map" viewBox="0 0 100 104" role="img" aria-label={`Plays as ${main}${others.length?`, also ${others.join(', ')}`:''}`}>
  <rect x="3" y="3" width="94" height="98" rx="3"/><line x1="3" y1="52" x2="97" y2="52"/><circle cx="50" cy="52" r="10"/><rect x="28" y="82" width="44" height="19"/><rect x="28" y="3" width="44" height="19"/>
  {others.flatMap(o=>SPOT[o]!.map(([x,y],i)=><circle key={`${o}${i}`} className="lgm-fm-alt" cx={x} cy={y} r="6"/>))}
  {SPOT[main]!.map(([x,y],i)=><circle key={i} className="lgm-fm-dot" cx={x} cy={y} r="7.5"/>)}
 </svg>
}
export function FmSheet({fm,name,pos,role,alt}:{fm:Sheet;name:string;pos:string;role?:string;alt?:readonly string[]}){
 return <section className="lgm-fm" aria-label={`Manager ratings — ${name}`} data-testid="legends-fm-sheet" data-source={fm.source}>
  <header className="lgm-fm-head">
   <PositionMap pos={pos} {...(role?{role}:{})} {...(alt?{alt}:{})}/>
   <p className="lgm-kicker">Manager ratings</p>
   <p className="lgm-fm-ability"><b>{fm.ability.toFixed(1)}</b><small>key average · 1–20</small></p>
  </header>
  <p className="lgm-fm-lines"><span><small>Best</small>{fm.best.join(' · ')}</span><span><small>Weakest</small>{fm.weak.join(' · ')}</span></p>
  <div className="lgm-fm-groups">{fm.groups.map(g=><div key={g.id} className="lgm-fm-group">
   <h4>{GROUP[g.id]}</h4>
   <ul>{g.rows.map(r=><li key={r.k} data-key={r.key||undefined}><span>{r.k}</span><b data-band={band(r.v)}>{r.v}</b></li>)}</ul>
  </div>)}</div>
  <p className="lgm-fine lgm-fm-src">{SOURCE[fm.source]}{fm.edition?` (${fm.edition})`:''}. Scaled to his stars, so every club is measured on the same ground. Bold = key for his position.</p>
 </section>
}
/** what a man you do not own shows instead */
export const HIDDEN_RATINGS='Ratings hidden until he joins your squad'
