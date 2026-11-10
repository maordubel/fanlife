import type {ReactNode} from 'react'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {FixtureCard} from '@/components/clubs/FixtureCard'
import type {wearLivery} from '@/lib/club-livery'
import type {UiLocale} from '@/lib/clubs/locale'

type Props={clubId:string;clubName:string;lv:(Parameters<typeof wearLivery>[0]&{pattern:string})|null|undefined;locale:UiLocale;copy:{kicker:string;vs:string;cta:string;kick?:string};
 /** what stands in when the provider has no confirmed match for this club */
 none:ReactNode;
 /** wraps the card when there is one (the home page's grid cell) */
 wrap?:(card:ReactNode)=>ReactNode}

/**
 * The next match, streamed (review F06, rule 104): a club's page never waits on the fixture provider. The page renders
 * at once and this card arrives when the feed answers — a cold cache, a slow or a failing provider delay only this card.
 */
export async function NextFixture({clubId,clubName,lv,locale,copy,none,wrap}:Props){
 const feed=await getFixtureFeed(new Date()).catch(()=>null),fx=feed?.fixtures.find(f=>f.clubId===clubId)
 if(!fx||!lv)return <>{none}</>
 const card=<FixtureCard clubId={clubId} clubName={clubName} fx={fx} lv={lv} locale={locale} copy={copy}/>
 return <>{wrap?wrap(card):card}</>
}

/** Holds the card's place while the feed answers: the same height, nothing to read, so nothing jumps and nothing misleads. */
export function NextFixtureHold({label}:{label:string}){
 return <div className="wkk-next-hold" aria-busy="true" aria-label={label}/>
}
