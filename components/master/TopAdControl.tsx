'use client'
import {useState} from 'react'
import type {TopAdSetting} from '@/lib/top-ad'

/**
 * Control room → Settings → Top ad. One switch for the Dubel top ad (Monetag In-Page Push, zone 11100824).
 * It never appears in the control room, during a game, or in LIFE, whatever this says (lib/top-ad.ts). The file switch in
 * public/dubel-top-ad.js (ADS_ENABLED) still overrides this one: if the file says false, nothing loads.
 */
export function TopAdControl({initial,api}:{initial:TopAdSetting;api:{busy:boolean;post:<T>(action:string,data?:unknown,message?:string)=>Promise<T|null>}}){
 const [on,setOn]=useState(initial.topAd),[at,setAt]=useState(initial.updatedAt)
 const flip=async()=>{const r=await api.post<TopAdSetting>('ads/top',{enabled:!on},!on?'Top ad switched on.':'Top ad switched off.');if(r){setOn(r.topAd);setAt(r.updatedAt)}}
 return <section className="desk-sub" aria-labelledby="ad-h">
  <h2 id="ad-h">Top ad</h2>
  <p>Monetag In-Page Push, zone <code>11100824</code> — the only ad on FAN LIFE. Shown on the hub and club reading pages; never in the control room, a game or LIFE.</p>
  <ul className="desk-rows"><li data-durable={on?'yes':'no'}><span className="desk-stamp">{on?'On':'Off'}</span><div>
   <b>{on?'Ads are showing to visitors':'No ad loads anywhere'}</b>
   <p className="desk-fine">{at?`Changed ${new Date(at).toLocaleString('en-GB')}.`:'Default: on.'} Live for visitors on their next page load.</p>
   <button type="button" className="min-h-tap button" role="switch" aria-checked={on} disabled={api.busy} onClick={flip}>{on?'Turn ads off':'Turn ads on'}</button>
  </div></li></ul>
 </section>
}
