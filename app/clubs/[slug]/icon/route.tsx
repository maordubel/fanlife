import {ImageResponse} from 'next/og'
import {NextResponse} from 'next/server'
import {clubApp} from '@/lib/clubs/pwa'
import {BRAND} from '@/lib/brand'
export const dynamic='force-dynamic'

/** The club's app icon: its colour worn the way its shirt wears it, its initials in the ink that reads on it. */
export function GET(req:Request,{params}:{params:{slug:string}}) {
 const app=clubApp(params.slug)
 if(!app)return new NextResponse('Not found',{status:404})
 const s=[180,192,512].includes(Number(new URL(req.url).searchParams.get('s')))?Number(new URL(req.url).searchParams.get('s')):512
 const {primary,on,pattern}=app,paper=app.background
 const bg=pattern==='stripes'?`repeating-linear-gradient(90deg, ${primary} 0px, ${primary} ${s/9}px, ${paper} ${s/9}px, ${paper} ${2*s/9}px)`
  :pattern==='hoops'?`repeating-linear-gradient(0deg, ${primary} 0px, ${primary} ${s/9}px, ${paper} ${s/9}px, ${paper} ${2*s/9}px)`
  :pattern==='sash'?`linear-gradient(135deg, ${primary} 0%, ${primary} 36%, ${paper} 36%, ${paper} 64%, ${primary} 64%, ${primary} 100%)`
  :pattern==='halves'?`linear-gradient(90deg, ${primary} 0%, ${primary} 50%, ${paper} 50%, ${paper} 100%)`
  :primary
 const plated=pattern!=='solid'
 return new ImageResponse(<div style={{width:s,height:s,display:'flex',alignItems:'center',justifyContent:'center',background:bg}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:s*0.62,height:s*0.62,borderRadius:s,border:`${Math.round(s/40)}px solid ${BRAND.ink}`,background:plated?paper:primary,color:plated?BRAND.ink:on,fontSize:s*0.26,fontWeight:900,letterSpacing:-s/80}}>{app.reg.initials}</div>
 </div>,{width:s,height:s,headers:{'Cache-Control':'public, max-age=3600'}})
}
