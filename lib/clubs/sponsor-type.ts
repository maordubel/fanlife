import table from '@/content/manual/sponsor-type.json'

/**
 * Typographic treatment of a chest sponsor (content/manual/sponsor-type.json — the same table the archive drawings use).
 * A sponsor is LETTERED on the cloth, never a redrawn logo (rule 25); this only chooses weight, family, case, tracking and
 * line breaks. The brand colour is never read here: a club page paints neutral ink (rule 95).
 */
export type SponsorFam='heavy'|'cond'|'round'|'serif'
export type SponsorLine={t:string;fam:SponsorFam;weight:number;italic:boolean;case:'upper'|'lower'|'asis';track:number;scale:number}
type Raw={fam?:SponsorFam;weight?:number;italic?:boolean;case?:'upper'|'lower'|'asis';track?:number;scale?:number;t?:string;lines?:Raw[]}
const styles=table.styles as Record<string,Raw>,dflt=table.default as Raw
export const SPONSOR_FONT:Record<SponsorFam,string>={heavy:"'Archivo Black','Arial Black',Impact,sans-serif",cond:"'Bebas Neue','Arial Narrow',Impact,sans-serif",round:"Nunito,'Varela Round','Arial Rounded MT Bold','Trebuchet MS',sans-serif",serif:"Georgia,'Times New Roman',serif"}
export function sponsorLines(name:string):SponsorLine[]{
 const st=styles[name]??styles[name.trim().toLowerCase()]??{},parts:Raw[]=st.lines??[{...st,t:name}]
 return parts.map(p=>{const f={...dflt,...st,...p},raw=p.t??name,t=f.case==='lower'?raw.toLowerCase():f.case==='asis'?raw:raw.toUpperCase()
  return {t,fam:f.fam??'cond',weight:f.weight??700,italic:!!f.italic,case:f.case??'upper',track:f.track??0,scale:p.scale??1}})
}
