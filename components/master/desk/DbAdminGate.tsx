'use client'
import {useEffect,useState,type ReactNode} from 'react'
import {useAuctionApi} from '@/components/fanlife/auction/AuctionApi'
import {signInWithGoogle} from '@/lib/portal/sync'

/**
 * The market and contribution consoles are decided by the database (`worker_admin_whoami` + RLS), so the owner key alone
 * opens an empty page — which is what the owner saw (desk tidy, 4.11.2026). Say what is missing and offer the one click
 * that fixes it: signing in to FAN LIFE with the admin account in this browser.
 */
export function DbAdminGate({what,children}:{what:string;children:ReactNode}){
 const api=useAuctionApi()
 const [admin,setAdmin]=useState<boolean|null>(null)
 useEffect(()=>{let live=true;void api.adminWhoami().then(r=>{if(live)setAdmin(r.ok&&r.admin)}).catch(()=>{if(live)setAdmin(false)});return()=>{live=false}},[api])
 if(admin===null)return <p className="desk-state" role="status">Checking your FAN LIFE account…</p>
 if(!admin)return <section className="desk-card" aria-labelledby="dbadmin-h">
  <h2 className="desk-h2" id="dbadmin-h">Sign in to manage {what}</h2>
  <p className="desk-fine">{what.charAt(0).toUpperCase()+what.slice(1)} is guarded by the database, not only by the desk key: this browser must also be signed in to FAN LIFE with your admin account (the Google account the market knows as an admin).</p>
  <p className="desk-actions"><button type="button" className="desk-btn min-h-tap" onClick={()=>void signInWithGoogle(window.location.pathname+window.location.search)}>Sign in with Google</button></p>
 </section>
 return <>{children}</>
}
