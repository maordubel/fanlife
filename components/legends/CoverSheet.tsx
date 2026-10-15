'use client'
import {useEffect,useMemo,useState} from 'react'
import {legendsCovers} from '@/app/all-football/legends/actions'
import {COVER_LINK,type CoverData} from '@/lib/legends/cover'
import {COVER_FORMATS,renderCover,type CoverFormat} from '@/lib/legends/cover-render'
import {canvasMeasure,dataUri,loadShareFonts,svgToPng} from '@/lib/share/v3/client'
import {Sheet} from './Sheet'

/**
 * U05: a finished moment as a magazine cover. The preview is private until the person presses Share, Download or Copy; the cover
 * carries the club, the result and (only if switched on) a public alias — never the save, the budget or an account. The link is
 * the manager's entry page, not the career.
 */
const KIND_NAME:Record<CoverData['kind'],string>={champions:'Champions','season':'Season review','big-win':'Big win','late-winner':'Late drama'}
export function CoverSheet({careerId,season,onClose}:{careerId:string;season:number;onClose:()=>void}){
 const [covers,setCovers]=useState<CoverData[]|null>(null),[err,setErr]=useState<string|null>(null)
 const [pick,setPick]=useState(0),[format,setFormat]=useState<CoverFormat>('story')
 const [show,setShow]=useState(false),[alias,setAlias]=useState('')
 const [assets,setAssets]=useState<{logo:string;fontCss:string}|null>(null),[note,setNote]=useState<string|null>(null),[busy,setBusy]=useState(false)
 useEffect(()=>{let live=true
  legendsCovers(careerId,season).then(r=>{if(!live)return;if(r.ok)setCovers(r.covers);else setErr(r.error)}).catch(()=>live&&setErr('The cover could not be prepared. Try again.'))
  Promise.all([loadShareFonts(),dataUri('/legends/brand/logo-mono-512.webp')]).then(([fontCss,logo])=>{if(live)setAssets({fontCss,logo})}).catch(()=>live&&setErr('The cover fonts could not be loaded. Try again.'))
  return()=>{live=false}},[careerId,season])
 const cover=covers?.[pick]??null
 const drawn=useMemo(()=>{if(!cover||!assets)return null;try{return renderCover(cover,{format,alias,showAlias:show,assets,measure:canvasMeasure})}catch{return null}},[cover,assets,format,alias,show])
 const aliasBad=show&&(!alias.trim()||alias.trim().length>18)
 const file=`legends-cover-s${season}-${cover?.kind??'cover'}-${format}.png`
 async function png(){if(!drawn)throw new Error('nothing drawn');return svgToPng(drawn.svg)}
 async function download(){setBusy(true);setNote(null);try{const b=await png(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);setNote('Saved to your device.')}catch{setNote('Could not make the file. Try again.')}finally{setBusy(false)}}
 async function share(){setBusy(true);setNote(null);try{const b=await png(),f=new File([b],file,{type:'image/png'}),url=COVER_LINK(cover!.club)
   if(navigator.canShare?.({files:[f]})){await navigator.share({files:[f],title:`${cover!.clubName} · LEGENDS MANAGER`,text:`${cover!.headline} — ${cover!.big}`,url});setNote(null)}else{await navigator.clipboard.writeText(url);setNote('Sharing files is not available here — the link was copied. Use Download for the picture.')}}
  catch(e){if((e as Error).name!=='AbortError')setNote('Could not share. Try Download instead.')}finally{setBusy(false)}}
 async function copy(){try{await navigator.clipboard.writeText(COVER_LINK(cover!.club));setNote('Link copied — it opens LEGENDS MANAGER, not your career.')}catch{setNote('Could not copy the link.')}}
 return <Sheet id="cover" title={`Season ${season} cover`} kicker="Magazine cover" onClose={onClose} wide>
  <div className="wkl-cover" data-testid="legends-cover">
   {err?<p className="wk-k red" role="alert">{err}</p>:!covers||!assets?<p className="wk-k wk-muted" role="status">Setting the type…</p>:<>
    <div className="wk-opts two" role="tablist" aria-label="Cover moment">{covers.map((c,i)=><button key={c.kind} type="button" role="tab" aria-selected={i===pick} className="wk-opt min-h-tap" onClick={()=>setPick(i)}>{KIND_NAME[c.kind]}</button>)}</div>
    <div className="wk-seg" role="group" aria-label="Format">{(Object.keys(COVER_FORMATS) as CoverFormat[]).map(f=><button key={f} type="button" aria-pressed={f===format} onClick={()=>setFormat(f)}>{f==="story"?"Story":"Feed"}<small>{f==="story"?"1080×1920":"1080×1350"}</small></button>)}</div>
    {drawn?<img className="wkl-cover-preview" data-format={format} alt={`${cover!.clubName}: ${cover!.headline} ${cover!.big}`} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawn.svg)}`}/>:<p className="wk-k red" role="alert">This cover could not be drawn.</p>}
    {drawn?.warnings.length?<p className="wk-k wk-muted" role="status">{drawn.warnings[0]}</p>:null}
    <label className="wkl-cover-alias wk-k"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Show a public name on the cover <small>(off by default — no account name, ever)</small></label>
    {show?<label className="wkl-cover-alias wk-k">Public name <input value={alias} maxLength={18} onChange={e=>setAlias(e.target.value)} placeholder="1–18 characters" aria-invalid={aliasBad||undefined}/></label>:null}
    <p className="wk-cap white">This picture is private until you share it. It shows the club, the result and nothing from your save.</p>
    <div className="wkl-cover-actions">
     <button type="button" className="wk-btn red block min-h-tap" disabled={!drawn||busy||aliasBad} onClick={download} data-testid="legends-cover-download">Download</button>
     <button type="button" className="wk-btn block min-h-tap" disabled={!drawn||busy||aliasBad} onClick={share} data-testid="legends-cover-share">Share</button>
     <button type="button" className="wk-btn paper block min-h-tap" onClick={copy}>Copy link</button>
    </div>
    {note?<p className="wk-k wk-muted" role="status">{note}</p>:null}
   </>}
  </div>
 </Sheet>
}
