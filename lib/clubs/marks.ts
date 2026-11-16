import marks from '@/content/manual/maker-marks.json'
import sponsorVectors from '@/content/manual/sponsor-marks.json'
import type { Variant } from './kit-model'

/**
 * The sponsor manifest links source SVGs to the shirt seasons and variants that wore them.
 * The older mark table supplies maker artwork and the existing sponsor fallback.
 * Monochrome prints use the cloth's contrast ink under rule 95.
 */
export type Mark={viewBox:string;kind:'fill'|'stroke'|'raster'|'svg';d?:string;strokeWidth?:number;/** Image mark under public/, printed through a mask (mono) or in its original colours. */src?:string;print?:'mono'|'colour';/** the mark stands in for the sponsor's lettering */replace?:boolean}
type Table=Record<string,Mark>
/** the club pages print sponsors in English (lib/clubs/english.ts); the artwork is filed under the archive's spelling */
const ENGLISH:Record<string,string>={keter:'כתר',hachshara:'הכשרה','bonei hatichon':'בוני התיכון','club hotels':'קלאב הוטלס'}
const key=(s:string)=>{const k=s.toLowerCase().trim();return ENGLISH[k]??k}
export const makerMark=(name:string|null|undefined):Mark|null=>name?((marks.makers as unknown as Table)[key(name)]??null):null
export type SponsorContext = { club: string; season: string; variant: Variant; base?: string | null }
type SponsorVector = Pick<Mark, 'viewBox' | 'print'> & {
 src: string
 club?: string
 seasons?: string[]
 variant?: string
 bases?: string[]
}
const vectors = sponsorVectors as Record<string, SponsorVector[]>

export function sponsorMark(name: string | null | undefined, context?: SponsorContext): Mark | null {
 if (!name) return null
 const normalized = key(name)
 const artworks = Object.hasOwn(vectors, normalized) ? vectors[normalized] : undefined
 const vector = artworks?.find((art) =>
  (!art.club || art.club === context?.club) &&
  (!art.seasons || (context && art.seasons.includes(context.season))) &&
  (!art.variant || art.variant === context?.variant) &&
  (!art.bases || (context?.base != null && art.bases.includes(context.base)))
 )
 if (vector) {
  return { kind: 'svg', src: vector.src, viewBox: vector.viewBox, print: vector.print, replace: true }
 }
 if (context && artworks?.some((art) => art.club === context.club)) return null
 return Object.hasOwn(marks.sponsors, normalized) ? (marks.sponsors as unknown as Table)[normalized] ?? null : null
}
/** where a mark of this viewBox lands when fitted (never stretched) into a w×h box centred on (cx,cy) */
export function fitMark(m:Mark,cx:number,cy:number,w:number,h:number){
 const [x0,y0,vw,vh]=m.viewBox.split(' ').map(Number) as [number,number,number,number],k=Math.min(w/vw,h/vh)
 return {transform:`translate(${(cx-(x0+vw/2)*k).toFixed(2)} ${(cy-(y0+vh/2)*k).toFixed(2)}) scale(${k.toFixed(4)})`,k}
}
