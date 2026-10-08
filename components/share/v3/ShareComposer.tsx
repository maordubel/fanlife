'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {fl} from '@/lib/fanlife/copy'
import {track} from '@/lib/analytics/meter'
import {renderShare,shareCaption,SHARE_FORMATS,type ShareAssets,type ShareFormat} from '@/lib/share/v3/render'
import {validateDraft,type ShareDraft} from '@/lib/share/v3/adapters'
import {sharePalette,shareClub,type InkMode} from '@/lib/share/v3/theme'
import {canvasMeasure,loadShareAssets,svgToPng,svgUrl} from '@/lib/share/v3/client'

/**
 * THE SHARE COMPOSER (V3 handoff §6.2, §10). One button on a finished result opens the card at once: the format, the
 * person's own words, an optional nickname (anonymous by default), club colours or black-and-white. The PNG is printed
 * BEFORE the share button is pressed, so the phone's share sheet opens inside the same tap. Nothing is posted for the
 * person; every channel only opens an intent.
 */
const FORMATS:ShareFormat[]=['story','square','link']
const FORMAT_LABEL:Record<ShareFormat,Parameters<typeof fl>[0]>={story:'share3.story',square:'share3.post',link:'share3.link'}

export function ShareComposer({draft,label}:{draft:ShareDraft;label?:string}){
 const [open,setOpen]=useState(false),opener=useRef<HTMLButtonElement>(null)
 const problems=useMemo(()=>validateDraft(draft),[draft])
 if(problems.length)return process.env.NODE_ENV==='production'?null:<p className="mag-fine" role="note">{fl('share3.blocked',{why:problems.join(', ')})}</p>
 return <>
  <button ref={opener} type="button" className="share3-open min-h-tap" data-testid="share-open" onClick={()=>{setOpen(true);track('share_open',{detail:draft.template.surface})}}>{label||fl('share3.open')}</button>
  {open&&createPortal(<Sheet draft={draft} onClose={()=>{setOpen(false);opener.current?.focus()}}/>,document.body)}
 </>
}

