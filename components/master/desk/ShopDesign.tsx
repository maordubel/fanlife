'use client'
import {useEffect,useRef,useState} from 'react'
import {removePlainBackground} from '@/lib/shop/cutout'
import type {ProductDesign} from '@/lib/shop/types'

/**
 * THE BUILDER'S DESIGN CONTROLS (owner, 13.11.2026: more editing — print on the back, background removal, and what helps sell).
 * One set of choices for a new product and for re-pressing an existing one: where it prints, how big, which garment colours,
 * a clean background, and its own margin. Choices a product cannot take are ignored when it is pressed (a mug has no back).
 */
const SIDE_L={front:'Front',back:'Back',both:'Front + back'} as const
const SIZE_L={auto:'Automatic',badge:'Small badge',medium:'Medium',large:'Large',full:'Full width'} as const
const SHADE_L={light:'Light colours',dark:'Dark colours',all:'Every colour'} as const
export function DesignControls({value,onChange,library,margin}:{value:ProductDesign;onChange:(d:ProductDesign)=>void;library:boolean;margin:number}){
 const set=(p:Partial<ProductDesign>)=>onChange({...value,...p})
 const chips=<K extends string>(label:string,map:Record<K,string>,cur:K,pick:(k:K)=>void)=><div className="shop-design-row"><span className="desk-fine">{label}</span>
  <div className="desk-chips" role="radiogroup" aria-label={label}>{(Object.keys(map) as K[]).map(k=><button key={k} type="button" role="radio" aria-checked={cur===k} className="desk-chip" aria-current={cur===k} onClick={()=>pick(k)}>{map[k]}</button>)}</div></div>
 return <div className="shop-design">
  {chips('Print on',SIDE_L,value.sides??'front',k=>set({sides:k}))}
  {chips('Print size (garments, bags)',SIZE_L,value.size??'auto',k=>set({size:k}))}
  {chips('Garment colours',SHADE_L,value.shades??'light',k=>set({shades:k}))}
  {value.shades&&value.shades!=='light'&&!value.cutout&&library&&<p className="desk-fine shop-warn">On dark colours a picture with a paper ground prints as a box — switch on “Remove background”.</p>}
  {library&&<label className="shop-switch"><input type="checkbox" checked={!!value.cutout} onChange={e=>set({cutout:e.target.checked})}/><span>Remove background (the paper ground goes; the art stays)</span></label>}
  <label className="shop-field shop-margin"><span>Margin for these products (empty = the shop’s {margin}%)</span>
   <input type="number" inputMode="numeric" min={10} max={300} step={5} value={value.margin??''} placeholder={`${margin}`} onChange={e=>set({margin:e.target.value?Math.max(10,Math.min(300,Number(e.target.value))):undefined})}/></label>
 </div>
}

/** An uploaded picture, cleaned in the browser before it is sent: preview on a checkerboard, a strength slider, undo. */
export function CutoutPreview({file,onReady}:{file:File|null;onReady:(data:string|null,share:number)=>void}){
 const [on,setOn]=useState(false),[tol,setTol]=useState(60),[share,setShare]=useState(0),[busy,setBusy]=useState(false),[url,setUrl]=useState<string|null>(null),cv=useRef<HTMLCanvasElement|null>(null)
 useEffect(()=>{let gone=false;if(!file){setUrl(null);onReady(null,0);return}
  setBusy(true)
  void (async()=>{const bmp=await createImageBitmap(file),c=cv.current??document.createElement('canvas');cv.current=c;c.width=bmp.width;c.height=bmp.height
   const g=c.getContext('2d',{willReadFrequently:true})!;g.clearRect(0,0,c.width,c.height);g.drawImage(bmp,0,0)
   let s=0;if(on){const img=g.getImageData(0,0,c.width,c.height);s=removePlainBackground({data:img.data,width:c.width,height:c.height},tol);g.putImageData(img,0,0)}
   if(gone)return;const data=on?c.toDataURL('image/png'):null;setShare(s);setUrl(c.toDataURL('image/png'));setBusy(false);onReady(data,s)})()
  return ()=>{gone=true}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[file,on,tol])
 if(!file)return null
 return <div className="shop-cutout">
  <label className="shop-switch"><input type="checkbox" checked={on} onChange={e=>setOn(e.target.checked)}/><span>Remove background</span></label>
  {on&&<label className="shop-field"><span>Strength — more removes more of the ground ({Math.round(share*100)}% removed)</span><input type="range" min={20} max={160} step={5} value={tol} onChange={e=>setTol(Number(e.target.value))}/></label>}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  {url&&<img className="shop-cutout-img" src={url} alt="Preview of the picture as it will print" aria-busy={busy}/>}
 </div>
}
