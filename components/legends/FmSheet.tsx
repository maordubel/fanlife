import type {FmSheet as Sheet} from '@/lib/legends/fm'

/**
 * His manager ratings, the way a Football Manager screen reads them: three groups of 1–20, the key attributes for his position in
 * bold, his best three and his weakest three. Shown only on men in the manager's own squad (the server sends nothing for anyone
 * else). The small print says where the shape came from and that the level is Legends' own, so the clubs stay level.
 */
const GROUP:Record<string,string>={technical:'Technical',mental:'Mental',physical:'Physical',goalkeeping:'Goalkeeping'}
const band=(v:number)=>v>=16?'elite':v>=13?'good':v>=9?'fair':'weak'
const SOURCE:Record<Sheet['source'],string>={game:'From the game databases',partial:'From the game databases, gaps filled by the scouts',estimate:'Scout’s estimate — no game data on him'}
export function FmSheet({fm,name}:{fm:Sheet;name:string}){
 return <section className="lgm-fm" aria-label={`Manager ratings — ${name}`} data-testid="legends-fm-sheet" data-source={fm.source}>
  <header className="lgm-fm-head">
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
