'use client'
import {useCallback,useEffect,useState,type FormEvent} from 'react'
import type {Brief} from '@/lib/stories/projects'
export function StoriesDesk(){
 const [briefs,setBriefs]=useState<Brief[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const load=useCallback(async()=>{try{const r=await fetch('/api/master/stories',{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error);setBriefs(b.briefs)}catch(e){setError(e instanceof Error?e.message:'Could not load briefs.')}},[])
 useEffect(()=>{void load()},[load])
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');setBusy(true);const form=e.currentTarget,data=new FormData(form);try{const r=await fetch('/api/master/stories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({club:data.get('club'),topic:data.get('topic'),season:data.get('season'),duration:Number(data.get('duration'))})}),b=await r.json();if(!r.ok)throw new Error(b.error);form.reset();await load()}catch(err){setError(err instanceof Error?err.message:'Could not save brief.')}finally{setBusy(false)}}
 return <main style={{maxWidth:960,margin:'auto',padding:'40px 20px',fontFamily:'Arial, sans-serif',color:'#15130f',background:'#f4ecd8',minHeight:'100vh'}}>
  <p style={{fontWeight:700,letterSpacing:2}}>FANLIFE / OWNER STUDIO</p><h1 style={{fontSize:'clamp(40px,8vw,76px)',lineHeight:1,margin:'16px 0'}}>Football<br/>Stories.</h1><p>Build a documentary brief for your channel.</p>
  <p role="status" style={{borderLeft:'5px solid #b91c1c',padding:'12px',background:'#fff'}}>Briefs are saved only. The production worker is not connected yet; saving will not generate or upload a video.</p>
  <form onSubmit={save} style={{display:'grid',gap:14,maxWidth:640,margin:'32px 0'}}><label>Club<input name="club" required maxLength={100} placeholder="e.g. Hapoel Tel Aviv" style={input}/></label><label>Story or topic<textarea name="topic" required maxLength={240} placeholder="e.g. The double-winning season" style={input}/></label><label>Season or event<input name="season" maxLength={100} placeholder="e.g. 1999–2000" style={input}/></label><label>Target duration in minutes<input name="duration" type="number" min={7} max={25} defaultValue={12} required style={input}/></label><button disabled={busy} style={{padding:14,background:'#15130f',color:'white',border:0,fontWeight:700,cursor:'pointer'}}>{busy?'Saving…':'Save production brief'}</button></form>
  {error&&<p role="alert">{error}</p>}<h2>Saved briefs</h2>{briefs.length===0?<p>No saved briefs yet.</p>:<ul style={{padding:0,listStyle:'none'}}>{briefs.map(b=><li key={b.id} style={{padding:'16px 0',borderTop:'1px solid #aaa'}}><strong>{b.club} · {b.season||'Season not specified'}</strong><p>{b.topic} · {b.duration} min</p><small>Saved — production not started · {new Date(b.createdAt).toLocaleString()}</small></li>)}</ul>}
 </main>
}
const input={display:'block',width:'100%',padding:'12px',marginTop:6,border:'1px solid #15130f',background:'#fffbf2',color:'#15130f',fontSize:16} as const
