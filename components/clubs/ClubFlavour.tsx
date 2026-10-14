import type {WorldFlavour} from '@/lib/clubs/world'

/**
 * One small, sourced local touch — a place, a piece of heritage, a word, a moment — printed as the weekly's caption box.
 * `dyk` makes it the issue's one "Did you know?" box (yellow: one per screen). Seasoning on the page, never its subject.
 */
export function ClubFlavour({item,kicker,variant,label}:{item:WorldFlavour|null;kicker:string;variant:'hero'|'terrace'|'dyk';label?:string}) {
 if(!item)return null
 const local=item.local&&<> <bdi className="club-local" lang={item.script} dir="auto">{item.local}</bdi></>
 if(variant==='dyk')return <aside className="wk-dyk wkk-dyk" data-variant={variant} data-kind={item.kind} data-testid="club-flavour" aria-label={kicker}>
  <span className="wk-dyk-lbl" aria-hidden="true">{label??kicker}</span>
  <p className="wkk-dyk-text">{item.line}{local}</p>
 </aside>
 return <aside className="wk-cap white wkk-flavour" data-variant={variant} data-kind={item.kind} data-testid="club-flavour" aria-label={kicker}>
  <small className="wk-k red">{kicker}</small>
  <span className="wkk-flavour-line">{item.line}{local}</span>
 </aside>
}
