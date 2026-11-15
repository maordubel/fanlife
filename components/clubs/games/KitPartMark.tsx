import {kitMark,type KitParts} from '@/lib/clubs/kit-parts'

/** The same independent mark used by the garment renderer, offered at a readable size. */
export function KitPartMark({parts,kind,className}:{parts:Partial<Pick<KitParts,'crest'|'maker'|'sponsor'>>;kind:'crest'|'maker'|'sponsor';className?:string}){
 if(kind==='crest'){
  // eslint-disable-next-line @next/next/no-img-element -- the archived crest has its own proportions
  return parts.crest?<img src={parts.crest.src} alt="" className={className} data-kit-part="crest" width={42} height={42} style={{objectFit:'contain'}}/>:null
 }
 const item=kitMark({maker:parts.maker??null,sponsor:parts.sponsor??null},kind)
 if(!item)return null
 const mark=item.art
 if(!mark)return <bdi className={className} data-kit-part={kind}>{item.label}</bdi>
 // eslint-disable-next-line @next/next/no-img-element -- the standalone archive mark keeps its proportions
 if(mark.kind==='raster'&&mark.src)return <img src={mark.src} alt={item.label} className={className} data-kit-part={kind} style={{width:52,height:28,objectFit:'contain'}}/>
 if(!mark.d)return <bdi className={className} data-kit-part={kind}>{item.label}</bdi>
 return <svg viewBox={mark.viewBox} width="52" height="28" role="img" aria-label={item.label} className={className} data-kit-part={kind}>
  <path d={mark.d} fill={mark.kind==='stroke'?'none':'currentColor'} stroke={mark.kind==='stroke'?'currentColor':undefined} strokeWidth={mark.strokeWidth}/>
 </svg>
}
