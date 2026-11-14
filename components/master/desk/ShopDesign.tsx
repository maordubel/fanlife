'use client'
import {useEffect,useRef,useState} from 'react'
import {removePlainBackground} from '@/lib/shop/cutout'
import type {AreaDesign,ArtRef,ProductDesign} from '@/lib/shop/types'

/**
 * THE BUILDER'S DESIGN CONTROLS (owner, 13.11.2026: more editing — print on the back, background removal, and what helps sell).
 * One set of choices for a new product and for re-pressing an existing one: where it prints, how big, which garment colours,
 * a clean background, and its own margin. Choices a product cannot take are ignored when it is pressed (a mug has no back).
 */
const SIDE_L={front:'Front',back:'Back',both:'Front + back'} as const
const SIZE_L={auto:'Automatic',badge:'Small badge',medium:'Medium',large:'Large',full:'Full width'} as const
const PLACE_L={auto:'Automatic',center:'Centre','chest-left':'Left chest (logo)','chest-right':'Right chest',upper:'Upper',lower:'Lower'} as const
const POS_L:Record<string,string>={front:'Front',back:'Back',left_sleeve:'Left sleeve',right_sleeve:'Right sleeve',neck:'Neck label',neck_label:'Neck label',left_chest:'Left chest',right_chest:'Right chest',pocket:'Pocket',hood:'Hood',default:'Print'}
const posName=(p:string)=>POS_L[p]??p.replace(/_/g,' ')
const SHADE_L={light:'Light colours',dark:'Dark colours',all:'Every colour'} as const
export type Stock={printer:string;product:string;variants:number;positions?:{position:string;variants:number;w:number;h:number}[];colors:{name:string;hex:string|null;light:boolean;variants:number}[];sizes:string[]}
export type PicOption={id:string;name:string}
export function DesignControls({value,onChange,library,margin,stock,loadStock,busy,pictures=[],uploadArt,noSides=false}:{noSides?:boolean;value:ProductDesign;onChange:(d:ProductDesign)=>void;library:boolean;margin:number;stock?:Stock|null;loadStock?:()=>void;busy?:boolean;pictures?:PicOption[];uploadArt?:(f:File)=>Promise<ArtRef|null>}){
 const set=(p:Partial<ProductDesign>)=>onChange({...value,...p})
 const chips=<K extends string>(label:string,map:Record<K,string>,cur:K,pick:(k:K)=>void)=><div className="shop-design-row"><span className="desk-fine">{label}</span>
  <div className="desk-chips" role="radiogroup" aria-label={label}>{(Object.keys(map) as K[]).map(k=><button key={k} type="button" role="radio" aria-checked={cur===k} className="desk-chip min-h-tap" aria-current={cur===k} onClick={()=>pick(k)}>{map[k]}</button>)}</div></div>
 return <div className="shop-design">
  {!value.areas&&!noSides&&<div className="shop-design-row"><span className="desk-fine">How it prints</span><PrintSides value={value} onChange={onChange} pictures={pictures} uploadArt={uploadArt}/></div>}
  {!value.areas&&chips('Front placement',PLACE_L,value.place??'auto',k=>set({place:k}))}
  {value.areas&&<p className="desk-fine">Printing on the areas chosen below. <button type="button" className="desk-chip min-h-tap" onClick={()=>set({areas:undefined})}>Back to the quick choice</button></p>}
  {chips('Print size (garments, bags)',SIZE_L,value.size??'auto',k=>set({size:k}))}
  {chips('Garment colours',SHADE_L,value.shades??'light',k=>set({shades:k,colors:undefined}))}
  {loadStock&&!stock&&<button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={loadStock}>Choose exact colours and sizes from the printer’s stock</button>}
  {stock&&<div className="shop-stock">
   <p className="desk-fine"><b>{stock.product}</b> · {stock.printer} · {stock.colors.length} colours and {stock.sizes.length} sizes in stock now. {value.colors?.length?`${value.colors.length} chosen.`:'None chosen — the “Garment colours” choice above decides.'}</p>
   {stock.colors.length>0&&<div className="shop-swatches" role="group" aria-label="Colours in stock">{stock.colors.map(c=>{const on=!!value.colors?.includes(c.name);return <button key={c.name} type="button" className="shop-swatch min-h-tap" aria-pressed={on} title={`${c.name} · ${c.variants} sizes`}
    onClick={()=>set({colors:on?value.colors!.filter(x=>x!==c.name):[...(value.colors??[]),c.name]})}><span className="shop-dot" style={{background:c.hex??undefined}} data-unknown={c.hex?undefined:true} aria-hidden="true"/><span>{c.name}</span></button>})}</div>}
   {stock.colors.length>0&&<div className="shop-row"><button type="button" className="desk-chip min-h-tap" onClick={()=>set({colors:stock.colors.filter(c=>c.light).map(c=>c.name)})}>All light</button><button type="button" className="desk-chip min-h-tap" onClick={()=>set({colors:stock.colors.filter(c=>!c.light).map(c=>c.name)})}>All dark</button><button type="button" className="desk-chip min-h-tap" onClick={()=>set({colors:undefined})}>Clear</button></div>}
   {stock.sizes.length>1&&<div className="desk-chips" role="group" aria-label="Sizes">{stock.sizes.map(z=>{const on=!value.sizes?.length||value.sizes.includes(z);return <button key={z} type="button" className="desk-chip min-h-tap" aria-pressed={on} aria-current={on}
    onClick={()=>{const cur=value.sizes?.length?value.sizes:stock.sizes;const next=on?cur.filter(x=>x!==z):[...cur,z];set({sizes:next.length===stock.sizes.length?undefined:next})}}>{z}</button>})}</div>}
   {stock.positions&&stock.positions.length>0&&<AreasEditor value={value} onChange={onChange} stock={stock} pictures={pictures} uploadArt={uploadArt} library={library}/>}
   {(value.colors?.length??1)*(value.sizes?.length||stock.sizes.length)>100&&<p className="desk-fine shop-warn">Printify takes at most 100 colour-and-size combinations per product — the first 100 are used.</p>}
   {value.colors?.some(n=>!stock.colors.find(c=>c.name===n)?.light)&&library&&!value.cutout&&<p className="desk-fine shop-warn">Dark colours chosen: switch on “Remove background” unless the picture is already cut out.</p>}
  </div>}
  {value.shades&&value.shades!=='light'&&!value.cutout&&library&&<p className="desk-fine shop-warn">On dark colours a picture with a paper ground prints as a box — switch on “Remove background”.</p>}
  {library&&<label className="shop-switch"><input type="checkbox" checked={!!value.cutout} onChange={e=>set({cutout:e.target.checked})}/><span>Remove background (the paper ground goes; the art stays)</span></label>}
  <label className="shop-field shop-margin"><span>Margin for these products (empty = the shop’s {margin}%)</span>
   <input type="number" inputMode="numeric" min={10} max={300} step={5} value={value.margin??''} placeholder={`${margin}`} onChange={e=>set({margin:e.target.value?Math.max(10,Math.min(300,Number(e.target.value))):undefined})}/></label>
 </div>
}

