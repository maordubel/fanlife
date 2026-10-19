'use client'
import {useEffect,useState} from 'react'
type Evt=Event&{prompt:()=>Promise<void>}
/** "Install <club>": the browser's own install prompt for this club's manifest. Shown only when the browser offers it. */
export function InstallClub({label}:{label:string}){
 const [evt,setEvt]=useState<Evt|null>(null)
 useEffect(()=>{const h=(e:Event)=>{e.preventDefault();setEvt(e as Evt)};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h)},[])
 if(!evt)return null
 return <button type="button" className="wk-btn paper min-h-tap" data-testid="install-club" onClick={()=>{void evt.prompt();setEvt(null)}}>{label}</button>
}
