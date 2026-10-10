import type {WorldFlavour} from '@/lib/clubs/world'

/** One small, sourced local touch — a place, a piece of heritage, a word, a moment. Seasoning on the page, never its subject. */
export function ClubFlavour({item,kicker,variant}:{item:WorldFlavour|null;kicker:string;variant:'hero'|'terrace'}) {
 if(!item)return null
 return <aside className="club-flavour" data-variant={variant} data-kind={item.kind} data-testid="club-flavour" aria-label={kicker}>
  <small>{kicker}</small>
  <p>{item.line}{item.local&&<> <bdi className="club-local" lang={item.script} dir="auto">{item.local}</bdi></>}</p>
 </aside>
}