/**
 * HOW IT PRINTS — chosen first, at the opening of a product (owner, 14.11.2026): front only, back only, the same picture on both
 * sides, or two different pictures (the back's own picture from the library or an upload). A product without a back prints the front.
 */
const MODE_L={front:'Front only',back:'Back only',same:'Front + back · same picture',two:'Front + back · two pictures'} as const
type Mode=keyof typeof MODE_L
export const modeOf=(d:ProductDesign):Mode=>d.sides==='back'?'back':d.sides==='both'?(d.backArt?'two':'same'):'front'
export function PrintSides({value,onChange,pictures=[],uploadArt}:{value:ProductDesign;onChange:(d:ProductDesign)=>void;pictures?:PicOption[];uploadArt?:(f:File)=>Promise<ArtRef|null>}){
 const mode=modeOf(value),[busy,setBusy]=useState(false),[two,setTwo]=useState(mode==='two')
 const pick=(m:Mode)=>{setTwo(m==='two');onChange({...value,areas:undefined,sides:m==='front'?'front':m==='back'?'back':'both',backArt:m==='two'?value.backArt:undefined})}
 const back=value.backArt,backKey=back?('library' in back?`lib:${back.library.id}`:'upload'):''
 return <div className="shop-sides">
  <div className="shop-sides-grid" role="radiogroup" aria-label="How it prints">{(Object.keys(MODE_L) as Mode[]).map(m=><button key={m} type="button" role="radio" aria-checked={(two?'two':mode)===m} className="shop-side min-h-tap" onClick={()=>pick(m)}>
   <span className="shop-side-ico" aria-hidden="true" data-m={m}><i/><i/></span><span>{MODE_L[m]}</span></button>)}</div>
  {(two||mode==='two')&&<div className="shop-form">
   <label className="shop-field"><span>The back’s picture</span><select value={backKey} onChange={e=>{const v=e.target.value,pc=pictures.find(x=>`lib:${x.id}`===v);if(pc)onChange({...value,sides:'both',backArt:{library:{id:pc.id,name:pc.name}}})}}>
    <option value="" disabled>Choose a picture…</option>{backKey==='upload'&&<option value="upload">{back&&'upload' in back?back.upload.name:'Uploaded picture'}</option>}
    {pictures.map(pc=><option key={pc.id} value={`lib:${pc.id}`}>{pc.name}</option>)}</select></label>
   {uploadArt&&<label className="shop-field"><span>…or upload the back’s picture</span><input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);const art=await uploadArt(f);setBusy(false);if(art)onChange({...value,sides:'both',backArt:art})}}/></label>}
   {busy&&<p className="desk-fine">Uploading…</p>}
   {!back&&<p className="desk-fine shop-warn">Choose the back’s picture — until then the back repeats the front.</p>}
  </div>}
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