function Sheet({draft,onClose}:{draft:ShareDraft;onClose:()=>void}){
 const [format,setFormat]=useState<ShareFormat>('story'),[statement,setStatement]=useState(draft.data.statement||''),[sign,setSign]=useState(false),[alias,setAlias]=useState(''),[ink,setInk]=useState<InkMode>('club')
 const [assets,setAssets]=useState<ShareAssets|null>(null),[preview,setPreview]=useState<string|null>(null),[png,setPng]=useState<Blob|null>(null),[status,setStatus]=useState(''),[failed,setFailed]=useState(false)
 const closeRef=useRef<HTMLButtonElement>(null),version=useRef(0)
 const club=shareClub(draft.data.club)!,P=sharePalette(club,ink)
 const data=useMemo(()=>({...draft.data,statement,showAlias:sign,alias:alias.slice(0,18),inkMode:ink}),[draft.data,statement,sign,alias,ink])
 useEffect(()=>{closeRef.current?.focus();const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';return ()=>{document.removeEventListener('keydown',k);document.body.style.overflow=o}},[onClose])
 useEffect(()=>{loadShareAssets().then(setAssets).catch(()=>setFailed(true))},[])
 // print: preview at once, the PNG right after — ready before the share button is pressed
 useEffect(()=>{if(!assets)return;const v=++version.current;setPng(null)
  const timer=setTimeout(()=>{try{const r=renderShare(draft.template,data,format,{assets,measure:canvasMeasure});const url=svgUrl(r.svg);setPreview(old=>{if(old)URL.revokeObjectURL(old);return url})
   svgToPng(r.svg).then(b=>{if(v===version.current)setPng(b)}).catch(()=>setFailed(true))}catch{setFailed(true)}},180)
  return ()=>clearTimeout(timer)},[assets,data,format,draft.template])
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
 const caption=shareCaption(draft.template,data),name=`fanlife-${club.id}-${draft.template.id}-${format}.png`
 const note=(s:string)=>{setStatus(s);setTimeout(()=>setStatus(''),2600)}
 const download=useCallback((b:Blob)=>{const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)},[name])
 const shareFile=async()=>{if(!png)return;const file=new File([png],name,{type:'image/png'})
  if(typeof navigator.canShare==='function'&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],text:caption});track('share_created',{detail:'native'})}catch{/* the person closed the sheet: not an error, not a share */}}
  else{download(png);try{await navigator.clipboard.writeText(caption)}catch{/* no clipboard: the image is saved */}track('share_created',{detail:'download'});note(fl('share3.saved'))}}
 const intent=(channel:'whatsapp'|'telegram')=>{const u=channel==='whatsapp'?`https://wa.me/?text=${encodeURIComponent(caption)}`:`https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(caption.replace(data.link,'').trim())}`;window.open(u,'_blank','noopener');track('share_click',{detail:channel})}
 const copy=async()=>{try{await navigator.clipboard.writeText(data.link);note(fl('share3.copied'))}catch{note(data.link)}track('share_click',{detail:'copy'})}
 const size=SHARE_FORMATS[format]
 return <div className="share3 fl mag z-[60]" lang="en" dir="ltr" role="dialog" aria-modal="true" aria-labelledby="share3-h" style={{['--s3-accent' as string]:P.primary,['--s3-on' as string]:P.onPrimary,['--s3-type' as string]:P.red}}>
  <div className="share3-scrim" onClick={onClose} aria-hidden="true"/>
  <section className="share3-panel">
   <header className="share3-head"><h2 id="share3-h">{fl('share3.title')}</h2><span className="share3-club">{club.name}</span><button ref={closeRef} type="button" className="share3-x min-h-tap" onClick={onClose} aria-label={fl('share3.close')}>×</button></header>
   <div className="share3-body">
    <figure className="share3-preview" data-format={format} style={{aspectRatio:`${size.w} / ${size.h}`}}>
     {preview?<img src={preview} alt={`${draft.template.name} — ${club.name}`} width={size.w} height={size.h}/>:<span className="share3-wait" aria-live="polite">{failed?fl('share3.failed'):fl('share3.preparing')}</span>}
    </figure>
    <div className="share3-controls">
     <fieldset className="share3-seg"><legend>{fl('share3.format')}</legend>{FORMATS.map(f=><button key={f} type="button" className="min-h-tap" aria-pressed={format===f} onClick={()=>setFormat(f)}><b>{fl(FORMAT_LABEL[f])}</b><small>{SHARE_FORMATS[f].w}×{SHARE_FORMATS[f].h}</small></button>)}</fieldset>
     <label className="share3-field"><span>{fl('share3.words')}</span><textarea value={statement} maxLength={210} rows={2} onChange={e=>setStatement(e.target.value)} placeholder={draft.data.detail}/><small>{fl('share3.wordsHint')}</small></label>
     <label className="share3-check"><input type="checkbox" checked={sign} onChange={e=>setSign(e.target.checked)}/><span>{fl('share3.sign')}</span></label>
     {sign?<label className="share3-field"><span>{fl('share3.alias')}</span><input value={alias} maxLength={18} onChange={e=>setAlias(e.target.value)} autoComplete="off"/></label>:<p className="share3-fine">{fl('share3.anon')}</p>}
     <fieldset className="share3-seg two"><legend>{fl('share3.edition')}</legend><button type="button" className="min-h-tap" aria-pressed={ink==='club'} onClick={()=>setInk('club')}><i aria-hidden="true"/><b>{fl('share3.clubInk')}</b></button><button type="button" className="min-h-tap" aria-pressed={ink==='mono'} onClick={()=>setInk('mono')}><i className="mono" aria-hidden="true"/><b>{fl('share3.monoInk')}</b></button></fieldset>
     {draft.resultOrigin==='device-reported'&&<p className="share3-fine">{fl('share3.deviceNote')}</p>}
    </div>
   </div>
   <footer className="share3-actions">
    <button type="button" className="share3-primary min-h-tap" data-testid="share-image" disabled={!png} onClick={shareFile}>{png?fl('share3.share'):fl('share3.preparing')}</button>
    <div className="share3-row">
     <button type="button" className="min-h-tap" disabled={!png} onClick={()=>{if(png){download(png);track('share_created',{detail:'download'});note(fl('share3.saved'))}}}>{fl('share3.save')}</button>
     <button type="button" className="min-h-tap" onClick={()=>intent('whatsapp')}>{fl('share3.whatsapp')}</button>
     <button type="button" className="min-h-tap" onClick={()=>intent('telegram')}>{fl('share3.telegram')}</button>
     <button type="button" className="min-h-tap" onClick={copy}>{fl('share3.copy')}</button>
    </div>
    <p className="share3-fine" aria-live="polite">{status||(format==='story'?fl('share3.storyTip'):'')}</p>
   </footer>
  </section>
 </div>
}
