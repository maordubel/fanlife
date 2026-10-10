import marks from '@/content/manual/maker-marks.json'

/**
 * Real maker and sponsor marks (content/manual/maker-marks.json: simple-icons CC0 paths and the Worker's Umbro diamond; trademarks of their
 * owners, printed with the owner's approval of 10.10.2026). A maker or sponsor with no mark is lettered. Printed in the cloth's contrast ink
 * on club pages (rule 95); the static archive drawings may use the mark's own colour.
 */
export type Mark={viewBox:string;kind:'fill'|'stroke'|'raster';d?:string;strokeWidth?:number;/** raster marks: the Worker's artwork under public/, printed as a white shape through a mask (mono) or as it is (colour) */src?:string;print?:'mono'|'colour';/** the mark stands in for the sponsor's lettering */replace?:boolean}
type Table=Record<string,Mark>
const key=(s:string)=>s.toLowerCase().trim()
export const makerMark=(name:string|null|undefined):Mark|null=>name?((marks.makers as unknown as Table)[key(name)]??null):null
export const sponsorMark=(name:string|null|undefined):Mark|null=>name?((marks.sponsors as unknown as Table)[key(name)]??null):null
/** where a mark of this viewBox lands when fitted (never stretched) into a w×h box centred on (cx,cy) */
export function fitMark(m:Mark,cx:number,cy:number,w:number,h:number){
 const [x0,y0,vw,vh]=m.viewBox.split(' ').map(Number) as [number,number,number,number],k=Math.min(w/vw,h/vh)
 return {transform:`translate(${(cx-(x0+vw/2)*k).toFixed(2)} ${(cy-(y0+vh/2)*k).toFixed(2)}) scale(${k.toFixed(4)})`,k}
}
