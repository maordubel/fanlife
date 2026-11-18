'use client'
import {useMemo,useRef} from 'react'
import {AlbumApp,type AlbumActions,type Drawn} from '@/components/album/AlbumApp'
import type {CatalogRow,CopyRow,Me,Pressed,Variant,WingInfo} from '@/lib/album/view'

/** an in-memory album that answers like the database: 2 distinct stickers a day, pity on the 5th, picks, 5-for-1 */
export function AlbumHarness({view,wings,catalog,eras,kits,pressed}:{view:string;wings:WingInfo[];catalog:CatalogRow[];eras:Record<string,string>;kits:Record<string,string>;pressed:Record<string,Pressed>}){
 const wing=wings.find(w=>w.id==='panathinaikos')?.id??wings[0]!.id
 const st=useRef({book:view==='new'||view==='out'?null as Me['book']:{wing,cover:{name:'Nikos'},picks:1,weekDays:3,claimedToday:view==='envelope'?false:false,envelopes:9,since:'2026-11-01T10:00:00Z'},
  copies:new Map<string,CopyRow>(),seq:0})
 useMemo(()=>{if(!st.current.book)return;const ids=catalog.filter(r=>r[1]===wing).map(r=>r[0]);ids.slice(0,14).forEach((id,i)=>st.current.copies.set(id,[id,i%4===0?3:1,i<10,i===2?'gold':i===5?'silver':'base']));ids.slice(20,23).forEach(id=>st.current.copies.set(id,[id,2,false,'base']))},[catalog,wing])
 const me=():Me=>({ok:true,today:'2026-11-18',book:st.current.book,copies:[...st.current.copies.values()],waiting:[]})
 const ok=<T,>(data:T)=>Promise.resolve({ok:true as const,data})
 const draw=():Drawn=>{const b=st.current.book!,pool=catalog.filter(r=>r[1]===b.wing).map(r=>r[0]),out:string[]=[]
  const miss=pool.filter(id=>!st.current.copies.has(id))
  while(out.length<2){const id=(out.length===0&&miss.length?miss:pool)[(st.current.seq++*7919+13)%(out.length===0&&miss.length?miss.length:pool.length)]!;if(!out.includes(id))out.push(id)}
  const fresh=out.map(id=>!st.current.copies.has(id)),variants:Variant[]=out.map((_,i)=>i===1?'silver':'base')
  out.forEach((id,i)=>{const c=st.current.copies.get(id);st.current.copies.set(id,c?[id,c[1]+1,c[2],c[3]]:[id,1,false,variants[i]!])})
  b.claimedToday=true;b.weekDays=Math.min(5,b.weekDays+1);return {envelope:'00000000-0000-4000-8000-00000000000'+(st.current.seq%10),stickers:out,variants,fresh}}
 const actions:AlbumActions={
  start:(w)=>{st.current.book={wing:w,cover:{},picks:0,weekDays:1,claimedToday:true,envelopes:3,since:'2026-11-18T10:00:00Z'};catalog.filter(r=>r[1]===w).slice(0,6).forEach(r=>st.current.copies.set(r[0],[r[0],1,false,'base']));return ok(me())},
  wing:(w)=>{st.current.book!.wing=w;return ok({wing:w})},daily:()=>ok(draw()),opened:()=>ok({}),
  stick:(id)=>{const c=st.current.copies.get(id);if(!c)return Promise.resolve({ok:false as const,error:'You do not hold it.'});st.current.copies.set(id,[id,c[1],true,c[3]]);return ok({})},
  pick:(id)=>{const b=st.current.book!;if(b.picks<1)return Promise.resolve({ok:false as const,error:'No pick.'});b.picks--;st.current.copies.set(id,[id,1,false,'base']);return ok({})},
  trade:(give,want)=>{for(const g of give){const c=st.current.copies.get(g)!;st.current.copies.set(g,[g,c[1]-1,c[2],c[3]])}st.current.copies.set(want,[want,1,false,'base']);return ok({})},
  refresh:()=>ok(me()),signIn:()=>{}}
 const initial=view==='out'?null:me()
 if(view==='envelope'&&initial?.book)initial.waiting=[{id:'00000000-0000-4000-8000-000000000001',kind:'daily',...(()=>{const d=draw();return {stickers:d.stickers,variants:d.variants,fresh:d.fresh}})()}]
 return <AlbumApp wings={wings} catalog={catalog} eras={eras} kits={kits} pressed={pressed} me={initial} signedIn={view!=='out'} profiles actions={actions}/>
}
