import {Plate} from '@/components/weekly/Plate'
import css from './derby.module.css'

/**
 * Gate 11's masthead (The Weekly, rule 124): a torn derby-day poster — the club's own plate on one side, floodlit ink on
 * the other, the two names across a "v" burst. The rival is ALWAYS ink and paper: its name prints white on the night
 * side and its crest, when we hold one, prints in one ink (rule 95) — so a rival's colour can never reach a club page.
 * Server-safe (no state): the view hands it the names, the crests it already holds and the documented span.
 */
export function DerbyHero({clubName,rival,clubCrest,rivalCrest,kicker,tag,vs}:{clubName:string;rival:string;clubCrest:string|null;rivalCrest:string|null;kicker:string|null;tag:string|null;vs:string}){
 return <section className={css.hero} aria-label={`${clubName} ${vs} ${rival}`} data-testid="derby-hero">
  <span className={css.heroLit} aria-hidden="true"><span className="wk-speed" style={{['--sx' as string]:'22%',['--sy' as string]:'30%'}}/></span>
  <span className={css.heroNight} aria-hidden="true"/>
  <span className={css.heroCut} aria-hidden="true"/>
  <Plate art="scarf" ink="club" className={css.heroArt}/>
  {kicker&&<p className={css.heroKicker}><bdi>{kicker}</bdi></p>}
  {tag&&<span className={`wk-tag ink ${css.heroTag}`}><bdi>{tag}</bdi></span>}
  <span className={css.heroUs}>
   {clubCrest&&<span className={`wk-roundel ${css.heroCrest}`}><img src={clubCrest} alt="" width={58} height={58}/></span>}
   <b className={css.heroName}><bdi>{clubName}</bdi></b>
  </span>
  <span className={`wk-burst white ${css.heroV}`} aria-hidden="true"><span>{vs}</span></span>
  <span className={css.heroThem}>
   {rivalCrest&&<span className={`wk-roundel ${css.heroCrest} ${css.heroCrestThem}`}><img src={rivalCrest} alt="" width={62} height={62} data-rival="true"/></span>}
   <b className={css.heroName}><bdi>{rival}</bdi></b>
  </span>
 </section>
}