/**
 * EVERY PRINT AREA THE PRINTER OFFERS (owner, 13.11.2026: two different pictures front and back, a chest logo, all the options).
 * Each area the product has at this printer can be switched on with its own picture, placement and size. Printify adds its own
 * cost for each extra area, and the price follows it automatically (cost + margin).
 */
function AreasEditor({value,onChange,stock,pictures,uploadArt,library}:{value:ProductDesign;onChange:(d:ProductDesign)=>void;stock:Stock;pictures:PicOption[];uploadArt?:(f:File)=>Promise<ArtRef|null>;library:boolean}){
 const areas=value.areas??{},setArea=(pos:string,a:AreaDesign|null)=>{const next={...areas};if(a)next[pos]=a;else delete next[pos];onChange({...value,areas:Object.keys(next).length?next:undefined})}
 const [loading,setLoading]=useState<string|null>(null)
 return <div className="shop-areas"><p className="desk-fine"><b>Print areas at this printer.</b> Each extra area adds the printer’s cost for it — the price follows automatically.</p>
  {stock.positions!.map(ps=>{const a=areas[ps.position],on=!!a,artKey=a?.art?('library' in a.art?`lib:${a.art.library.id}`:'upload'):'main'
   return <fieldset key={ps.position} className="shop-area" data-on={on?'1':'0'}><legend><label className="shop-switch"><input type="checkbox" checked={on} onChange={e=>setArea(ps.position,e.target.checked?{place:ps.position==='front'?'auto':'auto'}:null)}/><span>{posName(ps.position)} <small>({ps.w}×{ps.h}px{ps.variants<stock.variants?`, on ${ps.variants} of ${stock.variants} variants`:''})</small></span></label></legend>
    {on&&<div className="shop-design">
     <label className="shop-field"><span>Picture</span><select value={artKey} onChange={async e=>{const v=e.target.value
      if(v==='main')setArea(ps.position,{...a,art:undefined});else if(v.startsWith('lib:')){const pic=pictures.find(x=>x.id===v.slice(4));if(pic)setArea(ps.position,{...a,art:{library:{id:pic.id,name:pic.name}}})}}}>
      <option value="main">The product’s picture</option>{artKey==='upload'&&<option value="upload">{a!.art&&'upload' in a!.art?a!.art.upload.name:'Uploaded picture'}</option>}
      {pictures.length>0&&<optgroup label="From the library">{pictures.map(pc=><option key={pc.id} value={`lib:${pc.id}`}>{pc.name}</option>)}</optgroup>}</select></label>
     {uploadArt&&<label className="shop-field"><span>…or upload another picture for this area (a cut-out PNG reads best)</span><input type="file" accept="image/png,image/jpeg" disabled={!!loading} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setLoading(ps.position);const art=await uploadArt(f);setLoading(null);if(art)setArea(ps.position,{...a,art})}}/></label>}
     {loading===ps.position&&<p className="desk-fine">Uploading…</p>}
     <div className="desk-chips" role="radiogroup" aria-label="Placement">{(Object.keys(PLACE_L) as (keyof typeof PLACE_L)[]).map(k=><button key={k} type="button" role="radio" aria-checked={(a?.place??'auto')===k} className="desk-chip min-h-tap" aria-current={(a?.place??'auto')===k} onClick={()=>setArea(ps.position,{...a,place:k})}>{PLACE_L[k]}</button>)}</div>
     <div className="desk-chips" role="radiogroup" aria-label="Size">{(Object.keys(SIZE_L) as (keyof typeof SIZE_L)[]).map(k=><button key={k} type="button" role="radio" aria-checked={(a?.size??'auto')===k} className="desk-chip min-h-tap" aria-current={(a?.size??'auto')===k} onClick={()=>setArea(ps.position,{...a,size:k})}>{SIZE_L[k]}</button>)}</div>
     {(library||(a?.art&&'library' in a.art))&&<label className="shop-switch"><input type="checkbox" checked={!!a?.cutout} onChange={e=>setArea(ps.position,{...a,cutout:e.target.checked})}/><span>Remove background (library pictures)</span></label>}
    </div>}
   </fieldset>})}
 </div>
}
