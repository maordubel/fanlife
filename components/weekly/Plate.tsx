import type {CSSProperties} from 'react'
import ratios from '@/public/brand/weekly/plates/index.json'

/**
 * A comic plate (rule 124): one of the owner's pictures re-inked as a 1970s comic print, in two layers
 * (scripts/brand/weekly-plates.py) — the line (ink, skin, paper) over a colour band filled with an ink of the page's
 * choosing. `ink="club"` is the club's own colour; the named inks follow the rival lock, so a plate can never print a
 * colour the page has banned. Decorative: always aria-hidden.
 */
export type PlateArt=keyof typeof ratios
export type PlateInk='club'|'red'|'green'|'orange'|'navy'|'cyan'|'ink'
const INK:Record<PlateInk,string>={club:'var(--club-primary, var(--mag-vermilion))',red:'var(--mag-vermilion)',green:'var(--mag-green)',orange:'var(--mag-orange)',navy:'var(--mag-navy)',cyan:'var(--mag-cyan)',ink:'var(--mag-ink)'}
export const PLATE_ARTS=Object.keys(ratios) as PlateArt[]

export function Plate({art,ink='club',className='',style,flip}:{art:PlateArt;ink?:PlateInk;className?:string;style?:CSSProperties;flip?:boolean}){
 return <span aria-hidden="true" data-art={art} className={`wk-plate${flip?' flip':''}${className?` ${className}`:''}`}
  style={{['--plate-line' as string]:`url(/brand/weekly/plates/${art}-line.webp)`,['--plate-tone' as string]:`url(/brand/weekly/plates/${art}-tone.webp)`,['--plate-ink' as string]:INK[ink],['--ar' as string]:ratios[art],...style}}/>
}
