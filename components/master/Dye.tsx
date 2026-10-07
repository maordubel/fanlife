import type {CSSProperties} from 'react'

/**
 * A press photograph printed in one ink: the owner's element sheet (7.10.2026), cut to greyscale by
 * `scripts/brand/magazine-elements.py`, dyed here in the club's colour (or any `ink`) with a CSS mask
 * and a multiply layer. One file serves every club; a grey pixel has no hue, so none can turn yellow.
 * Decorative only — always aria-hidden; the words around it carry the meaning.
 */
export const DYE_ART={
 kicker:1000/1007,
 shirt:252/413,
 'terrace-scarf':500/372,
 'boot-ball-ticket':493/419,
 face:454/481,
 'net-keeper':486/479,
 'shirt-swap':900/823,
} as const
export type DyeArt=keyof typeof DYE_ART

export function Dye({art,ink,className='',soft=false,style}:{art:DyeArt;ink?:string;className?:string;soft?:boolean;style?:CSSProperties}){
 return <span aria-hidden="true" className={`mag-dye${soft?' soft':''} ${className}`} data-art={art} style={{['--art' as string]:`url(/brand/magazine/elements/${art}.webp)`,['--ar' as string]:DYE_ART[art],...(ink?{['--dye' as string]:ink}:{}),...style}}/>
}
