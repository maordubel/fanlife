import {CELEBRATIONS,type Celebration} from './types'
import {fxAllowed} from './fx'
import {KEEPER_SHIRTS,PALETTE,paletteFor,type Palette} from './kit'

/**
 * What a page lets the highlights show, decided on the server where the club's colour policy is known (rule 95): the
 * celebration films whose paint is allowed, whether a booking may be yellow, the pitch's paint, the keeper shirts on offer, and
 * each side's livery colour (a banned one falls to the magazine's navy, or ink). The hub passes no predicate and gets all of it.
 */
export type HighlightsAllow={fx:Celebration[];yellowCard:boolean;palette:Palette;keepers:string[];primary:{us:string;them:string};/** a club page: the pitch-side banners print in one ink (rule 95) */mono:boolean}
const NAVY='#1C2F93',INK='#151515'
export function highlightsAllow(forbidden:((hex:string)=>boolean)|undefined,primary:{us?:string|null;them?:string|null}):HighlightsAllow{
 const ok=(h:string)=>!forbidden||!forbidden(h),safe=(h?:string|null)=>h&&ok(h)?h:ok(NAVY)?NAVY:INK
 return {fx:CELEBRATIONS.filter(c=>fxAllowed(c,forbidden)),yellowCard:ok(PALETTE.cardYellow),palette:paletteFor(forbidden),keepers:KEEPER_SHIRTS().filter(ok),primary:{us:safe(primary.us),them:safe(primary.them)},mono:!!forbidden}
}
