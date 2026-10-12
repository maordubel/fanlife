import {forbiddenColor,type ClubTheme} from '@/lib/clubs/theme'

/**
 * The LEGENDS MANAGER banner on a club's home (owner, 12.10.2026: "a dedicated banner on every club page"). It wears the
 * feature's own paint — night navy, bronze laurels, one vermilion star — and rule 95 still holds on a club page: any of the three
 * a club bans steps aside (navy → ink, vermilion star → bronze, bronze → paper). The hexes mirror the tokens in
 * `app/magazine.css` (--mag-navy, --mag-vermilion) and `app/all-football/legends/legends.css` (--lgm-bronze); the CSS reads
 * the choice from data attributes, never a colour from here.
 */
export const LEGENDS_PAINT={navy:'#1b2a5e',vermilion:'#b02d10',bronze:'#A35E2A'} as const
export type BannerPaint={night:'navy'|'ink';star:'vermilion'|'bronze'|'paper';bronze:'bronze'|'paper'}
export function bannerPaint(theme:ClubTheme):BannerPaint{
 const no=(hex:string)=>forbiddenColor(theme,hex)
 const bronze=no(LEGENDS_PAINT.bronze)?'paper':'bronze'
 return {night:no(LEGENDS_PAINT.navy)?'ink':'navy',bronze,star:no(LEGENDS_PAINT.vermilion)?bronze:'vermilion'}
}
/** the front door's address, with the club already chosen */
export const legendsHref=(club:string)=>`/all-football/legends?club=${encodeURIComponent(club)}#lgm-roll-h`
